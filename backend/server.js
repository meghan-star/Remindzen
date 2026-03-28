require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sgMail = require("@sendgrid/mail");
const twilio = require("twilio");
const { createClient } = require("@supabase/supabase-js");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
// Simple in-memory rate limiter
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute per IP

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = requestCounts.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW;
  }
  entry.count++;
  requestCounts.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Too many requests — please slow down." });
  }
  next();
}

// Apply rate limiter to all routes except webhook
app.use((req, res, next) => {
  if (req.path === "/billing/webhook") return next();
  rateLimiter(req, res, next);
});

const allowedOrigins = [
  "https://app.remindzen.com",
  "https://remindzen.com",
  "http://localhost:5173", // dev only
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-admin-uid", "x-business-id"],
}));
app.options("*", cors());
// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use((req, res, next) => { if (req.path === "/billing/webhook") next(); else express.json()(req, res, next); });

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const DAILY_LIMIT = parseInt(process.env.DAILY_SEND_LIMIT || "100");
const ADMIN_EMAIL = "hello@remindzen.com";

// ── Rate limiting ──

const sendCounts = {};

function getRateLimitKey(businessId) {
  const today = new Date().toISOString().split("T")[0];
  return `${businessId}:${today}`;
}

function checkRateLimit(businessId) {
  const key = getRateLimitKey(businessId);
  const count = sendCounts[key] || 0;
  return { allowed: count < DAILY_LIMIT, count, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - count) };
}

function incrementRateLimit(businessId, amount = 1) {
  const key = getRateLimitKey(businessId);
  sendCounts[key] = (sendCounts[key] || 0) + amount;
  // Clean up old keys every hour
  if (Math.random() < 0.01) {
    const today = new Date().toISOString().split("T")[0];
    Object.keys(sendCounts).forEach(k => { if (!k.includes(today)) delete sendCounts[k]; });
  }
}

// ── Helpers ──

function resolveVars(text, customer, vars = {}) {
  if (!text) return "";
  return text
    .replace(/{name}/g, customer.name || "")
    .replace(/{date}/g, vars.date || "")
    .replace(/{time}/g, vars.time || "")
    .replace(/{amount}/g, vars.amount || "");
}

