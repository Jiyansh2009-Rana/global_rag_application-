import { useState } from "react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: "◆",
    tag: "Chat Studio",
    title: "Streaming RAG Conversations",
    desc: "Multi-turn chat with real-time typewriter streaming, reasoning traces, and page-level citation pills linking back to source documents.",
    color: "#46b7ff",
    page: "chat",
    items: [
      "Slash commands /search /doc /deep /audit",
      "Knowledge Base, Session & Hybrid modes",
      "Collapsible reasoning accordion with source preview",
    ],
  },
  {
    icon: "↑",
    tag: "Ingest Pipeline",
    title: "Live Document Processing",
    desc: "Drag-and-drop file ingestion with a 5-stage live pipeline stepper and interactive chunk visualizer to inspect every embedded fragment.",
    color: "#8bf3e6",
    page: "upload",
    items: [
      "PDF · DOCX · MD · TXT · PPTX support",
      "Chunk preview with token counts & fragment IDs",
      "pgvector HNSW indexing with live progress",
    ],
  },
];

const STATS = [
  { value: "<150ms", label: "Retrieval latency" },
  { value: "1536-dim", label: "Embedding space" },
  { value: "Hybrid", label: "Dense + BM25 search" },
  { value: "Multi-tenant", label: "Row-level isolation" },
];

const TECH = [
  "Vector Search", "RAG Pipeline", "pgvector HNSW", "FastAPI", "OpenAI Embeddings",
  "Streaming SSE", "BM25 Sparse", "Cross-Encoder Rerank", "Multi-tenant",
  "Vector Search", "RAG Pipeline", "pgvector HNSW", "FastAPI", "OpenAI Embeddings",
  "Streaming SSE", "BM25 Sparse", "Cross-Encoder Rerank", "Multi-tenant",
];

interface Props {
  onOpenApp?: (page?: string) => void;
}

