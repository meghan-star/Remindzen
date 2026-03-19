require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sgMail = require("@sendgrid/mail");
const twilio = require("twilio");

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));
app.options("*", cors());
app.use(express.json());

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ── Helpers ──

function resolveVars(text, customer, vars) {
  if (!text) return "";
  return text
    .replace(/{name}/g, customer.name || "")
    .replace(/{date}/g, vars.date || "")
    .replace(/{time}/g, vars.time || "")
    .replace(/{amount}/g, vars.amount || "");
}

function buildEmailHtml(body, businessName) {
  const escaped = body.replace(/\n/g, "<br/>");
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f7f8fa; margin: 0; padding: 0; }
    .wrapper { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #f0f0f0; }
    .body { padding: 32px 36px; font-size: 15px; line-height: 1.7; color: #333; }
    .footer { background: #f7f8fa; padding: 16px 36px; border-top: 1px solid #f0f0f0; text-align: center; }
    .footer-brand { font-size: 12px; color: #aaa; }
    .footer-brand a { color: #185FA5; text-decoration: none; }
    .footer-unsub { font-size: 11px; color: #bbb; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="body">${escaped}</div>
    <div class="footer">
      <div class="footer-brand">Sent by <a href="https://remindzen.com">Remind Zen</a> on behalf of ${businessName}</div>
      <div class="footer-unsub">To unsubscribe from these reminders, reply STOP or contact ${businessName} directly.</div>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(customer, subject, body, vars, businessName) {
  if (!customer.email) return { ok: false, error: "No email address" };
  const resolvedBody = resolveVars(body, customer, vars);
  const resolvedSubject = resolveVars(subject, customer, vars);
  const msg = {
    to: customer.email,
    from: process.env.FROM_EMAIL,
    subject: resolvedSubject,
    text: resolvedBody + `\n\n— Sent by Remind Zen on behalf of ${businessName}. Reply STOP to unsubscribe.`,
    html: buildEmailHtml(resolvedBody, businessName),
  };
  await sgMail.send(msg);
  return { ok: true };
}

async function sendSMS(customer, body, vars, businessName) {
  if (!customer.phone) return { ok: false, error: "No phone number" };
  const resolvedBody = resolveVars(body, customer, vars);
  const message = await twilioClient.messages.create({
    body: `${resolvedBody}\n\nReply STOP to unsubscribe. Sent by Remind Zen for ${businessName}.`,
    from: process.env.TWILIO_FROM_NUMBER,
    to: customer.phone,
  });
  return { ok: true, sid: message.sid };
}

// ── Routes ──

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/send", async (req, res) => {
  const { customers, subject, body, vars = {}, businessName = "Remind Zen" } = req.body;

  if (!customers || customers.length === 0) {
    return res.status(400).json({ success: false, error: "No customers provided" });
  }
  if (!body) {
    return res.status(400).json({ success: false, error: "Message body is required" });
  }

  const results = [];

  for (const customer of customers) {
    const channel = customer.channel || customer.preferred_channel || "email";
    const customerResult = { id: customer.id, name: customer.name, results: [] };

    try {
      if (channel === "email" || channel === "both") {
        const r = await sendEmail(customer, subject, body, vars, businessName);
        customerResult.results.push({ channel: "email", ...r });
      }
      if (channel === "sms" || channel === "both") {
        const r = await sendSMS(customer, body, vars, businessName);
        customerResult.results.push({ channel: "sms", ...r });
      }
      customerResult.success = customerResult.results.every(r => r.ok);
    } catch (err) {
      customerResult.success = false;
      customerResult.error = err.message;
      console.error(`Error sending to ${customer.name}:`, err.message);
    }

    results.push(customerResult);
    console.log(`[${new Date().toISOString()}] ${customer.name} (${channel}):`, customerResult.success ? "✓" : "✗");
  }

  const sentCount = results.filter(r => r.success).length;
  res.json({
    success: sentCount === results.length,
    sent: sentCount,
    failed: results.filter(r => !r.success).length,
    results,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Remind Zen server running on http://localhost:${PORT}`);
  console.log(`  SendGrid key: ${process.env.SENDGRID_API_KEY ? "✓ set" : "✗ missing"}`);
  console.log(`  Twilio SID:   ${process.env.TWILIO_ACCOUNT_SID ? "✓ set" : "✗ missing"}`);
});
