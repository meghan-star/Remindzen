# RemindMe — Appointment & Service Reminder App

Send email and SMS reminders to customers. Built for hair salons, landscapers, and any service business.

## Features
- **Customer list** — add, search, and manage contacts with email + phone
- **Send reminders** — 3-step wizard: pick customers → compose message → send
- **Templates** — pre-built and custom message templates with variables like `{name}`, `{date}`, `{time}`
- **Email** via SendGrid (free: 100/day)
- **SMS** via Twilio (free trial: $15 credit)

---

## Quick Start

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your SendGrid + Twilio keys (see below)
npm start
# Server runs at http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# App opens at http://localhost:5173
```

---

## Getting API Keys

### SendGrid (Email)
1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
2. Go to Settings → API Keys → Create API Key (Full Access)
3. Add to `.env`:
   ```
   SENDGRID_API_KEY=SG.your_key_here
   FROM_EMAIL=you@yourdomain.com
   ```
4. Verify your sender email at Settings → Sender Authentication

### Twilio (SMS)
1. Sign up at https://twilio.com (free trial includes $15 credit)
2. From the Console Dashboard, copy your Account SID and Auth Token
3. Get a phone number at Phone Numbers → Manage → Buy a Number
4. Add to `.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxx
   TWILIO_FROM_NUMBER=+1XXXXXXXXXX
   ```
   Note: Free trial only sends to verified numbers. Upgrade ($20/mo) to send to anyone.

---

## Message Variables

In any template or message body, use these placeholders:
- `{name}` — replaced with the customer's name
- `{date}` — filled in from the "date" field on the Send page
- `{time}` — filled in from the "time" field
- `{amount}` — filled in from the "amount" field

---

## Deploying to Production

**Backend** → Deploy to Railway, Render, or Heroku
- Set all `.env` variables as environment variables in the dashboard
- Update the `API` constant in `frontend/src/App.jsx` to your deployed URL

**Frontend** → Deploy to Vercel or Netlify
- Run `npm run build` and upload the `dist/` folder

---

## Tech Stack
- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Email**: SendGrid (`@sendgrid/mail`)
- **SMS**: Twilio SDK
- **Storage**: localStorage (customer list persists in the browser)

For a production app, swap localStorage for a database (Supabase, PlanetScale, etc.)
