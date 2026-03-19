import { useState, useEffect } from "react";

const API = "https://remindzen.onrender.com";

const TEMPLATES = [
  { id: 1, name: "Appointment Reminder", channel: "both", subject: "Reminder: Your appointment tomorrow", body: "Hi {name}, this is a reminder that you have an appointment scheduled for {date} at {time}. Please reply to confirm or call us to reschedule. See you soon!" },
  { id: 2, name: "Monthly Service Due", channel: "both", subject: "Time to schedule your monthly service", body: "Hi {name}, your monthly service is due! Give us a call or reply to this message to schedule at your convenience. We appreciate your business!" },
  { id: 3, name: "Follow-up Thank You", channel: "email", subject: "Thanks for your visit!", body: "Hi {name}, thank you for visiting us on {date}. We hope everything was to your satisfaction. We look forward to seeing you again soon!" },
  { id: 4, name: "Payment Due", channel: "sms", body: "Hi {name}, a friendly reminder that your payment of {amount} is due on {date}. Please contact us with any questions." },
];

const NAV = ["Customers", "Send Reminder", "Templates"];

function Badge({ type, label }) {
  const colors = {
    email: { bg: "#E6F1FB", color: "#185FA5" },
    sms: { bg: "#EAF3DE", color: "#3B6D11" },
    both: { bg: "#EEEDFE", color: "#3C3489" },
  };
  const c = colors[type] || colors.both;
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {label || type}
    </span>
  );
}

function Avatar({ name }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#B5D4F4", "#9FE1CB", "#FAC775", "#F5C4B3", "#CEC BF6", "#C0DD97"];
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 480, position: "relative" }}>
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

