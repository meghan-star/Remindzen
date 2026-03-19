require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sgMail = require("@sendgrid/mail");
const twilio = require("twilio");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.options("*", cors());
app.use(express.json());

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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
  const { customers, subject, body, vars = {}, businessName = "Remind Zen" } = req.body;
  if (!customers?.length) return res.status(400).json({ success: false, error: "No customers provided" });
  if (!body) return res.status(400).json({ success: false, error: "Message body is required" });

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

  res.json({ success: results.every(r => r.success), sent: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results });
});

// ── Scheduler ──

function shouldRunToday(schedule, now) {
  const [h, m] = (schedule.send_time || "09:00").split(":").map(Number);
  const sendMinutes = h * 60 + m;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (Math.abs(nowMinutes - sendMinutes) > 1) return false;

  if (schedule.cadence === "daily") return true;
  if (schedule.cadence === "weekly") return now.getDay() === parseInt(schedule.day_of_week || 1);
  if (schedule.cadence === "monthly") return now.getDate() === parseInt(schedule.day_of_month || 1);
  if (schedule.cadence === "interval") {
    if (!schedule.last_run_at) return true;
    const last = new Date(schedule.last_run_at);
    const daysSince = (now - last) / 86400000;
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
      if (!shouldRunToday(schedule, now)) continue;

      // Get business info
      const { data: business } = await supabase.from("businesses").select("name,email").eq("id", schedule.business_id).single();

      // Get customers for this schedule
      let query = supabase.from("customers").select("*").eq("business_id", schedule.business_id).eq("unsubscribed", false);
      if (schedule.tag_filter) query = query.contains("tags", [schedule.tag_filter]);
      const { data: customers } = await query;
      if (!customers?.length) continue;

      console.log(`[Scheduler] Running "${schedule.name}" for ${business?.name} — ${customers.length} customers`);

      const historyRows = [];
      for (const customer of customers) {
        const channel = schedule.channel === "preferred" ? (customer.preferred_channel || "email") : schedule.channel;
        let success = false, error = null;
        try {
          if (channel === "email" || channel === "both") await sendEmail(customer, schedule.subject, schedule.body, {}, business?.name || "Remind Zen");
          if (channel === "sms" || channel === "both") await sendSMS(customer, schedule.body, {}, business?.name || "Remind Zen");
          success = true;
        } catch (err) { error = err.message; }
        historyRows.push({ business_id: schedule.business_id, customer_id: customer.id, customer_name: customer.name, channel, subject: schedule.subject, body: schedule.body, status: success ? "sent" : "failed", error });
      }

      await supabase.from("send_history").insert(historyRows);
      await supabase.from("schedules").update({ last_run_at: now.toISOString() }).eq("id", schedule.id);
      console.log(`[Scheduler] "${schedule.name}" complete — ${historyRows.filter(r => r.status === "sent").length} sent`);
    }
  } catch (err) {
    console.error("[Scheduler] Error:", err.message);
  }
}

// Run scheduler every minute
setInterval(runScheduler, 60 * 1000);
console.log("[Scheduler] Started — checking every minute");

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Remind Zen server running on http://localhost:${PORT}`);
  console.log(`  SendGrid key:    ${process.env.SENDGRID_API_KEY ? "✓ set" : "✗ missing"}`);
  console.log(`  Twilio SID:      ${process.env.TWILIO_ACCOUNT_SID ? "✓ set" : "✗ missing"}`);
  console.log(`  Supabase URL:    ${process.env.SUPABASE_URL ? "✓ set" : "✗ missing"}`);
  console.log(`  Supabase key:    ${process.env.SUPABASE_SERVICE_KEY ? "✓ set" : "✗ missing"}`);
});