export function SpecShowcasePage({ onOpenApp }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  const scrollVariant = {
    hidden: { opacity: 0, y: 35 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <div style={{ background: "#07080a", color: "#e8e6e0", minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── HERO SECTION WITH SMOOTH REVEAL ── */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(70,183,255,0.18) 0%, transparent 70%), radial-gradient(ellipse 45% 35% at 80% 20%, rgba(139,243,230,0.08) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "200px 200px", opacity: 0.1, mixBlendMode: "overlay", pointerEvents: "none", zIndex: 1 }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 160, background: "linear-gradient(to bottom, transparent, #07080a)", zIndex: 2, pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 10, maxWidth: 840, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "clamp(3.5rem, 8vw, 7rem) 1rem 3.5rem" }}>

          {/* Announcement pill with reveal */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <a
              href="#features"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 9999,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                fontSize: "0.72rem",
                fontFamily: "Space Mono, monospace",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#9a9690",
                textDecoration: "none",
                marginBottom: "1.5rem",
                backdropFilter: "blur(8px)",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8bf3e6", display: "inline-block" }} />
              Hybrid Vector · BM25 · Cross-Encoder Rerank
              <span style={{ color: "#5a5852" }}>→</span>
            </a>
          </motion.div>

          {/* Main Hero title with reveal */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: '"Bricolage Grotesque", "Inter", sans-serif',
              fontSize: "clamp(2.2rem, 8.5vw, 5.2rem)",
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: "#e8e6e0",
              marginBottom: "1.25rem",
            }}
          >
            <span>Query your docs<br />with the power of </span>
            <span style={{ color: "#46b7ff" }}>intelligence.</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ maxWidth: 540, fontSize: "clamp(0.92rem, 2.5vw, 1.12rem)", lineHeight: 1.65, color: "#9a9690", marginBottom: "2rem" }}
          >
            Upload documents, ask complex multi-turn questions, and receive precise citations with grounded source verification in real-time.
          </motion.p>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginBottom: "2.5rem" }}
          >
            <button
              onClick={() => onOpenApp?.("chat")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 28px",
                borderRadius: 9999,
                background: "#e8e6e0",
                color: "#07080a",
                fontSize: "0.9rem",
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                border: "none",
                cursor: "pointer",
                transition: "background 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#e8e6e0";
                e.currentTarget.style.transform = "none";
              }}
            >
              Get Started / Sign In →
            </button>
            <button
              onClick={() => onOpenApp?.("chat")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 28px",
                borderRadius: 9999,
                background: "transparent",
                color: "#e8e6e0",
                fontSize: "0.9rem",
                fontWeight: 500,
                fontFamily: "Inter, sans-serif",
                border: "1px solid rgba(255,255,255,0.16)",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              Explore Features
            </button>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.875rem", color: "#9a9690" }}
          >
            <div style={{ display: "flex" }}>
              {["#2e7dff","#8bf3e6","#46b7ff","#a78bfa"].map((c, i) => (
                <span key={i} style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #07080a", marginLeft: i === 0 ? 0 : -8, background: `radial-gradient(circle at 30% 30%, ${c}, #07080a)`, display: "inline-block" }} />
              ))}
            </div>
            <span><strong style={{ color: "#e8e6e0" }}>Enterprise-grade</strong> document intelligence</span>
          </motion.div>
        </div>
      </section>

      {/* ── TECH MARQUEE STRIP WITH SCROLL REVEAL ── */}
      <motion.div
        variants={scrollVariant}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "18px 0", overflow: "hidden" }}
      >
        <div style={{ display: "flex", gap: 56, whiteSpace: "nowrap", width: "max-content", animation: "marquee 32s linear infinite", maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}>
          {TECH.map((item, i) => (
            <span key={i} style={{ fontFamily: "Space Mono, monospace", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#5a5852" }}>
              {item}<span style={{ marginLeft: 56, color: "rgba(255,255,255,0.1)" }}>✦</span>
            </span>
          ))}
        </div>
      </motion.div>

      {/* ── CORE CAPABILITIES (Vector Audit completely deleted) WITH SCROLL REVEAL ── */}
      <motion.section
        id="features"
        variants={scrollVariant}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(3rem, 6vw, 5rem) 1rem" }}
      >
        <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
          <p style={{ fontFamily: "Space Mono, monospace", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#8bf3e6", marginBottom: "0.75rem" }}>
            Platform Modules
          </p>
          <h2 style={{ fontFamily: '"Bricolage Grotesque", "Inter", sans-serif', fontSize: "clamp(1.75rem, 5vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#e8e6e0" }}>
            Enterprise Document Intelligence
          </h2>
        </div>

        {/* 2-column feature grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: "relative",
                overflow: "hidden",
                background: "#0f1014",
                border: `1px solid ${hovered === i ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 18,
                padding: "clamp(1.25rem, 4vw, 2rem)",
                cursor: "pointer",
                transition: "border-color 0.4s, transform 0.5s cubic-bezier(0.22,1,0.36,1), box-shadow 0.5s cubic-bezier(0.22,1,0.36,1)",
                transform: hovered === i ? "translateY(-4px)" : "none",
                boxShadow: hovered === i ? "0 18px 60px -18px rgba(70,183,255,0.4)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <p style={{ fontFamily: "Space Mono, monospace", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#8bf3e6" }}>{f.tag}</p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 9999, fontSize: "0.65rem", fontWeight: 600, border: `1px solid ${f.color}55`, background: `${f.color}15`, color: f.color, fontFamily: "Space Mono, monospace" }}>Active</span>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: `${f.color}15`, border: `1px solid ${f.color}28`, fontSize: "1.4rem", marginBottom: "1.25rem" }}>{f.icon}</div>
              <h3 style={{ fontFamily: '"Bricolage Grotesque", "Inter", sans-serif', fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#e8e6e0", marginBottom: "0.75rem" }}>{f.title}</h3>
              <p style={{ fontSize: "0.9rem", color: "#9a9690", lineHeight: 1.65, marginBottom: "1.5rem" }}>{f.desc}</p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {f.items.map((item, j) => (
                  <li key={j} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", color: "#9a9690" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: f.color, flexShrink: 0 }} />{item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onOpenApp?.("chat")}
                style={{
                  marginTop: "1.75rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: f.color,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Launch {f.tag} →
              </button>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── STATS SECTION WITH SCROLL REVEAL ── */}
      <motion.section
        variants={scrollVariant}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2.5rem 1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "0.75rem" }}>
              <div style={{ fontFamily: '"Bricolage Grotesque", "Inter", sans-serif', fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#e8e6e0", marginBottom: "0.35rem" }}>{s.value}</div>
              <div style={{ fontSize: "0.72rem", color: "#9a9690", fontFamily: "Space Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── CTA BANNER WITH SCROLL REVEAL ── */}
      <motion.section
        variants={scrollVariant}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(3rem, 6vw, 5rem) 1rem" }}
      >
        <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, rgba(70,183,255,0.06) 0%, rgba(139,243,230,0.04) 100%)", border: "1px solid rgba(70,183,255,0.15)", borderRadius: 24, padding: "clamp(2rem, 5vw, 3.5rem) clamp(1rem, 4vw, 2rem)", textAlign: "center" }}>
          <div style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(70,183,255,0.15)", filter: "blur(50px)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2 }}>
            <p style={{ fontFamily: "Space Mono, monospace", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#8bf3e6", marginBottom: "0.75rem" }}>Ready to start</p>
            <h2 style={{ fontFamily: '"Bricolage Grotesque", "Inter", sans-serif', fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#e8e6e0", marginBottom: "0.875rem" }}>Sign in to access your intelligence workspace</h2>
            <p style={{ fontSize: "0.95rem", color: "#9a9690", marginBottom: "2rem", maxWidth: 500, margin: "0 auto 2rem" }}>Upload documents, query indexed fragments, and leverage high-speed semantic retrieval.</p>
            <button
              onClick={() => onOpenApp?.("chat")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 32px",
                borderRadius: 9999,
                background: "#e8e6e0",
                color: "#07080a",
                fontSize: "0.9rem",
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                border: "none",
                cursor: "pointer",
                transition: "background 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#e8e6e0";
                e.currentTarget.style.transform = "none";
              }}
            >
              Sign In / Access Workspace →
            </button>
          </div>
        </div>
      </motion.section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "2.5rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-flex", width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 6, background: "linear-gradient(135deg, #46b7ff, #8bf3e6)", fontSize: "0.5rem", fontWeight: 900, color: "#04121f" }}>RA</span>
            <span style={{ fontFamily: '"Bricolage Grotesque", "Inter", sans-serif', fontSize: "0.9rem", fontWeight: 700, color: "#9a9690", letterSpacing: "-0.02em" }}>Rag-Agent</span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#5a5852", fontFamily: "Space Mono, monospace" }}>Production Edition v3.0 — FastAPI · pgvector · React</p>
        </div>
      </footer>
    </div>
  );
}