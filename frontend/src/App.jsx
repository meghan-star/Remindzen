import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import logo from "./logo.png";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const ADMIN_EMAIL = "remindzenco@gmail.com";
const ADMIN_UID = "2bd0487e-a317-4cbd-9871-70d87aacaf47";

const TEMPLATES = [
  { id: 1, name: "Appointment Reminder", channel: "both", subject: "Reminder: Your appointment with {business_name}", body: "Hi {name}, this is a friendly reminder that you have an appointment with {business_name} on {date} at {time}. Please reply to confirm or call us to reschedule. See you soon!" },
  { id: 2, name: "Monthly Service Due", channel: "both", subject: "Time to schedule your service — {business_name}", body: "Hi {name}, your monthly service with {business_name} is coming up! Give us a call or reply to this message to schedule at your convenience. We appreciate your business!" },
  { id: 3, name: "Follow-up Thank You", channel: "email", subject: "Thanks for choosing {business_name}!", body: "Hi {name}, thank you for visiting {business_name} on {date}. We hope everything was to your satisfaction. We'd love to see you again — feel free to reach out anytime!" },
  { id: 4, name: "Payment Reminder", channel: "both", subject: "Payment reminder from {business_name}", body: "Hi {name}, this is a friendly reminder that your payment of {amount} is due on {date}. Please contact {business_name} with any questions. Thank you!" },
  { id: 5, name: "Service Follow-up", channel: "email", subject: "How did we do? — {business_name}", body: "Hi {name}, we hope you were happy with your recent service from {business_name}! Your satisfaction means everything to us. If you have any feedback or questions, please don't hesitate to reach out. We look forward to serving you again!" },
  { id: 6, name: "Review Request", channel: "email", subject: "We'd love your feedback — {business_name}", body: "Hi {name}, thank you for being a valued customer of {business_name}! If you've been happy with our service, we'd really appreciate a quick review. It helps other small businesses find us. Thank you so much for your support!" },
  { id: 7, name: "Seasonal Promotion", channel: "both", subject: "Special offer for you from {business_name}", body: "Hi {name}, as one of our valued customers, we wanted to share a special offer just for you! Contact {business_name} today to learn more. We appreciate your loyalty!" },
  { id: 8, name: "Re-engagement", channel: "both", subject: "We miss you! — {business_name}", body: "Hi {name}, it's been a while since we've seen you at {business_name}! We'd love to have you back. Get in touch to schedule your next appointment — we have some great availability coming up." },
  { id: 9, name: "Appointment Confirmation", channel: "both", subject: "Your appointment is confirmed — {business_name}", body: "Hi {name}, your appointment with {business_name} on {date} at {time} is confirmed. If you need to reschedule, please contact us as soon as possible. See you then!" },
  { id: 10, name: "No-show Follow-up", channel: "sms", body: "Hi {name}, we missed you today at {business_name}! We'd love to reschedule your appointment at a time that works better for you. Just reply or give us a call." },
  { id: 11, name: "We Saved Your Spot", channel: "both", subject: "We saved your spot — {business_name}", body: "Hi {name}, we wanted to reach out because we've been holding your usual spot open at {business_name}. It's been a while since we've seen you! We'd love to have you back — just reply or call us to book your next appointment." },
  { id: 12, name: "You're Almost Due", channel: "both", subject: "You're almost due for your next visit — {business_name}", body: "Hi {name}, just a friendly heads up that you're almost due for your next service at {business_name}! Staying on schedule helps get the best results. Book your appointment before your spot fills up." },
  { id: 13, name: "Limited Availability", channel: "both", subject: "Limited spots available this week — {business_name}", body: "Hi {name}, we have a few openings this week at {business_name} and wanted to give you first pick before they fill up. Reply or call us to grab your spot — we'd love to see you!" },
  { id: 14, name: "You're Our VIP", channel: "email", subject: "A special thank you from {business_name}", body: "Hi {name}, as one of our most valued customers we just wanted to say thank you for your continued loyalty. As a small token of our appreciation, please mention this message on your next visit. We truly appreciate your support!" },
  { id: 15, name: "Don't Lose Your Progress", channel: "both", subject: "Don't lose your progress — {business_name}", body: "Hi {name}, we noticed it's been a little while since your last visit to {business_name}. Staying consistent is the best way to maintain your results! We'd love to help you keep up the great work. Ready to book?" },
  { id: 16, name: "Quick Check-in", channel: "sms", body: "Hi {name}! Just checking in from {business_name} — hope you've been well! We'd love to see you again soon. Any questions or ready to book? Just reply to this message." },
];

const NAV = ["Dashboard", "Customers", "Send Reminder", "Templates", "Schedules", "History", "Billing", "Settings", "About", "Legal", "Contact"];
const ADMIN_NAV = ["Dashboard", "Customers", "Send Reminder", "Templates", "Schedules", "History", "Billing", "Settings", "About", "Legal", "Contact", "Admin"];

// ── Shared UI ──

function Badge({ type, label }) {
  const colors = {
    email: { bg: "#E6F1FB", color: "#185FA5" },
    sms: { bg: "#EAF3DE", color: "#3B6D11" },
    both: { bg: "#EEEDFE", color: "#3C3489" },
  };
  const c = colors[type] || colors.email;
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {label || type}
    </span>
  );
}

function Avatar({ name }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#B5D4F4", "#9FE1CB", "#FAC775", "#F5C4B3", "#CECBF6", "#C0DD97"];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div style={{ width: 38, height: 38, borderRadius: "50%", background: colors[idx] || "#B5D4F4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#185FA5", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  if (!msg) return null;
  const bg = type === "success" ? "#EAF3DE" : "#FCEBEB";
  const col = type === "success" ? "#3B6D11" : "#A32D2D";
  return (
    <div style={{ position: "fixed", bottom: 32, right: 32, background: bg, color: col, padding: "12px 20px", borderRadius: 10, fontWeight: 500, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", display: "flex", gap: 12, alignItems: "center" }}>
      {msg}
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: col, fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, padding: "0" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg-card)", borderRadius: "16px 16px 0 0", padding: "24px 20px", width: "100%", maxWidth: 560, position: "relative", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e0e0e0",
  fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 12,
  fontFamily: "inherit", background: "var(--bg-hover)",
};

const btnStyle = (primary) => ({
  padding: "10px 22px", borderRadius: 8, border: primary ? "none" : "1px solid #e0e0e0",
  background: primary ? "#185FA5" : "#fff", color: primary ? "#fff" : "#444",
  fontWeight: 500, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
});


function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

function PasswordStrength({ password }) {
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const strength = len >= 12 && (hasUpper || hasNum) ? "strong" : len >= 8 && (hasUpper || hasNum) ? "good" : "weak";
  const colors = { weak: "#A32D2D", good: "#BA7517", strong: "#3B6D11" };
  const widths = { weak: "33%", good: "66%", strong: "100%" };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ height: 4, background: "#f0f0f0", borderRadius: 99, marginBottom: 4 }}>
        <div style={{ height: 4, width: widths[strength], background: colors[strength], borderRadius: 99, transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: 12, color: colors[strength] }}>
        {strength === "weak" ? "Weak — add numbers or uppercase letters" : strength === "good" ? "Good password" : "Strong password"}
      </div>
    </div>
  );
}

function SmsCounter({ body }) {
  const chars = body.length;
  const segments = Math.ceil(chars / 160);
  const over = chars > 160;
  const remaining = 160 - (chars % 160 || 160);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
      <span style={{ fontSize: 12, color: over ? "#A32D2D" : "#aaa" }}>
        {chars} chars · {over ? `${segments} SMS segments (costs ${segments}x)` : "1 SMS segment"}
      </span>
      <span style={{ fontSize: 12, color: "var(--text-hint)" }}>{remaining} until next segment</span>
    </div>
  );
}

function TagSuggestions({ tags, onAdd }) {
  const lib = JSON.parse(localStorage.getItem("tagLibrary") || "[]");
  const suggestions = lib.filter(t => !tags.includes(t));
  if (suggestions.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
      {suggestions.map(t => (
        <button key={t} onClick={() => onAdd(t)} style={{ padding: "3px 10px", borderRadius: 99, border: "1px dashed #CECBF6", background: "transparent", color: "#534AB7", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ {t}</button>
      ))}
    </div>
  );
}

function InviteCodeField({ form, setForm }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 4 }}>
      {!show ? (
        <button type="button" onClick={() => setShow(true)} style={{ background: "none", border: "none", color: "#185FA5", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "inherit", marginBottom: 8 }}>
          Have an invite code?
        </button>
      ) : (
        <input style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--border-mid)", borderRadius: 10, fontSize: 14, marginBottom: 8, fontFamily: "inherit", outline: "none", background: "var(--bg-input)", color: "var(--text-primary)", textTransform: "uppercase" }}
          placeholder="Enter invite code" value={form.inviteCode} autoFocus
          onChange={e => setForm({ ...form, inviteCode: e.target.value.toUpperCase() })} />
      )}
    </div>
  );
}

