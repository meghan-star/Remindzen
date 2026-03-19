// RemindMe Backend — Node.js + Express
// Handles sending email (via SendGrid) and SMS (via Twilio)
//
// Setup:
//   npm install express cors @sendgrid/mail twilio dotenv
//   cp .env.example .env  →  fill in your API keys
//   node server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sgMail = require("@sendgrid/mail");
const twilio = require("twilio");

const app = express();
app.use(cors());
app.use(express.json());

// ── SendGrid ──
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ── Twilio ──
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ── Helpers ──

function resolveVars(text, customer, vars) {
  if (!text) return "";
  return text
    .replace(/{name}/g, customer.name || "")
    .replace(/{date}/g, vars.date || "")
    .replace(/{time}/g, vars.time || "")
    .replace(/{amount}/g, vars.amount || "");
}

async function sendEmail(customer, subject, body, vars) {
  if (!customer.email) return { ok: false, error: "No email address" };
  const msg = {
    to: customer.email,
    from: process.env.FROM_EMAIL, // must be verified in SendGrid
    subject: resolveVars(subject, customer, vars),
    text: resolveVars(body, customer, vars),
    html: resolveVars(body, customer, vars).replace(/\n/g, "<br/>"),
  };
  await sgMail.send(msg);
  return { ok: true };
}

async function sendSMS(customer, body, vars) {
  if (!customer.phone) return { ok: false, error: "No phone number" };
  const message = await twilioClient.messages.create({
    body: resolveVars(body, customer, vars),
    from: process.env.TWILIO_FROM_NUMBER,
    to: customer.phone,
  });
  return { ok: true, sid: message.sid };
}

// ── Routes ──

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Send reminders
app.post("/send", async (req, res) => {
  const { customers, channel, subject, body, vars = {} } = req.body;

  if (!customers || customers.length === 0) {
    return res.status(400).json({ success: false, error: "No customers provided" });
  }
  if (!body) {
    return res.status(400).json({ success: false, error: "Message body is required" });
  }

  const results = [];

  for (const customer of customers) {
    const customerResult = { id: customer.id, name: customer.name, results: [] };

    try {
      if (channel === "email" || channel === "both") {
        const r = await sendEmail(customer, subject, body, vars);
        customerResult.results.push({ channel: "email", ...r });
      }

      if (channel === "sms" || channel === "both") {
        const r = await sendSMS(customer, body, vars);
        customerResult.results.push({ channel: "sms", ...r });
      }

      customerResult.success = customerResult.results.every(r => r.ok);
    } catch (err) {
      customerResult.success = false;
      customerResult.error = err.message;
    }

    results.push(customerResult);
    console.log(`[${new Date().toISOString()}] Sent to ${customer.name}:`, customerResult.results);
  }

  const allOk = results.every(r => r.success);
  res.json({
    success: allOk,
    sent: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  });
});

// ── Start ──
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`RemindMe server running on http://localhost:${PORT}`);
  console.log(`  SendGrid key: ${process.env.SENDGRID_API_KEY ? "✓ set" : "✗ missing"}`);
  console.log(`  Twilio SID:   ${process.env.TWILIO_ACCOUNT_SID ? "✓ set" : "✗ missing"}`);
});