function buildEmailHtml(body, businessName) {
  const escaped = body.replace(/\n/g, "<br/>");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f7f8fa;margin:0;padding:0}
    .wrapper{max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #f0f0f0}
    .body{padding:32px 36px;font-size:15px;line-height:1.7;color:#333}
    .footer{background:#f7f8fa;padding:16px 36px;border-top:1px solid #f0f0f0;text-align:center}
    .footer-brand{font-size:12px;color:#aaa}.footer-brand a{color:#185FA5;text-decoration:none}
    .footer-unsub{font-size:11px;color:#bbb;margin-top:4px}
  </style></head><body>
  <div class="wrapper">
    <div class="body">${escaped}</div>
    <div class="footer">
      <div class="footer-brand">Sent by <a href="https://app.remindzen.com">Remind Zen</a> on behalf of ${businessName}</div>
      <div class="footer-unsub">To unsubscribe from these reminders, reply STOP or contact ${businessName} directly.</div>
    </div>
  </div></body></html>`;
}

async function sendEmail(customer, subject, body, vars, businessName) {
  if (!customer.email) return { ok: false, error: "No email address" };
  const resolvedBody = resolveVars(body, customer, vars);
  try {
    await sgMail.send({
      to: customer.email,
      from: process.env.FROM_EMAIL,
      subject: resolveVars(subject, customer, vars),
      text: resolvedBody + `\n\n— Sent by Remind Zen on behalf of ${businessName}. Reply STOP to unsubscribe.`,
      html: buildEmailHtml(resolvedBody, businessName),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: parseSendGridError(err) };
  }
}

async function sendSMS(customer, body, vars, businessName) {
  if (!customer.phone) return { ok: false, error: "No phone number" };
  const resolvedBody = resolveVars(body, customer, vars);
  try {
    await twilioClient.messages.create({
      body: `${resolvedBody}\n\nReply STOP to unsubscribe. Sent by Remind Zen for ${businessName}.`,
      from: process.env.TWILIO_FROM_NUMBER,
      to: customer.phone,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: parseTwilioError(err) };
  }
}



// ── Plan configuration ──
const PLANS = {
  starter: {
    name: "Starter",
    monthly: process.env.PRICE_STARTER_MONTHLY,
    annual: process.env.PRICE_STARTER_ANNUAL,
    emailOverage: process.env.PRICE_STARTER_EMAIL,
    smsOverage: process.env.PRICE_STARTER_SMS,
    messageLimit: 150,
    customerLimit: 100,
    scheduleLimit: 2,
  },
  growth: {
    name: "Growth",
    monthly: process.env.PRICE_GROWTH_MONTHLY,
    annual: process.env.PRICE_GROWTH_ANNUAL,
    emailOverage: process.env.PRICE_GROWTH_EMAIL,
    smsOverage: process.env.PRICE_GROWTH_SMS,
    messageLimit: 500,
    customerLimit: 300,
    scheduleLimit: 999,
  },
  pro: {
    name: "Pro",
    monthly: process.env.PRICE_PRO_MONTHLY,
    annual: process.env.PRICE_PRO_ANNUAL,
    emailOverage: process.env.PRICE_PRO_EMAIL,
    smsOverage: process.env.PRICE_PRO_SMS,
    messageLimit: 2000,
    customerLimit: 999999,
    scheduleLimit: 999,
  },
};

function getPlanByPriceId(priceId) {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.monthly === priceId || plan.annual === priceId) return key;
  }
  return "growth"; // default
}

async function getBusinessPlan(businessId) {
  const { data } = await supabase.from("businesses").select("plan, trial_ends_at, stripe_customer_id, messages_used_this_month, suspended").eq("id", businessId).single();
  return data;
}

async function reportUsageToStripe(businessId, emailCount, smsCount) {
  try {
    const { data: biz } = await supabase.from("businesses").select("stripe_subscription_id, plan").eq("id", businessId).single();
    if (!biz?.stripe_subscription_id) return;
    const plan = PLANS[biz.plan];
    if (!plan) return;
    const sub = await stripe.subscriptions.retrieve(biz.stripe_subscription_id, { expand: ["items"] });
    for (const item of sub.items.data) {
      if (item.price.id === plan.emailOverage && emailCount > 0) {
        await stripe.subscriptionItems.createUsageRecord(item.id, { quantity: emailCount, timestamp: Math.floor(Date.now() / 1000) });
      }
      if (item.price.id === plan.smsOverage && smsCount > 0) {
        await stripe.subscriptionItems.createUsageRecord(item.id, { quantity: smsCount, timestamp: Math.floor(Date.now() / 1000) });
      }
    }
  } catch (e) { console.error("Usage report error:", e.message); }
}

// ── Error message helpers ──

function parseSendGridError(err) {
  const code = err?.response?.body?.errors?.[0]?.message || err.message || "";
  if (code.includes("does not match a verified")) return "Your sender email is not verified in SendGrid. Go to SendGrid → Sender Authentication and verify your email.";
  if (code.includes("API key")) return "Invalid SendGrid API key. Check your SENDGRID_API_KEY environment variable.";
  if (code.includes("Forbidden")) return "SendGrid API key does not have permission to send emails.";
  if (code.includes("invalid")) return "Invalid email address format.";
  return `SendGrid error: ${code}`;
}

function parseTwilioError(err) {
  const code = err?.code || 0;
  const msg = err?.message || "";
  if (code === 21211 || msg.includes("not a valid phone number")) return "Invalid phone number format. Numbers must be in +1XXXXXXXXXX format.";
  if (code === 21612) return "This phone number cannot receive SMS messages.";
  if (code === 21408) return "SMS not supported in this region.";
  if (code === 21610) return "This number has opted out of receiving messages (replied STOP).";
  if (code === 21614) return "Phone number is not SMS-capable.";
  if (code === 30032 || msg.includes("Toll-Free")) return "Your Twilio toll-free number needs to be verified before sending. Go to Twilio Console → Phone Numbers → Toll-Free Verification.";
  if (code === 21219 || msg.includes("trial")) return "Twilio trial accounts can only send to verified numbers. Upgrade your Twilio account or verify the recipient number.";
  if (msg.includes("authenticate")) return "Invalid Twilio credentials. Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.";
  return `Twilio error ${code}: ${msg}`;
}

// ── Routes ──

app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.post("/send", async (req, res) => {
  const { customers, subject, body, vars = {}, businessName = "Remind Zen", businessId } = req.body;
  if (!customers?.length) return res.status(400).json({ success: false, error: "No customers provided" });
  if (!body) return res.status(400).json({ success: false, error: "Message body is required" });

  // Plan & rate limit checks
  if (businessId && supabase) {
    const biz = await getBusinessPlan(businessId);
    const plan = PLANS[biz?.plan];
    const trialActive = biz?.trial_ends_at && new Date(biz.trial_ends_at) > new Date();

    // Check suspension
    if (biz?.suspended) {
      return res.status(403).json({ success: false, error: "Your account has been suspended. Please contact support at remindzenco@gmail.com." });
    }

    // Check trial/subscription status
    if (!plan && !trialActive) {
      return res.status(403).json({ success: false, error: "Your free trial has expired. Please subscribe to continue sending reminders.", trialExpired: true });
    }

    // Check monthly message limit (plan limit, not just daily)
    if (plan) {
      const used = biz?.messages_used_this_month || 0;
      if (used >= plan.messageLimit) {
        return res.status(429).json({ success: false, error: `Monthly message limit of ${plan.messageLimit} reached for your ${plan.name} plan. Additional messages will be billed as overages ($0.01/email, $0.05/SMS). Upgrade for a higher limit.`, monthlyLimitReached: true });
      }
    }
  }

  // Daily rate limit check
  if (businessId) {
    const { allowed, count, limit, remaining } = checkRateLimit(businessId);
    if (!allowed) {
      return res.status(429).json({ success: false, error: `Daily send limit of ${limit} messages reached. Resets at midnight.`, rateLimited: true, count, limit });
    }
    if (customers.length > remaining) {
      return res.status(429).json({ success: false, error: `Only ${remaining} messages remaining today (limit: ${limit}/day).`, rateLimited: true, remaining, limit });
    }
  }

  const results = [];
  for (const customer of customers) {
    const channel = customer.channel || customer.preferred_channel || "email";
    const r = { id: customer.id, name: customer.name, results: [] };
    try {
      if (channel === "email" || channel === "both") r.results.push({ channel: "email", ...await sendEmail(customer, subject, body, vars, businessName) });
      if (channel === "sms" || channel === "both") r.results.push({ channel: "sms", ...await sendSMS(customer, body, vars, businessName) });
      r.success = r.results.every(x => x.ok);
      if (!r.success) r.error = r.results.filter(x => !x.ok).map(x => x.error).join(", ");
    } catch (err) {
      r.success = false; r.error = err.message;
      console.error(`Error sending to ${customer.name}:`, err.message);
    }
    results.push(r);
    console.log(`[${new Date().toISOString()}] ${customer.name} (${channel}):`, r.success ? "✓" : "✗");
  }

  if (businessId) incrementRateLimit(businessId, customers.length);

  const sentCount = results.filter(r => r.success).length;

  // Update message usage count and report overages to Stripe
  if (businessId && supabase && sentCount > 0) {
    try {
      const biz = await getBusinessPlan(businessId);
      const plan = PLANS[biz?.plan];
      const newUsed = (biz?.messages_used_this_month || 0) + sentCount;
      await supabase.from("businesses").update({ messages_used_this_month: newUsed }).eq("id", businessId);

      // Report overage if over plan limit
      if (plan && newUsed > plan.messageLimit) {
        const overageCount = Math.min(sentCount, newUsed - plan.messageLimit);
        const emailResults = results.filter(r => r.success && r.results?.some(x => x.channel === "email"));
        const smsResults = results.filter(r => r.success && r.results?.some(x => x.channel === "sms"));
        if (overageCount > 0) await reportUsageToStripe(businessId, emailResults.length, smsResults.length);
      }
    } catch (e) { console.error("Usage tracking error:", e.message); }
  }

  res.json({ success: results.every(r => r.success), sent: sentCount, failed: results.filter(r => !r.success).length, results });
});

// Feedback endpoint — emails admin
app.post("/feedback", async (req, res) => {
  const { type, subject, message, businessName, email } = req.body;
  try {
    await sgMail.send({
      to: ADMIN_EMAIL,
      from: process.env.FROM_EMAIL,
      subject: `[Remind Zen Feedback] ${(type || "feedback").replace("pro_priority_", "").toUpperCase()}: ${subject}`,
      text: `From: ${businessName} (${email})\nType: ${type}\nSubject: ${subject}\n\n${message}`,
      html: `<h3>New Feedback — ${type}</h3><p><strong>From:</strong> ${businessName} (${email})</p><p><strong>Subject:</strong> ${subject}</p><p>${message.replace(/\n/g, "<br/>")}</p>`,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Feedback email error:", err.message, err?.response?.body);
    res.json({ success: false, error: err.message });
  }
});



// ── Billing Routes ──

// Get current plan status
app.get("/billing/status", async (req, res) => {
  const businessId = req.headers["x-business-id"];
  if (!businessId) return res.status(400).json({ error: "Missing business ID" });
  try {
    const biz = await getBusinessPlan(businessId);
    const plan = PLANS[biz?.plan || "trial"];
    const trialActive = biz?.trial_ends_at && new Date(biz.trial_ends_at) > new Date();
    const trialDaysLeft = biz?.trial_ends_at ? Math.max(0, Math.ceil((new Date(biz.trial_ends_at) - new Date()) / 86400000)) : 0;
    res.json({
      plan: biz?.plan || "trial",
      planName: plan?.name || "Trial",
      trialActive,
      trialDaysLeft,
      messagesUsed: biz?.messages_used_this_month || 0,
      messageLimit: plan?.messageLimit || 50,
      customerLimit: plan?.customerLimit || 25,
      scheduleLimit: plan?.scheduleLimit || 1,
      stripeCustomerId: biz?.stripe_customer_id,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create checkout session
app.post("/billing/checkout", async (req, res) => {
  const { businessId, priceId, email, annual } = req.body;
  if (!businessId || !priceId) return res.status(400).json({ error: "Missing required fields" });
  try {
    const planKey = getPlanByPriceId(priceId);
    const plan = PLANS[planKey];
    const lineItems = [{ price: priceId, quantity: 1 }];
    if (annual) {
      if (plan.emailOverage) lineItems.push({ price: plan.emailOverage });
      if (plan.smsOverage) lineItems.push({ price: plan.smsOverage });
    } else {
      if (plan.emailOverage) lineItems.push({ price: plan.emailOverage });
      if (plan.smsOverage) lineItems.push({ price: plan.smsOverage });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: lineItems,
      subscription_data: {
        trial_period_days: 14,
        metadata: { businessId, planKey },
      },
      allow_promotion_codes: true,
      success_url: `${process.env.FRONTEND_URL || "https://app.remindzen.com"}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || "https://app.remindzen.com"}?cancelled=true`,
      metadata: { businessId, planKey },
    });
    res.json({ url: session.url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Open customer portal
app.post("/billing/portal", async (req, res) => {
  const { businessId } = req.body;
  if (!businessId) return res.status(400).json({ error: "Missing business ID" });
  try {
    const { data: biz } = await supabase.from("businesses").select("stripe_customer_id").eq("id", businessId).single();
    if (!biz?.stripe_customer_id) return res.status(400).json({ error: "No billing account found" });
    const session = await stripe.billingPortal.sessions.create({
      customer: biz.stripe_customer_id,
      return_url: process.env.FRONTEND_URL || "https://app.remindzen.com",
    });
    res.json({ url: session.url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Stripe webhook
app.post("/billing/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("Webhook signature failed:", e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const businessId = session.metadata?.businessId;
        const planKey = session.metadata?.planKey || "growth";
        if (businessId) {
          await supabase.from("businesses").update({
            plan: planKey,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
          }).eq("id", businessId);
          console.log(`[Billing] ${businessId} subscribed to ${planKey}`);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const planKey = getPlanByPriceId(sub.items?.data?.[0]?.price?.id) || "growth";
        const { data: biz } = await supabase.from("businesses").select("id").eq("stripe_customer_id", sub.customer).single();
        if (biz) {
          await supabase.from("businesses").update({
            plan: planKey,
            stripe_subscription_id: sub.id,
          }).eq("id", biz.id);
          console.log(`[Billing] ${biz.id} plan updated to ${planKey}`);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const { data: biz } = await supabase.from("businesses").select("id").eq("stripe_customer_id", sub.customer).single();
        if (biz) {
          await supabase.from("businesses").update({ plan: "cancelled", stripe_subscription_id: null }).eq("id", biz.id);
          console.log(`[Billing] ${biz.id} subscription cancelled`);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const { data: biz } = await supabase.from("businesses").select("id, email, name").eq("stripe_customer_id", invoice.customer).single();
        if (biz?.email) {
          await sgMail.send({
            to: biz.email,
            from: process.env.FROM_EMAIL,
            subject: "Action required: Payment failed for Remind Zen",
            text: `Hi ${biz.name || "there"},\n\nYour payment for Remind Zen failed. Please update your payment method to keep your account active.\n\nManage billing: ${process.env.FRONTEND_URL || "https://app.remindzen.com"}\n\n— Remind Zen`,
          });
        }
        break;
      }
      case "customer.subscription_trial_will_end": {
        const sub = event.data.object;
        const trialEndDate = new Date(sub.trial_end * 1000);
        const { data: biz } = await supabase.from("businesses").select("id, email, name").eq("stripe_customer_id", sub.customer).single();
        if (biz?.email) {
          // Get usage stats
          const [{ count: custCount }, { count: sentCount }, { data: schedules }] = await Promise.all([
            supabase.from("customers").select("*", { count: "exact", head: true }).eq("business_id", biz.id),
            supabase.from("send_history").select("*", { count: "exact", head: true }).eq("business_id", biz.id).eq("status", "sent"),
            supabase.from("schedules").select("id").eq("business_id", biz.id).eq("active", true),
          ]);
          const customers = custCount || 0;
          const sent = sentCount || 0;
          const activeSchedules = schedules?.length || 0;
          const dateStr = trialEndDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
          const billingUrl = `${process.env.FRONTEND_URL || "https://app.remindzen.com"}/#Billing`;

          await sgMail.send({
            to: biz.email,
            from: { email: process.env.FROM_EMAIL, name: "Remind Zen" },
            subject: `Your free trial ends in 3 days — ${biz.name || "Remind Zen"}`,
            html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:20px;background:#f7f8fa;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;">
    <div style="background:#3B6F73;padding:28px 32px;text-align:center;">
      <div style="font-size:28px;margin-bottom:6px;">🔔</div>
      <div style="color:white;font-size:20px;font-weight:700;">Remind Zen</div>
      <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px;">Helpful reminders for busy businesses</div>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;font-weight:600;color:#1a1a1a;margin:0 0 12px;">Your free trial ends in 3 days 🎉</p>
      <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 16px;">Hi ${biz.name || "there"}, just a heads up — your 14-day free trial ends on <strong>${dateStr}</strong>. Your subscription will activate automatically so your reminders keep running without any interruption.</p>
      <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">No action needed on your end. We just wanted to make sure you knew what to expect.</p>
      <div style="background:#f0f6ff;border-radius:10px;padding:18px 20px;margin:20px 0;">
        <div style="font-size:13px;font-weight:600;color:#185FA5;margin-bottom:12px;">Here's what you've set up so far:</div>
        <div style="display:flex;gap:24px;">
          <div style="text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#185FA5;">${customers}</div>
            <div style="font-size:12px;color:#888;">Customers</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#185FA5;">${sent}</div>
            <div style="font-size:12px;color:#888;">Reminders sent</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#185FA5;">${activeSchedules}</div>
            <div style="font-size:12px;color:#888;">Schedules active</div>
          </div>
        </div>
      </div>
      <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">If you'd like to make any changes to your plan before it activates, you can do that from your Billing page. And if you decide Remind Zen isn't the right fit, you can cancel anytime — no hard feelings.</p>
      <a href="${billingUrl}" style="display:block;text-align:center;background:#3B6F73;color:white;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:20px;">View my billing →</a>
      <p style="font-size:13px;color:#aaa;line-height:1.7;margin:0;">Questions? Just reply to this email — I read every message personally.<br/><em>— Meghan, Founder of Remind Zen</em></p>
    </div>
    <div style="background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #f0f0f0;">
      <p style="font-size:12px;color:#bbb;margin:0;">Remind Zen · Ventura, CA · <a href="https://remindzen.com" style="color:#bbb;">remindzen.com</a></p>
      <p style="font-size:12px;color:#bbb;margin:6px 0 0;">You're receiving this because you signed up for a Remind Zen trial.</p>
    </div>
  </div>
</body>
</html>`,
            text: `Hi ${biz.name || "there"}, your Remind Zen trial ends on ${dateStr}. Your subscription activates automatically — no action needed. You've added ${customers} customers and sent ${sent} reminders. View billing: ${billingUrl} — Meghan, Founder of Remind Zen`,
          });
          console.log(`[Billing] Trial ending email sent to ${biz.email}`);
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const { data: biz } = await supabase.from("businesses").select("id").eq("stripe_customer_id", invoice.customer).single();
        if (biz) {
          await supabase.from("businesses").update({ messages_used_this_month: 0, messages_reset_at: new Date().toISOString() }).eq("id", biz.id);
          console.log(`[Billing] ${biz.id} payment succeeded — message count reset`);
        }
        break;
      }
    }
  } catch (e) { console.error("[Webhook] Handler error:", e.message); }

  res.json({ received: true });
});


