import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import logo from "./logo.png";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const ADMIN_EMAIL = "remindzenco@gmail.com";
const ADMIN_UID = "2bd0487e-a317-4cbd-9871-70d87aacaf47";

const TEMPLATES = [
  { id: 1, name: "Appointment Reminder", channel: "both", subject: "Reminder: Your appointment tomorrow", body: "Hi {name}, this is a reminder that you have an appointment scheduled for {date} at {time}. Please reply to confirm or call us to reschedule. See you soon!" },
  { id: 2, name: "Monthly Service Due", channel: "both", subject: "Time to schedule your monthly service", body: "Hi {name}, your monthly service is due! Give us a call or reply to this message to schedule at your convenience. We appreciate your business!" },
  { id: 3, name: "Follow-up Thank You", channel: "email", subject: "Thanks for your visit!", body: "Hi {name}, thank you for visiting us on {date}. We hope everything was to your satisfaction. We look forward to seeing you again soon!" },
  { id: 4, name: "Payment Due", channel: "sms", body: "Hi {name}, a friendly reminder that your payment of {amount} is due on {date}. Please contact us with any questions." },
];

const NAV = ["Customers", "Send Reminder", "Templates", "Schedules", "History", "Billing", "Settings", "Legal", "Contact"];
const ADMIN_NAV = ["Customers", "Send Reminder", "Templates", "Schedules", "History", "Billing", "Settings", "Legal", "Contact", "Admin"];

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
      <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", padding: "24px 20px", width: "100%", maxWidth: 560, position: "relative", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#1a1a1a" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e0e0e0",
  fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 12,
  fontFamily: "inherit", background: "#fafafa",
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
      <span style={{ fontSize: 12, color: "#aaa" }}>{remaining} until next segment</span>
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

// ── Auth Screen ──

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", inviteCode: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

        const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password });
        if (error) throw error;
        if (data.user) {
          const trialEnd = new Date(Date.now() + trialDays * 86400000).toISOString();
          await supabase.from("businesses").insert({ id: data.user.id, name: form.name, email: form.email, trial_ends_at: trialEnd, plan: lockedPlan || "trial" });
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
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>
            {mode === "login" ? "Sign in to your account" : mode === "signup" ? "Create your business account" : "Reset your password"}
          </div>
        </div>

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
                <input style={{ ...inputStyle, textTransform: "uppercase" }} placeholder="Invite code (optional)" value={form.inviteCode} onChange={e => setForm({ ...form, inviteCode: e.target.value.toUpperCase() })} />
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
                <button onClick={() => setMode("reset")} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 13 }}>
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

// ── Customers Page ──

