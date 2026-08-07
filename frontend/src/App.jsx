import { useState, useEffect, useRef, useCallback } from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  bg:       "#0B1120",
  surface:  "#111827",
  surface2: "#1E2A45",
  border:   "#1F2D4A",
  primary:  "#6366F1",
  primaryH: "#818CF8",
  success:  "#10B981",
  warning:  "#F59E0B",
  danger:   "#EF4444",
  muted:    "#64748B",
  body:     "#CBD5E1",
  heading:  "#F1F5F9",
  white:    "#FFFFFF",
};

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: ${T.bg};
      color: ${T.body};
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      min-height: 100vh;
    }

    h1,h2,h3,h4,h5 {
      font-family: 'Space Grotesk', sans-serif;
      color: ${T.heading};
      letter-spacing: -0.02em;
    }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: ${T.surface}; }
    ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }

    input, textarea, select {
      font-family: 'Inter', sans-serif;
      font-size: 14px;
    }

    button { cursor: pointer; font-family: 'Space Grotesk', sans-serif; }

    .fade-in {
      animation: fadeIn 0.3s ease forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .pulse-dot {
      animation: pulseDot 2s ease-in-out infinite;
    }
    @keyframes pulseDot {
      0%,100% { opacity: 0.4; transform: scale(1); }
      50%      { opacity: 1;   transform: scale(1.4); }
    }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
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
      vx:  (Math.random() - 0.5) * 0.4,
      vy:  (Math.random() - 0.5) * 0.4,
      r:   Math.random() * 2.5 + 1,
      hue: Math.random() > 0.5 ? 238 : 160,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const nodes = nodesRef.current;

      nodes.forEach(n => {
        n.x += n.vx * (active ? 1.8 : 1);
        n.y += n.vy * (active ? 1.8 : 1);
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx   = nodes[i].x - nodes[j].x;
          const dy   = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${(1 - dist / 90) * 0.25})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.hue === 238
          ? `rgba(99,102,241,${active ? 0.9 : 0.5})`
          : `rgba(16,185,129,${active ? 0.8 : 0.4})`;
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
        opacity: 0.6,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── ATOMS ────────────────────────────────────────────────────────────────────
const Btn = ({ children, variant = "primary", onClick, disabled, style = {}, type = "button", size = "md" }) => {
  const pad = size === "sm" ? "6px 14px" : "10px 22px";
  const fs  = size === "sm" ? "12px" : "14px";

  const variants = {
    primary: { background: T.primary,  color: T.white,   border: "none" },
    ghost:   { background: "transparent", color: T.body, border: `1px solid ${T.border}` },
    danger:  { background: T.danger,   color: T.white,   border: "none" },
    success: { background: T.success,  color: T.white,   border: "none" },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: pad, borderRadius: 8, fontWeight: 600,
        fontSize: fs, transition: "all 0.15s",
        opacity: disabled ? 0.45 : 1,
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const Field = ({ label, children, error }) => (
  <div style={{ marginBottom: 16 }}>
    {label && (
      <label style={{
        display: "block", marginBottom: 6,
        fontSize: 12, fontWeight: 600,
        color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase",
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        {label}
      </label>
    )}
    {children}
    {error && (
      <p style={{ marginTop: 4, fontSize: 12, color: T.danger }}>{error}</p>
    )}
  </div>
);

const Input = ({ value, onChange, placeholder, type = "text", style = {} }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={{
      width: "100%", padding: "10px 14px",
      background: T.surface2, border: `1px solid ${T.border}`,
      borderRadius: 8, color: T.heading,
      outline: "none", transition: "border 0.15s",
      ...style,
    }}
    onFocus={e  => e.target.style.borderColor = T.primary}
    onBlur={e   => e.target.style.borderColor = T.border}
  />
);

const Select = ({ value, onChange, options, style = {} }) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      width: "100%", padding: "10px 14px",
      background: T.surface2, border: `1px solid ${T.border}`,
      borderRadius: 8, color: T.heading,
      outline: "none", ...style,
    }}
  >
    {options.map(o => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
);

const Badge = ({ children, color = T.primary }) => (
  <span style={{
    padding: "2px 10px", borderRadius: 999,
    fontSize: 11, fontWeight: 600,
    background: color + "22", color,
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: "0.04em",
  }}>
    {children}
  </span>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 14, padding: 24, ...style,
  }}>
    {children}
  </div>
);

const Spinner = () => (
  <svg className="spin" width={18} height={18} viewBox="0 0 24 24" fill="none"
    style={{ display: "inline-block", verticalAlign: "middle" }}>
    <circle cx="12" cy="12" r="10" stroke={T.border} strokeWidth="3" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke={T.primary} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const Toast = ({ message, type = "info", onClose }) => {
  const colors = { info: T.primary, success: T.success, error: T.danger, warning: T.warning };
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fade-in" style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: T.surface, border: `1px solid ${colors[type]}44`,
      borderLeft: `3px solid ${colors[type]}`,
      borderRadius: 10, padding: "12px 18px",
      maxWidth: 360, boxShadow: "0 8px 32px #00000055",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ color: colors[type], fontSize: 16 }}>
        {type === "success" ? "✓" : type === "error" ? "✕" : type === "warning" ? "⚠" : "ℹ"}
      </span>
      <span style={{ flex: 1, fontSize: 13, color: T.body }}>{message}</span>
      <button onClick={onClose}
        style={{ background: "none", border: "none", color: T.muted, fontSize: 16 }}>
        ×
      </button>
    </div>
  );
};

// ─── API LAYER ────────────────────────────────────────────────────────────────
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
    fd.append("file", file);
    fd.append("upload_mode", mode);
    fd.append("confirmed", confirmed);
    return fetch(`${BASE}/upload/document`, {
      method: "POST",
      credentials: "include",
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
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: T.bg, position: "relative", overflow: "hidden",
    }}>
      {/* Ambient BG */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${T.primary}18 0%, transparent 70%)`,
      }} />
      <div style={{ position: "absolute", inset: 0 }}>
        <KnowledgeGraph active={busy} />
      </div>

      <div className="fade-in" style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 420, padding: 24 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 52, height: 52, borderRadius: 14,
            background: `linear-gradient(135deg, ${T.primary}, #818CF8)`,
            marginBottom: 16, boxShadow: `0 0 32px ${T.primary}55`,
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>RAG Platform</h1>
          <p style={{ color: T.muted, fontSize: 13 }}>Enterprise Knowledge Intelligence</p>
        </div>

        <Card>
          {/* Tabs */}
          <div style={{ display: "flex", marginBottom: 24, background: T.surface2, borderRadius: 8, padding: 4 }}>
            {["login", "signup"].map(t => (
              <button key={t} onClick={() => { setTab(t); setErr(""); }}
                style={{
                  flex: 1, padding: "8px 0", border: "none", borderRadius: 6,
                  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
                  fontSize: 13, transition: "all 0.2s",
                  background: tab === t ? T.primary : "transparent",
                  color: tab === t ? T.white : T.muted,
                }}>
                {t === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <Field label="Email">
            <Input value={form.email} onChange={set("email")} placeholder="you@company.com" type="email" />
          </Field>

          <Field label="Password">
            <Input value={form.password} onChange={set("password")} placeholder="••••••••" type="password" />
          </Field>

          {tab === "signup" && (
            <>
              <Field label="Role">
                <Select
                  value={form.role}
                  onChange={set("role")}
                  options={[
                    { value: "User",        label: "User" },
                    { value: "Admin",       label: "Admin" },
                    { value: "Super Admin", label: "Super Admin" },
                  ]}
                />
              </Field>
              <Field label="Organisation ID (optional)">
                <Input value={form.org_id} onChange={set("org_id")} placeholder="Leave blank to auto-generate" />
              </Field>
            </>
          )}

          {err && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 16,
              background: T.danger + "18", border: `1px solid ${T.danger}44`,
              color: T.danger, fontSize: 13,
            }}>
              {err}
            </div>
          )}

          <Btn onClick={submit} disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
            {busy ? <><Spinner /> &nbsp;Please wait…</> : tab === "login" ? "Sign In" : "Create Account"}
          </Btn>
        </Card>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: T.muted }}>
          Secured with JWT · RBAC · Tenant Isolation
        </p>
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: "query",    label: "Query",    icon: "⌖" },
  { id: "upload",   label: "Upload",   icon: "↑" },
  { id: "profile",  label: "Profile",  icon: "◎" },
];

