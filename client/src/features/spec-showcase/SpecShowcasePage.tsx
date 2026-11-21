import { useState } from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";

const MODULES = [
  {
    icon: "◆",
    tag: "Chat Studio",
    title: "Streaming Multi-Turn RAG",
    desc: "Conversational document assistant featuring real-time Server-Sent Event streaming, transparent reasoning traces, and exact page-level citations.",
    accent: "#00C2DE",
    page: "chat",
    items: [
      "Targeted search across Global and Local Session indexes",
      "Exact page & chunk similarity breakdown for zero hallucination",
      "Collapsible reasoning accordion with source preview",
    ],
  },
  {
    icon: "↑",
    tag: "Ingest Pipeline",
    title: "Real-Time Document Ingestion",
    desc: "Drag-and-drop document processing pipeline with chunk visualization, duplicate content detection, and automated delta indexing.",
    accent: "#0051C6",
    page: "upload",
    items: [
      "PDF, DOCX, TXT, MD, and image format support",
      "pgvector HNSW vector indexing with Supabase storage",
      "Automated page hashing to prevent redundant embeddings",
    ],
  },
  {
    icon: "⊞",
    tag: "Governance & Control",
    title: "Multi-Tenant Enterprise Security",
    desc: "Strict tenant data isolation and role-based access control protecting organization knowledge bases and auditing all actions.",
    accent: "#00C2DE",
    page: "admin",
    items: [
      "Super Admin, Admin, and User role separation",
      "Global vs. private 1-hour session isolation",
      "Complete user activity & document audit logging",
    ],
  },
];

/* Real architectural pillars without any hardcoded fake numbers */
const PILLARS = [
  { value: "Hybrid", label: "Dense Vector + Lexical Search" },
  { value: "pgvector", label: "Neon HNSW Indexing" },
  { value: "Multi-Tenant", label: "Row-Level Quarantined Access" },
  { value: "Real-Time", label: "Token-by-Token SSE Stream" },
];

const STACK = [
  "FastAPI", "Neon PostgreSQL", "pgvector HNSW", "Supabase", "Jina Embeddings",
  "Groq LLM", "Redis Session Store", "React 18", "Vite", "Tailwind CSS",
  "FastAPI", "Neon PostgreSQL", "pgvector HNSW", "Supabase", "Jina Embeddings",
  "Groq LLM", "Redis Session Store", "React 18", "Vite", "Tailwind CSS",
];

interface Props {
  onOpenApp?: (page?: string) => void;
}