function CustomersPage({ user, showToast }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bulkSelected, setBulkSelected] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "", preferred_channel: "email", unsubscribed: false, sms_consent: false, sms_consent_at: null, tags: [] });

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
    setForm({ name: c.name, email: c.email || "", phone: c.phone || "", notes: c.notes || "", preferred_channel: c.preferred_channel || "email", unsubscribed: c.unsubscribed || false, sms_consent: c.sms_consent || false, sms_consent_at: c.sms_consent_at || null, tags: c.tags || [] });
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
      const { error } = await supabase.from("customers").update({ ...form }).eq("id", editingCustomer.id);
      if (!error) { showToast(`${form.name} updated`, "success"); loadCustomers(); setShowModal(false); }
      else showToast("Update failed", "error");
    } else {
      if (form.email) {
        const { data: dup } = await supabase.from("customers").select("id,name").eq("business_id", user.id).eq("email", form.email).single();
        if (dup) { showToast(`A customer with this email already exists: ${dup.name}`, "error"); return; }
      }
      if (form.phone) {
        const { data: dup } = await supabase.from("customers").select("id,name").eq("business_id", user.id).eq("phone", form.phone).single();
        if (dup) { showToast(`A customer with this phone number already exists: ${dup.name}`, "error"); return; }
      }
      const { error } = await supabase.from("customers").insert({ ...form, business_id: user.id });
      if (!error) { showToast(`${form.name} added`, "success"); loadCustomers(); setShowModal(false); }
      else showToast("Add failed", "error");
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
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);
    const matchesTag = !activeTag || (c.tags || []).includes(activeTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 8, flexWrap: "wrap" }}>
        <input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120, marginBottom: 0 }} />
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "#f0f6ff", borderRadius: 10, marginBottom: 12, border: "1px solid #b5d4f4" }}>
          <span style={{ fontSize: 14, color: "#185FA5", fontWeight: 500 }}>{bulkSelected.length} selected</span>
          <button onClick={handleBulkDelete} style={{ ...btnStyle(false), fontSize: 13, padding: "5px 14px", color: "#A32D2D", borderColor: "#f7c1c1" }}>Delete selected</button>
          <button onClick={() => setBulkSelected([])} style={{ ...btnStyle(false), fontSize: 13, padding: "5px 14px" }}>Clear selection</button>
        </div>
      )}

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
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
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
                <div style={{ fontWeight: 600, fontSize: 15, color: "#1a1a1a" }}>{c.name}</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2, display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {c.email && <span>✉ {c.email}</span>}
                  {c.phone && <span>📱 {c.phone}</span>}
                </div>
                {c.notes && <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>{c.notes}</div>}
                {c.tags && c.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                    {c.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 11, background: "#EEEDFE", color: "#3C3489", padding: "1px 8px", borderRadius: 99, fontWeight: 500 }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Badge type={c.preferred_channel} label={c.preferred_channel === "both" ? "Email + SMS" : c.preferred_channel?.toUpperCase()} />
                {c.unsubscribed && <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: "#F1EFE8", color: "#5F5E5A" }}>Opted out</span>}
              </div>
              <button onClick={() => openEdit(c)} title="Edit" style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 15, padding: 4 }}>✏️</button>
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
          <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Tags</label>
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
          <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Preferred reminder channel</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={form.preferred_channel} onChange={e => setForm({ ...form, preferred_channel: e.target.value })}>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="both">Email + SMS</option>
          </select>
          <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 4, paddingTop: 16, marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 12 }}>
              <input type="checkbox" checked={form.sms_consent} onChange={e => setForm({ ...form, sms_consent: e.target.checked, sms_consent_at: e.target.checked ? new Date().toISOString() : null })} style={{ width: 16, height: 16, cursor: "pointer", marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>SMS consent given</div>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Customer has agreed to receive SMS reminders. Required by TCPA before sending text messages.{form.sms_consent_at && <span style={{ display: "block", marginTop: 2, color: "#3B6D11" }}>Consent recorded {new Date(form.sms_consent_at).toLocaleDateString()}</span>}</div>
              </div>
            </label>
            {editingCustomer && (
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={form.unsubscribed} onChange={e => setForm({ ...form, unsubscribed: e.target.checked })} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#e24b4a" }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: form.unsubscribed ? "#A32D2D" : "#1a1a1a" }}>
                    {form.unsubscribed ? "Customer is opted out" : "Opt out of reminders"}
                  </div>
                  <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>
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
        const errMsg = data.results?.find(r => !r.success)?.error || data.error || "Unknown error";
        showToast("Send failed: " + errMsg, "error");
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
            <p style={{ margin: 0, color: "#888", fontSize: 14 }}>{selected.length} selected — opted-out customers are hidden</p>
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
            <p style={{ color: "#aaa", textAlign: "center", padding: "40px 0" }}>No customers yet. Add some from the Customers tab.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {(tagFilter ? customers.filter(c => (c.tags||[]).includes(tagFilter)) : customers).map(c => (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${selected.includes(c.id) ? "#185FA5" : "#f0f0f0"}`, background: selected.includes(c.id) ? "#f0f6ff" : "#fff", cursor: "pointer" }}>
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => setSelected(selected.includes(c.id) ? selected.filter(x => x !== c.id) : [...selected, c.id])} style={{ width: 16, height: 16, cursor: "pointer" }} />
                  <Avatar name={c.name} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{c.email} {c.phone && `· ${c.phone}`}</div>
                    {c.notes && <div style={{ fontSize: 11, color: "#aaa", marginTop: 2, fontStyle: "italic" }}>{c.notes}</div>}
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
          <div style={{ background: "#f9f9f9", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
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

          <p style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>Quick templates</p>
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

          <p style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>Fill in variables (optional)</p>
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
          <div style={{ background: "#f9f9f9", borderRadius: 12, padding: "20px 24px", marginBottom: 20, border: "1px solid #f0f0f0" }}>
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "#888" }}>
              Sending to {selected.length} customer{selected.length > 1 ? "s" : ""} · {usePreferred ? "using each customer's preferred channel" : overrideChannel === "both" ? "Email + SMS" : overrideChannel.toUpperCase()}
            </p>
            {msg.subject && <p style={{ margin: "0 0 8px", fontSize: 14 }}><strong>Subject:</strong> {msg.subject}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {customers.filter(c => selected.includes(c.id)).slice(0, 3).map(c => (
                <div key={c.id} style={{ background: "#fff", borderRadius: 8, padding: "12px 16px", border: "1px solid #eee", fontSize: 13, lineHeight: 1.7, color: "#333" }}>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4, fontWeight: 500 }}>Preview for {c.name}</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{resolveBody(msg.body, c.name)}</div>
                </div>
              ))}
              {selected.length > 3 && <div style={{ fontSize: 12, color: "#aaa", textAlign: "center" }}>+ {selected.length - 3} more recipients</div>}
            </div>
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#f0f0f0", borderRadius: 8, fontSize: 12, color: "#888" }}>
              — Sent by Remind Zen on behalf of {business?.name || "your business"}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
            {customers.filter(c => selected.includes(c.id)).map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0f6ff", borderRadius: 20, padding: "4px 12px" }}>
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
                <p style={{ fontSize: 14, color: "#444", marginBottom: 8, lineHeight: 1.7 }}>
                  You're about to send <strong>{selected.length} message{selected.length > 1 ? "s" : ""}</strong> to {selected.length} customer{selected.length > 1 ? "s" : ""}.
                </p>
                <p style={{ fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 1.7 }}>
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
          <div key={t.id} style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "16px 20px" }}>
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
            {t.subject && <p style={{ margin: "0 0 6px", fontSize: 13, color: "#888" }}>Subject: {t.subject}</p>}
            {editing === t.id && (
              <div style={{ background: "#f9f9f9", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, color: "#444", marginTop: 8, whiteSpace: "pre-wrap" }}>
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
            <input style={inputStyle} placeholder="Email subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
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
        <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>Loading history...</div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p style={{ margin: 0 }}>No messages sent yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 ? <p style={{ color: "#aaa", textAlign: "center", padding: "20px 0" }}>No results match your search.</p> : filtered.map(h => (
            <div key={h.id} style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: "#1a1a1a" }}>{h.customer_name}</div>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{h.subject || h.body?.slice(0, 60) + "..."}</div>
              </div>
              <Badge type={h.channel} label={h.channel === "both" ? "Email + SMS" : h.channel?.toUpperCase()} />
              <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: h.status === "sent" ? "#EAF3DE" : "#FCEBEB", color: h.status === "sent" ? "#3B6D11" : "#A32D2D" }} title={h.error || ""}>
                {h.status === "failed" && h.error ? "failed — hover for details" : h.status}
              </span>
              <div style={{ fontSize: 12, color: "#bbb", whiteSpace: "nowrap", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
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

function SettingsPage({ user, business, setBusiness, showToast }) {
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
      <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "24px 28px", marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600 }}>Business information</h3>
        <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Business name</label>
        <input style={inputStyle} placeholder="Your business name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Contact email</label>
        <input style={inputStyle} placeholder="Contact email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Timezone</label>
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
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Get a summary email each time an automated reminder schedule runs</div>
          </div>
        </label>
        <button onClick={saveBusiness} disabled={saving} style={btnStyle(true)}>{saving ? "Saving..." : "Save changes"}</button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "24px 28px", marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>Account</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#aaa" }}>Signed in as {user.email}</p>
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

      <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "24px 28px", marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: "#A32D2D" }}>Sign out</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#aaa" }}>You'll need to sign back in to access your account.</p>
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
    <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "24px 28px", marginBottom: 20 }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>Tag library</h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#aaa" }}>Define preset tags your team can pick from. Custom tags can still be added on the fly when editing customers.</p>
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
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#aaa" }}>Permanently delete your account and all associated data including customers, schedules, and send history. Your subscription will be cancelled automatically. This cannot be undone.</p>
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

function FeedbackPage({ user, business, showToast }) {
  const [form, setForm] = useState({ type: "bug", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.message.trim()) return;
    setSubmitting(true);
    try {
      const { data: biz } = await supabase.from("businesses").select("plan").eq("id", user.id).single();
      const isPro = biz?.plan === "pro";
      await supabase.from("feedback").insert({
        business_id: user.id,
        business_name: business?.name || "",
        email: user.email,
        type: isPro ? `pro_priority_${form.type}` : form.type,
        subject: isPro ? `[PRO] ${form.subject}` : form.subject,
        message: form.message,
      });
      setSubmitted(true);
      showToast("Feedback submitted — thank you!", "success");
    } catch (e) {
      showToast("Failed to submit feedback", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ maxWidth: 560, textAlign: "center", padding: "60px 0" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🙏</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>Thank you for your feedback!</h2>
        <p style={{ color: "#aaa", fontSize: 14, margin: "0 0 24px" }}>We review every submission and use it to improve Remind Zen.</p>
        <button onClick={() => { setSubmitted(false); setForm({ type: "bug", subject: "", message: "" }); }} style={btnStyle(false)}>Submit another</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, width: "100%" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[["bug", "🐛 Bug report"], ["feature", "✨ Feature request"], ["other", "💬 Other"]].map(([val, label]) => (
          <button key={val} onClick={() => setForm({ ...form, type: val })} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: form.type === val ? "#185FA5" : "#f0f0f0", color: form.type === val ? "#fff" : "#555", fontWeight: 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "24px 28px" }}>
        <input style={inputStyle} placeholder="Subject *" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
        <textarea style={{ ...inputStyle, minHeight: 140, resize: "vertical" }} placeholder={form.type === "bug" ? "Describe the bug — what happened, and what did you expect to happen?" : form.type === "feature" ? "Describe the feature you'd like to see and why it would be helpful." : "What's on your mind?"} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>Submitting as {user.email} · {business?.name}</div>
        <button onClick={handleSubmit} disabled={submitting || !form.subject.trim() || !form.message.trim()} style={{ ...btnStyle(true), opacity: (!form.subject.trim() || !form.message.trim()) ? 0.4 : 1 }}>
          {submitting ? "Submitting..." : "Submit feedback"}
        </button>
      </div>
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

  const markRead = async (f) => {
    await fetch(`${API}/admin/feedback/${f.id}/read`, { method: "POST", headers: adminHeaders });
    setFeedback(feedback.map(x => x.id === f.id ? { ...x, read: true } : x));
  };

  const unreadCount = feedback.filter(f => !f.read).length;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[["businesses", `Businesses (${businesses.length})`], ["feedback", `Feedback${unreadCount > 0 ? ` (${unreadCount} new)` : ""}`], ["invites", `Invite Codes (${inviteCodes.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: tab === key ? "#185FA5" : "#f0f0f0", color: tab === key ? "#fff" : "#555", fontWeight: 500, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>Loading...</div> : null}

      {!loading && tab === "businesses" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {businesses.map(b => (
            <div key={b.id} style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, opacity: b.suspended ? 0.6 : 1 }}>
              <Avatar name={b.name || b.email} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{b.name || "(no name)"}</div>
                <div style={{ fontSize: 13, color: "#888" }}>{b.email}</div>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Joined {new Date(b.created_at).toLocaleDateString()}</div>
              </div>
              {b.suspended && <span style={{ fontSize: 11, background: "#FCEBEB", color: "#A32D2D", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>Suspended</span>}
              <button onClick={() => toggleSuspend(b)} style={{ ...btnStyle(false), fontSize: 12, padding: "5px 14px", color: b.suspended ? "#3B6D11" : "#A32D2D", borderColor: b.suspended ? "#C0DD97" : "#f7c1c1" }}>
                {b.suspended ? "Reinstate" : "Suspend"}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "invites" && (
        <div>
          <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Create new invite code</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Code *</label>
                <input style={{ ...inputStyle, marginBottom: 0, textTransform: "uppercase" }} placeholder="e.g. EARLY2024" value={newCode.code} onChange={e => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Trial days</label>
                <input style={{ ...inputStyle, marginBottom: 0 }} type="number" min="1" max="365" value={newCode.trial_days} onChange={e => setNewCode({ ...newCode, trial_days: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Lock to plan</label>
                <select style={{ ...inputStyle, marginBottom: 0, cursor: "pointer" }} value={newCode.locked_plan} onChange={e => setNewCode({ ...newCode, locked_plan: e.target.value })}>
                  <option value="">No lock (free choice)</option>
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Max uses</label>
                <input style={{ ...inputStyle, marginBottom: 0 }} type="number" min="1" placeholder="Unlimited" value={newCode.max_uses} onChange={e => setNewCode({ ...newCode, max_uses: e.target.value })} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Note (internal only)</label>
                <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="e.g. Early adopter batch 1" value={newCode.note} onChange={e => setNewCode({ ...newCode, note: e.target.value })} />
              </div>
            </div>
            <button onClick={handleCreateCode} disabled={saving || !newCode.code.trim()} style={{ ...btnStyle(true), opacity: !newCode.code.trim() ? 0.4 : 1 }}>
              {saving ? "Creating..." : "Create invite code"}
            </button>
          </div>

          {inviteCodes.length === 0 ? (
            <p style={{ color: "#aaa", textAlign: "center", padding: "40px 0" }}>No invite codes yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {inviteCodes.map(c => (
                <div key={c.id} style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, opacity: c.active ? 1 : 0.6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, fontFamily: "monospace", color: "#185FA5" }}>{c.code}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: c.active ? "#EAF3DE" : "#F1EFE8", color: c.active ? "#3B6D11" : "#5F5E5A" }}>{c.active ? "Active" : "Inactive"}</span>
                      {c.locked_plan && <span style={{ fontSize: 11, background: "#EEEDFE", color: "#3C3489", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>{c.locked_plan}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#aaa", display: "flex", gap: 16, flexWrap: "wrap" }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {feedback.length === 0 && <p style={{ color: "#aaa", textAlign: "center", padding: "40px 0" }}>No feedback yet.</p>}
          {feedback.map(f => (
            <div key={f.id} style={{ background: f.read ? "#fff" : "#f0f6ff", border: `1px solid ${f.read ? "#f0f0f0" : "#b5d4f4"}`, borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{f.subject}</span>
                  {f.type?.startsWith("pro_priority") && <span style={{ marginLeft: 8, fontSize: 11, background: "#FAEEDA", color: "#633806", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>⭐ PRO</span>}
                  <span style={{ marginLeft: 8, fontSize: 11, background: f.type?.includes("bug") ? "#FCEBEB" : f.type?.includes("feature") ? "#EEEDFE" : "#F1EFE8", color: f.type?.includes("bug") ? "#A32D2D" : f.type?.includes("feature") ? "#3C3489" : "#5F5E5A", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>{f.type?.replace("pro_priority_", "")}</span>
                  {!f.read && <span style={{ marginLeft: 8, fontSize: 11, background: "#E6F1FB", color: "#185FA5", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>New</span>}
                </div>
                <div style={{ fontSize: 12, color: "#aaa" }}>{new Date(f.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ fontSize: 13, color: "#444", marginBottom: 8, lineHeight: 1.6 }}>{f.message}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#aaa" }}>{f.business_name} · {f.email}</div>
                {!f.read && <button onClick={() => markRead(f)} style={{ ...btnStyle(false), fontSize: 12, padding: "4px 12px" }}>Mark as read</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>Welcome to Remind Zen!</h2>
            <p style={{ color: "#888", fontSize: 14, margin: "0 0 32px", lineHeight: 1.7 }}>Let's get you set up in 3 quick steps. It only takes a minute.</p>
            <button onClick={() => setStep(2)} style={{ ...btnStyle(true), width: "100%", marginBottom: 12 }}>Get started →</button>
            <button onClick={skipToApp} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 13 }}>Skip and go to the app</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Add your first customer</h2>
            <p style={{ color: "#aaa", fontSize: 13, margin: "0 0 20px" }}>You can add more later — just start with one to try it out.</p>
            <input style={inputStyle} placeholder="Full name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input style={inputStyle} placeholder="Email address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input style={inputStyle} placeholder="Phone number (+1XXXXXXXXXX)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Preferred channel</label>
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
            <p style={{ color: "#888", fontSize: 14, margin: "0 0 8px", lineHeight: 1.7 }}>Your first customer has been added. Head to <strong>Send Reminder</strong> to send your first message, or set up a <strong>Schedule</strong> for automatic recurring reminders.</p>
            <p style={{ color: "#aaa", fontSize: 13, margin: "0 0 28px" }}>You can always add more customers, templates, and schedules from the main nav.</p>
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
  const [form, setForm] = useState({ name: "", cadence: "weekly", day_of_week: "1", day_of_month: "1", interval_days: "7", send_time: "09:00", channel: "preferred", subject: "", body: "", tag_filter: "", customer_ids: [] });

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
        <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>Loading...</div>
      ) : schedules.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗓</div>
          <p style={{ margin: 0 }}>No schedules yet. Create one to start sending reminders automatically.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {schedules.map(s => (
            <div key={s.id} style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "16px 20px", opacity: s.active ? 1 : 0.6 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: "#1a1a1a" }}>{s.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: s.active ? "#EAF3DE" : "#F1EFE8", color: s.active ? "#3B6D11" : "#5F5E5A" }}>
                      {s.active ? "Active" : "Paused"}
                    </span>
                    {s.tag_filter && <span style={{ fontSize: 11, background: "#EEEDFE", color: "#3C3489", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>{s.tag_filter}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>{cadenceLabel(s)}</div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>{s.subject || s.body?.slice(0, 60) + "..."}</div>
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
          <input style={inputStyle} placeholder="Schedule name (e.g. Monthly lawn reminder) *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

          <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Send to</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={form.tag_filter} onChange={e => setForm({ ...form, tag_filter: e.target.value })}>
            <option value="">All customers</option>
            {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>

          <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Cadence</label>
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

          <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Send time</label>
          <input style={inputStyle} type="time" value={form.send_time} onChange={e => setForm({ ...form, send_time: e.target.value })} />

          <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Channel</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>
            <option value="preferred">Each customer's preferred channel</option>
            <option value="email">Email only</option>
            <option value="sms">SMS only</option>
            <option value="both">Email + SMS</option>
          </select>

          {(form.channel === "email" || form.channel === "both" || form.channel === "preferred") && (
            <input style={inputStyle} placeholder="Email subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          )}
          <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} placeholder="Message body... Use {name}, {date}, {time}, {amount}" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />

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

  if (loading) return <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>Loading billing info...</div>;

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
        <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 4 }}>Current plan</div>
              <span style={{ background: planInfo.bg, color: planInfo.color, fontWeight: 600, fontSize: 15, padding: "4px 14px", borderRadius: 99 }}>{planInfo.name}</span>
            </div>
            <button onClick={handleManageBilling} disabled={redirecting} style={btnStyle(false)}>
              {redirecting ? "Opening..." : "Manage billing →"}
            </button>
          </div>
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "#888" }}>Messages this month</span>
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
                <span style={{ fontSize: 30, fontWeight: 700, color: "#1a1a1a" }}>${price}</span>
                <span style={{ fontSize: 13, color: "#aaa" }}>{period}</span>
                {annual && <div style={{ fontSize: 11, color: "#3B6D11", marginTop: 2 }}>${plan.monthlyPrice}/mo billed annually</div>}
              </div>
              <div style={{ flex: 1, marginBottom: 20 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", gap: 8, fontSize: 13, color: "#555", padding: "4px 0" }}>
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

      <div style={{ fontSize: 12, color: "#aaa", textAlign: "center", lineHeight: 1.8 }}>
        All plans include a 14-day free trial · No credit card required to start<br />
        Overages: $0.01/email · $0.05/SMS above plan limit · Cancel anytime<br />
        * Feature coming soon
      </div>
    </div>
  );
}

// ── Contact Page ──

function ContactPage() {
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "28px 32px", marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Get in touch</h3>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "#888", lineHeight: 1.7 }}>
          Have a question, found a bug, or need help with your account? We're here to help.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✉️</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Email support</div>
              <a href="mailto:remindzenco@gmail.com" style={{ fontSize: 13, color: "#185FA5" }}>remindzenco@gmail.com</a>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>We typically respond within 1 business day</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>💬</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>In-app feedback</div>
              <div style={{ fontSize: 13, color: "#888" }}>Use the "Send feedback" button at the top of any page to submit bug reports or feature requests directly.</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "28px 32px", marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Common questions</h3>
        {[
          ["Why didn't my SMS send?", "Make sure the phone number is in +1XXXXXXXXXX format. Also check that the customer has not opted out — opted-out customers are automatically skipped. If the issue persists, contact us and we'll look into it."],
          ["Why isn't my scheduled reminder firing?", "Check that the schedule is set to Active in the Schedules tab, and that your timezone is set correctly in Settings. Schedules fire based on your selected timezone."],
          ["How do I import my customers?", "Go to the Customers tab and click 'Import CSV'. Your CSV should have columns named: name, email, phone, notes, preferred_channel."],
          ["How do I cancel my account?", "Go to Settings → Delete account. This permanently removes all your data. If you need help, email us first."],
        ].map(([q, a]) => (
          <details key={q} style={{ marginBottom: 12, borderBottom: "1px solid #f0f0f0", paddingBottom: 12 }}>
            <summary style={{ fontSize: 14, fontWeight: 500, cursor: "pointer", color: "#1a1a1a" }}>{q}</summary>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#888", lineHeight: 1.7 }}>{a}</p>
          </details>
        ))}
      </div>

      <div style={{ background: "#f9f9f9", borderRadius: 12, padding: "20px 24px", fontSize: 13, color: "#aaa", lineHeight: 1.7 }}>
        <strong style={{ color: "#888" }}>Remind Zen LLC</strong> · Ventura, CA · <a href="mailto:remindzenco@gmail.com" style={{ color: "#185FA5" }}>remindzenco@gmail.com</a>
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
        <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "32px 36px", lineHeight: 1.8, fontSize: 14, color: "#333" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>Terms of Service</h2>
          <p style={{ margin: "0 0 24px", color: "#aaa", fontSize: 13 }}>Last updated: {today}</p>

          <p>These Terms of Service ("Terms") govern your use of the Remind Zen platform ("Service") operated by Remind Zen LLC ("us", "we", or "our"). By accessing or using our Service, you agree to be bound by these Terms.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>1. Use of the Service</h3>
          <p>Remind Zen provides a customer reminder platform that allows businesses to send email and SMS messages to their customers. You are responsible for all activity that occurs under your account. You must not use the Service for any unlawful purpose or in violation of any regulations, including but not limited to the CAN-SPAM Act and the Telephone Consumer Protection Act (TCPA).</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>2. Customer consent</h3>
          <p>You are solely responsible for ensuring that your customers have given proper consent to receive communications from you before sending them messages through our Service. You must maintain records of customer consent and provide opt-out mechanisms in all communications. We reserve the right to suspend accounts that violate consent requirements.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>3. Prohibited content</h3>
          <p>You may not use the Service to send spam, unsolicited messages, misleading content, illegal content, or any messages that violate the rights of third parties. We reserve the right to remove content and suspend accounts that violate these policies without notice.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>4. Account responsibility</h3>
          <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We are not liable for any loss or damage arising from your failure to protect your account information.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>5. Service availability</h3>
          <p>We strive to maintain reliable service but do not guarantee uninterrupted or error-free operation. We reserve the right to modify, suspend, or discontinue the Service at any time with reasonable notice.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>6. Limitation of liability</h3>
          <p>To the maximum extent permitted by law, Remind Zen LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability to you shall not exceed the amounts paid by you to us in the three months preceding the claim.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>7. Changes to terms</h3>
          <p>We reserve the right to update these Terms at any time. We will notify you of significant changes by email or by posting a notice within the Service. Your continued use of the Service after changes constitutes your acceptance of the new Terms.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>8. Contact</h3>
          <p style={{ margin: 0 }}>For questions about these Terms, contact us at <a href="mailto:remindzenco@gmail.com" style={{ color: "#185FA5" }}>remindzenco@gmail.com</a>.</p>
        </div>
      )}

      {tab === "privacy" && (
        <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "32px 36px", lineHeight: 1.8, fontSize: 14, color: "#333" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>Privacy Policy</h2>
          <p style={{ margin: "0 0 24px", color: "#aaa", fontSize: 13 }}>Last updated: {today}</p>

          <p>Remind Zen LLC ("we", "us", or "our") operates the Remind Zen platform. This Privacy Policy explains how we collect, use, and protect information when you use our Service.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>1. Information we collect</h3>
          <p>We collect information you provide directly to us, including your business name, email address, and password when you create an account. We also store customer contact information (names, email addresses, phone numbers) that you enter into the platform on behalf of your business.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>2. How we use your information</h3>
          <p>We use the information we collect to provide and operate the Service, send messages on your behalf to your customers, maintain send history and analytics, and communicate with you about your account. We do not sell your data or your customers' data to third parties.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>3. Customer data</h3>
          <p>You retain ownership of all customer data you upload to the Service. We process this data solely on your behalf and in accordance with your instructions. You are responsible for ensuring you have proper authorization to store and use your customers' contact information.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>4. Data storage & security</h3>
          <p>Your data is stored securely using Supabase, a SOC 2 compliant database provider. We implement industry-standard security measures including encryption in transit and at rest. However, no method of transmission over the Internet is 100% secure.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>5. Third-party services</h3>
          <p>We use SendGrid to deliver email messages and Twilio to deliver SMS messages on your behalf. These providers may process recipient email addresses and phone numbers as part of message delivery. Please review their respective privacy policies for details.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>6. Data retention</h3>
          <p>We retain your account data for as long as your account is active. You may delete your account and associated data at any time by contacting us. Send history is retained for 12 months for compliance and support purposes.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>7. Your rights</h3>
          <p>You have the right to access, correct, or delete your personal information at any time. To exercise these rights, contact us at the address below. California residents may have additional rights under the CCPA.</p>

          <h3 style={{ margin: "24px 0 8px", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>8. Contact</h3>
          <p style={{ margin: 0 }}>For privacy-related questions, contact us at <a href="mailto:remindzenco@gmail.com" style={{ color: "#185FA5" }}>remindzenco@gmail.com</a> or write to Remind Zen LLC, Ventura, CA.</p>
        </div>
      )}
    </div>
  );
}


// ── App Header ──

function AppHeader({ page, setPage, user, business, billingStatus }) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = user?.id === ADMIN_UID ? ADMIN_NAV : NAV;

  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: isMobile ? "0 16px" : "0 32px", position: "relative" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", height: 56, gap: isMobile ? 8 : 24 }}>
        <img src={logo} alt="Remind Zen" style={{ height: 32, flexShrink: 0, cursor: "pointer" }} onClick={() => setPage("Customers")} />

        {!isMobile && (
          <nav style={{ display: "flex", gap: 2, flex: 1, flexWrap: "nowrap", overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {nav.map(n => (
              <button key={n} onClick={() => setPage(n)} style={{ padding: "5px 10px", borderRadius: 8, border: "none", background: page === n ? "#f0f6ff" : "transparent", color: page === n ? "#185FA5" : "#666", fontWeight: page === n ? 600 : 400, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {n}
              </button>
            ))}
          </nav>
        )}

        {isMobile && <div style={{ flex: 1 }} />}

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {!isMobile && (
            <>
              {billingStatus && (
                <button onClick={() => setPage("Billing")} title="Message usage this month" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, border: "1px solid #f0f0f0" }}>
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
              <div style={{ fontSize: 11, color: "#bbb", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{business?.name || ""}</div>
            </>
          )}
          {billingStatus && isMobile && (
            <button onClick={() => {}} title="Message usage" style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 8px", display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 28, height: 3, borderRadius: 99, background: "#f0f0f0", overflow: "hidden" }}>
                <div style={{ height: 3, borderRadius: 99, background: billingStatus.messagesUsed / billingStatus.messageLimit > 0.9 ? "#E24B4A" : "#185FA5", width: `${Math.min(100, Math.round(billingStatus.messagesUsed / billingStatus.messageLimit * 100))}%` }} />
              </div>
            </button>
          )}
          {isMobile && (
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, padding: 4, color: "#555" }}>
              {menuOpen ? "✕" : "☰"}
            </button>
          )}
        </div>
      </div>

      {isMobile && menuOpen && (
        <div style={{ background: "#fff", borderTop: "1px solid #f0f0f0", padding: "8px 0 16px" }}>
          {nav.map(n => (
            <button key={n} onClick={() => { setPage(n); setMenuOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 20px", border: "none", background: page === n ? "#f0f6ff" : "transparent", color: page === n ? "#185FA5" : "#444", fontWeight: page === n ? 600 : 400, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
              {n}
            </button>
          ))}
          <div style={{ borderTop: "1px solid #f0f0f0", margin: "8px 0", padding: "8px 20px 0" }}>
            <button onClick={() => { setPage("Feedback"); setMenuOpen(false); }} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14, padding: 0, fontFamily: "inherit" }}>Send feedback</button>
          </div>
          <div style={{ fontSize: 12, color: "#bbb", padding: "4px 20px" }}>{business?.name || user?.email}</div>
        </div>
      )}
    </div>
  );
}

// ── Main App ──

export default function App() {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("Customers");
  const [toast, setToast] = useState(null);
  const [billingStatus, setBillingStatus] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Handle Stripe redirect back to app
    const params = new URLSearchParams(window.location.search);
    if (params.get("session_id")) {
      // Payment successful - clean URL and go to billing page
      window.history.replaceState({}, "", window.location.pathname);
      setPage("Billing");
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
  };

  const completeOnboarding = async () => {
    await supabase.from("businesses").update({ onboarded: true }).eq("id", user.id);
    setBusiness(prev => ({ ...prev, onboarded: true }));
  };

  const showToast = (msg, type = "success") => setToast({ msg, type });

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f8fa" }}>
        <div style={{ fontSize: 14, color: "#aaa" }}>Loading...</div>
      </div>
    );
  }

  if (!user) return <AuthScreen onAuth={setUser} />;
  if (showOnboarding) return <OnboardingWizard user={user} onComplete={() => { setShowOnboarding(false); localStorage.setItem("onboarding_complete", "1"); }} />;
  if (user && business && business.onboarded === false && !localStorage.getItem("onboarding_complete")) return <OnboardingWizard user={user} onComplete={completeOnboarding} />;

  const pageTitles = {
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
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", minHeight: "100vh", background: "#f7f8fa" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <AppHeader page={page} setPage={setPage} user={user} business={business} billingStatus={billingStatus} />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
        {billingStatus?.trialActive && billingStatus?.trialDaysLeft <= 3 && page !== "Billing" && (
          <div style={{ background: "#FAEEDA", border: "1px solid #FAC775", borderRadius: 10, padding: "10px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#633806", fontWeight: 500 }}>⚠️ Your free trial ends in {billingStatus.trialDaysLeft} day{billingStatus.trialDaysLeft !== 1 ? "s" : ""}</span>
            <button onClick={() => setPage("Billing")} style={{ ...btnStyle(true), fontSize: 12, padding: "5px 14px", background: "#854F0B" }}>Subscribe now →</button>
          </div>
        )}
        {billingStatus?.plan === "cancelled" && page !== "Billing" && (
          <div style={{ background: "#FCEBEB", border: "1px solid #f7c1c1", borderRadius: 10, padding: "10px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#A32D2D", fontWeight: 500 }}>Your subscription has ended — sending is disabled</span>
            <button onClick={() => setPage("Billing")} style={{ ...btnStyle(true), fontSize: 12, padding: "5px 14px", background: "#A32D2D" }}>Resubscribe →</button>
          </div>
        )}
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>{pageTitles[page]?.[0]}</h1>
        <p style={{ margin: "0 0 28px", color: "#aaa", fontSize: 14 }}>{pageTitles[page]?.[1]}</p>

        {page === "Customers" && <CustomersPage user={user} showToast={showToast} />}
        {page === "Send Reminder" && <SendPage user={user} business={business} showToast={showToast} />}
        {page === "Templates" && <TemplatesPage showToast={showToast} />}
        {page === "History" && <HistoryPage user={user} />}
        {page === "Billing" && <BillingPage user={user} business={business} />}
        {page === "Schedules" && <SchedulesPage user={user} showToast={showToast} />}
        {page === "Settings" && <SettingsPage user={user} business={business} setBusiness={setBusiness} showToast={showToast} />}
        {page === "Legal" && <LegalPage />}
        {page === "Feedback" && <FeedbackPage user={user} business={business} showToast={showToast} />}
        {page === "Admin" && <AdminPage user={user} showToast={showToast} />}
        {page === "Admin" && user?.id === ADMIN_UID && <AdminPage />}
        {page === "Contact" && <ContactPage />}
        {page === "Feedback" && <FeedbackPage user={user} business={business} showToast={showToast} />}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