function Sidebar({ active, setActive, user, onLogout }) {
  return (
    <div style={{
      width: 220, background: T.surface,
      borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${T.primary}, #818CF8)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>⬡</div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: T.heading }}>
              RAG Intel
            </div>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.06em" }}>ENTERPRISE v2.1</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setActive(n.id)}
            style={{
              width: "100%", textAlign: "left",
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 8, border: "none",
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500,
              fontSize: 14, marginBottom: 2, transition: "all 0.15s",
              background: active === n.id ? T.primary + "22" : "transparent",
              color:      active === n.id ? T.primaryH    : T.body,
              borderLeft: active === n.id ? `2px solid ${T.primary}` : "2px solid transparent",
            }}>
            <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>

      {/* User Footer */}
      <div style={{
        padding: "14px 16px", borderTop: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: `linear-gradient(135deg, ${T.primary}88, ${T.success}88)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: T.white, flexShrink: 0,
        }}>
          {user?.email?.[0]?.toUpperCase() || "?"}
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 12, color: T.heading, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user?.email}
          </div>
          <Badge color={user?.role === "Super Admin" ? T.warning : user?.role === "Admin" ? T.primary : T.success}>
            {user?.role || "User"}
          </Badge>
        </div>
        <button onClick={onLogout} title="Logout"
          style={{ background: "none", border: "none", color: T.muted, fontSize: 16, padding: 4 }}>
          ⏻
        </button>
      </div>
    </div>
  );
}

// ─── QUERY VIEW ──────────────────────────────────────────────────────────────
function QueryView({ user }) {
  const [form, setForm]       = useState({
    query: "", upload_mode: "global", top_k: 5,
    language: "English", system_prompt: "",
  });
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.query.trim()) return;
    setError(""); setLoading(true); setResult(null);
    try {
      const data = await api.query({
        query: form.query,
        upload_mode: form.upload_mode,
        top_k: Number(form.top_k),
        language: form.language,
        system_prompt: form.system_prompt || undefined,
      });
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, height: "100%" }}>
      {/* Main */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card>
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>Knowledge Query</h2>

          <Field label="Your Question">
            <textarea
              value={form.query}
              onChange={set("query")}
              placeholder="Ask anything about your uploaded documents…"
              onFocus={e  => e.target.style.borderColor = T.primary}
              onBlur={e   => e.target.style.borderColor = T.border}
              style={{
                width: "100%", padding: "12px 14px", minHeight: 100,
                background: T.surface2, border: `1px solid ${T.border}`,
                borderRadius: 8, color: T.heading, resize: "vertical",
                outline: "none", lineHeight: 1.6,
              }}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Field label="Search Mode">
              <Select value={form.upload_mode} onChange={set("upload_mode")}
                options={[
                  { value: "global", label: "Global (Persistent)" },
                  { value: "local",  label: "Local (Session)"     },
                  { value: "both",   label: "Both Sources"         },
                ]}
              />
            </Field>
            <Field label="Top K Results">
              <Input value={form.top_k} onChange={set("top_k")} type="number" placeholder="5" />
            </Field>
            <Field label="Response Language">
              <Select value={form.language} onChange={set("language")}
                options={["English","Hindi","French","German","Spanish","Arabic","Chinese","Japanese"]
                  .map(l => ({ value: l, label: l }))}
              />
            </Field>
          </div>

          <Field label="Custom System Prompt (optional)">
            <Input value={form.system_prompt} onChange={set("system_prompt")}
              placeholder="Override the default RAG system instructions…" />
          </Field>

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 14,
              background: T.danger + "18", border: `1px solid ${T.danger}44`, color: T.danger, fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Btn onClick={submit} disabled={loading || !form.query.trim()}>
              {loading ? <><Spinner /> &nbsp;Searching…</> : "Run Query →"}
            </Btn>
            {result && (
              <span style={{ fontSize: 12, color: T.muted }}>
                {result.total_sources_found} source{result.total_sources_found !== 1 ? "s" : ""} · {result.language} · {result.query_mode}
              </span>
            )}
          </div>
        </Card>

        {/* Answer */}
        {result && (
          <Card className="fade-in">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15 }}>Answer</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <Badge color={T.success}>{result.generated_by}</Badge>
                <Badge color={T.primary}>{result.query_mode}</Badge>
              </div>
            </div>
            <div style={{
              background: T.surface2, borderRadius: 10, padding: "16px 18px",
              lineHeight: 1.8, color: T.heading, whiteSpace: "pre-wrap",
              fontSize: 14, borderLeft: `3px solid ${T.primary}`,
            }}>
              {result.answer}
            </div>
            <p style={{ marginTop: 10, fontSize: 11, color: T.muted }}>
              Queried at {new Date(result.queried_at).toLocaleString()} · Org: {result.org_id}
            </p>
          </Card>
        )}

        {/* Sources */}
        {result?.sources?.length > 0 && (
          <div>
            <h3 style={{ fontSize: 14, marginBottom: 12, color: T.muted, fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Source Chunks ({result.sources.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {result.sources.map((s, i) => (
                <Card key={s.chunk_id} style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 6, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      background: T.primary + "33", color: T.primaryH,
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>{i + 1}</span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: T.heading, flex: 1 }}>
                      {s.document_name}
                    </span>
                    <Badge color={T.success}>{(s.similarity_score * 100).toFixed(1)}%</Badge>
                    <Badge color={T.muted}>p.{s.page_number}</Badge>
                  </div>
                  <p style={{ fontSize: 13, color: T.body, lineHeight: 1.6 }}>{s.text_preview}</p>
                  <p style={{ marginTop: 8, fontSize: 11, color: T.muted }}>
                    {s.upload_mode} · chunk #{s.chunk_index} · {s.chunk_id}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card style={{ position: "relative", overflow: "hidden", minHeight: 180 }}>
          <KnowledgeGraph active={loading} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <p style={{ fontSize: 11, color: T.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Space Grotesk',sans-serif" }}>
              Knowledge Graph
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className={loading ? "pulse-dot" : ""} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: loading ? T.success : T.muted,
                display: "inline-block",
              }} />
              <span style={{ fontSize: 12, color: loading ? T.success : T.muted }}>
                {loading ? "Retrieving vectors…" : "Ready"}
              </span>
            </div>
          </div>
        </Card>

        <Card style={{ padding: 18 }}>
          <p style={{ fontSize: 11, color: T.muted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Space Grotesk',sans-serif" }}>
            Query Tips
          </p>
          {[
            ["Global mode", "Searches permanently stored org docs"],
            ["Local mode",  "Searches your session-only uploads"],
            ["Both mode",   "Merges and deduplicates from both stores"],
            ["Top K",       "Number of chunks retrieved for context"],
          ].map(([k, v]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 12, color: T.primaryH, fontFamily: "'Space Grotesk',sans-serif" }}>{k}</span>
              <p style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{v}</p>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── UPLOAD VIEW ─────────────────────────────────────────────────────────────
function UploadView({ user }) {
  const [mode,      setMode]      = useState("global");
  const [consent,   setConsent]   = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [file,      setFile]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [report,    setReport]    = useState(null);
  const [error,     setError]     = useState("");
  const [dragging,  setDragging]  = useState(false);
  const fileRef = useRef();

  const canGlobal = ["Admin", "Super Admin"].includes(user?.role);

  const fetchConsent = async (m) => {
    setConsent(null); setConfirmed(false); setError("");
    try {
      const data = await api.consent(m);
      setConsent(data);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleModeChange = (m) => {
    setMode(m);
    setReport(null);
    fetchConsent(m);
  };

  useEffect(() => { fetchConsent(mode); }, []);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const upload = async () => {
    if (!file || !confirmed) return;
    setError(""); setLoading(true); setReport(null);
    try {
      const data = await api.upload(file, mode, true);
      setReport(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const ACCEPTED = ".txt,.md,.pdf,.docx,.xlsx,.csv,.pptx,.html,.htm,.png,.jpg,.jpeg,.gif,.webp";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card>
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>Document Upload</h2>

          {/* Mode Toggle */}
          <Field label="Upload Mode">
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { v: "global", label: "Global (Persistent)", icon: "🌐" },
                { v: "local",  label: "Local (Session)",     icon: "🔒" },
              ].map(({ v, label, icon }) => (
                <button key={v}
                  disabled={v === "global" && !canGlobal}
                  onClick={() => handleModeChange(v)}
                  style={{
                    flex: 1, padding: "12px 16px", border: "none", borderRadius: 10,
                    cursor: (v === "global" && !canGlobal) ? "not-allowed" : "pointer",
                    background: mode === v ? T.primary + "22" : T.surface2,
                    border: `2px solid ${mode === v ? T.primary : T.border}`,
                    color: mode === v ? T.primaryH : T.muted,
                    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
                    fontSize: 13, transition: "all 0.2s",
                    opacity: (v === "global" && !canGlobal) ? 0.4 : 1,
                  }}>
                  {icon} {label}
                </button>
              ))}
            </div>
            {!canGlobal && (
              <p style={{ fontSize: 12, color: T.warning, marginTop: 8 }}>
                ⚠ Global upload requires Admin or Super Admin role.
              </p>
            )}
          </Field>

          {/* Consent Banner */}
          {consent && (
            <div style={{
              background: mode === "global" ? T.primary + "15" : T.warning + "15",
              border: `1px solid ${mode === "global" ? T.primary : T.warning}44`,
              borderRadius: 10, padding: "14px 16px", marginBottom: 16,
            }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: mode === "global" ? T.primaryH : T.warning, marginBottom: 6, fontFamily: "'Space Grotesk',sans-serif" }}>
                {consent.title}
              </p>
              <p style={{ fontSize: 13, color: T.body, lineHeight: 1.6 }}>{consent.message}</p>
              {consent.warning_label && (
                <p style={{ marginTop: 8, fontSize: 12, color: T.warning }}>{consent.warning_label}</p>
              )}
              <label style={{
                display: "flex", alignItems: "center", gap: 8, marginTop: 12,
                cursor: "pointer", fontSize: 13, color: T.heading, userSelect: "none",
              }}>
                <input type="checkbox" checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: T.primary }}
                />
                I understand and confirm — {consent.confirm_label}
              </label>
            </div>
          )}

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? T.primary : file ? T.success : T.border}`,
              borderRadius: 12, padding: "36px 24px",
              textAlign: "center", cursor: "pointer",
              background: dragging ? T.primary + "0A" : file ? T.success + "0A" : T.surface2,
              transition: "all 0.2s", marginBottom: 16,
            }}>
            <input ref={fileRef} type="file" accept={ACCEPTED} style={{ display: "none" }}
              onChange={e => setFile(e.target.files[0])} />
            <div style={{ fontSize: 36, marginBottom: 10 }}>
              {file ? "📄" : "↑"}
            </div>
            {file ? (
              <div>
                <p style={{ fontWeight: 600, color: T.success, fontSize: 14 }}>{file.name}</p>
                <p style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB · Click to change
                </p>
              </div>
            ) : (
              <div>
                <p style={{ color: T.heading, fontSize: 14, fontWeight: 600 }}>Drop file here or click to browse</p>
                <p style={{ color: T.muted, fontSize: 12, marginTop: 6 }}>
                  PDF · DOCX · XLSX · PPTX · TXT · HTML · Images
                </p>
              </div>
            )}
          </div>

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 14,
              background: T.danger + "18", border: `1px solid ${T.danger}44`,
              color: T.danger, fontSize: 13,
            }}>{error}</div>
          )}

          <Btn onClick={upload} disabled={loading || !file || !confirmed}
            style={{ width: "100%" }}>
            {loading ? <><Spinner /> &nbsp;Uploading &amp; Indexing…</> : `Upload ${mode === "global" ? "Globally" : "to Session"} →`}
          </Btn>
        </Card>

        {/* Upload Report */}
        {report && (
          <Card className="fade-in" style={{ borderColor: T.success + "44" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>✓</span>
              <h3 style={{ fontSize: 15, color: T.success }}>Upload Complete</h3>
              <Badge color={T.success}>{report.status}</Badge>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              {[
                ["Document",        report.file_name,             T.heading],
                ["Doc ID",          report.doc_id,                T.muted],
                ["Type",            report.doc_type,              T.primary],
                ["Total Pages",     report.total_pages,           T.heading],
                ["Newly Indexed",   report.pages_newly_indexed,   T.success],
                ["Skipped",         report.pages_skipped,         T.warning],
                ["Chunks Created",  report.chunks_created,        T.primaryH],
                ["Upload Mode",     report.upload_mode,           T.primary],
                ["Organisation",    report.org_id,                T.muted],
              ].map(([label, val, color]) => (
                <div key={label} style={{
                  background: T.surface2, borderRadius: 8, padding: "12px 14px",
                }}>
                  <p style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Space Grotesk',sans-serif" }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 600, color, wordBreak: "break-all" }}>{String(val)}</p>
                </div>
              ))}
            </div>

            <p style={{ marginTop: 14, fontSize: 11, color: T.muted }}>
              Uploaded at {new Date(report.uploaded_at).toLocaleString()}
            </p>
          </Card>
        )}
      </div>

      {/* Info Panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card style={{ padding: 18 }}>
          <p style={{ fontSize: 11, color: T.muted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Space Grotesk',sans-serif" }}>
            Supported Formats
          </p>
          {[
            { ext: "PDF",   desc: "Text + scanned (OCR)",  color: T.danger  },
            { ext: "DOCX",  desc: "Word documents",        color: T.primary },
            { ext: "XLSX",  desc: "Excel / CSV",           color: T.success },
            { ext: "PPTX",  desc: "Slide decks",           color: T.warning },
            { ext: "TXT",   desc: "Plain text / Markdown", color: T.muted   },
            { ext: "HTML",  desc: "Web pages",             color: T.primaryH },
            { ext: "Image", desc: "PNG/JPG/WEBP/GIF",      color: T.success },
          ].map(({ ext, desc, color }) => (
            <div key={ext} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Badge color={color}>{ext}</Badge>
              <span style={{ fontSize: 12, color: T.muted }}>{desc}</span>
            </div>
          ))}
        </Card>

        <Card style={{ padding: 18 }}>
          <p style={{ fontSize: 11, color: T.muted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Space Grotesk',sans-serif" }}>
            Delta Indexing
          </p>
          <p style={{ fontSize: 12, color: T.body, lineHeight: 1.7 }}>
            Re-uploading a document with unchanged pages skips already-indexed pages. 
            Only modified or new pages are re-chunked and embedded — saving time and cost.
          </p>
        </Card>
      </div>
    </div>
  );
}

// ─── PROFILE VIEW ─────────────────────────────────────────────────────────────
function ProfileView({ user, onLogout }) {
  const roleColor = {
    "Super Admin": T.warning,
    "Admin":       T.primary,
    "User":        T.success,
  }[user?.role] || T.muted;

  return (
    <div style={{ maxWidth: 600 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${T.border}` }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            background: `linear-gradient(135deg, ${T.primary}, ${T.success})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 700, color: T.white, flexShrink: 0,
          }}>
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: 20 }}>{user?.email}</h2>
            <Badge color={roleColor}>{user?.role}</Badge>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            ["User ID",      user?.user_id,  T.muted],
            ["Email",        user?.email,    T.heading],
            ["Role",         user?.role,     roleColor],
            ["Organisation", user?.org_id,   T.primary],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: T.surface2, borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Space Grotesk',sans-serif" }}>
                {label}
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color, wordBreak: "break-all" }}>{val || "—"}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, marginBottom: 14, color: T.muted }}>Role Permissions</h3>
          {[
            { role: "User",        perms: ["Local uploads", "Global queries", "Session-scoped RAG"],        color: T.success },
            { role: "Admin",       perms: ["+ Global uploads", "Org-level document management"],            color: T.primary },
            { role: "Super Admin", perms: ["+ All organisations", "Cross-tenant access", "Full control"],   color: T.warning },
          ].map(({ role, perms, color }) => (
            <div key={role} style={{
              display: "flex", gap: 14, marginBottom: 12, padding: "12px 14px",
              borderRadius: 10, background: user?.role === role ? color + "15" : T.surface2,
              border: `1px solid ${user?.role === role ? color + "44" : "transparent"}`,
              alignItems: "flex-start",
            }}>
              <Badge color={color}>{role}</Badge>
              <div style={{ flex: 1 }}>
                {perms.map(p => (
                  <p key={p} style={{ fontSize: 12, color: T.body, marginBottom: 2 }}>· {p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
          <Btn variant="danger" onClick={onLogout}>Sign Out</Btn>
        </div>
      </Card>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [auth,     setAuth]     = useState(null);
  const [user,     setUser]     = useState(null);
  const [view,     setView]     = useState("query");
  const [toast,    setToast]    = useState(null);
  const [booting,  setBooting]  = useState(true);

  const addToast = useCallback((message, type = "info") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  // Resume session
  useEffect(() => {
    const token = localStorage.getItem("rag_token");
    if (token) {
      api.me()
        .then(u => { setUser(u); setAuth(true); })
        .catch(() => { localStorage.removeItem("rag_token"); })
        .finally(() => setBooting(false));
    } else {
      setBooting(false);
    }
  }, []);

  const handleAuth = async (data) => {
    try {
      const u = await api.me();
      setUser(u); setAuth(true);
      addToast("Signed in successfully", "success");
    } catch {
      addToast("Session error", "error");
    }
  };

  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    localStorage.removeItem("rag_token");
    setAuth(null); setUser(null);
    addToast("Signed out", "info");
  };

  if (booting) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
        <GlobalStyle />
        <Spinner />
      </div>
    );
  }

  if (!auth) {
    return (
      <>
        <GlobalStyle />
        <AuthView onAuth={handleAuth} />
        {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar active={view} setActive={setView} user={user} onLogout={handleLogout} />

        <main style={{ flex: 1, padding: 28, overflowY: "auto", maxHeight: "100vh" }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22 }}>
              {view === "query"   && "Knowledge Query"}
              {view === "upload"  && "Document Upload"}
              {view === "profile" && "Your Profile"}
            </h1>
            <p style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>
              {view === "query"   && "Retrieve answers from your organisation's indexed documents"}
              {view === "upload"  && "Ingest documents into the knowledge base"}
              {view === "profile" && "Account details and access permissions"}
            </p>
          </div>

          {view === "query"   && <QueryView   user={user} />}
          {view === "upload"  && <UploadView  user={user} />}
          {view === "profile" && <ProfileView user={user} onLogout={handleLogout} />}
        </main>
      </div>

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}