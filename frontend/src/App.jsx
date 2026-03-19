import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import logo from "./logo.png";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const TEMPLATES = [
  { id: 1, name: "Appointment Reminder", channel: "both", subject: "Reminder: Your appointment tomorrow", body: "Hi {name}, this is a reminder that you have an appointment scheduled for {date} at {time}. Please reply to confirm or call us to reschedule. See you soon!" },
  { id: 2, name: "Monthly Service Due", channel: "both", subject: "Time to schedule your monthly service", body: "Hi {name}, your monthly service is due! Give us a call or reply to this message to schedule at your convenience. We appreciate your business!" },
  { id: 3, name: "Follow-up Thank You", channel: "email", subject: "Thanks for your visit!", body: "Hi {name}, thank you for visiting us on {date}. We hope everything was to your satisfaction. We look forward to seeing you again soon!" },
  { id: 4, name: "Payment Due", channel: "sms", body: "Hi {name}, a friendly reminder that your payment of {amount} is due on {date}. Please contact us with any questions." },
];

const NAV = ["Customers", "Send Reminder", "Templates", "Schedules", "History", "Settings", "Legal"];

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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 480, position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
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

// ── Auth Screen ──

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
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
        const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password });
        if (error) throw error;
        if (data.user) {
          await supabase.from("businesses").insert({ id: data.user.id, name: form.name, email: form.email });
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
              <input style={inputStyle} placeholder="Business name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            )}
            <input style={inputStyle} placeholder="Email address" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            {mode !== "reset" && (
              <input style={inputStyle} placeholder="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleSubmit()} />
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
    if (editingCustomer) {
      const { error } = await supabase.from("customers").update({ ...form }).eq("id", editingCustomer.id);
      if (!error) { showToast(`${form.name} updated`, "success"); loadCustomers(); setShowModal(false); }
      else showToast("Update failed", "error");
    } else {
      const { error } = await supabase.from("customers").insert({ ...form, business_id: user.id });
      if (!error) { showToast(`${form.name} added`, "success"); loadCustomers(); setShowModal(false); }
      else showToast("Add failed", "error");
    }
  };

  const handleDelete = async (id, name) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (!error) { showToast(`${name} removed`, "success"); loadCustomers(); }
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 280, marginBottom: 0 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ ...btnStyle(false), cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
            📥 Import CSV
            <input type="file" accept=".csv" style={{ display: "none" }} onChange={e => handleCSVImport(e.target.files[0])} />
          </label>
          <button onClick={openAdd} style={btnStyle(true)}>+ Add Customer</button>
        </div>
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
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <p style={{ margin: 0 }}>{customers.length === 0 ? "No customers yet. Add your first one!" : "No customers match your search."}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, opacity: c.unsubscribed ? 0.6 : 1 }}>
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
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
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
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input style={{ ...inputStyle, marginBottom: 0, flex: 1 }} placeholder="Add a tag (e.g. VIP, monthly)" value={tagInput} onChange={e => setTagInput(e.target.value)}
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

  const handleSend = async () => {
    setSending(true);
    try {
      const selectedCustomers = customers.filter(c => selected.includes(c.id));
      const payload = {
        customers: selectedCustomers.map(c => ({
          ...c,
          channel: usePreferred ? c.preferred_channel : overrideChannel,
        })),
        subject: msg.subject,
        body: msg.body,
        vars,
        businessName: business?.name || "Remind Zen",
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
        showToast("Send failed: " + (data.error || "Unknown error"), "error");
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
      <div style={{ display: "flex", marginBottom: 32, position: "relative" }}>
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
          <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} placeholder="Message body... Use {name}, {date}, {time}, {amount} as variables" value={msg.body} onChange={e => setMsg({ ...msg, body: e.target.value })} />

          <p style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>Fill in variables (optional)</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="{date}" value={vars.date} onChange={e => setVars({ ...vars, date: e.target.value })} />
            <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="{time}" value={vars.time} onChange={e => setVars({ ...vars, time: e.target.value })} />
            <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="{amount}" value={vars.amount} onChange={e => setVars({ ...vars, amount: e.target.value })} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(1)} style={btnStyle(false)}>← Back</button>
            <button disabled={!canProceed2} onClick={() => setStep(3)} style={{ ...btnStyle(true), opacity: canProceed2 ? 1 : 0.4 }}>Preview →</button>
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
            <div style={{ background: "#fff", borderRadius: 8, padding: "14px 16px", border: "1px solid #eee", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "#333" }}>
              {resolveBody(msg.body)}
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
            <button onClick={handleSend} disabled={sending} style={{ ...btnStyle(true), minWidth: 160 }}>
              {sending ? "Sending..." : `Send to ${selected.length} Customer${selected.length > 1 ? "s" : ""}`}
            </button>
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

  useEffect(() => {
    supabase.from("send_history").select("*").eq("business_id", user.id).order("sent_at", { ascending: false }).limit(100)
      .then(({ data }) => { setHistory(data || []); setLoading(false); });
  }, []);

  const stats = {
    total: history.length,
    sent: history.filter(h => h.status === "sent").length,
    failed: history.filter(h => h.status === "failed").length,
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        {[["Total sent", stats.total, "#E6F1FB", "#185FA5"], ["Delivered", stats.sent, "#EAF3DE", "#3B6D11"], ["Failed", stats.failed, "#FCEBEB", "#A32D2D"]].map(([label, val, bg, col]) => (
          <div key={label} style={{ background: bg, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 12, color: col, fontWeight: 500, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: col }}>{val}</div>
          </div>
        ))}
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
          {history.map(h => (
            <div key={h.id} style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: "#1a1a1a" }}>{h.customer_name}</div>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{h.subject || h.body?.slice(0, 60) + "..."}</div>
              </div>
              <Badge type={h.channel} label={h.channel === "both" ? "Email + SMS" : h.channel?.toUpperCase()} />
              <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: h.status === "sent" ? "#EAF3DE" : "#FCEBEB", color: h.status === "sent" ? "#3B6D11" : "#A32D2D" }}>
                {h.status}
              </span>
              <div style={{ fontSize: 12, color: "#bbb", whiteSpace: "nowrap" }}>
                {new Date(h.sent_at).toLocaleDateString()} {new Date(h.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Settings Page ──

function SettingsPage({ user, business, setBusiness, showToast }) {
  const [form, setForm] = useState({ name: business?.name || "", email: business?.email || "" });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ newPass: "", confirm: "" });
  const [pwError, setPwError] = useState("");

  const saveBusiness = async () => {
    setSaving(true);
    const { error } = await supabase.from("businesses").upsert({ id: user.id, name: form.name, email: form.email });
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "24px 28px", marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600 }}>Business information</h3>
        <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Business name</label>
        <input style={inputStyle} placeholder="Your business name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Contact email</label>
        <input style={inputStyle} placeholder="Contact email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
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

      <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "24px 28px" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: "#A32D2D" }}>Sign out</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#aaa" }}>You'll need to sign back in to access your account.</p>
        <button onClick={handleSignOut} style={{ ...btnStyle(false), color: "#A32D2D", borderColor: "#f7c1c1" }}>Sign out</button>
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
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => toggleActive(s)} style={{ ...btnStyle(false), fontSize: 12, padding: "5px 14px" }}>{s.active ? "Pause" : "Resume"}</button>
                  <button onClick={() => handleDelete(s.id)} style={{ ...btnStyle(false), fontSize: 12, padding: "5px 14px", color: "#e24b4a", borderColor: "#f7c1c1" }}>Delete</button>
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

