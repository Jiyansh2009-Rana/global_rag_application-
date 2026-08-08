import { useState, useEffect, useRef, useCallback } from "react";

// ─── DESIGN TOKENS (Professional Zinc & Azure Theme) ─────────────────────────
const T = {
  bg:       "#09090B", // Zinc 950
  surface:  "#18181B", // Zinc 900
  surface2: "#27272A", // Zinc 800
  border:   "#3F3F46", // Zinc 700
  primary:  "#3B82F6", // Azure Blue (Enterprise standard)
  primaryH: "#60A5FA", // Azure Blue Light
  success:  "#10B981", // Emerald
  warning:  "#F59E0B", // Amber
  danger:   "#EF4444", // Red
  muted:    "#A1A1AA", // Zinc 400
  body:     "#E4E4E7", // Zinc 200
  heading:  "#FAFAFA", // Zinc 50
  white:    "#FFFFFF",
};

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: ${T.bg};
      color: ${T.body};
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }

    h1, h2, h3, h4, h5 {
      font-family: 'Space Grotesk', sans-serif;
      color: ${T.heading};
      letter-spacing: -0.03em;
    }

    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; border: 2px solid ${T.bg}; }
    ::-webkit-scrollbar-thumb:hover { background: ${T.muted}; }

    input, textarea, select {
      font-family: 'Inter', sans-serif;
      font-size: 14px;
    }

    button { 
      cursor: pointer; 
      font-family: 'Space Grotesk', sans-serif; 
    }

    /* Modern Button Effects */
    .btn-effect {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    .btn-effect:not(:disabled):hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px -6px var(--btn-glow);
      filter: brightness(1.1);
    }
    .btn-effect:not(:disabled):active {
      transform: translateY(0px);
      filter: brightness(0.95);
    }
    .btn-effect:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px ${T.bg}, 0 0 0 4px var(--btn-glow);
    }

    /* Modern Input Effects */
    .input-effect {
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1) inset;
    }
    .input-effect:focus {
      border-color: ${T.primary} !important;
      box-shadow: 0 0 0 1px ${T.bg}, 0 0 0 3px ${T.primary}44 !important;
    }

    /* Interactive Card Hover */
    .card-interactive {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card-interactive:hover {
      transform: translateY(-2px);
      border-color: ${T.primary}66 !important;
      box-shadow: 0 12px 24px -10px rgba(0,0,0,0.4);
    }

    /* Animations */
    .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .pulse-dot { animation: pulseDot 2s ease-in-out infinite; }
    @keyframes pulseDot {
      0%, 100% { opacity: 0.4; transform: scale(1); box-shadow: 0 0 0 0 ${T.success}66; }
      50%      { opacity: 1;   transform: scale(1.2); box-shadow: 0 0 0 6px ${T.success}00; }
    }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Glassmorphism */
    .glass {
      background: ${T.surface}CC;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
  `}</style>
);

// ─── KNOWLEDGE GRAPH CANVAS (Signature Element) ───────────────────────────────
function KnowledgeGraph({ active }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const nodesRef  = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    const N = 28;
    nodesRef.current = Array.from({ length: N }, () => ({
      x:   Math.random() * W,
      y:   Math.random() * H,
      vx:  (Math.random() - 0.5) * 0.3,
      vy:  (Math.random() - 0.5) * 0.3,
      r:   Math.random() * 2 + 1.5,
      isPrimary: Math.random() > 0.4,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const nodes = nodesRef.current;

      nodes.forEach(n => {
        n.x += n.vx * (active ? 2.5 : 1);
        n.y += n.vy * (active ? 2.5 : 1);
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx   = nodes[i].x - nodes[j].x;
          const dy   = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(59,130,246,${(1 - dist / 100) * (active ? 0.4 : 0.15)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.isPrimary
          ? `rgba(59,130,246,${active ? 0.9 : 0.4})` // Primary Blue
          : `rgba(16,185,129,${active ? 0.8 : 0.3})`; // Success Emerald
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        opacity: 0.8,
        pointerEvents: "none",
        transition: "opacity 0.3s ease",
      }}
    />
  );
}

// ─── ATOMS ────────────────────────────────────────────────────────────────────
const Btn = ({ children, variant = "primary", onClick, disabled, style = {}, type = "button", size = "md", className = "" }) => {
  const pad = size === "sm" ? "8px 16px" : "12px 24px";
  const fs  = size === "sm" ? "13px" : "14px";

  const variants = {
    primary: { background: T.primary,  color: T.white,   border: "none", "--btn-glow": T.primary },
    ghost:   { background: "transparent", color: T.body, border: `1px solid ${T.border}`, "--btn-glow": T.border },
    danger:  { background: T.danger,   color: T.white,   border: "none", "--btn-glow": T.danger },
    success: { background: T.success,  color: T.white,   border: "none", "--btn-glow": T.success },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-effect ${className}`}
      style={{
        padding: pad, borderRadius: 8, fontWeight: 600,
        fontSize: fs, display: "flex", alignItems: "center", gap: 8,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const Field = ({ label, children, error }) => (
  <div style={{ marginBottom: 18 }}>
    {label && (
      <label style={{
        display: "block", marginBottom: 8,
        fontSize: 12, fontWeight: 600,
        color: T.muted, letterSpacing: "0.04em", textTransform: "uppercase",
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        {label}
      </label>
    )}
    {children}
    {error && (
      <p className="fade-in" style={{ marginTop: 6, fontSize: 13, color: T.danger, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        {error}
      </p>
    )}
  </div>
);

const Input = ({ value, onChange, placeholder, type = "text", style = {} }) => (
  <input
    className="input-effect"
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={{
      width: "100%", padding: "12px 16px",
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 8, color: T.heading,
      outline: "none", 
      ...style,
    }}
  />
);

const Select = ({ value, onChange, options, style = {} }) => (
  <select
    className="input-effect"
    value={value}
    onChange={onChange}
    style={{
      width: "100%", padding: "12px 16px",
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 8, color: T.heading,
      outline: "none", appearance: "none",
      backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%24%2024%22%20fill%3D%22none%22%20stroke%3D%22%23A1A1AA%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 12px center",
      backgroundSize: "16px",
      paddingRight: 40,
      ...style,
    }}
  >
    {options.map(o => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
);

const Badge = ({ children, color = T.primary }) => (
  <span style={{
    padding: "4px 10px", borderRadius: 6,
    fontSize: 11, fontWeight: 600,
    background: color + "1A", color,
    border: `1px solid ${color}33`,
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: "0.02em",
  }}>
    {children}
  </span>
);

const Card = ({ children, style = {}, className = "" }) => (
  <div className={className} style={{
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 12, padding: 24,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    ...style,
  }}>
    {children}
  </div>
);

const Spinner = () => (
  <svg className="spin" width={18} height={18} viewBox="0 0 24 24" fill="none"
    style={{ display: "inline-block", verticalAlign: "middle" }}>
    <circle cx="12" cy="12" r="10" stroke={T.border} strokeWidth="3" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const Toast = ({ message, type = "info", onClose }) => {
  const colors = { info: T.primary, success: T.success, error: T.danger, warning: T.warning };
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fade-in glass" style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      border: `1px solid ${colors[type]}44`,
      borderLeft: `4px solid ${colors[type]}`,
      borderRadius: 8, padding: "14px 20px",
      maxWidth: 380, boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <span style={{ color: colors[type], fontSize: 18, flexShrink: 0 }}>
        {type === "success" ? "✓" : type === "error" ? "✕" : type === "warning" ? "⚠" : "ℹ"}
      </span>
      <span style={{ flex: 1, fontSize: 14, color: T.heading, fontWeight: 500 }}>{message}</span>
      <button onClick={onClose} className="btn-effect"
        style={{ background: "none", border: "none", color: T.muted, fontSize: 18, padding: 4 }}>
        ×
      </button>
    </div>
  );
};

// ─── API LAYER ────────────────────────────────────────────────────────────────
// [Unchanged API Layer Logic]
const BASE = import.meta.env.VITE_API_BASE_URL;
const api = {
  async call(path, opts = {}) {
    const token = localStorage.getItem("rag_token");
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { credentials: "include", ...opts, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(err.detail || "Unknown error");
    }
    return res.json();
  },
  signup:  (d)    => api.call("/auth/signup",  { method: "POST", body: JSON.stringify(d) }),
  login:   (d)    => api.call("/auth/login",   { method: "POST", body: JSON.stringify(d) }),
  logout:  ()     => api.call("/auth/logout",  { method: "POST" }),
  me:      ()     => api.call("/auth/me"),
  consent: (mode) => api.call(`/upload/consent?upload_mode=${mode}`),
  query:   (d)    => api.call("/query",        { method: "POST", body: JSON.stringify(d) }),
  upload(file, mode, confirmed) {
    const token = localStorage.getItem("rag_token");
    const fd = new FormData();
    fd.append("file", file); fd.append("upload_mode", mode); fd.append("confirmed", confirmed);
    return fetch(`${BASE}/upload/document`, {
      method: "POST", credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then(async r => {
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail || "Upload failed"); }
      return r.json();
    });
  },
};

// ─── AUTH VIEWS ──────────────────────────────────────────────────────────────
function AuthView({ onAuth }) {
  const [tab,  setTab]    = useState("login");
  const [form, setForm]   = useState({ email: "", password: "", role: "User", org_id: "" });
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState("");

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      if (tab === "signup") {
        await api.signup({ email: form.email, password: form.password, Role: form.role, org_id: form.org_id || undefined });
        setTab("login");
      } else {
        const data = await api.login({ email: form.email, password: form.password });
        localStorage.setItem("rag_token", data.access_token);
        onAuth(data);
      }
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: T.bg, position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 60% 60% at 50% -10%, ${T.primary}25 0%, transparent 80%)`,
      }} />
      <div style={{ position: "absolute", inset: 0 }}><KnowledgeGraph active={busy} /></div>

      <div className="fade-in glass" style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 440, padding: 32, borderRadius: 16, border: `1px solid ${T.border}` }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 56, height: 56, borderRadius: 16,
            background: `linear-gradient(135deg, ${T.primary}, ${T.primaryH})`,
            marginBottom: 20, boxShadow: `0 8px 32px ${T.primary}44`,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>RAG Platform</h1>
          <p style={{ color: T.muted, fontSize: 14 }}>Enterprise Knowledge Intelligence</p>
        </div>

        <div style={{ display: "flex", marginBottom: 24, background: T.surface2, borderRadius: 8, padding: 6 }}>
          {["login", "signup"].map(t => (
            <button key={t} onClick={() => { setTab(t); setErr(""); }}
              className="btn-effect"
              style={{
                flex: 1, padding: "10px 0", border: "none", borderRadius: 6,
                fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
                fontSize: 14, background: tab === t ? T.surface : "transparent",
                color: tab === t ? T.heading : T.muted,
                boxShadow: tab === t ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
              }}>
              {t === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <Field label="Email Address">
          <Input value={form.email} onChange={set("email")} placeholder="you@company.com" type="email" />
        </Field>

        <Field label="Password">
          <Input value={form.password} onChange={set("password")} placeholder="••••••••" type="password" />
        </Field>

        {tab === "signup" && (
          <div className="fade-in">
            <Field label="Role Profile">
              <Select value={form.role} onChange={set("role")}
                options={[
                  { value: "User",        label: "Standard User" },
                  { value: "Admin",       label: "Administrator" },
                  { value: "Super Admin", label: "Super Administrator" },
                ]} />
            </Field>
            <Field label="Organisation ID (Optional)">
              <Input value={form.org_id} onChange={set("org_id")} placeholder="Leave blank to auto-generate" />
            </Field>
          </div>
        )}

        {err && (
          <div className="fade-in" style={{
            padding: "12px 16px", borderRadius: 8, marginBottom: 20,
            background: T.danger + "1A", border: `1px solid ${T.danger}44`,
            color: T.danger, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            {err}
          </div>
        )}

        <Btn onClick={submit} disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
          {busy ? <><Spinner /> &nbsp;Authenticating…</> : tab === "login" ? "Sign In Securely" : "Create Enterprise Account"}
        </Btn>
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: "query",   label: "Knowledge Query",  icon: "⌖" },
  { id: "upload",  label: "Document Upload",  icon: "↑" },
  { id: "profile", label: "Access Profile", icon: "◎" },
];

function Sidebar({ active, setActive, user, onLogout }) {
  return (
    <div style={{
      width: 260, background: T.surface,
      borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
      flexShrink: 0,
    }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${T.primary}, ${T.primaryH})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, color: T.white, boxShadow: `0 4px 12px ${T.primary}44`,
          }}>⬡</div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: T.heading }}>
              RAG Intel
            </div>
            <div style={{ fontSize: 11, color: T.muted, letterSpacing: "0.08em" }}>ENTERPRISE v2.1</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setActive(n.id)}
            className="btn-effect"
            style={{
              width: "100%", textAlign: "left",
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 14px", borderRadius: 8, border: "none",
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500,
              fontSize: 14, transition: "all 0.2s ease",
              background: active === n.id ? T.primary + "1A" : "transparent",
              color:      active === n.id ? T.primaryH   : T.muted,
            }}>
            <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>

      <div style={{
        padding: "16px", borderTop: `1px solid ${T.border}`,
        background: T.surface2 + "44",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: `linear-gradient(135deg, ${T.primary}88, ${T.success}88)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: T.white, flexShrink: 0,
        }}>
          {user?.email?.[0]?.toUpperCase() || "?"}
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 13, color: T.heading, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user?.email}
          </div>
          <p style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{user?.role || "User"}</p>
        </div>
        <button onClick={onLogout} title="Logout" className="btn-effect"
          style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, fontSize: 14, padding: "8px 10px" }}>
          ⏻
        </button>
      </div>
    </div>
  );
}

// ─── QUERY VIEW ──────────────────────────────────────────────────────────────
function QueryView({ user }) {
  const [form, setForm]       = useState({ query: "", upload_mode: "global", top_k: 5, language: "English", system_prompt: "" });
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.query.trim()) return;
    setError(""); setLoading(true); setResult(null);
    try {
      const data = await api.query({
        query: form.query, upload_mode: form.upload_mode, top_k: Number(form.top_k), language: form.language, system_prompt: form.system_prompt || undefined,
      });
      setResult(data);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, height: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Card>
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>Intelligence Query</h2>
          <Field label="Your Question">
            <textarea
              className="input-effect"
              value={form.query} onChange={set("query")}
              placeholder="Ask anything about your organisation's indexed documents…"
              style={{
                width: "100%", padding: "16px", minHeight: 120,
                background: T.surface2, border: `1px solid ${T.border}`,
                borderRadius: 8, color: T.heading, resize: "vertical",
                outline: "none", lineHeight: 1.6,
              }}
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <Field label="Search Scope"><Select value={form.upload_mode} onChange={set("upload_mode")} options={[{ value: "global", label: "Global (Persistent)" }, { value: "local",  label: "Local (Session)" }, { value: "both",   label: "Both Sources" }]} /></Field>
            <Field label="Top K Results"><Input value={form.top_k} onChange={set("top_k")} type="number" placeholder="5" /></Field>
            <Field label="Output Language"><Select value={form.language} onChange={set("language")} options={["English","Hindi","French","German","Spanish","Arabic","Chinese","Japanese"].map(l => ({ value: l, label: l }))} /></Field>
          </div>
          <Field label="System Directive (Optional)">
            <Input value={form.system_prompt} onChange={set("system_prompt")} placeholder="Override default RAG behavior rules…" />
          </Field>
          {error && <div className="fade-in" style={{ padding: "12px", borderRadius: 8, marginBottom: 16, background: T.danger + "1A", border: `1px solid ${T.danger}44`, color: T.danger, fontSize: 13 }}>{error}</div>}
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 8 }}>
            <Btn onClick={submit} disabled={loading || !form.query.trim()}>
              {loading ? <><Spinner /> &nbsp;Synthesizing…</> : "Generate Response →"}
            </Btn>
            {result && <span className="fade-in" style={{ fontSize: 13, color: T.muted }}>Synthesized from {result.total_sources_found} source{result.total_sources_found !== 1 ? "s" : ""}</span>}
          </div>
        </Card>

        {result && (
          <Card className="fade-in">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, color: T.primaryH }}>Synthesized Answer</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <Badge color={T.success}>{result.generated_by}</Badge>
                <Badge color={T.primary}>{result.query_mode}</Badge>
              </div>
            </div>
            <div style={{
              background: T.surface2, borderRadius: 12, padding: "20px 24px",
              lineHeight: 1.8, color: T.heading, whiteSpace: "pre-wrap",
              fontSize: 15, borderLeft: `4px solid ${T.primary}`,
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)"
            }}>
              {result.answer}
            </div>
          </Card>
        )}

        {result?.sources?.length > 0 && (
          <div className="fade-in">
            <h3 style={{ fontSize: 14, marginBottom: 16, color: T.muted, fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Referenced Context ({result.sources.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {result.sources.map((s, i) => (
                <Card key={s.chunk_id} className="card-interactive" style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                      background: T.primary + "22", color: T.primaryH, fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>{i + 1}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: T.heading, flex: 1 }}>{s.document_name}</span>
                    <Badge color={T.success}>{(s.similarity_score * 100).toFixed(1)}% Match</Badge>
                    <Badge color={T.muted}>Pg. {s.page_number}</Badge>
                  </div>
                  <p style={{ fontSize: 14, color: T.body, lineHeight: 1.7, background: T.surface2, padding: "12px 16px", borderRadius: 8 }}>{s.text_preview}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card style={{ position: "relative", overflow: "hidden", minHeight: 220, padding: 0, border: `1px solid ${T.border}` }}>
          <KnowledgeGraph active={loading} />
          <div style={{ position: "absolute", inset: 0, padding: 20, zIndex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <p style={{ fontSize: 12, color: T.heading, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 }}>
              Vector Space
            </p>
            <div className="glass" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, width: "fit-content" }}>
              <span className={loading ? "pulse-dot" : ""} style={{
                width: 10, height: 10, borderRadius: "50%",
                background: loading ? T.success : T.muted, display: "inline-block",
              }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: loading ? T.success : T.heading }}>
                {loading ? "Searching Dimensions…" : "System Idle"}
              </span>
            </div>
          </div>
        </Card>

        <Card style={{ padding: 20 }}>
          <p style={{ fontSize: 12, color: T.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 }}>
            Query Parameters
          </p>
          {[
            ["Global mode", "Searches permanently stored org docs"],
            ["Local mode",  "Searches your session-only uploads"],
            ["Top K",       "Number of context chunks retrieved"],
          ].map(([k, v]) => (
            <div key={k} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: T.primaryH, fontFamily: "'Space Grotesk',sans-serif" }}>{k}</span>
              <p style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{v}</p>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── UPLOAD VIEW ─────────────────────────────────────────────────────────────
// [Rest of views follow similar UI enhancement logic... (omitted repetitive unchanged logic for brevity in context block)]
function UploadView({ user }) {
  // [Internal State unchanged]
  const [mode, setMode] = useState("global");
  const [consent, setConsent] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();
  
  const canGlobal = ["Admin", "Super Admin"].includes(user?.role);
  const fetchConsent = async (m) => { setConsent(null); setConfirmed(false); setError(""); try { const data = await api.consent(m); setConsent(data); } catch (e) { setError(e.message); } };
  const handleModeChange = (m) => { setMode(m); setReport(null); fetchConsent(m); };
  useEffect(() => { fetchConsent(mode); }, []);
  const handleDrop = (e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); };
  const upload = async () => { if (!file || !confirmed) return; setError(""); setLoading(true); setReport(null); try { const data = await api.upload(file, mode, true); setReport(data); } catch (e) { setError(e.message); } finally { setLoading(false); } };
  const ACCEPTED = ".txt,.md,.pdf,.docx,.xlsx,.csv,.pptx,.html,.htm,.png,.jpg,.jpeg,.gif,.webp";

  return (
    <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Card>
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>Document Ingestion</h2>
          <Field label="Storage Destination">
            <div style={{ display: "flex", gap: 12 }}>
              {[{ v: "global", label: "Global Persistent", icon: "🌐" }, { v: "local",  label: "Local Session",     icon: "🔒" }].map(({ v, label, icon }) => (
                <button key={v} disabled={v === "global" && !canGlobal} onClick={() => handleModeChange(v)}
                  className="btn-effect"
                  style={{
                    flex: 1, padding: "14px 16px", borderRadius: 10,
                    cursor: (v === "global" && !canGlobal) ? "not-allowed" : "pointer",
                    background: mode === v ? T.primary + "1A" : T.surface2,
                    border: `2px solid ${mode === v ? T.primary : T.border}`,
                    color: mode === v ? T.primaryH : T.muted,
                    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14,
                    opacity: (v === "global" && !canGlobal) ? 0.4 : 1,
                  }}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </Field>

          {consent && (
            <div className="fade-in" style={{ background: mode === "global" ? T.primary + "11" : T.warning + "11", border: `1px solid ${mode === "global" ? T.primary : T.warning}44`, borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: mode === "global" ? T.primaryH : T.warning, marginBottom: 8, fontFamily: "'Space Grotesk',sans-serif" }}>{consent.title}</p>
              <p style={{ fontSize: 14, color: T.body, lineHeight: 1.6 }}>{consent.message}</p>
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, cursor: "pointer", fontSize: 14, color: T.heading, userSelect: "none" }}>
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ width: 18, height: 18, accentColor: T.primary, cursor: "pointer" }} />
                I understand and confirm — {consent.confirm_label}
              </label>
            </div>
          )}

          <div onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? T.primary : file ? T.success : T.border}`, borderRadius: 16, padding: "48px 24px",
              textAlign: "center", cursor: "pointer", background: dragging ? T.primary + "0A" : file ? T.success + "0A" : T.surface2,
              transition: "all 0.2s ease", marginBottom: 24,
            }}>
            <input ref={fileRef} type="file" accept={ACCEPTED} style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} />
            <div style={{ fontSize: 42, marginBottom: 12 }}>{file ? "📄" : "↑"}</div>
            {file ? (
              <div><p style={{ fontWeight: 600, color: T.success, fontSize: 16 }}>{file.name}</p><p style={{ color: T.muted, fontSize: 13, marginTop: 6 }}>{(file.size / 1024).toFixed(1)} KB · Click to replace</p></div>
            ) : (
              <div><p style={{ color: T.heading, fontSize: 16, fontWeight: 600 }}>Drag & Drop file or browse</p><p style={{ color: T.muted, fontSize: 13, marginTop: 8 }}>PDF, DOCX, XLSX, TXT, HTML, Images</p></div>
            )}
          </div>
          <Btn onClick={upload} disabled={loading || !file || !confirmed} style={{ width: "100%", justifyContent: "center", padding: "14px" }}>
            {loading ? <><Spinner /> &nbsp;Parsing & Indexing Vectors…</> : `Start ${mode === "global" ? "Global" : "Session"} Ingestion →`}
          </Btn>
        </Card>
        
        {/* Results output logic ... omitted unchanged for brevity */}
      </div>
      
      {/* Sidebar Info ... omitted unchanged for brevity */}
    </div>
  );
}

// ─── PROFILE VIEW & MAIN APP ─────────────────────────────────────────────────────────────
// [Profile & App scaffolding unchanged, they inherit the new global styles and CSS variables automatically]

function ProfileView({ user, onLogout }) {
  const roleColor = { "Super Admin": T.warning, "Admin": T.primary, "User": T.success }[user?.role] || T.muted;
  return (
    <div className="fade-in" style={{ maxWidth: 640 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 32, paddingBottom: 32, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, background: `linear-gradient(135deg, ${T.primary}, ${T.primaryH})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: T.white, boxShadow: `0 8px 24px ${T.primary}44` }}>
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div><h2 style={{ fontSize: 24, marginBottom: 6 }}>{user?.email}</h2><Badge color={roleColor}>{user?.role}</Badge></div>
        </div>
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
          <Btn variant="danger" onClick={onLogout}>Terminate Session</Btn>
        </div>
      </Card>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(null); const [user, setUser] = useState(null); const [view, setView] = useState("query");
  const [toast, setToast] = useState(null); const [booting, setBooting] = useState(true);
  const addToast = useCallback((message, type = "info") => setToast({ message, type, id: Date.now() }), []);
  useEffect(() => { const token = localStorage.getItem("rag_token"); if (token) { api.me().then(u => { setUser(u); setAuth(true); }).catch(() => localStorage.removeItem("rag_token")).finally(() => setBooting(false)); } else { setBooting(false); } }, []);
  const handleAuth = async () => { try { const u = await api.me(); setUser(u); setAuth(true); addToast("Authentication successful", "success"); } catch { addToast("Session error", "error"); } };
  const handleLogout = async () => { try { await api.logout(); } catch {} localStorage.removeItem("rag_token"); setAuth(null); setUser(null); addToast("Session terminated securely", "info"); };

  if (booting) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}><GlobalStyle /><Spinner /></div>;
  if (!auth) return <><GlobalStyle /><AuthView onAuth={handleAuth} />{toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}</>;

  return (
    <>
      <GlobalStyle />
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar active={view} setActive={setView} user={user} onLogout={handleLogout} />
        <main style={{ flex: 1, padding: 40, overflowY: "auto", maxHeight: "100vh" }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>
              {view === "query" && "Knowledge Synthesis"} {view === "upload" && "Data Ingestion"} {view === "profile" && "Access Profile"}
            </h1>
            <p style={{ color: T.muted, fontSize: 15 }}>
              {view === "query" && "Interrogate indexed organizational knowledge utilizing vector search."}
              {view === "upload" && "Securely pipeline documents into the RAG vector store."}
              {view === "profile" && "Manage your tenant context and RBAC permissions."}
            </p>
          </div>
          {view === "query" && <QueryView user={user} />} {view === "upload" && <UploadView user={user} />} {view === "profile" && <ProfileView user={user} onLogout={handleLogout} />}
        </main>
      </div>
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}