export function SpecShowcasePage({ onOpenApp }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  const scrollVariant = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <div style={{ background: "#000000", color: "#FFFFFF", minHeight: "100vh", overflowX: "hidden", fontFamily: '"Open Sans", sans-serif' }}>

      {/* ── HERO SECTION WITH AUTHENTIC AMD WAVE BACKGROUND ── */}
      <section style={{ position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Authentic AMD Wave Photo Asset from amd.com */}
        <div className="amd-wave-backdrop amd-wave-animated" />
        <div className="amd-wave-vignette" />

        <div style={{ position: "relative", zIndex: 10, maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "clamp(2.75rem, 5.5vw, 5rem) 1.25rem 4rem" }}>

          {/* Logo badge with soft entrance */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: "2rem" }}
          >
            <Logo size="lg" showText={false} />
          </motion.div>

          {/* Announcement pill (Pill capsule shape) */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 14px',
                borderRadius: 9999,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(0, 194, 222, 0.3)',
                fontSize: '0.74rem',
                fontFamily: '"Space Mono", monospace',
                letterSpacing: '0.04em',
                color: '#00C2DE',
                marginBottom: '1.75rem',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C2DE', display: 'inline-block' }} />
              Enterprise Document Intelligence Platform
            </div>
          </motion.div>

          {/* Main Hero title with AMD Boldness */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: "clamp(2.5rem, 6.5vw, 4.8rem)",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              color: "#FFFFFF",
              marginBottom: "1.5rem",
            }}
          >
            <span>Ask questions across docs<br />with </span>
            <span style={{ color: "#00C2DE" }}>deterministic precision.</span>
          </motion.h1>

          {/* Subtext on calm contrast space */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ maxWidth: 640, fontSize: "clamp(1rem, 2vw, 1.15rem)", lineHeight: 1.6, color: "#9D9FA2", marginBottom: "2.75rem" }}
          >
            Askmydocsai blends dense vector search with lexical matching and automated delta indexing to deliver verifiable answers with exact source page citations.
          </motion.p>

          {/* Action buttons (Chamfered Tech & Capsule Pill Shapes) */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, marginBottom: "3rem" }}
          >
            {/* Primary Action Button: Asymmetric Chamfered Shape */}
            <Button
              variant="primary"
              size="lg"
              onClick={() => onOpenApp?.("chat")}
            >
              Launch Workspace →
            </Button>

            {/* Secondary Action Button: Capsule Pill Shape */}
            <Button
              variant="pill"
              size="lg"
              onClick={() => {
                const el = document.getElementById("modules");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Architecture Overview ↓
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── TECH MARQUEE STRIP ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "16px 0", overflow: "hidden", background: "#080809" }}>
        <div style={{ display: "flex", gap: 56, whiteSpace: "nowrap", width: "max-content", animation: "marquee 32s linear infinite" }}>
          {STACK.map((item, i) => (
            <span key={i} style={{ fontFamily: '"Space Mono", monospace', fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6C757D" }}>
              {item}<span style={{ marginLeft: 56, color: "rgba(0,194,222,0.4)" }}>•</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── ARCHITECTURAL PILLARS (Modern Elevated Glass Cards) ── */}
      <section style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0c0d0e" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "3rem 1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
          {PILLARS.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4, borderColor: "rgba(0,194,222,0.4)" }}
              className="card-feature-modern"
              style={{
                padding: "1.75rem 1.5rem",
                textAlign: "left",
                background: "rgba(22, 23, 25, 0.9)",
                borderRadius: "16px",
                border: "1px solid rgba(255, 255, 255, 0.09)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              }}
            >
              <div style={{ fontSize: "1.45rem", fontWeight: 700, color: "#00C2DE", marginBottom: "0.35rem" }}>
                {p.value}
              </div>
              <div style={{ fontSize: "0.82rem", color: "#9D9FA2", lineHeight: 1.4 }}>
                {p.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── MODULE CARDS (Modern Rounded Feature Cards with Staggered Scroll Reveal) ── */}
      <motion.section
        id="modules"
        variants={scrollVariant}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(3.5rem, 6vw, 6rem) 1.5rem" }}
      >
        <div style={{ marginBottom: "3rem", textAlign: "left" }}>
          <p style={{ fontFamily: '"Space Mono", monospace', fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#00C2DE", marginBottom: "0.5rem" }}>
            Core Modules
          </p>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFFFFF" }}>
            Designed for High-Consequence Workspaces
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 20 }}>
          {MODULES.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="card-feature-modern"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: "2.25rem 2rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background: "rgba(24, 25, 27, 0.88)",
                borderRadius: "16px",
                border: hovered === i ? "1px solid rgba(0,194,222,0.35)" : "1px solid rgba(255,255,255,0.08)",
                boxShadow: hovered === i ? "0 12px 32px rgba(0,0,0,0.6)" : "0 4px 16px rgba(0,0,0,0.3)",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", color: m.accent, fontFamily: '"Space Mono", monospace' }}>
                    {m.tag}
                  </span>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.accent }} />
                </div>

                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.75rem" }}>
                  {m.title}
                </h3>
                <p style={{ fontSize: "0.88rem", color: "#9D9FA2", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                  {m.desc}
                </p>

                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {m.items.map((item, j) => (
                    <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.82rem", color: "#ADB5BD" }}>
                      <Check size={14} className="text-[#00C2DE] mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: "2rem", paddingTop: "1.25rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button
                  onClick={() => onOpenApp?.(m.page)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                    transition: "color 140ms ease, transform 140ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#00C2DE";
                    e.currentTarget.style.transform = "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#FFFFFF";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  Open {m.tag} →
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── CTA BANNER (Modern Elevated Card with Ambient Glow) ── */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "#0c0d0e", padding: "5rem 1.5rem" }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="card-modern-glass"
          style={{
            maxWidth: 900,
            margin: "0 auto",
            textAlign: "center",
            padding: "3.5rem 2rem",
            background: "rgba(22, 23, 25, 0.92)",
            borderRadius: "20px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.65)",
          }}
        >
          <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700, color: "#FFFFFF", marginBottom: "1rem" }}>
            Ready to explore your enterprise documents?
          </h2>
          <p style={{ fontSize: "1rem", color: "#9D9FA2", maxWidth: 540, margin: "0 auto 2.5rem", lineHeight: 1.6 }}>
            Sign in to start querying, ingest confidential files, and configure organization boundaries.
          </p>

          <Button
            variant="primary"
            size="lg"
            onClick={() => onOpenApp?.("chat")}
          >
            Access Workspace →
          </Button>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "#000000", padding: "2.5rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <Logo size="sm" showText={true} />
          <div style={{ fontSize: "0.78rem", color: "#6C757D" }}>
            © {new Date().getFullYear()} Askmydocsai. High-Performance Document Intelligence Platform.
          </div>
        </div>
      </footer>
    </div>
  );
}