// ── Customers Page ──
function CustomersPage({ customers, setCustomers, showToast }) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const newCustomer = { id: Date.now(), ...form };
    const updated = [...customers, newCustomer];
    setCustomers(updated);
    localStorage.setItem("customers", JSON.stringify(updated));
    showToast(`${form.name} added`, "success");
    setForm({ name: "", email: "", phone: "", notes: "" });
    setShowModal(false);
  };

  const handleDelete = (id, name) => {
    const updated = customers.filter(c => c.id !== id);
    setCustomers(updated);
    localStorage.setItem("customers", JSON.stringify(updated));
    showToast(`${name} removed`, "success");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 280, marginBottom: 0 }} />
        <button onClick={() => setShowModal(true)} style={btnStyle(true)}>+ Add Customer</button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <p style={{ margin: 0 }}>No customers yet. Add your first one!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar name={c.name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#1a1a1a" }}>{c.name}</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2, display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {c.email && <span>✉ {c.email}</span>}
                  {c.phone && <span>📱 {c.phone}</span>}
                </div>
                {c.notes && <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>{c.notes}</div>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {c.email && <Badge type="email" />}
                {c.phone && <Badge type="sms" />}
              </div>
              <button onClick={() => handleDelete(c.id, c.name)} style={{ background: "none", border: "none", color: "#ddd", cursor: "pointer", fontSize: 18, padding: 4 }}>🗑</button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Add Customer" onClose={() => setShowModal(false)}>
          <input style={inputStyle} placeholder="Full name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input style={inputStyle} placeholder="Email address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input style={inputStyle} placeholder="Phone number (+1XXXXXXXXXX)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => setShowModal(false)} style={btnStyle(false)}>Cancel</button>
            <button onClick={handleAdd} style={btnStyle(true)}>Add Customer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Send Reminder Page ──
function SendPage({ customers, showToast }) {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState([]);
  const [channel, setChannel] = useState("email");
  const [templateId, setTemplateId] = useState(null);
  const [msg, setMsg] = useState({ subject: "", body: "" });
  const [vars, setVars] = useState({ date: "", time: "", amount: "" });
  const [sending, setSending] = useState(false);

  const template = TEMPLATES.find(t => t.id === templateId);

  const applyTemplate = (t) => {
    setTemplateId(t.id);
    setMsg({ subject: t.subject || "", body: t.body });
  };

  const resolveBody = (body) => {
    if (!body) return "";
    return body
      .replace(/{name}/g, "(customer name)")
      .replace(/{date}/g, vars.date || "{date}")
      .replace(/{time}/g, vars.time || "{time}")
      .replace(/{amount}/g, vars.amount || "{amount}");
  };

  const handleSend = async () => {
    if (selected.length === 0) return;
    setSending(true);
    try {
      const payload = {
        customers: customers.filter(c => selected.includes(c.id)),
        channel,
        subject: msg.subject,
        body: msg.body,
        vars,
      };
      const res = await fetch(`${API}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        showToast(`Sent to ${selected.length} customer${selected.length > 1 ? "s" : ""}!`, "success");
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
  const canProceed2 = msg.body.trim().length > 0 && (channel === "sms" || msg.subject.trim().length > 0);

  const channelTabs = ["email", "sms", "both"];

  return (
    <div>
      {/* Stepper */}
      <div style={{ display: "flex", gap: 0, marginBottom: 32, position: "relative" }}>
        {steps.map((s, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: done ? "pointer" : "default" }} onClick={() => done && setStep(n)}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: done ? "#185FA5" : active ? "#185FA5" : "#f0f0f0", color: (done || active) ? "#fff" : "#aaa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, zIndex: 1, position: "relative" }}>
                {done ? "✓" : n}
              </div>
              <div style={{ fontSize: 12, marginTop: 6, fontWeight: active ? 600 : 400, color: active ? "#185FA5" : "#aaa" }}>{s}</div>
              {i < steps.length - 1 && <div style={{ position: "absolute", top: 15, left: `${(i + 1) * (100 / steps.length)}%`, width: `${100 / steps.length}%`, height: 1, background: done ? "#185FA5" : "#f0f0f0", zIndex: 0 }} />}
            </div>
          );
        })}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{ margin: 0, color: "#888", fontSize: 14 }}>Select customers to send to ({selected.length} selected)</p>
            <button onClick={() => setSelected(selected.length === customers.length ? [] : customers.map(c => c.id))} style={{ ...btnStyle(false), fontSize: 13, padding: "6px 14px" }}>
              {selected.length === customers.length ? "Deselect All" : "Select All"}
            </button>
          </div>
          {customers.length === 0 ? (
            <p style={{ color: "#aaa", textAlign: "center", padding: "40px 0" }}>No customers yet. Add some from the Customers tab.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {customers.map(c => (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${selected.includes(c.id) ? "#185FA5" : "#f0f0f0"}`, background: selected.includes(c.id) ? "#f0f6ff" : "#fff", cursor: "pointer" }}>
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => setSelected(selected.includes(c.id) ? selected.filter(x => x !== c.id) : [...selected, c.id])} style={{ width: 16, height: 16, cursor: "pointer" }} />
                  <Avatar name={c.name} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{c.email} {c.phone && `· ${c.phone}`}</div>
                  </div>
                  {c.email && <Badge type="email" />}
                  {c.phone && <Badge type="sms" />}
                </label>
              ))}
            </div>
          )}
          <button disabled={!canProceed1} onClick={() => setStep(2)} style={{ ...btnStyle(true), opacity: canProceed1 ? 1 : 0.4 }}>Continue →</button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div>
          {/* Channel */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {channelTabs.map(ch => (
              <button key={ch} onClick={() => setChannel(ch)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: channel === ch ? "#185FA5" : "#f4f4f4", color: channel === ch ? "#fff" : "#555", fontWeight: 500, fontSize: 13, cursor: "pointer", textTransform: "capitalize" }}>
                {ch === "both" ? "Email + SMS" : ch.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Templates */}
          <p style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>Quick templates</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => applyTemplate(t)} style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${templateId === t.id ? "#185FA5" : "#e8e8e8"}`, background: templateId === t.id ? "#f0f6ff" : "#fff", color: templateId === t.id ? "#185FA5" : "#555", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                {t.name}
              </button>
            ))}
          </div>

          {(channel === "email" || channel === "both") && (
            <input style={inputStyle} placeholder="Email subject *" value={msg.subject} onChange={e => setMsg({ ...msg, subject: e.target.value })} />
          )}
          <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} placeholder="Message body... Use {name}, {date}, {time}, {amount} as variables" value={msg.body} onChange={e => setMsg({ ...msg, body: e.target.value })} />

          <p style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>Fill in variables (optional)</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="{date} value" value={vars.date} onChange={e => setVars({ ...vars, date: e.target.value })} />
            <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="{time} value" value={vars.time} onChange={e => setVars({ ...vars, time: e.target.value })} />
            <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="{amount} value" value={vars.amount} onChange={e => setVars({ ...vars, amount: e.target.value })} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(1)} style={btnStyle(false)}>← Back</button>
            <button disabled={!canProceed2} onClick={() => setStep(3)} style={{ ...btnStyle(true), opacity: canProceed2 ? 1 : 0.4 }}>Preview →</button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div>
          <div style={{ background: "#f9f9f9", borderRadius: 12, padding: "20px 24px", marginBottom: 20, border: "1px solid #f0f0f0" }}>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "#888" }}>Sending to {selected.length} customer{selected.length > 1 ? "s" : ""} via <strong>{channel === "both" ? "Email + SMS" : channel.toUpperCase()}</strong></p>
            {msg.subject && <p style={{ margin: "0 0 8px", fontSize: 14 }}><strong>Subject:</strong> {msg.subject}</p>}
            <div style={{ background: "#fff", borderRadius: 8, padding: "14px 16px", border: "1px solid #eee", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "#333" }}>
              {resolveBody(msg.body)}
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
            <button onClick={handleSend} disabled={sending} style={{ ...btnStyle(true), minWidth: 140 }}>
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

// ── Main App ──
export default function App() {
  const [page, setPage] = useState("Customers");
  const [customers, setCustomers] = useState(() => JSON.parse(localStorage.getItem("customers") || "[]"));
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", minHeight: "100vh", background: "#f7f8fa" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "0 32px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", height: 60, gap: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#185FA5", letterSpacing: "-0.5px" }}>
            📅 RemindMe
          </div>
          <nav style={{ display: "flex", gap: 4, flex: 1 }}>
            {NAV.map(n => (
              <button key={n} onClick={() => setPage(n)} style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: page === n ? "#f0f6ff" : "transparent", color: page === n ? "#185FA5" : "#666", fontWeight: page === n ? 600 : 400, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                {n}
              </button>
            ))}
          </nav>
          <div style={{ fontSize: 12, color: "#bbb" }}>{customers.length} customer{customers.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 32px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>{page}</h1>
        <p style={{ margin: "0 0 28px", color: "#aaa", fontSize: 14 }}>
          {page === "Customers" && "Manage your customer list"}
          {page === "Send Reminder" && "Send email and SMS reminders to your customers"}
          {page === "Templates" && "Reusable message templates"}
        </p>

        {page === "Customers" && <CustomersPage customers={customers} setCustomers={setCustomers} showToast={showToast} />}
        {page === "Send Reminder" && <SendPage customers={customers} showToast={showToast} />}
        {page === "Templates" && <TemplatesPage showToast={showToast} />}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
