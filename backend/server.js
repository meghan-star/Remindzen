require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sgMail = require("@sendgrid/mail");
const twilio = require("twilio");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type", "x-admin-uid"] }));
app.options("*", cors());
app.use(express.json());

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const DAILY_LIMIT = parseInt(process.env.DAILY_SEND_LIMIT || "100");
const ADMIN_EMAIL = "remindzenco@gmail.com";

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
      <div class="footer-brand">Sent by <a href="https://remindzen.com">Remind Zen</a> on behalf of ${businessName}</div>
      <div class="footer-unsub">To unsubscribe from these reminders, reply STOP or contact ${businessName} directly.</div>
    </div>
  </div></body></html>`;
}

async function sendEmail(customer, subject, body, vars, businessName) {
  if (!customer.email) return { ok: false, error: "No email address" };
  const resolvedBody = resolveVars(body, customer, vars);
  await sgMail.send({
    to: customer.email,
    from: process.env.FROM_EMAIL,
    subject: resolveVars(subject, customer, vars),
    text: resolvedBody + `\n\n— Sent by Remind Zen on behalf of ${businessName}. Reply STOP to unsubscribe.`,
    html: buildEmailHtml(resolvedBody, businessName),
  });
  return { ok: true };
}

async function sendSMS(customer, body, vars, businessName) {
  if (!customer.phone) return { ok: false, error: "No phone number" };
  const resolvedBody = resolveVars(body, customer, vars);
  await twilioClient.messages.create({
    body: `${resolvedBody}\n\nReply STOP to unsubscribe. Sent by Remind Zen for ${businessName}.`,
    from: process.env.TWILIO_FROM_NUMBER,
    to: customer.phone,
  });
  return { ok: true };
}

// ── Routes ──

app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.post("/send", async (req, res) => {
  const { customers, subject, body, vars = {}, businessName = "Remind Zen", businessId } = req.body;
  if (!customers?.length) return res.status(400).json({ success: false, error: "No customers provided" });
  if (!body) return res.status(400).json({ success: false, error: "Message body is required" });

  // Rate limit check
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
    } catch (err) {
      r.success = false; r.error = err.message;
      console.error(`Error sending to ${customer.name}:`, err.message);
    }
    results.push(r);
    console.log(`[${new Date().toISOString()}] ${customer.name} (${channel}):`, r.success ? "✓" : "✗");
  }

  if (businessId) incrementRateLimit(businessId, customers.length);

  res.json({ success: results.every(r => r.success), sent: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results });
});

// Feedback endpoint — emails admin
app.post("/feedback", async (req, res) => {
  const { type, subject, message, businessName, email } = req.body;
  try {
    await sgMail.send({
      to: ADMIN_EMAIL,
      from: process.env.FROM_EMAIL,
      subject: `[Remind Zen Feedback] ${type.toUpperCase()}: ${subject}`,
      text: `From: ${businessName} (${email})\nType: ${type}\nSubject: ${subject}\n\n${message}`,
      html: `<h3>New Feedback — ${type}</h3><p><strong>From:</strong> ${businessName} (${email})</p><p><strong>Subject:</strong> ${subject}</p><p>${message.replace(/\n/g, "<br/>")}</p>`,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Feedback email error:", err.message);
    res.json({ success: false, error: err.message });
  }
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

function shouldRunNow(schedule, now) {
  const [h, m] = (schedule.send_time || "09:00").split(":").map(Number);
  const sendMinutes = h * 60 + m;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (Math.abs(nowMinutes - sendMinutes) > 1) return false;
  if (schedule.cadence === "daily") return true;
  if (schedule.cadence === "weekly") return now.getDay() === parseInt(schedule.day_of_week || 1);
  if (schedule.cadence === "monthly") return now.getDate() === parseInt(schedule.day_of_month || 1);
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
      if (!shouldRunNow(schedule, now)) continue;
      const { data: business } = await supabase.from("businesses").select("name").eq("id", schedule.business_id).single();

      // Check rate limit for scheduled sends
      const { allowed, remaining } = checkRateLimit(schedule.business_id);
      if (!allowed) { console.log(`[Scheduler] Skipping "${schedule.name}" — rate limit reached`); continue; }

      let query = supabase.from("customers").select("*").eq("business_id", schedule.business_id).eq("unsubscribed", false);
      if (schedule.tag_filter) query = query.contains("tags", [schedule.tag_filter]);
      const { data: customers } = await query;
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
      console.log(`[Scheduler] "${schedule.name}" done — ${historyRows.filter(r => r.status === "sent").length} sent`);
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