// Delete account — cancels Stripe subscription then wipes all data
app.post("/account/delete", async (req, res) => {
  const { businessId } = req.body;
  if (!businessId) return res.status(400).json({ error: "Missing business ID" });
  try {
    // Cancel Stripe subscription first
    const { data: biz } = await supabase.from("businesses").select("stripe_subscription_id, stripe_customer_id").eq("id", businessId).single();
    if (biz?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(biz.stripe_subscription_id);
        console.log(`[Account] Cancelled Stripe subscription ${biz.stripe_subscription_id}`);
      } catch (e) { console.error("[Account] Stripe cancellation error:", e.message); }
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin Routes ──
const ADMIN_UID = "2bd0487e-a317-4cbd-9871-70d87aacaf47";

function requireAdmin(req, res, next) {
  const uid = req.headers["x-admin-uid"];
  if (uid !== ADMIN_UID) return res.status(403).json({ error: "Forbidden" });
  next();
}

app.get("/admin/businesses", requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from("businesses").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ businesses: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/admin/feedback", requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from("feedback").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ feedback: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/admin/businesses/:id/suspend", requireAdmin, async (req, res) => {
  try {
    const { suspended } = req.body;
    const { error } = await supabase.from("businesses").update({ suspended }).eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/admin/feedback/:id/read", requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from("feedback").update({ read: true }).eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Scheduler ──

function shouldRunNow(schedule, now, timezone) {
  const tz = timezone || "America/Los_Angeles";
  const localNow = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const [h, m] = (schedule.send_time || "09:00").split(":").map(Number);
  const sendMinutes = h * 60 + m;
  const nowMinutes = localNow.getHours() * 60 + localNow.getMinutes();
  if (Math.abs(nowMinutes - sendMinutes) > 1) return false;
  if (schedule.cadence === "daily") return true;
  if (schedule.cadence === "weekly") return localNow.getDay() === parseInt(schedule.day_of_week || 1);
  if (schedule.cadence === "monthly") return localNow.getDate() === parseInt(schedule.day_of_month || 1);
  if (schedule.cadence === "interval") {
    if (!schedule.last_run_at) return true;
    const daysSince = (now - new Date(schedule.last_run_at)) / 86400000;
    return daysSince >= parseInt(schedule.interval_days || 7);
  }
  return false;
}

async function runScheduler() {
  if (!supabase) return;
  try {
    const now = new Date();
    const { data: schedules } = await supabase.from("schedules").select("*").eq("active", true);
    if (!schedules?.length) return;

    for (const schedule of schedules) {
      if (!shouldRunNow(schedule, now, business?.timezone)) continue;
      const { data: business } = await supabase.from("businesses").select("name, email, timezone, notify_schedule_email").eq("id", schedule.business_id).single();

      // Check rate limit for scheduled sends
      const { allowed, remaining } = checkRateLimit(schedule.business_id);
      if (!allowed) { console.log(`[Scheduler] Skipping "${schedule.name}" — rate limit reached`); continue; }

      let query = supabase.from("customers").select("*").eq("business_id", schedule.business_id).eq("unsubscribed", false).eq("inactive", false);
      if (schedule.tag_filter) query = query.contains("tags", [schedule.tag_filter]);
      const { data: allCustomers } = await query;
      // Filter by specific customer_ids if set
      const customers = (schedule.customer_ids?.length > 0)
        ? (allCustomers || []).filter(c => schedule.customer_ids.includes(c.id))
        : (allCustomers || []);
      if (!customers?.length) continue;

      const toSend = customers.slice(0, remaining);
      console.log(`[Scheduler] Running "${schedule.name}" — ${toSend.length} customers`);

      const historyRows = [];
      for (const customer of toSend) {
        const channel = schedule.channel === "preferred" ? (customer.preferred_channel || "email") : schedule.channel;
        let success = false, error = null;
        try {
          if (channel === "email" || channel === "both") await sendEmail(customer, schedule.subject, schedule.body, {}, business?.name || "Remind Zen");
          if (channel === "sms" || channel === "both") await sendSMS(customer, schedule.body, {}, business?.name || "Remind Zen");
          success = true;
        } catch (err) { error = err.message; }
        historyRows.push({ business_id: schedule.business_id, customer_id: customer.id, customer_name: customer.name, channel, subject: schedule.subject, body: schedule.body, status: success ? "sent" : "failed", error });
      }

      incrementRateLimit(schedule.business_id, toSend.length);
      await supabase.from("send_history").insert(historyRows);
      await supabase.from("schedules").update({ last_run_at: now.toISOString() }).eq("id", schedule.id);
      const sentCount = historyRows.filter(r => r.status === "sent").length;
      console.log(`[Scheduler] "${schedule.name}" done — ${sentCount} sent`);

      if (business?.notify_schedule_email && business?.email && sentCount > 0) {
        try {
          await sgMail.send({
            to: business.email,
            from: process.env.FROM_EMAIL,
            subject: `Schedule "${schedule.name}" sent ${sentCount} reminder${sentCount !== 1 ? "s" : ""}`,
            text: `Your scheduled reminder "${schedule.name}" just ran.\n\n${sentCount} message${sentCount !== 1 ? "s were" : " was"} sent.\n\nView results in your Send History tab.\n\n— Remind Zen`,
          });
        } catch (e) { console.error("[Scheduler] Notification email failed:", e.message); }
      }
    }
  } catch (err) {
    console.error("[Scheduler] Error:", err.message);
  }
}

setInterval(runScheduler, 60 * 1000);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Remind Zen server running on http://localhost:${PORT}`);
  console.log(`  Daily send limit: ${DAILY_LIMIT} messages/account`);
  console.log(`  SendGrid key:     ${process.env.SENDGRID_API_KEY ? "✓" : "✗"}`);
  console.log(`  Twilio SID:       ${process.env.TWILIO_ACCOUNT_SID ? "✓" : "✗"}`);
  console.log(`  Supabase URL:     ${process.env.SUPABASE_URL ? "✓" : "✗"}`);
});