// ── Main App ──

export default function App() {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("Customers");
  const [toast, setToast] = useState(null);

  useEffect(() => {
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

  const pageTitles = {
    Customers: ["Customers", "Add, organize, and manage your customers"],

    "Send Reminder": ["Send Reminder", "Send personalized email and SMS reminders in seconds"],

    Templates: ["Templates", "Save time with reusable message templates"],

    History: ["Send History", "Track every message sent, delivered, and failed"],
    Schedules: ["Scheduled Reminders", "Set up automatic recurring reminders for your customers"],

    Settings: ["Settings", "Manage your Remind Zen account"],

    Legal: ["Legal", "Terms of service and privacy policy"],

  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", minHeight: "100vh", background: "#f7f8fa" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "0 32px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", height: 60, gap: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={logo} alt="Remind Zen" style={{ height: 36 }} />
          </div>
          <nav style={{ display: "flex", gap: 2, flex: 1 }}>
            {NAV.map(n => (
              <button key={n} onClick={() => setPage(n)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: page === n ? "#f0f6ff" : "transparent", color: page === n ? "#185FA5" : "#666", fontWeight: page === n ? 600 : 400, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                {n}
              </button>
            ))}
          </nav>
          <div style={{ fontSize: 12, color: "#bbb" }}>{business?.name || user.email}</div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 32px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>{pageTitles[page]?.[0]}</h1>
        <p style={{ margin: "0 0 28px", color: "#aaa", fontSize: 14 }}>{pageTitles[page]?.[1]}</p>

        {page === "Customers" && <CustomersPage user={user} showToast={showToast} />}
        {page === "Send Reminder" && <SendPage user={user} business={business} showToast={showToast} />}
        {page === "Templates" && <TemplatesPage showToast={showToast} />}
        {page === "History" && <HistoryPage user={user} />}
        {page === "Schedules" && <SchedulesPage user={user} showToast={showToast} />}
        {page === "Settings" && <SettingsPage user={user} business={business} setBusiness={setBusiness} showToast={showToast} />}
        {page === "Legal" && <LegalPage />}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