// ── Auth Screen ──

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", inviteCode: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: "offline", prompt: "consent" }
      }
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        onAuth(data.user);
      } else if (mode === "signup") {
        if (!form.name.trim()) { setError("Business name is required"); setLoading(false); return; }
        if (form.password.length < 8) { setError("Password must be at least 8 characters"); setLoading(false); return; }
        if (!/[A-Z]/.test(form.password) && !/[0-9]/.test(form.password)) { setError("Password must contain a number or uppercase letter"); setLoading(false); return; }

        // Check invite code if provided
        let trialDays = 14;
        let lockedPlan = null;
        if (form.inviteCode?.trim()) {
          const { data: code } = await supabase.from("invite_codes").select("*").eq("code", form.inviteCode.trim().toUpperCase()).eq("active", true).single();
          if (!code) { setError("Invalid invite code. Leave blank to sign up without one."); setLoading(false); return; }
          if (code.max_uses && code.uses_count >= code.max_uses) { setError("This invite code has reached its limit."); setLoading(false); return; }
          trialDays = code.trial_days || 14;
          lockedPlan = code.locked_plan || null;
          await supabase.from("invite_codes").update({ uses_count: (code.uses_count || 0) + 1 }).eq("id", code.id);
        }

        // Check for referral code stored from landing page link
        const storedRef = localStorage.getItem("referral_code");
        let referredBy = null;
        if (storedRef) {
          const { data: refData } = await supabase.from("referral_codes").select("*").eq("code", storedRef).single();
          if (refData) {
            trialDays = Math.max(trialDays, 30);
            referredBy = storedRef;
            const { data: referrerBiz } = await supabase.from("businesses").select("trial_ends_at").eq("id", refData.business_id).single();
            if (referrerBiz) {
              const baseDate = new Date(Math.max(new Date(referrerBiz.trial_ends_at || new Date()).getTime(), Date.now()));
              const rewardEnd = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
              await supabase.from("businesses").update({ trial_ends_at: rewardEnd.toISOString() }).eq("id", refData.business_id);
            }
            localStorage.removeItem("referral_code");
          }
        }

        const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password });
        if (error) throw error;
        if (data.user) {
          const trialEnd = new Date(Date.now() + trialDays * 86400000).toISOString();
          await supabase.from("businesses").insert({ id: data.user.id, name: form.name, email: form.email, trial_ends_at: trialEnd, plan: lockedPlan || "trial", referred_by: referredBy });
          if (form.inviteCode?.trim()) localStorage.setItem(`invite_code_${data.user.id}`, form.inviteCode.trim().toUpperCase());
          onAuth(data.user);
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: window.location.origin });
        if (error) throw error;
        setResetSent(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fa", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 420, boxShadow: "0 2px 24px rgba(0,0,0,0.07)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src={logo} alt="Remind Zen" style={{ width: 100, marginBottom: 4 }} />
          <div style={{ fontSize: 13, color: "var(--text-hint)", marginTop: 4 }}>
            {mode === "login" ? "Sign in to your account" : mode === "signup" ? "Create your business account" : "Reset your password"}
          </div>
        </div>

        {/* Google Sign In */}
        {mode !== "reset" && (
          <div style={{ marginBottom: 20 }}>
            <button onClick={handleGoogleLogin} disabled={googleLoading} style={{ width: "100%", padding: "11px 16px", borderRadius: 10, border: "1.5px solid #e0e0e0", background: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "inherit", color: "#333", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8f8f8"}
              onMouseLeave={e => e.currentTarget.style.background = "white"}>
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? "Redirecting..." : mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
              <div style={{ flex: 1, height: 1, background: "#e8e8e8" }} />
              <span style={{ fontSize: 12, color: "#aaa" }}>or continue with email</span>
              <div style={{ flex: 1, height: 1, background: "#e8e8e8" }} />
            </div>
          </div>
        )}

        {resetSent ? (
          <div style={{ textAlign: "center", color: "#3B6D11", background: "#EAF3DE", borderRadius: 10, padding: "16px 20px", fontSize: 14 }}>
            Check your email for a password reset link.
            <button onClick={() => { setMode("login"); setResetSent(false); }} style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", color: "#185FA5", cursor: "pointer", fontSize: 13 }}>
              Back to login
            </button>
          </div>
        ) : (
          <>
            {mode === "signup" && (
              <>
                <input style={inputStyle} placeholder="Business name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <InviteCodeField form={form} setForm={setForm} />
              </>
            )}
            <input style={inputStyle} placeholder="Email address" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            {mode !== "reset" && (
              <>
                <input style={inputStyle} placeholder="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()} />
                {mode === "signup" && form.password.length > 0 && (
                  <PasswordStrength password={form.password} />
                )}
              </>
            )}
            {error && <div style={{ color: "#A32D2D", fontSize: 13, marginBottom: 12, background: "#FCEBEB", padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
            <button onClick={handleSubmit} disabled={loading} style={{ ...btnStyle(true), width: "100%", marginBottom: 16 }}>
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              {mode === "login" && <>
                <button onClick={() => setMode("signup")} style={{ background: "none", border: "none", color: "#185FA5", cursor: "pointer", fontSize: 13 }}>
                  Don't have an account? Sign up
                </button>
                <button onClick={() => setMode("reset")} style={{ background: "none", border: "none", color: "var(--text-hint)", cursor: "pointer", fontSize: 13 }}>
                  Forgot password?
                </button>
              </>}
              {mode !== "login" && (
                <button onClick={() => setMode("login")} style={{ background: "none", border: "none", color: "#185FA5", cursor: "pointer", fontSize: 13 }}>
                  Already have an account? Sign in
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


// ── Dashboard Page ──

function DashboardPage({ user, business, billingStatus, setPage }) {
  const [stats, setStats] = useState({ sent: 0, failed: 0, customers: 0, schedules: 0 });
  const [recentHistory, setRecentHistory] = useState([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [histRes, custRes, schedRes] = await Promise.all([
        supabase.from("send_history").select("*").eq("business_id", user.id).order("sent_at", { ascending: false }).limit(100),
        supabase.from("customers").select("id").eq("business_id", user.id),
        supabase.from("schedules").select("*").eq("business_id", user.id).eq("active", true).order("created_at", { ascending: false }),
      ]);

      const history = histRes.data || [];
      const now = new Date();
      const thisMonth = history.filter(h => new Date(h.sent_at).getMonth() === now.getMonth());

      setStats({
        sent: thisMonth.filter(h => h.status === "sent").length,
        failed: thisMonth.filter(h => h.status === "failed").length,
        customers: custRes.data?.length || 0,
        schedules: schedRes.data?.length || 0,
      });
      setRecentHistory(history.slice(0, 5));
      setUpcomingSchedules(schedRes.data?.slice(0, 3) || []);
      setLoading(false);
    };
    load();
  }, []);

  const planInfo = { trial: "Free Trial", starter: "Starter", growth: "Growth", pro: "Pro" };
  const usagePct = billingStatus ? Math.min(100, Math.round((billingStatus.messagesUsed / billingStatus.messageLimit) * 100)) : 0;
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) return <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-hint)" }}>Loading dashboard...</div>;

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
          {greeting()}, {business?.name || "there"} 👋
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-hint)" }}>Here's what's happening with your reminders this month.</p>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Sent this month", value: stats.sent, color: "#185FA5", bg: "#E6F1FB", action: () => setPage("History") },
          { label: "Active customers", value: stats.customers, color: "#3B6D11", bg: "#EAF3DE", action: () => setPage("Customers") },
          { label: "Active schedules", value: stats.schedules, color: "#534AB7", bg: "#EEEDFE", action: () => setPage("Schedules") },
          { label: "Failed this month", value: stats.failed, color: stats.failed > 0 ? "#A32D2D" : "#888", bg: stats.failed > 0 ? "#FCEBEB" : "#f5f5f5", action: () => setPage("History") },
        ].map(s => (
          <div key={s.label} onClick={s.action} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Usage meter */}
      {billingStatus && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 22px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Message usage</span>
              <span style={{ marginLeft: 10, fontSize: 12, background: "#E6F1FB", color: "#185FA5", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>{planInfo[billingStatus.plan] || "Trial"}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: usagePct > 90 ? "#A32D2D" : "#1a1a1a" }}>{billingStatus.messagesUsed} / {billingStatus.messageLimit}</span>
          </div>
          <div style={{ height: 8, background: "#f0f0f0", borderRadius: 99 }}>
            <div style={{ height: 8, width: `${usagePct}%`, background: usagePct > 90 ? "#E24B4A" : usagePct > 70 ? "#BA7517" : "#185FA5", borderRadius: 99, transition: "width 0.5s" }} />
          </div>
          {usagePct > 70 && (
            <div style={{ fontSize: 12, color: usagePct > 90 ? "#A32D2D" : "#854F0B", marginTop: 8 }}>
              {usagePct > 90 ? "⚠️ Approaching limit — overages apply after limit" : "Getting close to your monthly limit"}
              <button onClick={() => setPage("Billing")} style={{ marginLeft: 10, background: "none", border: "none", color: "#185FA5", cursor: "pointer", fontSize: 12, fontFamily: "inherit", textDecoration: "underline" }}>Upgrade plan →</button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Recent sends */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Recent sends</span>
            <button onClick={() => setPage("History")} style={{ background: "none", border: "none", color: "#185FA5", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>View all →</button>
          </div>
          {recentHistory.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-hint)", fontSize: 13 }}>
              No messages sent yet.
              <br />
              <button onClick={() => setPage("Send Reminder")} style={{ marginTop: 8, background: "none", border: "none", color: "#185FA5", cursor: "pointer", fontSize: 13, fontFamily: "inherit", textDecoration: "underline" }}>Send your first reminder →</button>
            </div>
          ) : recentHistory.map(h => (
            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "0.5px solid #f5f5f5" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.customer_name}</div>
                <div style={{ fontSize: 11, color: "var(--text-hint)" }}>{new Date(h.sent_at).toLocaleDateString()}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: h.status === "sent" ? "#EAF3DE" : "#FCEBEB", color: h.status === "sent" ? "#3B6D11" : "#A32D2D", flexShrink: 0 }}>{h.status}</span>
            </div>
          ))}
        </div>

        {/* Upcoming schedules */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Active schedules</span>
            <button onClick={() => setPage("Schedules")} style={{ background: "none", border: "none", color: "#185FA5", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Manage →</button>
          </div>
          {upcomingSchedules.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-hint)", fontSize: 13 }}>
              No active schedules.
              <br />
              <button onClick={() => setPage("Schedules")} style={{ marginTop: 8, background: "none", border: "none", color: "#185FA5", cursor: "pointer", fontSize: 13, fontFamily: "inherit", textDecoration: "underline" }}>Create a schedule →</button>
            </div>
          ) : upcomingSchedules.map(s => (
            <div key={s.id} style={{ padding: "8px 0", borderBottom: "0.5px solid #f5f5f5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{s.name}</div>
                <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: "#EAF3DE", color: "#3B6D11", flexShrink: 0, marginLeft: 8 }}>Active</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 2 }}>{s.cadence} · {s.send_time} · {s.channel?.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 22px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14 }}>Quick actions</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "✉️ Send a reminder", page: "Send Reminder" },
            { label: "👤 Add a customer", page: "Customers" },
            { label: "🗓 Create a schedule", page: "Schedules" },
            { label: "📋 Browse templates", page: "Templates" },
          ].map(a => (
            <button key={a.label} onClick={() => setPage(a.page)} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #e8e8e8", background: "var(--bg-hover)", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#E6F1FB"; e.currentTarget.style.borderColor = "#b5d4f4"; e.currentTarget.style.color = "#185FA5"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.borderColor = "#e8e8e8"; e.currentTarget.style.color = "#444"; }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Customers Page ──

function CustomersPage({ user, showToast }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bulkSelected, setBulkSelected] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active"); // active | inactive | all
  const [alphaFilter, setAlphaFilter] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "", preferred_channel: "email", unsubscribed: false, sms_consent: false, sms_consent_at: null, tags: [], next_appointment: "", inactive: false });

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const { data } = await supabase.from("customers").select("*").eq("business_id", user.id).order("name");
    setCustomers(data || []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditingCustomer(null);
    setForm({ name: "", email: "", phone: "", notes: "", preferred_channel: "email", unsubscribed: false, sms_consent: false, sms_consent_at: null, tags: [] });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditingCustomer(c);
    setForm({ name: c.name, email: c.email || "", phone: c.phone || "", notes: c.notes || "", preferred_channel: c.preferred_channel || "email", unsubscribed: c.unsubscribed || false, sms_consent: c.sms_consent || false, sms_consent_at: c.sms_consent_at || null, tags: c.tags || [], next_appointment: c.next_appointment || "", inactive: c.inactive || false });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;

    // Check customer limit for new customers
    if (!editingCustomer) {
      const planLimits = { trial: 10, starter: 75, growth: 300, pro: 999999 };
      const { data: biz } = await supabase.from("businesses").select("plan, trial_ends_at").eq("id", user.id).single();
      const plan = biz?.plan || "trial";
      const limit = planLimits[plan] || 10;
      if (customers.length >= limit) {
        showToast(`Customer limit reached (${limit} on ${plan} plan). Upgrade to add more.`, "error");
        return;
      }
    }

    // Duplicate detection
    if (form.email || form.phone) {
      let dupQuery = supabase.from("customers").select("id,name").eq("business_id", user.id);
      if (editingCustomer) dupQuery = dupQuery.neq("id", editingCustomer.id);
      const { data: existing } = await dupQuery;
      const dup = (existing || []).find(c =>
        (form.email && c.email === form.email) || (form.phone && c.phone === form.phone)
      );
      if (dup) {
        const field = (form.email && dup.email === form.email) ? "email" : "phone number";
        if (!window.confirm(`A customer with this ${field} already exists (${dup.name}). Save anyway?`)) return;
      }
    }

    if (editingCustomer) {
      const updateData = {
        ...form,
        next_appointment: form.next_appointment || null,
        sms_consent_at: form.sms_consent_at || null,
      };
      const { error } = await supabase.from("customers").update(updateData).eq("id", editingCustomer.id);
      if (!error) { showToast(`${form.name} updated`, "success"); loadCustomers(); setShowModal(false); }
      else { console.error("Update error:", error); showToast("Update failed: " + error.message, "error"); }
    } else {
      if (form.email) {
        const { data: dup } = await supabase.from("customers").select("id,name").eq("business_id", user.id).eq("email", form.email).single();
        if (dup) { showToast(`A customer with this email already exists: ${dup.name}`, "error"); return; }
      }
      if (form.phone) {
        const { data: dup } = await supabase.from("customers").select("id,name").eq("business_id", user.id).eq("phone", form.phone).single();
        if (dup) { showToast(`A customer with this phone number already exists: ${dup.name}`, "error"); return; }
      }
      const insertData = { ...form, business_id: user.id, next_appointment: form.next_appointment || null, sms_consent_at: form.sms_consent_at || null };
      const { error } = await supabase.from("customers").insert(insertData);
      if (!error) { showToast(`${form.name} added`, "success"); loadCustomers(); setShowModal(false); }
      else { console.error("Insert error:", error); showToast("Add failed: " + error.message, "error"); }
    }
  };

  const handleDelete = async (id, name) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (!error) { showToast(`${name} removed`, "success"); loadCustomers(); }
  };

  const handleBulkDelete = async () => {
    if (!bulkSelected.length) return;
    if (!window.confirm(`Delete ${bulkSelected.length} customer${bulkSelected.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    await supabase.from("customers").delete().in("id", bulkSelected);
    showToast(`${bulkSelected.length} customer${bulkSelected.length > 1 ? "s" : ""} deleted`, "success");
    setBulkSelected([]);
    loadCustomers();
  };

  const handleCSVImport = async (file) => {
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
      return obj;
    }).filter(r => r.name || r.full_name);

    let added = 0, updated = 0, skipped = 0;
    for (const row of rows) {
      const name = row.name || row.full_name || row.customer_name || "";
      const email = row.email || row.email_address || "";
      const phone = row.phone || row.phone_number || row.mobile || "";
      const notes = row.notes || row.note || "";
      const preferred_channel = row.preferred_channel || row.channel || "email";
      if (!name) { skipped++; continue; }

      if (email) {
        const { data: existing } = await supabase.from("customers").select("id").eq("business_id", user.id).eq("email", email).single();
        if (existing) {
          await supabase.from("customers").update({ name, phone, notes, preferred_channel }).eq("id", existing.id);
          updated++;
          continue;
        }
      }
      await supabase.from("customers").insert({ name, email, phone, notes, preferred_channel, business_id: user.id });
      added++;
    }
    loadCustomers();
    showToast(`Import complete: ${added} added, ${updated} updated${skipped > 0 ? ", " + skipped + " skipped" : ""}`, "success");
  };


  const handleExportCSV = () => {
    const headers = ["name", "email", "phone", "notes", "preferred_channel", "tags", "unsubscribed", "sms_consent"];
    const rows = customers.map(c => [
      c.name, c.email || "", c.phone || "", c.notes || "",
      c.preferred_channel || "email",
      (c.tags || []).join("|"),
      c.unsubscribed ? "yes" : "no",
      c.sms_consent ? "yes" : "no",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "remindzen-customers.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${customers.length} customers`, "success");
  };

  const toggleUnsubscribe = async (c) => {
    const { error } = await supabase.from("customers").update({ unsubscribed: !c.unsubscribed }).eq("id", c.id);
    if (!error) { showToast(c.unsubscribed ? `${c.name} resubscribed` : `${c.name} opted out`, "success"); loadCustomers(); }
  };

  const allTags = [...new Set(customers.flatMap(c => c.tags || []))].sort();

  const filtered = customers.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);
    const matchesTag = !activeTag || (c.tags || []).includes(activeTag);
    const matchesStatus = statusFilter === "all" ? true : statusFilter === "inactive" ? c.inactive : !c.inactive;
    const matchesAlpha = !alphaFilter || c.name.toUpperCase().startsWith(alphaFilter);
    return matchesSearch && matchesTag && matchesStatus && matchesAlpha;
  });

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const usedLetters = new Set(customers.map(c => c.name?.[0]?.toUpperCase()).filter(Boolean));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 8, flexWrap: "wrap" }}>
        <input placeholder="Search customers..." value={search} onChange={e => { setSearch(e.target.value); setAlphaFilter(null); }} style={{ ...inputStyle, flex: 1, minWidth: 120, marginBottom: 0 }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label style={{ ...btnStyle(false), cursor: "pointer", display: "inline-flex", alignItems: "center", fontSize: 13 }}>
            📥 Import
            <input type="file" accept=".csv" style={{ display: "none" }} onChange={e => handleCSVImport(e.target.files[0])} />
          </label>
          <button onClick={handleExportCSV} style={{ ...btnStyle(false), fontSize: 13 }}>📤 Export</button>
          <button onClick={openAdd} style={{ ...btnStyle(true), fontSize: 13 }}>+ Add</button>
        </div>
      </div>

      {bulkSelected.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "var(--bg-selected)", borderRadius: 10, marginBottom: 12, border: "1px solid #b5d4f4" }}>
          <span style={{ fontSize: 14, color: "#185FA5", fontWeight: 500 }}>{bulkSelected.length} selected</span>
          <button onClick={handleBulkDelete} style={{ ...btnStyle(false), fontSize: 13, padding: "5px 14px", color: "#A32D2D", borderColor: "#f7c1c1" }}>Delete selected</button>
          <button onClick={() => setBulkSelected([])} style={{ ...btnStyle(false), fontSize: 13, padding: "5px 14px" }}>Clear selection</button>
        </div>
      )}

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {[["active", "Active"], ["inactive", "Inactive"], ["all", "All"]].map(([val, label]) => (
          <button key={val} onClick={() => setStatusFilter(val)} style={{ padding: "5px 14px", borderRadius: 8, border: "none", background: statusFilter === val ? "#185FA5" : "var(--bg-hover)", color: statusFilter === val ? "#fff" : "var(--text-secondary)", fontWeight: statusFilter === val ? 600 : 400, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
        ))}
        <span style={{ fontSize: 13, color: "var(--text-hint)", alignSelf: "center", marginLeft: 4 }}>{filtered.length} customer{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* A-Z quick jump */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 14 }}>
        {ALPHABET.map(letter => (
          <button key={letter} onClick={() => setAlphaFilter(alphaFilter === letter ? null : letter)} style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: alphaFilter === letter ? "#185FA5" : usedLetters.has(letter) ? "var(--bg-hover)" : "transparent", color: alphaFilter === letter ? "#fff" : usedLetters.has(letter) ? "var(--text-secondary)" : "var(--text-hint)", fontSize: 11, fontWeight: 500, cursor: usedLetters.has(letter) ? "pointer" : "default", fontFamily: "inherit" }}>
            {letter}
          </button>
        ))}
        {alphaFilter && <button onClick={() => setAlphaFilter(null)} style={{ padding: "2px 8px", borderRadius: 6, border: "none", background: "var(--bg-hover)", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✕ Clear</button>}
      </div>

      {allTags.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <button onClick={() => setActiveTag(null)} style={{ padding: "4px 12px", borderRadius: 99, border: "none", background: !activeTag ? "#185FA5" : "#f0f0f0", color: !activeTag ? "#fff" : "#555", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            All
          </button>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} style={{ padding: "4px 12px", borderRadius: 99, border: "none", background: activeTag === tag ? "#185FA5" : "#f0f0f0", color: activeTag === tag ? "#fff" : "#555", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-hint)" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-hint)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <p style={{ margin: 0 }}>{customers.length === 0 ? "No customers yet. Add your first one!" : "No customers match your search."}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background: bulkSelected.includes(c.id) ? "#f0f6ff" : "#fff", border: `1px solid ${bulkSelected.includes(c.id) ? "#b5d4f4" : "#f0f0f0"}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, opacity: c.unsubscribed ? 0.6 : 1 }}>
              <input type="checkbox" checked={bulkSelected.includes(c.id)} onChange={() => setBulkSelected(bulkSelected.includes(c.id) ? bulkSelected.filter(x => x !== c.id) : [...bulkSelected, c.id])} style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }} />
              <Avatar name={c.name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{c.name}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {c.email && <span>✉ {c.email}</span>}
                  {c.phone && <span>📱 {c.phone}</span>}
                </div>
                {c.notes && <div style={{ fontSize: 12, color: "var(--text-hint)", marginTop: 4 }}>{c.notes}</div>}
                {c.tags && c.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                    {c.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 11, background: "#EEEDFE", color: "#3C3489", padding: "1px 8px", borderRadius: 99, fontWeight: 500 }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {c.inactive && <span style={{ fontSize: 11, background: "#F1EFE8", color: "#5F5E5A", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>Inactive</span>}
                <Badge type={c.preferred_channel} label={c.preferred_channel === "both" ? "Email + SMS" : c.preferred_channel?.toUpperCase()} />
                {c.unsubscribed && <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: "#F1EFE8", color: "#5F5E5A" }}>Opted out</span>}
              </div>
              <button onClick={() => openEdit(c)} title="Edit" style={{ background: "none", border: "none", color: "var(--text-hint)", cursor: "pointer", fontSize: 15, padding: 4 }}>✏️</button>
              <button onClick={() => handleDelete(c.id, c.name)} title="Delete" style={{ background: "none", border: "none", color: "#ddd", cursor: "pointer", fontSize: 15, padding: 4 }}>🗑</button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editingCustomer ? "Edit Customer" : "Add Customer"} onClose={() => setShowModal(false)}>
          <input style={inputStyle} placeholder="Full name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input style={inputStyle} placeholder="Email address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input style={inputStyle} placeholder="Phone number (+1XXXXXXXXXX)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Tags</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {(form.tags || []).map(tag => (
              <span key={tag} style={{ background: "#EEEDFE", color: "#3C3489", fontSize: 12, padding: "3px 10px", borderRadius: 99, display: "flex", alignItems: "center", gap: 6 }}>
                {tag}
                <button onClick={() => setForm({ ...form, tags: form.tags.filter(t => t !== tag) })} style={{ background: "none", border: "none", cursor: "pointer", color: "#3C3489", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <TagSuggestions tags={form.tags || []} onAdd={t => setForm({ ...form, tags: [...(form.tags||[]), t] })} />
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input style={{ ...inputStyle, marginBottom: 0, flex: 1 }} placeholder="Add a custom tag or pick above" value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && tagInput.trim()) { const t = tagInput.trim(); if (!(form.tags||[]).includes(t)) setForm({ ...form, tags: [...(form.tags||[]), t] }); setTagInput(""); e.preventDefault(); } }} />
            <button onClick={() => { if (tagInput.trim()) { const t = tagInput.trim(); if (!(form.tags||[]).includes(t)) setForm({ ...form, tags: [...(form.tags||[]), t] }); setTagInput(""); }}} style={{ ...btnStyle(false), padding: "9px 16px" }}>Add</button>
          </div>
          <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Preferred reminder channel</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={form.preferred_channel} onChange={e => setForm({ ...form, preferred_channel: e.target.value })}>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="both">Email + SMS</option>
          </select>
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 16, marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 12 }}>
              <input type="checkbox" checked={form.sms_consent} onChange={e => setForm({ ...form, sms_consent: e.target.checked, sms_consent_at: e.target.checked ? new Date().toISOString() : null })} style={{ width: 16, height: 16, cursor: "pointer", marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>SMS consent given</div>
                <div style={{ fontSize: 12, color: "var(--text-hint)", marginTop: 2 }}>Customer has agreed to receive SMS reminders. Required by TCPA before sending text messages.{form.sms_consent_at && <span style={{ display: "block", marginTop: 2, color: "#3B6D11" }}>Consent recorded {new Date(form.sms_consent_at).toLocaleDateString()}</span>}</div>
              </div>
            </label>
            {editingCustomer && (
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={form.unsubscribed} onChange={e => setForm({ ...form, unsubscribed: e.target.checked })} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#e24b4a" }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: form.unsubscribed ? "#A32D2D" : "#1a1a1a" }}>
                    {form.unsubscribed ? "Customer is opted out" : "Opt out of reminders"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-hint)", marginTop: 2 }}>
                    {form.unsubscribed ? "This customer will not receive any reminders. Uncheck to resubscribe." : "Check this to stop sending reminders to this customer."}
                  </div>
                </div>
              </label>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => setShowModal(false)} style={btnStyle(false)}>Cancel</button>
            <button onClick={handleSave} style={btnStyle(true)}>{editingCustomer ? "Save Changes" : "Add Customer"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Send Page ──

function SendPage({ user, business, showToast }) {
  const [customers, setCustomers] = useState([]);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState([]);
  const [templateId, setTemplateId] = useState(null);
  const [msg, setMsg] = useState({ subject: "", body: "" });
  const [vars, setVars] = useState({ date: "", time: "", amount: "" });
  const [sending, setSending] = useState(false);
  const [usePreferred, setUsePreferred] = useState(true);
  const [overrideChannel, setOverrideChannel] = useState("email");
  const [tagFilter, setTagFilter] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    supabase.from("customers").select("*").eq("business_id", user.id).eq("unsubscribed", false).order("name")
      .then(({ data }) => setCustomers(data || []));
  }, []);

  const applyTemplate = (t) => {
    setTemplateId(t.id);
    setMsg({ subject: t.subject || "", body: t.body });
  };

  const resolveBody = (body, name = "(customer name)") =>
    (body || "").replace(/{name}/g, name).replace(/{date}/g, vars.date || "{date}").replace(/{time}/g, vars.time || "{time}").replace(/{amount}/g, vars.amount || "{amount}");

  const handleSendTest = async () => {
    if (!msg.body.trim()) return;
    setSendingTest(true);
    try {
      const testCustomer = { id: "test", name: user.email, email: user.email, phone: business?.phone || "", preferred_channel: "email", channel: "email" };
      const res = await fetch(`${API}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customers: [testCustomer], subject: msg.subject, body: msg.body, vars, businessName: business?.name || "Remind Zen" }) });
      const data = await res.json();
      if (data.sent > 0) showToast(`Test sent to ${user.email}`, "success");
      else showToast("Test failed: " + (data.results?.[0]?.error || "Unknown error"), "error");
    } catch { showToast("Could not connect to server", "error"); }
    finally { setSendingTest(false); }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const selectedCustomers = customers.filter(c => selected.includes(c.id));

      // Rate limit check — count today's sends
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const { count } = await supabase.from("send_history").select("*", { count: "exact", head: true })
        .eq("business_id", user.id).gte("sent_at", todayStart.toISOString());
      if ((count || 0) + selectedCustomers.length > 100) {
        showToast(`Daily limit reached. You've sent ${count}/100 messages today.`, "error");
        setSending(false); return;
      }
      const payload = {
        customers: selectedCustomers.map(c => ({
          ...c,
          channel: usePreferred ? c.preferred_channel : overrideChannel,
        })),
        subject: msg.subject,
        body: msg.body,
        vars,
        businessName: business?.name || "Remind Zen",
        businessId: user.id,
        businessId: user.id,
      };
      const res = await fetch(`${API}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success || data.sent > 0) {
        const historyRows = selectedCustomers.map(c => ({
          business_id: user.id,
          customer_id: c.id,
          customer_name: c.name,
          channel: usePreferred ? c.preferred_channel : overrideChannel,
          subject: msg.subject,
          body: resolveBody(msg.body, c.name),
          status: data.results?.find(r => r.id === c.id)?.success ? "sent" : "failed",
          error: data.results?.find(r => r.id === c.id)?.error || null,
        }));
        await supabase.from("send_history").insert(historyRows);
        showToast(`Sent to ${data.sent} customer${data.sent !== 1 ? "s" : ""}!`, "success");
        setStep(1); setSelected([]); setMsg({ subject: "", body: "" }); setTemplateId(null);
      } else {
        const errMsg = data.error || data.results?.find(r => !r.success)?.error || "Unknown error";
        if (errMsg.includes("trial has expired")) {
          showToast("Your free trial has expired. Please subscribe in the Billing tab.", "error");
        } else if (errMsg.includes("suspended")) {
          showToast("Your account has been suspended. Contact support at hello@remindzen.com", "error");
        } else if (errMsg.includes("Daily send limit")) {
          showToast("Daily send limit reached — resets at midnight. Upgrade your plan for higher limits.", "error");
        } else if (errMsg.includes("Monthly message limit")) {
          showToast("Monthly message limit reached. Upgrade your plan for more messages.", "error");
        } else {
          showToast("Send failed: " + errMsg, "error");
        }
      }
    } catch {
      showToast("Could not connect to server", "error");
    } finally {
      setSending(false);
    }
  };

  const steps = ["Select Customers", "Compose Message", "Review & Send"];
  const canProceed1 = selected.length > 0;
  const canProceed2 = msg.body.trim().length > 0;

  return (
    <div>
      <div style={{ display: "flex", marginBottom: 24, position: "relative", gap: 4 }}>
        {steps.map((s, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: done ? "pointer" : "default" }} onClick={() => done && setStep(n)}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: (done || active) ? "#185FA5" : "#f0f0f0", color: (done || active) ? "#fff" : "#aaa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>
                {done ? "✓" : n}
              </div>
              <div style={{ fontSize: 12, marginTop: 6, fontWeight: active ? 600 : 400, color: active ? "#185FA5" : "#aaa" }}>{s}</div>
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>{selected.length} selected — opted-out customers are hidden</p>
            <button onClick={() => { const visible = tagFilter ? customers.filter(c => (c.tags||[]).includes(tagFilter)) : customers; setSelected(selected.length === visible.length ? [] : visible.map(c => c.id)); }} style={{ ...btnStyle(false), fontSize: 13, padding: "6px 14px" }}>
              {selected.length === (tagFilter ? customers.filter(c => (c.tags||[]).includes(tagFilter)).length : customers.length) ? "Deselect All" : "Select All"}
            </button>
          </div>
          {[...new Set(customers.flatMap(c => c.tags || []))].length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <button onClick={() => setTagFilter(null)} style={{ padding: "4px 12px", borderRadius: 99, border: "none", background: !tagFilter ? "#185FA5" : "#f0f0f0", color: !tagFilter ? "#fff" : "#555", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>All</button>
              {[...new Set(customers.flatMap(c => c.tags || []))].sort().map(tag => (
                <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)} style={{ padding: "4px 12px", borderRadius: 99, border: "none", background: tagFilter === tag ? "#185FA5" : "#f0f0f0", color: tagFilter === tag ? "#fff" : "#555", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>{tag}</button>
              ))}
            </div>
          )}
          {customers.length === 0 ? (
            <p style={{ color: "var(--text-hint)", textAlign: "center", padding: "40px 0" }}>No customers yet. Add some from the Customers tab.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {(tagFilter ? customers.filter(c => (c.tags||[]).includes(tagFilter)) : customers).map(c => (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${selected.includes(c.id) ? "#185FA5" : "#f0f0f0"}`, background: selected.includes(c.id) ? "#f0f6ff" : "#fff", cursor: "pointer" }}>
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => {
                    const newSel = selected.includes(c.id) ? selected.filter(x => x !== c.id) : [...selected, c.id];
                    setSelected(newSel);
                    if (!selected.includes(c.id) && c.next_appointment) {
                      const appt = new Date(c.next_appointment);
                      setVars(v => ({
                        ...v,
                        date: v.date || appt.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }),
                        time: v.time || appt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      }));
                    }
                  }} style={{ width: 16, height: 16, cursor: "pointer" }} />
                  <Avatar name={c.name} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.email} {c.phone && `· ${c.phone}`}</div>
                    {c.notes && <div style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 2, fontStyle: "italic" }}>{c.notes}</div>}
                    {c.next_appointment && <div style={{ fontSize: 11, color: "#185FA5", marginTop: 2 }}>📅 {new Date(c.next_appointment).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</div>}
                  </div>
                  <Badge type={c.preferred_channel} label={c.preferred_channel === "both" ? "Email + SMS" : c.preferred_channel?.toUpperCase()} />
                </label>
              ))}
            </div>
          )}
          <button disabled={!canProceed1} onClick={() => setStep(2)} style={{ ...btnStyle(true), opacity: canProceed1 ? 1 : 0.4 }}>Continue →</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ background: "var(--bg-hover)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={usePreferred} onChange={e => setUsePreferred(e.target.checked)} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>Use each customer's preferred channel</span>
            </label>
            {!usePreferred && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {["email", "sms", "both"].map(ch => (
                  <button key={ch} onClick={() => setOverrideChannel(ch)} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: overrideChannel === ch ? "#185FA5" : "#eee", color: overrideChannel === ch ? "#fff" : "#555", fontWeight: 500, fontSize: 13, cursor: "pointer" }}>
                    {ch === "both" ? "Email + SMS" : ch.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>Quick templates</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => applyTemplate(t)} style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${templateId === t.id ? "#185FA5" : "#e8e8e8"}`, background: templateId === t.id ? "#f0f6ff" : "#fff", color: templateId === t.id ? "#185FA5" : "#555", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                {t.name}
              </button>
            ))}
          </div>

          <input style={inputStyle} placeholder="Email subject (for email sends)" value={msg.subject} onChange={e => setMsg({ ...msg, subject: e.target.value })} />
          <div style={{ position: "relative", marginBottom: 12 }}>
            <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical", marginBottom: 0 }} placeholder="Message body... Use {name}, {date}, {time}, {amount} as variables" value={msg.body} onChange={e => setMsg({ ...msg, body: e.target.value })} />
            {msg.body.length > 0 && (
              <SmsCounter body={msg.body} />
            )}
          </div>

          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>Fill in variables (optional)</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
            <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="{date}" value={vars.date} onChange={e => setVars({ ...vars, date: e.target.value })} />
            <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="{time}" value={vars.time} onChange={e => setVars({ ...vars, time: e.target.value })} />
            <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="{amount}" value={vars.amount} onChange={e => setVars({ ...vars, amount: e.target.value })} />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => setStep(1)} style={btnStyle(false)}>← Back</button>
            <button disabled={!canProceed2} onClick={() => setStep(3)} style={{ ...btnStyle(true), opacity: canProceed2 ? 1 : 0.4 }}>Preview →</button>
            <button disabled={sendingTest || !canProceed2} onClick={handleSendTest} style={{ ...btnStyle(false), opacity: !canProceed2 ? 0.4 : 1, fontSize: 13 }}>
              {sendingTest ? "Sending..." : "📧 Send test to myself"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{ background: "var(--bg-hover)", borderRadius: 12, padding: "20px 24px", marginBottom: 20, border: "1px solid var(--border)" }}>
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-muted)" }}>
              Sending to {selected.length} customer{selected.length > 1 ? "s" : ""} · {usePreferred ? "using each customer's preferred channel" : overrideChannel === "both" ? "Email + SMS" : overrideChannel.toUpperCase()}
            </p>
            {msg.subject && <p style={{ margin: "0 0 8px", fontSize: 14 }}><strong>Subject:</strong> {msg.subject}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {customers.filter(c => selected.includes(c.id)).slice(0, 3).map(c => (
                <div key={c.id} style={{ background: "#fff", borderRadius: 8, padding: "12px 16px", border: "1px solid #eee", fontSize: 13, lineHeight: 1.7, color: "#333" }}>
                  <div style={{ fontSize: 11, color: "var(--text-hint)", marginBottom: 4, fontWeight: 500 }}>Preview for {c.name}</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{resolveBody(msg.body, c.name)}</div>
                </div>
              ))}
              {selected.length > 3 && <div style={{ fontSize: 12, color: "var(--text-hint)", textAlign: "center" }}>+ {selected.length - 3} more recipients</div>}
            </div>
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#f0f0f0", borderRadius: 8, fontSize: 12, color: "var(--text-muted)" }}>
              — Sent by Remind Zen on behalf of {business?.name || "your business"}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
            {customers.filter(c => selected.includes(c.id)).map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-selected)", borderRadius: 20, padding: "4px 12px" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#B5D4F4", fontSize: 10, fontWeight: 600, color: "#185FA5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {c.name[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 13, color: "#185FA5", fontWeight: 500 }}>{c.name}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(2)} style={btnStyle(false)}>← Back</button>
            <button onClick={() => setShowConfirm(true)} disabled={sending} style={{ ...btnStyle(true), minWidth: 160 }}>
              {sending ? "Sending..." : `Send to ${selected.length} Customer${selected.length > 1 ? "s" : ""}`}
            </button>
            {showConfirm && (
              <Modal title="Confirm send" onClose={() => setShowConfirm(false)}>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.7 }}>
                  You're about to send <strong>{selected.length} message{selected.length > 1 ? "s" : ""}</strong> to {selected.length} customer{selected.length > 1 ? "s" : ""}.
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.7 }}>
                  {usePreferred ? "Each customer will receive via their preferred channel." : `All messages will be sent via ${overrideChannel === "both" ? "Email + SMS" : overrideChannel.toUpperCase()}.`}
                  {" "}This will count toward your monthly message limit.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowConfirm(false)} style={btnStyle(false)}>Cancel</button>
                  <button onClick={() => { setShowConfirm(false); handleSend(); }} style={btnStyle(true)}>
                    Yes, send {selected.length} message{selected.length > 1 ? "s" : ""}
                  </button>
                </div>
              </Modal>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Templates Page ──

function TemplatesPage({ showToast }) {
  const [editing, setEditing] = useState(null);
  const [custom, setCustom] = useState(() => JSON.parse(localStorage.getItem("customTemplates") || "[]"));
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", channel: "email", subject: "", body: "" });

  const saveCustom = () => {
    if (!form.name || !form.body) return;
    const updated = [...custom, { id: Date.now(), ...form }];
    setCustom(updated);
    localStorage.setItem("customTemplates", JSON.stringify(updated));
    showToast("Template saved", "success");
    setShowModal(false);
    setForm({ name: "", channel: "email", subject: "", body: "" });
  };

  const deleteCustom = (id) => {
    const updated = custom.filter(t => t.id !== id);
    setCustom(updated);
    localStorage.setItem("customTemplates", JSON.stringify(updated));
    showToast("Template deleted", "success");
  };

  const all = [...TEMPLATES, ...custom];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button onClick={() => setShowModal(true)} style={btnStyle(true)}>+ New Template</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {all.map(t => (
          <div key={t.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</span>
                <span style={{ marginLeft: 10 }}><Badge type={t.channel} label={t.channel === "both" ? "Email + SMS" : t.channel.toUpperCase()} /></span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEditing(editing === t.id ? null : t.id)} style={{ ...btnStyle(false), fontSize: 12, padding: "5px 12px" }}>
                  {editing === t.id ? "Collapse" : "Preview"}
                </button>
                {t.id > 4 && <button onClick={() => deleteCustom(t.id)} style={{ ...btnStyle(false), fontSize: 12, padding: "5px 12px", color: "#e24b4a", borderColor: "#f7c1c1" }}>Delete</button>}
              </div>
            </div>
            {t.subject && <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-muted)" }}>Subject: {t.subject}</p>}
            {editing === t.id && (
              <div style={{ background: "var(--bg-hover)", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)", marginTop: 8, whiteSpace: "pre-wrap" }}>
                {t.body}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title="New Template" onClose={() => setShowModal(false)}>
          <input style={inputStyle} placeholder="Template name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <select style={{ ...inputStyle, cursor: "pointer" }} value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="both">Email + SMS</option>
          </select>
          {(form.channel === "email" || form.channel === "both") && (
            <input style={inputStyle} placeholder="Email subject *" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          )}
          <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} placeholder="Message body... Use {name}, {date}, {time}, {amount}" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={() => setShowModal(false)} style={btnStyle(false)}>Cancel</button>
            <button onClick={saveCustom} style={btnStyle(true)}>Save Template</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── History Page ──

function HistoryPage({ user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    supabase.from("send_history").select("*").eq("business_id", user.id).order("sent_at", { ascending: false }).limit(500)
      .then(({ data }) => { setHistory(data || []); setLoading(false); });
  }, []);

  const filtered = history.filter(h => {
    const matchesSearch = !search || h.customer_name?.toLowerCase().includes(search.toLowerCase()) || h.subject?.toLowerCase().includes(search.toLowerCase());
    const now = new Date();
    const sent = new Date(h.sent_at);
    const matchesDate = dateFilter === "all" ||
      (dateFilter === "today" && sent.toDateString() === now.toDateString()) ||
      (dateFilter === "week" && (now - sent) < 7 * 86400000) ||
      (dateFilter === "month" && sent.getMonth() === now.getMonth() && sent.getFullYear() === now.getFullYear());
    return matchesSearch && matchesDate;
  });

  const stats = {
    total: history.length,
    sent: history.filter(h => h.status === "sent").length,
    failed: history.filter(h => h.status === "failed").length,
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 12, marginBottom: 28 }}>
        {[["Total sent", stats.total, "#E6F1FB", "#185FA5"], ["Delivered", stats.sent, "#EAF3DE", "#3B6D11"], ["Failed", stats.failed, "#FCEBEB", "#A32D2D"]].map(([label, val, bg, col]) => (
          <div key={label} style={{ background: bg, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 12, color: col, fontWeight: 500, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: col }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input placeholder="Search history..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 140, marginBottom: 0 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["all","All time"],["today","Today"],["week","This week"],["month","This month"]].map(([val, label]) => (
            <button key={val} onClick={() => setDateFilter(val)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: dateFilter === val ? "#185FA5" : "#f0f0f0", color: dateFilter === val ? "#fff" : "#555", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-hint)" }}>Loading history...</div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-hint)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p style={{ margin: 0 }}>No messages sent yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 ? <p style={{ color: "var(--text-hint)", textAlign: "center", padding: "20px 0" }}>No results match your search.</p> : filtered.map(h => (
            <div key={h.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: "var(--text-primary)" }}>{h.customer_name}</div>
                <div style={{ fontSize: 12, color: "var(--text-hint)", marginTop: 2 }}>{h.subject || h.body?.slice(0, 60) + "..."}</div>
              </div>
              <Badge type={h.channel} label={h.channel === "both" ? "Email + SMS" : h.channel?.toUpperCase()} />
              <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: h.status === "sent" ? "#EAF3DE" : "#FCEBEB", color: h.status === "sent" ? "#3B6D11" : "#A32D2D" }} title={h.error || ""}>
                {h.status === "failed" && h.error ? "failed — hover for details" : h.status}
              </span>
              <div style={{ fontSize: 12, color: "var(--text-placeholder)", whiteSpace: "nowrap", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span>{new Date(h.sent_at).toLocaleDateString()}</span>
                <span style={{ fontSize: 11 }}>{new Date(h.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Delete Account Section ──

function DeleteAccountSection({ user }) {
  const [step, setStep] = useState("idle");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleRequestDelete = () => setStep("confirm");

  const handleConfirmDelete = async () => {
    if (confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
      setError("Email doesn't match. Please try again."); return;
    }
    setDeleting(true);
    try {
      await supabase.from("send_history").delete().eq("business_id", user.id);
      await supabase.from("schedules").delete().eq("business_id", user.id);
      await supabase.from("customers").delete().eq("business_id", user.id);
      await supabase.from("feedback").delete().eq("business_id", user.id);
      await supabase.from("businesses").delete().eq("id", user.id);
      await supabase.auth.signOut();
      window.location.reload();
    } catch (e) {
      setError("Deletion failed: " + e.message);
      setDeleting(false);
    }
  };

  if (step === "idle") return (
    <button onClick={handleRequestDelete} style={{ ...btnStyle(false), color: "#A32D2D", borderColor: "#f7c1c1" }}>Delete my account</button>
  );

  return (
    <div style={{ background: "#FCEBEB", borderRadius: 10, padding: "16px 20px" }}>
      <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 500, color: "#A32D2D" }}>Are you sure? This will permanently delete all your customers, schedules, and history.</p>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#A32D2D" }}>Type your email address to confirm: <strong>{user.email}</strong></p>
      <input style={{ ...inputStyle, marginBottom: 12, background: "#fff" }} placeholder="Enter your email" value={confirmEmail} onChange={e => { setConfirmEmail(e.target.value); setError(""); }} />
      {error && <div style={{ color: "#A32D2D", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => { setStep("idle"); setConfirmEmail(""); setError(""); }} style={btnStyle(false)}>Cancel</button>
        <button onClick={handleConfirmDelete} disabled={deleting} style={{ ...btnStyle(false), color: "#A32D2D", borderColor: "#f7c1c1" }}>{deleting ? "Deleting..." : "Permanently delete account"}</button>
      </div>
    </div>
  );
}

// ── Settings Page ──

function SettingsPage({ user, business, setBusiness, showToast, darkMode, setDarkMode }) {
  const [form, setForm] = useState({ name: business?.name || "", email: business?.email || "", timezone: business?.timezone || "America/Los_Angeles", notify_schedule_email: business?.notify_schedule_email || false });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ newPass: "", confirm: "" });
  const [pwError, setPwError] = useState("");

  const saveBusiness = async () => {
    setSaving(true);
    const { error } = await supabase.from("businesses").upsert({ id: user.id, name: form.name, email: form.email, timezone: form.timezone, notify_schedule_email: form.notify_schedule_email });
    setSaving(false);
    if (!error) { setBusiness({ ...business, ...form }); showToast("Settings saved", "success"); }
    else showToast("Save failed", "error");
  };

  const changePassword = async () => {
    setPwError("");
    if (passwords.newPass !== passwords.confirm) { setPwError("Passwords don't match"); return; }
    if (passwords.newPass.length < 6) { setPwError("Password must be at least 6 characters"); return; }
    const { error } = await supabase.auth.updateUser({ password: passwords.newPass });
    if (!error) { showToast("Password updated", "success"); setChangingPassword(false); setPasswords({ newPass: "", confirm: "" }); }
    else setPwError(error.message);
  };

  const [tagLibrary, setTagLibrary] = useState(() => JSON.parse(localStorage.getItem("tagLibrary") || '["VIP","Monthly Service","New Customer","Lawn Care","Hair Care","Follow Up"]'));
  const [newTag, setNewTag] = useState("");

  const addLibraryTag = () => {
    const t = newTag.trim();
    if (!t || tagLibrary.includes(t)) return;
    const updated = [...tagLibrary, t];
    setTagLibrary(updated);
    localStorage.setItem("tagLibrary", JSON.stringify(updated));
    setNewTag("");
    showToast("Tag added to library", "success");
  };

  const removeLibraryTag = (tag) => {
    const updated = tagLibrary.filter(t => t !== tag);
    setTagLibrary(updated);
    localStorage.setItem("tagLibrary", JSON.stringify(updated));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{ maxWidth: 560, width: "100%" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px", marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600 }}>Business information</h3>
        <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Business name</label>
        <input style={inputStyle} placeholder="Your business name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Contact email</label>
        <input style={inputStyle} placeholder="Contact email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Timezone</label>
        <select style={{ ...inputStyle, cursor: "pointer" }} value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>
          <option value="America/Los_Angeles">US/Pacific — Los Angeles</option>
          <option value="America/Denver">US/Mountain — Denver</option>
          <option value="America/Chicago">US/Central — Chicago</option>
          <option value="America/New_York">US/Eastern — New York</option>
          <option value="America/Anchorage">US/Alaska — Anchorage</option>
          <option value="Pacific/Honolulu">US/Hawaii — Honolulu</option>
          <option value="Europe/London">Europe — London</option>
          <option value="Europe/Paris">Europe — Paris / Berlin</option>
          <option value="Australia/Sydney">Australia — Sydney</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 16 }}>
          <input type="checkbox" checked={form.notify_schedule_email} onChange={e => setForm({ ...form, notify_schedule_email: e.target.checked })} style={{ width: 16, height: 16 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Email me when a schedule fires</div>
            <div style={{ fontSize: 12, color: "var(--text-hint)", marginTop: 2 }}>Get a summary email each time an automated reminder schedule runs</div>
          </div>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 16 }} onClick={() => setDarkMode(!darkMode)}>
          <div style={{ width: 44, height: 24, borderRadius: 99, background: darkMode ? "#185FA5" : "#ddd", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: darkMode ? 23 : 3, transition: "left 0.2s" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{darkMode ? "🌙 Dark mode" : "☀️ Light mode"}</div>
            <div style={{ fontSize: 12, color: "var(--text-hint)", marginTop: 2 }}>Switch between light and dark appearance</div>
          </div>
        </label>

        <button onClick={saveBusiness} disabled={saving} style={btnStyle(true)}>{saving ? "Saving..." : "Save changes"}</button>

        <div style={{ height: 1, background: "#f0f0f0", margin: "28px 0" }} />

        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Referral program</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.6 }}>Share your referral link. When someone signs up using it, they get a 30-day free trial and you get 30 free days added to your subscription.</p>
        <ReferralSection userId={user.id} />
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px", marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>Account</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-hint)" }}>Signed in as {user.email}</p>
        {!changingPassword ? (
          <button onClick={() => setChangingPassword(true)} style={btnStyle(false)}>Change password</button>
        ) : (
          <div>
            <input style={inputStyle} placeholder="New password" type="password" value={passwords.newPass} onChange={e => setPasswords({ ...passwords, newPass: e.target.value })} />
            <input style={inputStyle} placeholder="Confirm new password" type="password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} />
            {pwError && <div style={{ color: "#A32D2D", fontSize: 13, marginBottom: 12 }}>{pwError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setChangingPassword(false)} style={btnStyle(false)}>Cancel</button>
              <button onClick={changePassword} style={btnStyle(true)}>Update password</button>
            </div>
          </div>
        )}
      </div>

      <TagLibrarySection user={user} showToast={showToast} />

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px", marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: "#A32D2D" }}>Sign out</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-hint)" }}>You'll need to sign back in to access your account.</p>
        <button onClick={handleSignOut} style={{ ...btnStyle(false), color: "#A32D2D", borderColor: "#f7c1c1" }}>Sign out</button>
      </div>
    </div>
  );
}




// ── Tag Library Section (used inside Settings) ──

function TagLibrarySection({ user, showToast }) {
  const [tags, setTags] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    supabase.from("tag_library").select("tag").eq("business_id", user.id).order("tag")
      .then(({ data }) => setTags((data || []).map(r => r.tag)));
  }, []);

  const addTag = async () => {
    const tag = input.trim();
    if (!tag || tags.includes(tag)) return;
    await supabase.from("tag_library").insert({ business_id: user.id, tag });
    setTags([...tags, tag].sort());
    setInput("");
    showToast(`Tag "${tag}" added to library`, "success");
  };

  const removeTag = async (tag) => {
    await supabase.from("tag_library").delete().eq("business_id", user.id).eq("tag", tag);
    setTags(tags.filter(t => t !== tag));
    showToast(`Tag "${tag}" removed`, "success");
  };

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px", marginBottom: 20 }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>Tag library</h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-hint)" }}>Define preset tags your team can pick from. Custom tags can still be added on the fly when editing customers.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {tags.length === 0 && <span style={{ fontSize: 13, color: "#ccc" }}>No preset tags yet</span>}
        {tags.map(tag => (
          <span key={tag} style={{ background: "#EEEDFE", color: "#3C3489", fontSize: 13, padding: "4px 12px", borderRadius: 99, display: "flex", alignItems: "center", gap: 6 }}>
            {tag}
            <button onClick={() => removeTag(tag)} style={{ background: "none", border: "none", cursor: "pointer", color: "#3C3489", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...inputStyle, marginBottom: 0, flex: 1 }} placeholder="New tag (e.g. Monthly Service, VIP)" value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()} />
        <button onClick={addTag} style={btnStyle(true)}>Add</button>
      </div>
    </div>
  );
}

// ── Account Deletion Section (used inside Settings) ──

function AccountDeletionSection({ user, showToast }) {
  const [step, setStep] = useState("idle");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
      showToast("Email doesn't match", "error"); return;
    }
    setDeleting(true);
    try {
      // Cancel Stripe subscription first
      await fetch(`${API}/account/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: user.id }),
      });

      // Then wipe all data from Supabase
      await supabase.from("send_history").delete().eq("business_id", user.id);
      await supabase.from("schedules").delete().eq("business_id", user.id);
      await supabase.from("customers").delete().eq("business_id", user.id);
      await supabase.from("tag_library").delete().eq("business_id", user.id);
      await supabase.from("feedback").delete().eq("business_id", user.id);
      await supabase.from("invite_codes").delete().eq("business_id", user.id).throwOnError();
      await supabase.from("businesses").delete().eq("id", user.id);
      await supabase.auth.signOut();
      window.location.reload();
    } catch (e) {
      showToast("Deletion failed: " + e.message, "error");
      setDeleting(false);
    }
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #f7c1c1", borderRadius: 12, padding: "24px 28px", marginBottom: 20 }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: "#A32D2D" }}>Delete account</h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-hint)" }}>Permanently delete your account and all associated data including customers, schedules, and send history. Your subscription will be cancelled automatically. This cannot be undone.</p>
      {step === "idle" && (
        <button onClick={() => setStep("confirm")} style={{ ...btnStyle(false), color: "#A32D2D", borderColor: "#f7c1c1" }}>Delete my account</button>
      )}
      {step === "confirm" && (
        <div>
          <p style={{ fontSize: 13, color: "#A32D2D", marginBottom: 10, fontWeight: 500 }}>Type your email address to confirm deletion:</p>
          <input style={{ ...inputStyle, borderColor: "#f7c1c1" }} placeholder={user.email} value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setStep("idle"); setConfirmEmail(""); }} style={btnStyle(false)}>Cancel</button>
            <button onClick={handleDelete} disabled={deleting} style={{ ...btnStyle(true), background: "#A32D2D" }}>
              {deleting ? "Deleting..." : "Permanently delete account"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Feedback Page ──

function FeedbackForm({ user, business, showToast }) {
  const [form, setForm] = useState({ type: "bug", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.message.trim()) return;
    setSubmitting(true);
    try {
      const { data: biz } = await supabase.from("businesses").select("plan").eq("id", user.id).single();
      const isPro = biz?.plan === "pro";
      const feedbackType = isPro ? `pro_priority_${form.type}` : form.type;
      const feedbackSubject = isPro ? `[PRO] ${form.subject}` : form.subject;

      await supabase.from("feedback").insert({
        business_id: user.id,
        business_name: business?.name || "",
        email: user.email,
        type: feedbackType,
        subject: feedbackSubject,
        message: form.message,
      });

      // Also notify via email
      fetch(`${API}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: feedbackType,
          subject: feedbackSubject,
          message: form.message,
          businessName: business?.name || "Unknown",
          email: user.email,
        }),
      }).catch(() => {}); // fire and forget — don't block on email

      setSubmitted(true);
      showToast("Feedback submitted — thank you!", "success");
    } catch (e) {
      showToast("Failed to submit feedback", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🙏</div>
      <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600 }}>Thank you!</h3>
      <p style={{ color: "var(--text-hint)", fontSize: 14, margin: "0 0 16px" }}>We review every submission and use it to improve Remind Zen.</p>
      <button onClick={() => { setSubmitted(false); setForm({ type: "bug", subject: "", message: "" }); }} style={btnStyle(false)}>Submit another</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["bug", "🐛 Bug report"], ["feature", "✨ Feature request"], ["other", "💬 Other"]].map(([val, label]) => (
          <button key={val} onClick={() => setForm({ ...form, type: val })} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: form.type === val ? "#185FA5" : "var(--bg-hover)", color: form.type === val ? "#fff" : "var(--text-secondary)", fontWeight: 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            {label}
          </button>
        ))}
      </div>
      <input style={inputStyle} placeholder="Subject *" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
      <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} placeholder={form.type === "bug" ? "Describe the bug — what happened, and what did you expect to happen?" : form.type === "feature" ? "Describe the feature you'd like to see and why it would be helpful." : "What's on your mind?"} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
      <div style={{ fontSize: 12, color: "var(--text-hint)", marginBottom: 14 }}>Submitting as {user.email} · {business?.name}</div>
      <button onClick={handleSubmit} disabled={submitting || !form.subject.trim() || !form.message.trim()} style={{ ...btnStyle(true), opacity: (!form.subject.trim() || !form.message.trim()) ? 0.4 : 1 }}>
        {submitting ? "Submitting..." : "Submit feedback"}
      </button>
    </div>
  );
}

function FeedbackPage({ user, business, showToast }) {
  return (
    <div style={{ maxWidth: 560, width: "100%" }}>
      <FeedbackForm user={user} business={business} showToast={showToast} />
    </div>
  );
}

// ── Admin Page ──

function AdminPage() {
  const [businesses, setBusinesses] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [inviteCodes, setInviteCodes] = useState([]);
  const [tab, setTab] = useState("businesses");
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState({ code: "", trial_days: 30, locked_plan: "", max_uses: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [bizSearch, setBizSearch] = useState("");

  const adminHeaders = { "Content-Type": "application/json", "x-admin-uid": "2bd0487e-a317-4cbd-9871-70d87aacaf47" };

  const loadInviteCodes = async () => {
    const { data } = await supabase.from("invite_codes").select("*").order("created_at", { ascending: false });
    setInviteCodes(data || []);
  };

  useEffect(() => {
    Promise.all([
      fetch(`${API}/admin/businesses`, { headers: adminHeaders }).then(r => r.json()),
      fetch(`${API}/admin/feedback`, { headers: adminHeaders }).then(r => r.json()),
    ]).then(([b, f]) => {
      setBusinesses(b.businesses || []);
      const sorted = (f.feedback || []).sort((a, b) => { const aP = a.type?.startsWith("pro_priority") ? 0 : 1; const bP = b.type?.startsWith("pro_priority") ? 0 : 1; return aP - bP || new Date(b.created_at) - new Date(a.created_at); }); setFeedback(sorted);
      setLoading(false);
    });
    loadInviteCodes();
  }, []);

  const handleCreateCode = async () => {
    if (!newCode.code.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("invite_codes").insert({
      code: newCode.code.trim().toUpperCase(),
      trial_days: parseInt(newCode.trial_days) || 30,
      locked_plan: newCode.locked_plan || null,
      max_uses: newCode.max_uses ? parseInt(newCode.max_uses) : null,
      note: newCode.note || null,
      active: true,
    });
    if (!error) {
      setNewCode({ code: "", trial_days: 30, locked_plan: "", max_uses: "", note: "" });
      loadInviteCodes();
    }
    setSaving(false);
  };

  const toggleCodeActive = async (code) => {
    await supabase.from("invite_codes").update({ active: !code.active }).eq("id", code.id);
    loadInviteCodes();
  };

  const deleteCode = async (id) => {
    if (!window.confirm("Delete this invite code?")) return;
    await supabase.from("invite_codes").delete().eq("id", id);
    loadInviteCodes();
  };

  const toggleSuspend = async (b) => {
    await fetch(`${API}/admin/businesses/${b.id}/suspend`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ suspended: !b.suspended }) });
    setBusinesses(businesses.map(x => x.id === b.id ? { ...x, suspended: !x.suspended } : x));
  };

  const updateFeedbackStatus = async (f, status) => {
    await supabase.from("feedback").update({ status, read: status !== "new" }).eq("id", f.id);
    setFeedback(feedback.map(x => x.id === f.id ? { ...x, status, read: status !== "new" } : x));
  };

  const [feedbackFilter, setFeedbackFilter] = useState("active");
  const unreadCount = feedback.filter(f => !f.read && f.status !== "archived").length;
  const filteredFeedback = feedback.filter(f => {
    if (feedbackFilter === "active") return f.status !== "archived" && f.status !== "resolved";
    if (feedbackFilter === "resolved") return f.status === "resolved";
    if (feedbackFilter === "archived") return f.status === "archived";
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[["businesses", `Businesses (${businesses.length})`], ["feedback", `Feedback${unreadCount > 0 ? ` (${unreadCount} new)` : ""}`], ["invites", `Invite Codes (${inviteCodes.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: tab === key ? "#185FA5" : "#f0f0f0", color: tab === key ? "#fff" : "#555", fontWeight: 500, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-hint)" }}>Loading...</div> : null}

      {!loading && tab === "businesses" && (
        <div>
          <input placeholder="Search businesses..." style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--border-mid)", borderRadius: 10, fontSize: 14, marginBottom: 16, fontFamily: "inherit", outline: "none", background: "var(--bg-input)", color: "var(--text-primary)" }}
            value={bizSearch} onChange={e => setBizSearch(e.target.value)} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {businesses.filter(b => !bizSearch || b.name?.toLowerCase().includes(bizSearch.toLowerCase()) || b.email?.toLowerCase().includes(bizSearch.toLowerCase())).map(b => (
            <div key={b.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, opacity: b.suspended ? 0.6 : 1 }}>
              <Avatar name={b.name || b.email} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{b.name || "(no name)"}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{b.email}</div>
                <div style={{ fontSize: 12, color: "var(--text-hint)", marginTop: 2 }}>Joined {new Date(b.created_at).toLocaleDateString()}</div>
              </div>
              {b.suspended && <span style={{ fontSize: 11, background: "#FCEBEB", color: "#A32D2D", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>Suspended</span>}
              <button onClick={() => toggleSuspend(b)} style={{ ...btnStyle(false), fontSize: 12, padding: "5px 14px", color: b.suspended ? "#3B6D11" : "#A32D2D", borderColor: b.suspended ? "#C0DD97" : "#f7c1c1" }}>
                {b.suspended ? "Reinstate" : "Suspend"}
              </button>
            </div>
          ))}
          </div>
        </div>
      )}

      {!loading && tab === "invites" && (
        <div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Create new invite code</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Code *</label>
                <input style={{ ...inputStyle, marginBottom: 0, textTransform: "uppercase" }} placeholder="e.g. EARLY2024" value={newCode.code} onChange={e => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Trial days</label>
                <input style={{ ...inputStyle, marginBottom: 0 }} type="number" min="1" max="365" value={newCode.trial_days} onChange={e => setNewCode({ ...newCode, trial_days: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Lock to plan</label>
                <select style={{ ...inputStyle, marginBottom: 0, cursor: "pointer" }} value={newCode.locked_plan} onChange={e => setNewCode({ ...newCode, locked_plan: e.target.value })}>
                  <option value="">No lock (free choice)</option>
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Max uses</label>
                <input style={{ ...inputStyle, marginBottom: 0 }} type="number" min="1" placeholder="Unlimited" value={newCode.max_uses} onChange={e => setNewCode({ ...newCode, max_uses: e.target.value })} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Note (internal only)</label>
                <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="e.g. Early adopter batch 1" value={newCode.note} onChange={e => setNewCode({ ...newCode, note: e.target.value })} />
              </div>
            </div>
            <button onClick={handleCreateCode} disabled={saving || !newCode.code.trim()} style={{ ...btnStyle(true), opacity: !newCode.code.trim() ? 0.4 : 1 }}>
              {saving ? "Creating..." : "Create invite code"}
            </button>
          </div>

          {inviteCodes.length === 0 ? (
            <p style={{ color: "var(--text-hint)", textAlign: "center", padding: "40px 0" }}>No invite codes yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {inviteCodes.map(c => (
                <div key={c.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, opacity: c.active ? 1 : 0.6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, fontFamily: "monospace", color: "#185FA5" }}>{c.code}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: c.active ? "#EAF3DE" : "#F1EFE8", color: c.active ? "#3B6D11" : "#5F5E5A" }}>{c.active ? "Active" : "Inactive"}</span>
                      {c.locked_plan && <span style={{ fontSize: 11, background: "#EEEDFE", color: "#3C3489", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>{c.locked_plan}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-hint)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <span>🗓 {c.trial_days} day trial</span>
                      <span>👥 {c.uses_count || 0}{c.max_uses ? `/${c.max_uses}` : ""} uses</span>
                      {c.note && <span>📝 {c.note}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => toggleCodeActive(c)} style={{ ...btnStyle(false), fontSize: 12, padding: "5px 12px" }}>{c.active ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => deleteCode(c.id)} style={{ ...btnStyle(false), fontSize: 12, padding: "5px 12px", color: "#e24b4a", borderColor: "#f7c1c1" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && tab === "feedback" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[["active", "Active"], ["resolved", "Resolved"], ["archived", "Archived"], ["all", "All"]].map(([val, label]) => (
              <button key={val} onClick={() => setFeedbackFilter(val)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: feedbackFilter === val ? "#185FA5" : "var(--bg-hover)", color: feedbackFilter === val ? "#fff" : "var(--text-secondary)", fontWeight: 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredFeedback.length === 0 && <p style={{ color: "var(--text-hint)", textAlign: "center", padding: "40px 0" }}>No feedback in this category.</p>}
            {filteredFeedback.map(f => (
              <div key={f.id} style={{ background: !f.read ? "var(--bg-selected)" : "var(--bg-card)", border: `1px solid ${!f.read ? "#b5d4f4" : "var(--border)"}`, borderRadius: 12, padding: "16px 20px", opacity: f.status === "archived" ? 0.6 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{f.subject}</span>
                    {f.type?.startsWith("pro_priority") && <span style={{ fontSize: 11, background: "#FAEEDA", color: "#633806", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>⭐ PRO</span>}
                    <span style={{ fontSize: 11, background: f.type?.includes("bug") ? "#FCEBEB" : f.type?.includes("feature") ? "#EEEDFE" : "#F1EFE8", color: f.type?.includes("bug") ? "#A32D2D" : f.type?.includes("feature") ? "#3C3489" : "#5F5E5A", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>{f.type?.replace("pro_priority_", "")}</span>
                    {!f.read && <span style={{ fontSize: 11, background: "#E6F1FB", color: "#185FA5", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>New</span>}
                    {f.status === "resolved" && <span style={{ fontSize: 11, background: "#EAF3DE", color: "#3B6D11", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>✓ Resolved</span>}
                    {f.status === "in_progress" && <span style={{ fontSize: 11, background: "#FAEEDA", color: "#633806", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>In progress</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-hint)", flexShrink: 0 }}>{new Date(f.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.6 }}>{f.message}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "var(--text-hint)" }}>{f.business_name} · {f.email}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {f.status !== "in_progress" && f.status !== "resolved" && f.status !== "archived" && (
                      <button onClick={() => updateFeedbackStatus(f, "in_progress")} style={{ ...btnStyle(false), fontSize: 11, padding: "3px 10px", color: "#854F0B", borderColor: "#FAC775" }}>In progress</button>
                    )}
                    {f.status !== "resolved" && f.status !== "archived" && (
                      <button onClick={() => updateFeedbackStatus(f, "resolved")} style={{ ...btnStyle(false), fontSize: 11, padding: "3px 10px", color: "#3B6D11", borderColor: "#C0DD97" }}>Resolve</button>
                    )}
                    {f.status !== "archived" && (
                      <button onClick={() => updateFeedbackStatus(f, "archived")} style={{ ...btnStyle(false), fontSize: 11, padding: "3px 10px", color: "var(--text-muted)" }}>Archive</button>
                    )}
                    {f.status === "archived" && (
                      <button onClick={() => updateFeedbackStatus(f, "new")} style={{ ...btnStyle(false), fontSize: 11, padding: "3px 10px" }}>Restore</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Starter Tags ──
const STARTER_TAGS = ["VIP", "New customer", "Inactive", "Appointment", "Monthly service", "Follow-up needed"];

// ── Onboarding Wizard ──

function OnboardingWizard({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", phone: "", preferred_channel: "email" });
  const [saving, setSaving] = useState(false);

  const handleAddCustomer = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await supabase.from("customers").insert({ ...form, business_id: user.id });
    setSaving(false);
    setStep(3);
  };

  const skipToApp = async () => {
    await supabase.from("businesses").update({ onboarded: true }).eq("id", user.id);
    onComplete();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fa", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 480, boxShadow: "0 2px 24px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
          {[1,2,3].map(n => (
            <div key={n} style={{ width: 28, height: 28, borderRadius: "50%", background: step >= n ? "#185FA5" : "#f0f0f0", color: step >= n ? "#fff" : "#aaa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>
              {step > n ? "✓" : n}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div style={{ textAlign: "center" }}>
            <img src={logo} alt="Remind Zen" style={{ width: 80, marginBottom: 16 }} />
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Welcome to Remind Zen!</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 32px", lineHeight: 1.7 }}>Let's get you set up in 3 quick steps. It only takes a minute.</p>
            <button onClick={() => setStep(2)} style={{ ...btnStyle(true), width: "100%", marginBottom: 12 }}>Get started →</button>
            <button onClick={skipToApp} style={{ background: "none", border: "none", color: "var(--text-hint)", cursor: "pointer", fontSize: 13 }}>Skip and go to the app</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Add your first customer</h2>
            <p style={{ color: "var(--text-hint)", fontSize: 13, margin: "0 0 20px" }}>You can add more later — just start with one to try it out.</p>
            <input style={inputStyle} placeholder="Full name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input style={inputStyle} placeholder="Email address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input style={inputStyle} placeholder="Phone number (+1XXXXXXXXXX)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Preferred channel</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={form.preferred_channel} onChange={e => setForm({ ...form, preferred_channel: e.target.value })}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="both">Email + SMS</option>
            </select>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={skipToApp} style={btnStyle(false)}>Skip</button>
              <button onClick={handleAddCustomer} disabled={saving || !form.name.trim()} style={{ ...btnStyle(true), flex: 1, opacity: !form.name.trim() ? 0.4 : 1 }}>
                {saving ? "Adding..." : "Add customer →"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>You're all set!</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 16px", lineHeight: 1.7 }}>Your first customer has been added. We've also added some starter tags to help you organize customers:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 16 }}>
              {STARTER_TAGS.map(tag => (
                <span key={tag} style={{ background: "#EEEDFE", color: "#3C3489", fontSize: 12, padding: "3px 10px", borderRadius: 99, fontWeight: 500 }}>{tag}</span>
              ))}
            </div>
            <p style={{ color: "var(--text-hint)", fontSize: 13, margin: "0 0 24px" }}>Head to <strong>Send Reminder</strong> to send your first message, or set up a <strong>Schedule</strong> for automatic reminders.</p>
            <button onClick={skipToApp} style={{ ...btnStyle(true), width: "100%" }}>Go to the app →</button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Schedules Page ──

function SchedulesPage({ user, showToast }) {
  const [schedules, setSchedules] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", cadence: "weekly", day_of_week: "1", day_of_month: "1", interval_days: "7", send_time: "09:00", channel: "preferred", subject: "", body: "", tag_filter: "", customer_ids: [], send_to_mode: "all" });

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => {
    Promise.all([
      supabase.from("schedules").select("*").eq("business_id", user.id).order("created_at", { ascending: false }),
      supabase.from("customers").select("id,name,tags,preferred_channel").eq("business_id", user.id).eq("unsubscribed", false).order("name"),
    ]).then(([{ data: s }, { data: c }]) => {
      setSchedules(s || []);
      setCustomers(c || []);
      setLoading(false);
    });
    setTemplates(JSON.parse(localStorage.getItem("customTemplates") || "[]"));
  }, []);

  const allTags = [...new Set(customers.flatMap(c => c.tags || []))].sort();

  const getNextRun = (schedule) => {
    const now = new Date();
    const [h, m] = (schedule.send_time || "09:00").split(":").map(Number);
    let next = new Date();
    next.setHours(h, m, 0, 0);
    if (schedule.cadence === "daily") {
      if (next <= now) next.setDate(next.getDate() + 1);
    } else if (schedule.cadence === "weekly") {
      const target = parseInt(schedule.day_of_week || 1);
      const diff = (target - now.getDay() + 7) % 7 || 7;
      next.setDate(now.getDate() + diff);
      next.setHours(h, m, 0, 0);
    } else if (schedule.cadence === "monthly") {
      next.setDate(parseInt(schedule.day_of_month || 1));
      if (next <= now) { next.setMonth(next.getMonth() + 1); next.setDate(parseInt(schedule.day_of_month || 1)); }
    } else if (schedule.cadence === "interval") {
      const last = schedule.last_run_at ? new Date(schedule.last_run_at) : now;
      next = new Date(last.getTime() + parseInt(schedule.interval_days || 7) * 86400000);
    }
    return next;
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.body.trim()) return;

    // Check schedule limit for plan
    const planLimits = { trial: 1, starter: 2, growth: 999, pro: 999 };
    const { data: biz } = await supabase.from("businesses").select("plan").eq("id", user.id).single();
    const plan = biz?.plan || "trial";
    const limit = planLimits[plan] || 1;
    if (schedules.length >= limit) {
      showToast(`Schedule limit reached (${limit} on ${plan} plan). Upgrade to create more.`, "error");
      return;
    }

    const { error } = await supabase.from("schedules").insert({
      business_id: user.id,
      name: form.name,
      cadence: form.cadence,
      day_of_week: form.cadence === "weekly" ? parseInt(form.day_of_week) : null,
      day_of_month: form.cadence === "monthly" ? parseInt(form.day_of_month) : null,
      interval_days: form.cadence === "interval" ? parseInt(form.interval_days) : null,
      send_time: form.send_time,
      channel: form.channel,
      subject: form.subject,
      body: form.body,
      tag_filter: form.tag_filter || null,
      active: true,
    });
    if (!error) {
      showToast("Schedule created", "success");
      setShowModal(false);
      const { data } = await supabase.from("schedules").select("*").eq("business_id", user.id).order("created_at", { ascending: false });
      setSchedules(data || []);
    } else showToast("Failed to create schedule", "error");
  };

  const toggleActive = async (s) => {
    await supabase.from("schedules").update({ active: !s.active }).eq("id", s.id);
    setSchedules(schedules.map(x => x.id === s.id ? { ...x, active: !s.active } : x));
    showToast(s.active ? "Schedule paused" : "Schedule resumed", "success");
  };

  const handleDelete = async (id) => {
    await supabase.from("schedules").delete().eq("id", id);
    setSchedules(schedules.filter(s => s.id !== id));
    showToast("Schedule deleted", "success");
  };

  const cadenceLabel = (s) => {
    if (s.cadence === "daily") return `Daily at ${s.send_time}`;
    if (s.cadence === "weekly") return `Every ${DAYS[s.day_of_week || 1]} at ${s.send_time}`;
    if (s.cadence === "monthly") return `Monthly on the ${s.day_of_month}${["st","nd","rd"][((s.day_of_month||1)-1)%10] || "th"} at ${s.send_time}`;
    if (s.cadence === "interval") return `Every ${s.interval_days} days at ${s.send_time}`;
    return "";
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button onClick={() => setShowModal(true)} style={btnStyle(true)}>+ New Schedule</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-hint)" }}>Loading...</div>
      ) : schedules.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-hint)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗓</div>
          <p style={{ margin: 0 }}>No schedules yet. Create one to start sending reminders automatically.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {schedules.map(s => (
            <div key={s.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", opacity: s.active ? 1 : 0.6 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{s.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: s.active ? "#EAF3DE" : "#F1EFE8", color: s.active ? "#3B6D11" : "#5F5E5A" }}>
                      {s.active ? "Active" : "Paused"}
                    </span>
                    {s.tag_filter && <span style={{ fontSize: 11, background: "#EEEDFE", color: "#3C3489", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>{s.tag_filter}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{cadenceLabel(s)}</div>
                  <div style={{ fontSize: 12, color: "var(--text-hint)" }}>{s.subject || s.body?.slice(0, 60) + "..."}</div>
                  {s.active && <div style={{ fontSize: 12, color: "#185FA5", marginTop: 6 }}>Next run: {getNextRun(s).toLocaleDateString()} at {s.send_time}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                  <button onClick={() => toggleActive(s)} style={{ ...btnStyle(false), fontSize: 12, padding: "5px 10px" }}>{s.active ? "Pause" : "Resume"}</button>
                  <button onClick={() => handleDelete(s.id)} style={{ ...btnStyle(false), fontSize: 12, padding: "5px 10px", color: "#e24b4a", borderColor: "#f7c1c1" }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="New Schedule" onClose={() => setShowModal(false)}>
          <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Schedule name <span style={{ color: "#E24B4A" }}>*</span></label>
          <input style={inputStyle} placeholder="e.g. Monthly lawn reminder" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

          <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Send to <span style={{ color: "#E24B4A" }}>*</span></label>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[["all", "All customers"], ["tag", "By tag"], ["specific", "Specific customers"]].map(([val, label]) => (
              <button key={val} type="button" onClick={() => setForm({ ...form, send_to_mode: val, tag_filter: "", customer_ids: [] })}
                style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: form.send_to_mode === val ? "#185FA5" : "var(--bg-hover)", color: form.send_to_mode === val ? "#fff" : "var(--text-secondary)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: form.send_to_mode === val ? 600 : 400 }}>
                {label}
              </button>
            ))}
          </div>

          {form.send_to_mode === "tag" && (
            <select style={{ ...inputStyle, cursor: "pointer" }} value={form.tag_filter} onChange={e => setForm({ ...form, tag_filter: e.target.value })}>
              <option value="">Select a tag...</option>
              {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          )}

          {form.send_to_mode === "specific" && (
            <div style={{ border: "1px solid var(--border-mid)", borderRadius: 10, maxHeight: 180, overflowY: "auto", padding: "8px 12px", marginBottom: 12, background: "var(--bg-input)" }}>
              {customers.length === 0 && <div style={{ fontSize: 13, color: "var(--text-hint)" }}>No customers yet</div>}
              {customers.filter(c => !c.inactive && !c.unsubscribed).map(c => (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer", borderBottom: "0.5px solid var(--border)" }}>
                  <input type="checkbox" checked={form.customer_ids.includes(c.id)}
                    onChange={() => setForm({ ...form, customer_ids: form.customer_ids.includes(c.id) ? form.customer_ids.filter(x => x !== c.id) : [...form.customer_ids, c.id] })}
                    style={{ width: 15, height: 15, cursor: "pointer" }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</div>
                    {c.email && <div style={{ fontSize: 11, color: "var(--text-hint)" }}>{c.email}</div>}
                  </div>
                </label>
              ))}
            </div>
          )}
          {form.send_to_mode === "specific" && form.customer_ids.length > 0 && (
            <div style={{ fontSize: 12, color: "#185FA5", marginBottom: 10, marginTop: -8 }}>{form.customer_ids.length} customer{form.customer_ids.length !== 1 ? "s" : ""} selected</div>
          )}

          <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Cadence <span style={{ color: "#E24B4A" }}>*</span></label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={form.cadence} onChange={e => setForm({ ...form, cadence: e.target.value })}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="interval">Every X days</option>
            <option value="monthly">Monthly</option>
          </select>

          {form.cadence === "weekly" && (
            <select style={{ ...inputStyle, cursor: "pointer" }} value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value })}>
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          )}
          {form.cadence === "interval" && (
            <input style={inputStyle} type="number" min="1" max="365" placeholder="Every how many days?" value={form.interval_days} onChange={e => setForm({ ...form, interval_days: e.target.value })} />
          )}
          {form.cadence === "monthly" && (
            <select style={{ ...inputStyle, cursor: "pointer" }} value={form.day_of_month} onChange={e => setForm({ ...form, day_of_month: e.target.value })}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>Day {d}</option>)}
            </select>
          )}

          <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Send time <span style={{ color: "#E24B4A" }}>*</span></label>
          <input style={inputStyle} type="time" value={form.send_time} onChange={e => setForm({ ...form, send_time: e.target.value })} />

          <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Channel <span style={{ color: "#E24B4A" }}>*</span></label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>
            <option value="preferred">Each customer's preferred channel</option>
            <option value="email">Email only</option>
            <option value="sms">SMS only</option>
            <option value="both">Email + SMS</option>
          </select>

          {/* Template picker */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Quick templates <span style={{ fontSize: 11, color: "var(--text-hint)" }}>(optional — fills subject & message)</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TEMPLATES.filter(t => {
                if (form.channel === "sms") return t.channel === "sms" || t.channel === "both";
                if (form.channel === "email") return t.channel === "email" || t.channel === "both";
                return true;
              }).map(t => (
                <button key={t.id} type="button" onClick={() => {
                  setForm({ ...form, subject: t.subject || form.subject, body: t.body });
                }} style={{ padding: "5px 12px", borderRadius: 8, border: "1.5px solid var(--border-mid)", background: "var(--bg-hover)", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#185FA5"; e.currentTarget.style.color = "#185FA5"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-mid)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {(form.channel === "email" || form.channel === "both" || form.channel === "preferred") && (
            <input style={inputStyle} placeholder="Email subject *" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          )}
          <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} placeholder="Message body * — Use {name}, {date}, {time}, {amount}" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />

          <div style={{ fontSize: 12, color: "var(--text-hint)", marginBottom: 8 }}><span style={{ color: "#E24B4A" }}>*</span> Required field</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => setShowModal(false)} style={btnStyle(false)}>Cancel</button>
            <button onClick={handleSave} style={btnStyle(true)}>Create Schedule</button>
          </div>
        </Modal>
      )}
    </div>
  );
}




// ── Invite Code Benefit Display ──

function InviteCodeBenefit({ userId, trialDaysLeft }) {
  const [codeUsed, setCodeUsed] = useState(null);

  useEffect(() => {
    // Check if this business signed up with an invite code
    // We store this in localStorage at signup time
    const code = localStorage.getItem(`invite_code_${userId}`);
    if (code) setCodeUsed(code);
  }, [userId]);

  if (!codeUsed) return null;

  return (
    <div style={{ background: "#EAF3DE", border: "1px solid #C0DD97", borderRadius: 12, padding: "14px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ fontSize: 24 }}>🎁</div>
      <div>
        <div style={{ fontWeight: 600, color: "#27500A", fontSize: 14 }}>Invite code applied — {trialDaysLeft} days free trial</div>
        <div style={{ fontSize: 13, color: "#3B6D11", marginTop: 2 }}>Code <strong>{codeUsed}</strong> gave you an extended free trial. Your plan activates automatically when the trial ends.</div>
      </div>
    </div>
  );
}

// ── Billing Page ──

const PLAN_DETAILS = {
  trial: { name: "Free Trial", color: "#3B6D11", bg: "#EAF3DE", limit: 50 },
  starter: { name: "Starter", color: "#185FA5", bg: "#E6F1FB", limit: 150 },
  growth: { name: "Growth", color: "#534AB7", bg: "#EEEDFE", limit: 500 },
  pro: { name: "Pro", color: "#854F0B", bg: "#FAEEDA", limit: 2000 },
  cancelled: { name: "Cancelled", color: "#A32D2D", bg: "#FCEBEB", limit: 0 },
};

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

function BillingPage({ user, business }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [annual, setAnnual] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    fetch(`${API}/billing/status`, { headers: { "x-business-id": user.id } })
      .then(r => r.json())
      .then(data => { setStatus(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planKey) => {
    setRedirecting(true);
    const priceMap = {
      starter: annual ? import.meta.env.VITE_PRICE_STARTER_ANNUAL : import.meta.env.VITE_PRICE_STARTER_MONTHLY,
      growth: annual ? import.meta.env.VITE_PRICE_GROWTH_ANNUAL : import.meta.env.VITE_PRICE_GROWTH_MONTHLY,
      pro: annual ? import.meta.env.VITE_PRICE_PRO_ANNUAL : import.meta.env.VITE_PRICE_PRO_MONTHLY,
    };
    try {
      const res = await fetch(`${API}/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: user.id, priceId: priceMap[planKey], email: user.email, annual }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { setRedirecting(false); }
  };

  const handleManageBilling = async () => {
    setRedirecting(true);
    try {
      const res = await fetch(`${API}/billing/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: user.id }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { setRedirecting(false); }
  };

  const plans = [
    { key: "starter", name: "Starter", monthlyPrice: 14, annualPrice: 140, features: ["75 customers", "150 messages/month", "Email + SMS", "2 schedules", "Templates", "14-day free trial"] },
    { key: "growth", name: "Growth", monthlyPrice: 29, annualPrice: 290, features: ["300 customers", "500 messages/month", "Email + SMS", "Unlimited schedules", "Tags & groups", "CSV import/export", "Analytics", "14-day free trial"], popular: true },
    { key: "pro", name: "Pro", monthlyPrice: 59, annualPrice: 590, features: ["Unlimited customers", "2,000 messages/month", "Everything in Growth", "Priority support", "Calendar integration*", "Two-way SMS*", "14-day free trial"] },
  ];

  if (loading) return <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-hint)" }}>Loading billing info...</div>;

  const planInfo = PLAN_DETAILS[status?.plan || "trial"];
  const usagePct = status ? Math.min(100, Math.round((status.messagesUsed / status.messageLimit) * 100)) : 0;
  const isSubscribed = status?.plan && !["trial", "cancelled"].includes(status.plan);

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Trial banner */}
      {status?.trialActive && (
        <div style={{ background: "#EAF3DE", border: "1px solid #C0DD97", borderRadius: 12, padding: "14px 20px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <span style={{ fontWeight: 600, color: "#3B6D11" }}>Free trial active</span>
            <span style={{ color: "#3B6D11", fontSize: 14, marginLeft: 8 }}>{status.trialDaysLeft} day{status.trialDaysLeft !== 1 ? "s" : ""} remaining</span>
          </div>
          <span style={{ fontSize: 13, color: "#3B6D11" }}>Your plan will activate automatically when the trial ends</span>
        </div>
      )}

      {status?.plan === "cancelled" && (
        <div style={{ background: "#FCEBEB", border: "1px solid #f7c1c1", borderRadius: 12, padding: "14px 20px", marginBottom: 24 }}>
          <span style={{ fontWeight: 600, color: "#A32D2D" }}>Your subscription has been cancelled.</span>
          <span style={{ color: "#A32D2D", fontSize: 14, marginLeft: 8 }}>Subscribe below to restore access.</span>
        </div>
      )}

      {status?.trialActive && status?.trialDaysLeft > 3 && (
        <InviteCodeBenefit userId={user.id} trialDaysLeft={status.trialDaysLeft} />
      )}

      {/* Current plan + usage */}
      {isSubscribed && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--text-hint)", marginBottom: 4 }}>Current plan</div>
              <span style={{ background: planInfo.bg, color: planInfo.color, fontWeight: 600, fontSize: 15, padding: "4px 14px", borderRadius: 99 }}>{planInfo.name}</span>
            </div>
            <button onClick={handleManageBilling} disabled={redirecting} style={btnStyle(false)}>
              {redirecting ? "Opening..." : "Manage billing →"}
            </button>
          </div>
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--text-muted)" }}>Messages this month</span>
            <span style={{ fontWeight: 500, color: usagePct > 90 ? "#A32D2D" : "#1a1a1a" }}>{status.messagesUsed} / {status.messageLimit}</span>
          </div>
          <div style={{ height: 8, background: "#f0f0f0", borderRadius: 99 }}>
            <div style={{ height: 8, width: `${usagePct}%`, background: usagePct > 90 ? "#E24B4A" : usagePct > 70 ? "#BA7517" : "#185FA5", borderRadius: 99, transition: "width 0.5s" }} />
          </div>
          {usagePct > 90 && <div style={{ fontSize: 12, color: "#A32D2D", marginTop: 6 }}>Approaching limit — additional messages will be billed as overages ($0.01/email, $0.05/SMS)</div>}
        </div>
      )}

      {/* Annual toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 14, color: !annual ? "#1a1a1a" : "#aaa", fontWeight: !annual ? 500 : 400 }}>Monthly</span>
        <div onClick={() => setAnnual(!annual)} style={{ width: 44, height: 24, borderRadius: 99, background: annual ? "#185FA5" : "#ddd", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: annual ? 23 : 3, transition: "left 0.2s" }} />
        </div>
        <span style={{ fontSize: 14, color: annual ? "#1a1a1a" : "#aaa", fontWeight: annual ? 500 : 400 }}>
          Annual <span style={{ background: "#EAF3DE", color: "#3B6D11", fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 99, marginLeft: 4 }}>2 months free</span>
        </span>
      </div>

      {/* Plan cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
        {plans.map(plan => {
          const isCurrent = status?.plan === plan.key;
          const price = annual ? plan.annualPrice : plan.monthlyPrice;
          const period = annual ? "/year" : "/mo";
          return (
            <div key={plan.key} style={{ background: "#fff", border: plan.popular ? "2px solid #185FA5" : "1px solid #f0f0f0", borderRadius: 14, padding: "22px 20px", display: "flex", flexDirection: "column" }}>
              {plan.popular && <div style={{ fontSize: 11, fontWeight: 600, color: "#185FA5", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Most popular</div>}
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{plan.name}</div>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 30, fontWeight: 700, color: "var(--text-primary)" }}>${price}</span>
                <span style={{ fontSize: 13, color: "var(--text-hint)" }}>{period}</span>
                {annual && <div style={{ fontSize: 11, color: "#3B6D11", marginTop: 2 }}>${plan.monthlyPrice}/mo billed annually</div>}
              </div>
              <div style={{ flex: 1, marginBottom: 20 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text-secondary)", padding: "4px 0" }}>
                    <span style={{ color: "#185FA5", flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              {isCurrent ? (
                <button style={{ ...btnStyle(false), width: "100%", opacity: 0.6, cursor: "default" }}>Current plan</button>
              ) : (
                <button onClick={() => handleSubscribe(plan.key)} disabled={redirecting} style={{ ...btnStyle(plan.popular), width: "100%", background: plan.popular ? "#185FA5" : "#fff", color: plan.popular ? "#fff" : "#185FA5", border: plan.popular ? "none" : "1px solid #185FA5" }}>
                  {redirecting ? "Redirecting..." : isSubscribed ? "Switch to this plan" : "Start free trial"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: "var(--text-hint)", textAlign: "center", lineHeight: 1.8 }}>
        All plans include a 14-day free trial · No credit card required to start<br />
        Overages: $0.01/email · $0.05/SMS above plan limit · Cancel anytime<br />
        * Feature coming soon
      </div>
    </div>
  );
}


// ── Referral Section ──

function ReferralSection({ userId }) {
  const [referralCode, setReferralCode] = useState(null);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadReferral();
  }, []);

  const loadReferral = async () => {
    const { data } = await supabase.from("referral_codes").select("*").eq("business_id", userId).single();
    if (data) {
      setReferralCode(data);
      const { count } = await supabase.from("businesses").select("*", { count: "exact", head: true }).eq("referred_by", data.code);
      setReferralCount(count || 0);
    }
  };

  const generateCode = async () => {
    setGenerating(true);
    const code = "REF" + userId.slice(0, 6).toUpperCase();
    const { data, error } = await supabase.from("referral_codes").insert({ business_id: userId, code, reward_days: 30 }).select().single();
    if (!error) setReferralCode(data);
    setGenerating(false);
  };

  const referralLink = `https://app.remindzen.com?ref=${referralCode?.code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!referralCode) return (
    <button onClick={generateCode} disabled={generating} style={btnStyle(false)}>
      {generating ? "Generating..." : "Generate my referral link"}
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input readOnly value={referralLink} style={{ ...inputStyle, marginBottom: 0, flex: 1, fontSize: 13, color: "var(--text-secondary)", background: "var(--bg-hover)" }} />
        <button onClick={copyLink} style={{ ...btnStyle(copied ? true : false), flexShrink: 0, minWidth: 80 }}>
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
        {referralCount > 0
          ? `🎉 ${referralCount} business${referralCount !== 1 ? "es" : ""} signed up using your link — ${referralCount * 30} free days earned!`
          : "No referrals yet — share your link to start earning free days!"}
      </div>
    </div>
  );
}

// ── Contact Page ──

function ContactPage({ user, business, showToast }) {
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 32px", marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Get in touch</h3>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7 }}>
          Have a question, found a bug, or need help with your account? We're here to help.
        </p>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✉️</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Email support</div>
            <a href="mailto:hello@remindzen.com" style={{ fontSize: 13, color: "#185FA5" }}>hello@remindzen.com</a>
            <div style={{ fontSize: 12, color: "var(--text-hint)", marginTop: 2 }}>We typically respond within 1 business day</div>
          </div>
        </div>
      </div>

      {/* Feedback form embedded in Contact */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 32px", marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Send feedback</h3>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7 }}>Report a bug, suggest a feature, or share any thoughts.</p>
        <FeedbackForm user={user} business={business} showToast={showToast} />
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 32px", marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Common questions</h3>
        {[
          ["Why didn't my SMS send?", "Make sure the phone number is in +1XXXXXXXXXX format. Also check that the customer has not opted out — opted-out customers are automatically skipped. If the issue persists, contact us and we'll look into it."],
          ["Why isn't my scheduled reminder firing?", "Check that the schedule is set to Active in the Schedules tab, and that your timezone is set correctly in Settings. Schedules fire based on your selected timezone."],
          ["How do I import my customers?", "Go to the Customers tab and click 'Import CSV'. Your CSV should have columns named: name, email, phone, notes, preferred_channel."],
          ["How do I cancel my account?", "Go to Settings → Delete account. This permanently removes all your data. If you need help, email us first."],
        ].map(([q, a]) => (
          <details key={q} style={{ marginBottom: 12, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            <summary style={{ fontSize: 14, fontWeight: 500, cursor: "pointer", color: "var(--text-primary)" }}>{q}</summary>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>{a}</p>
          </details>
        ))}
      </div>

      <div style={{ background: "var(--bg-hover)", borderRadius: 12, padding: "20px 24px", fontSize: 13, color: "var(--text-hint)", lineHeight: 1.7 }}>
        <strong style={{ color: "var(--text-muted)" }}>Remind Zen LLC</strong> · Ventura, CA · <a href="mailto:hello@remindzen.com" style={{ color: "#185FA5" }}>hello@remindzen.com</a>
      </div>
    </div>
  );
}


// ── About Page ──

function AboutPage() {
  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "32px 36px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#3B6F73", marginBottom: 16 }}>A note from the founder</div>
        <div style={{ borderLeft: "4px solid #3B6F73", paddingLeft: 24, lineHeight: 1.85, fontFamily: "Georgia, serif" }}>
          <p style={{ fontSize: 17, margin: "0 0 16px", fontWeight: 500, color: "var(--text-primary)" }}>I built Remind Zen because of a simple frustration that I suspect a lot of people share.</p>
          <p style={{ fontSize: 15, margin: "0 0 14px", color: "var(--text-secondary)" }}>I have a chronic illness, which means I'm careful about where my time and energy go. When I found a service I loved and wanted to book monthly, I discovered there was no way to do it — no online booking, no reminders. Just me trying to remember to call each month. Sometimes I forgot. Sometimes life got in the way. The business lost out, and so did I.</p>
          <p style={{ fontSize: 15, margin: "0 0 14px", color: "var(--text-secondary)" }}>It seemed like such an easy thing to fix. A simple, automated reminder — "Hey, it's been a month, time to book your next session" — would have made all the difference. For me as a customer, and for that small business trying to fill their schedule.</p>
          <p style={{ fontSize: 15, margin: "0 0 14px", color: "var(--text-secondary)" }}>That's what Remind Zen is. I built it specifically for very small businesses — the ones who don't have a big tech budget or a dedicated marketing team, but who deliver real value to their customers and deserve tools that help them grow. I wanted it to be affordable enough that the ROI is obvious from day one.</p>
          <p style={{ fontSize: 15, margin: "0 0 20px", color: "var(--text-secondary)" }}>Because here's what I've come to believe: a good reminder doesn't just help a business. It helps the customer too. It takes one more thing off their plate. And for someone like me, that matters.</p>
          <p style={{ fontSize: 15, margin: "0 0 4px", color: "var(--text-primary)", fontStyle: "italic" }}>— Meghan, Founder of Remind Zen</p>
          <p style={{ fontSize: 13, color: "var(--text-hint)", margin: 0 }}>Ventura, CA</p>
        </div>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "28px 36px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Our mission</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8, margin: "0 0 14px" }}>To help small service businesses spend less time chasing customers and more time serving them — through simple, affordable, and reliable automated reminders.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          {[
            ["🔒", "Privacy first", "We never sell your data or spam your customers."],
            ["💚", "Built for small business", "Affordable pricing designed for businesses of 1–10 people."],
            ["⚡", "Simple by design", "Set up in 2 minutes. No tech skills needed."],
            ["🤝", "We're here for you", "Real support from a real person — hello@remindzen.com"],
          ].map(([emoji, title, desc]) => (
            <div key={title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{emoji}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Legal Page ──

function LegalPage() {
  const [tab, setTab] = useState("terms");
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {[["terms", "Terms of Service"], ["privacy", "Privacy Policy"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: tab === key ? "#185FA5" : "#f0f0f0", color: tab === key ? "#fff" : "#555", fontWeight: 500, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "terms" && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "32px 36px", lineHeight: 1.8, fontSize: 14, color: "#333" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>Terms of Service</h2>
          <p style={{ margin: "0 0 24px", color: "var(--text-hint)", fontSize: 13 }}>Last updated: {today}</p>

          <p>These Terms of Service ("Terms") govern your use of the Remind Zen platform ("Service") operated by Remind Zen LLC ("us", "we", or "our"). By accessing or using our Service, you agree to be bound by these Terms.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>1. Use of the Service</h3>
          <p>Remind Zen provides a customer reminder platform that allows businesses to send email and SMS messages to their customers. You are responsible for all activity that occurs under your account. You must not use the Service for any unlawful purpose or in violation of any regulations, including but not limited to the CAN-SPAM Act and the Telephone Consumer Protection Act (TCPA).</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>2. Customer consent</h3>
          <p>You are solely responsible for ensuring that your customers have given proper consent to receive communications from you before sending them messages through our Service. You must maintain records of customer consent and provide opt-out mechanisms in all communications. We reserve the right to suspend accounts that violate consent requirements.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>3. Prohibited content</h3>
          <p>You may not use the Service to send spam, unsolicited messages, misleading content, illegal content, or any messages that violate the rights of third parties. We reserve the right to remove content and suspend accounts that violate these policies without notice.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>4. Account responsibility</h3>
          <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We are not liable for any loss or damage arising from your failure to protect your account information.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>5. Billing and payments</h3>
          <p>All plans require a valid credit card at signup. Each plan includes a 14-day free trial. Your card will be charged automatically at the end of the trial period unless you cancel before then. Subscriptions renew automatically on a monthly or annual basis depending on your selected plan. Cancellations take effect at the end of the current billing period — no refunds are issued for partial months or unused time.</p>
          <p style={{ marginTop: 12 }}>If your usage exceeds your plan's monthly message limit, overage charges will apply at the rates listed on our pricing page ($0.01 per email, $0.05 per SMS). Overages are calculated at the end of each billing period and charged automatically to your card on file.</p>
          <p style={{ marginTop: 12 }}>We reserve the right to suspend or terminate accounts with failed payments. You will be notified by email before any suspension occurs.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>6. Service availability</h3>
          <p>We strive to maintain reliable service but do not guarantee uninterrupted or error-free operation. We reserve the right to modify, suspend, or discontinue the Service at any time with reasonable notice.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>7. Limitation of liability</h3>
          <p>To the maximum extent permitted by law, Remind Zen LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability to you shall not exceed the amounts paid by you to us in the three months preceding the claim.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>8. Changes to terms</h3>
          <p>We reserve the right to update these Terms at any time. We will notify you of significant changes by email or by posting a notice within the Service. Your continued use of the Service after changes constitutes your acceptance of the new Terms.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>9. Contact</h3>
          <p style={{ margin: 0 }}>For questions about these Terms, contact us at <a href="mailto:hello@remindzen.com" style={{ color: "#185FA5" }}>hello@remindzen.com</a>.</p>
        </div>
      )}

      {tab === "privacy" && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "32px 36px", lineHeight: 1.8, fontSize: 14, color: "#333" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>Privacy Policy</h2>
          <p style={{ margin: "0 0 24px", color: "var(--text-hint)", fontSize: 13 }}>Last updated: {today}</p>

          <p>Remind Zen LLC ("we", "us", or "our") operates the Remind Zen platform. This Privacy Policy explains how we collect, use, and protect information when you use our Service.</p>

          <div style={{ background: "var(--bg-hover)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Our commitments to you:</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>🔒 Your data is encrypted in transit and at rest</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>🚫 We never sell your data — ever</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>📵 We never send unsolicited marketing messages to your customers</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>💳 Payments are processed securely by Stripe</div>
          </div>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>1. Information we collect</h3>
          <p>We collect information you provide directly to us, including your business name, email address, and password when you create an account. We also store customer contact information (names, email addresses, phone numbers) that you enter into the platform on behalf of your business.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>2. How we use your information</h3>
          <p>We use the information we collect to provide and operate the Service, send messages on your behalf to your customers, maintain send history and analytics, and communicate with you about your account. We do not sell your data or your customers' data to third parties.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>3. Customer data</h3>
          <p>You retain ownership of all customer data you upload to the Service. We process this data solely on your behalf and in accordance with your instructions. You are responsible for ensuring you have proper authorization to store and use your customers' contact information.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>4. Data storage & security</h3>
          <p>Your data is stored securely using Supabase, a SOC 2 compliant database provider. We implement industry-standard security measures including encryption in transit and at rest. However, no method of transmission over the Internet is 100% secure.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>5. Third-party services</h3>
          <p>We use SendGrid to deliver email messages and Twilio to deliver SMS messages on your behalf. These providers may process recipient email addresses and phone numbers as part of message delivery. Please review their respective privacy policies for details.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>6. Data retention</h3>
          <p>We retain your account data for as long as your account is active. You may delete your account and associated data at any time by contacting us. Send history is retained for 12 months for compliance and support purposes.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>7. Your rights</h3>
          <p>You have the right to access, correct, or delete your personal information at any time. To exercise these rights, contact us at the address below. California residents may have additional rights under the CCPA.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>9. Contact</h3>
          <p style={{ margin: 0 }}>For privacy-related questions, contact us at <a href="mailto:hello@remindzen.com" style={{ color: "#185FA5" }}>hello@remindzen.com</a> or write to Remind Zen LLC, Ventura, CA.</p>
        </div>
      )}
    </div>
  );
}


// ── App Header ──

function AppHeader({ page, setPage, user, business, billingStatus, darkMode, setDarkMode }) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user?.id === ADMIN_UID;

  const primaryNav = ["Dashboard", "Customers", "Send Reminder", "Schedules", "History", "Billing"];
  const secondaryNav = isAdmin
    ? ["Templates", "Settings", "Legal", "Contact", "Admin"]
    : ["Templates", "Settings", "Legal", "Contact"];

  const allNav = [...primaryNav, ...secondaryNav];
  const isSecondary = secondaryNav.includes(page);

  return (
    <div style={{ background: "var(--nav-bg)", borderBottom: "1px solid var(--nav-border)", padding: isMobile ? "0 16px" : "0 24px", position: "relative" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", height: 56, gap: isMobile ? 8 : 16 }}>

        {/* Logo */}
        <img src={logo} alt="Remind Zen" style={{ height: 32, flexShrink: 0, cursor: "pointer" }} onClick={() => setPage("Dashboard")} />

        {/* Desktop primary nav */}
        {!isMobile && (
          <nav style={{ display: "flex", gap: 2, flex: 1, flexWrap: "nowrap" }}>
            {primaryNav.map(n => (
              <button key={n} onClick={() => { setPage(n); setMenuOpen(false); }} style={{ padding: "5px 9px", borderRadius: 8, border: "none", background: page === n ? "#f0f6ff" : "transparent", color: page === n ? "#185FA5" : "#666", fontWeight: page === n ? 600 : 400, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {n}
              </button>
            ))}
          </nav>
        )}

        {isMobile && <div style={{ flex: 1 }} />}

        {/* Right side — usage meter + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

          {/* Usage meter — desktop only */}
          {!isMobile && billingStatus && (
            <button onClick={() => setPage("Billing")} title="Message usage this month" style={{ background: "none", border: "1px solid var(--border)", cursor: "pointer", padding: "4px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                <span style={{ fontSize: 11, color: billingStatus.messagesUsed / billingStatus.messageLimit > 0.9 ? "#A32D2D" : billingStatus.messagesUsed / billingStatus.messageLimit > 0.7 ? "#854F0B" : "#555", whiteSpace: "nowrap", fontWeight: 500 }}>
                  {billingStatus.messagesUsed}/{billingStatus.messageLimit} msgs
                </span>
                <div style={{ width: 64, height: 3, borderRadius: 99, background: "#f0f0f0", overflow: "hidden" }}>
                  <div style={{ height: 3, borderRadius: 99, background: billingStatus.messagesUsed / billingStatus.messageLimit > 0.9 ? "#E24B4A" : billingStatus.messagesUsed / billingStatus.messageLimit > 0.7 ? "#BA7517" : "#185FA5", width: `${Math.min(100, Math.round(billingStatus.messagesUsed / billingStatus.messageLimit * 100))}%`, transition: "width 0.5s" }} />
                </div>
              </div>
            </button>
          )}

          {/* Business name — desktop only */}
          {!isMobile && (
            <div style={{ fontSize: 11, color: "var(--text-placeholder)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{business?.name || ""}</div>
          )}

          {/* Dark mode toggle */}
          <button onClick={() => setDarkMode && setDarkMode(!darkMode)} title={darkMode ? "Switch to light mode" : "Switch to dark mode"} style={{ background: "none", border: "1px solid var(--border)", cursor: "pointer", borderRadius: 8, padding: "6px 8px", fontSize: 14, color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
            {darkMode ? "☀️" : "🌙"}
          </button>

          {/* Hamburger — always visible, shows secondary nav on desktop, all nav on mobile */}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: isSecondary ? "#f0f6ff" : "none", border: isSecondary ? "1px solid #b5d4f4" : "1px solid #f0f0f0", cursor: "pointer", borderRadius: 8, padding: "6px 10px", fontSize: 16, color: isSecondary ? "#185FA5" : "#555", display: "flex", alignItems: "center", gap: 6 }}>
            {menuOpen ? "✕" : "☰"}
            {!isMobile && <span style={{ fontSize: 12, fontWeight: isSecondary ? 600 : 400, color: isSecondary ? "#185FA5" : "#666" }}>More</span>}
          </button>
        </div>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <div style={{ position: "absolute", top: 56, right: 0, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "0 0 12px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", zIndex: 200, minWidth: 200, overflow: "hidden" }}>
          {/* On mobile show primary nav too */}
          {isMobile && (
            <>
              {primaryNav.map(n => (
                <button key={n} onClick={() => { setPage(n); setMenuOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "13px 20px", border: "none", background: page === n ? "#f0f6ff" : "transparent", color: page === n ? "#185FA5" : "#444", fontWeight: page === n ? 600 : 400, fontSize: 14, cursor: "pointer", fontFamily: "inherit", borderBottom: "1px solid #f5f5f5" }}>
                  {n}
                </button>
              ))}
              <div style={{ height: 1, background: "#e8e8e8", margin: "4px 0" }} />
            </>
          )}

          {/* Secondary nav — always in dropdown */}
          {secondaryNav.map(n => (
            <button key={n} onClick={() => { setPage(n); setMenuOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 20px", border: "none", background: page === n ? "#f0f6ff" : "transparent", color: page === n ? "#185FA5" : "#555", fontWeight: page === n ? 600 : 400, fontSize: 13, cursor: "pointer", fontFamily: "inherit", borderBottom: "1px solid #f5f5f5" }}>
              {n}
            </button>
          ))}

          {/* Usage meter on mobile */}
          {isMobile && billingStatus && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                <span>Messages this month</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{billingStatus.messagesUsed}/{billingStatus.messageLimit}</span>
              </div>
              <div style={{ height: 4, background: "#f0f0f0", borderRadius: 99 }}>
                <div style={{ height: 4, borderRadius: 99, background: billingStatus.messagesUsed / billingStatus.messageLimit > 0.9 ? "#E24B4A" : "#185FA5", width: `${Math.min(100, Math.round(billingStatus.messagesUsed / billingStatus.messageLimit * 100))}%` }} />
              </div>
            </div>
          )}

          {/* Business name on mobile */}
          {isMobile && (
            <div style={{ padding: "10px 20px", fontSize: 12, color: "var(--text-placeholder)", borderTop: "1px solid #f5f5f5" }}>{business?.name || user?.email}</div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />}
    </div>
  );
}

// ── Main App ──

export default function App() {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    const validPages = ["Dashboard", "Customers", "Send Reminder", "Templates", "Schedules", "History", "Billing", "Settings", "Legal", "Contact", "Feedback", "Admin"];
    return validPages.includes(hash) ? hash : "Dashboard";
  });
  const navigateTo = (p) => { setPage(p); window.location.hash = p; };
  const [toast, setToast] = useState(null);
  const [billingStatus, setBillingStatus] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Handle referral code in URL
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem("referral_code", refCode.toUpperCase());
      window.history.replaceState({}, "", window.location.pathname);
    }

    // Handle Stripe redirect back to app
    if (params.get("session_id")) {
      // Payment successful - clean URL and go to billing page
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => navigateTo("Billing"), 100);
    } else if (params.get("cancelled")) {
      window.history.replaceState({}, "", window.location.pathname);
      setPage("Billing");
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) loadBusiness(session.user.id);
      else setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) loadBusiness(session.user.id);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadBusiness = async (uid) => {
    const { data } = await supabase.from("businesses").select("*").eq("id", uid).single();
    setBusiness(data || {});
    setAuthLoading(false);
    // Only show onboarding for genuinely new accounts
    const seen = localStorage.getItem("onboarding_complete");
    if (!seen && data?.onboarded === false) setShowOnboarding(true);
    // Fetch billing status for usage meter
    fetch(`${API}/billing/status`, { headers: { "x-business-id": uid } })
      .then(r => r.json())
      .then(data => setBillingStatus(data))
      .catch(() => {});
  };

  const completeOnboarding = async () => {
    await supabase.from("businesses").update({ onboarded: true }).eq("id", user.id);
    setBusiness(prev => ({ ...prev, onboarded: true }));
  };

  const showToast = (msg, type = "success") => setToast({ msg, type });

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f8fa" }}>
        <div style={{ fontSize: 14, color: "var(--text-hint)" }}>Loading...</div>
      </div>
    );
  }

  if (!user) return <AuthScreen onAuth={setUser} />;
  if (showOnboarding) return <OnboardingWizard user={user} onComplete={() => { setShowOnboarding(false); localStorage.setItem("onboarding_complete", "1"); }} />;
  if (user && business && business.onboarded === false && !localStorage.getItem("onboarding_complete")) return <OnboardingWizard user={user} onComplete={completeOnboarding} />;

  const pageTitles = {
    Dashboard: ["Dashboard", "Welcome to Remind Zen"],
    Customers: ["Customers", "Add, organize, and manage your customers"],
    "Send Reminder": ["Send Reminder", "Send personalized email and SMS reminders in seconds"],
    Templates: ["Templates", "Save time with reusable message templates"],
    Schedules: ["Scheduled Reminders", "Set up automatic recurring reminders for your customers"],
    History: ["Send History", "Track every message sent, delivered, and failed"],
    Billing: ["Billing", "Manage your Remind Zen subscription"],
    Settings: ["Settings", "Manage your Remind Zen account"],
    Legal: ["Legal", "Terms of service and privacy policy"],
    Contact: ["Contact & Support", "Get help or reach the Remind Zen team"],
    Feedback: ["Send Feedback", "Report a bug or suggest a feature"],
    Admin: ["Admin Panel", "Manage all Remind Zen accounts"],
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", minHeight: "100vh", background: "var(--bg-page)", color: "var(--text-primary)" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <AppHeader page={page} setPage={navigateTo} user={user} business={business} billingStatus={billingStatus} darkMode={darkMode} setDarkMode={setDarkMode} />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
        {billingStatus?.trialActive && billingStatus?.trialDaysLeft <= 3 && page !== "Billing" && (
          <div style={{ background: "#FAEEDA", border: "1px solid #FAC775", borderRadius: 10, padding: "10px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#633806", fontWeight: 500 }}>⚠️ Your free trial ends in {billingStatus.trialDaysLeft} day{billingStatus.trialDaysLeft !== 1 ? "s" : ""}</span>
            <button onClick={() => navigateTo("Billing")} style={{ ...btnStyle(true), fontSize: 12, padding: "5px 14px", background: "#854F0B" }}>Subscribe now →</button>
          </div>
        )}
        {billingStatus?.plan === "cancelled" && page !== "Billing" && (
          <div style={{ background: "#FCEBEB", border: "1px solid #f7c1c1", borderRadius: 10, padding: "10px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#A32D2D", fontWeight: 500 }}>Your subscription has ended — sending is disabled</span>
            <button onClick={() => navigateTo("Billing")} style={{ ...btnStyle(true), fontSize: 12, padding: "5px 14px", background: "#A32D2D" }}>Resubscribe →</button>
          </div>
        )}
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{pageTitles[page]?.[0]}</h1>
        <p style={{ margin: "0 0 28px", color: "var(--text-hint)", fontSize: 14 }}>{pageTitles[page]?.[1]}</p>

        {page === "Dashboard" && <DashboardPage user={user} business={business} billingStatus={billingStatus} setPage={navigateTo} />}
        {page === "Customers" && <CustomersPage user={user} showToast={showToast} />}
        {page === "Send Reminder" && <SendPage user={user} business={business} showToast={showToast} />}
        {page === "Templates" && <TemplatesPage showToast={showToast} />}
        {page === "History" && <HistoryPage user={user} />}
        {page === "Billing" && <BillingPage user={user} business={business} />}
        {page === "Schedules" && <SchedulesPage user={user} showToast={showToast} />}
        {page === "Settings" && <SettingsPage user={user} business={business} setBusiness={setBusiness} showToast={showToast} darkMode={darkMode} setDarkMode={setDarkMode} />}
        {page === "About" && <AboutPage />}
        {page === "Legal" && <LegalPage />}
        {page === "Feedback" && <FeedbackPage user={user} business={business} showToast={showToast} />}
        {page === "Admin" && user?.id === ADMIN_UID && <AdminPage />}
        {page === "Contact" && <ContactPage user={user} business={business} showToast={showToast} />}
        
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
