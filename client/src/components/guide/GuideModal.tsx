import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, Lightbulb } from 'lucide-react';
import { getPlatformGuide } from '@/api/guide';
import type { PlatformGuide } from '@/api/types';

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
}

const fallbackGuide: PlatformGuide = {
  title: 'Welcome to Askmydocsai Platform',
  introduction:
    'Askmydocsai acts as your enterprise document intelligence assistant. Securely upload documents (PDFs, Word documents, Spreadsheets, Presentations, Images) and query them with deterministic precision and verifiable page citations.',
  how_to_use_steps: [
    {
      step: 1,
      title: 'Account Creation & Authentication',
      description: "Sign in with your organization email or Google OAuth. Once authenticated, you are scoped to your organization workspace.",
    },
    {
      step: 2,
      title: 'Document Ingestion (Sandbox vs Global)',
      description: 'Choose your ingestion target based on security and collaboration requirements:',
      details: {
        'Local / Sandbox Mode': 'Ephemeral, private document analysis. Files are isolated to your session and cached in Redis with a 1-hour TTL.',
        'Global Knowledge Base': "Shared enterprise repository indexed in Neon PostgreSQL with pgvector HNSW embeddings for organization-wide retrieval.",
      },
    },
    {
      step: 3,
      title: 'Querying & Retrieval',
      description: 'Ask questions using real-time streaming inference. Target your search mode according to context:',
      details: {
        'Global Mode': "Queries your organization's permanent knowledge base.",
        'Sandbox Mode': 'Queries only your private session documents.',
        'Hybrid Mode': "Blends global organizational knowledge with active session files.",
      },
    },
    {
      step: 4,
      title: 'Chat History & Session Continuity',
      description: "Past questions, streaming responses, and citations are safely indexed for quick reference across sessions.",
    },
  ],
  tips_for_best_results: [
    'Be specific with terms, codes, or sections you want to reference.',
    'Responses cite exact source document names and page numbers for auditability.',
    'Multimodal image charts and diagrams are retrieved via cross-modal vector similarity.',
  ],
  support: "If you need elevated permissions (such as Global Ingestion), please reach out to your Organization Admin.",
  contact: 'For support or assistance, reach out to rag1agentsuperadmin@gmail.com',
};

export function GuideModal({ open, onClose }: GuideModalProps) {
  const [guide, setGuide] = useState<PlatformGuide>(fallbackGuide);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getPlatformGuide()
        .then((data) => {
          if (data && data.title) setGuide(data);
        })
        .catch(() => {
          // Use fallback
        })
        .finally(() => setLoading(false));
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            background: 'rgba(2, 8, 14, 0.78)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-deep"
            style={{
              width: '100%',
              maxWidth: 720,
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 22,
              border: '1px solid rgba(0, 210, 200, 0.22)',
              borderTopColor: 'rgba(255, 255, 255, 0.3)',
              boxShadow: '0 24px 80px rgba(0, 0, 0, 0.75), 0 0 40px rgba(0, 210, 200, 0.12)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.4rem 1.75rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,194,222,0.12)',
                    border: '1px solid rgba(0,194,222,0.3)',
                  }}
                >
                  <BookOpen size={18} className="text-[#00C2DE]" />
                </div>
                <div>
                  <h2
                    style={{
                      fontFamily: '"Open Sans", sans-serif',
                      fontSize: '1.15rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.25,
                    }}
                  >
                    {guide.title}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <p style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                      How to use the Askmydocsai Platform &amp; Best Practices
                    </p>
                    {loading && (
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          border: '1.5px solid var(--accent)',
                          borderTopColor: 'transparent',
                          animation: 'spin 0.7s linear infinite',
                          display: 'inline-block',
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                aria-label="Close guide"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--muted)',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.18s ease, color 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--muted)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              {/* Introduction */}
              <div
                style={{
                  padding: '1.1rem 1.35rem',
                  borderRadius: 14,
                  background: 'rgba(22, 23, 25, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.86rem',
                  color: 'var(--text)',
                  lineHeight: 1.65,
                }}
              >
                {guide.introduction}
              </div>

              {/* How to use steps */}
              <div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--muted)',
                    fontWeight: 600,
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: '"Space Mono", monospace',
                  }}
                >
                  <span style={{ color: 'var(--accent)' }}>◈</span> Step-by-Step Guide
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {guide.how_to_use_steps?.map((step) => (
                    <div
                      key={step.step}
                      style={{
                        padding: '1.1rem 1.25rem',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        transition: 'background-color 0.2s ease, border-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'rgba(0,194,222,0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                      }}
                    >
                      <div
                        style={{
                          fontFamily: '"Open Sans", sans-serif',
                          fontSize: '0.92rem',
                          fontWeight: 600,
                          color: 'var(--text)',
                          marginBottom: 6,
                          letterSpacing: '-0.015em',
                        }}
                      >
                        {step.title}
                      </div>
                      <p style={{ fontSize: '0.81rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                        {step.description}
                      </p>

                      {step.details && (
                        <div
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          {Object.entries(step.details).map(([key, val]) => (
                            <div key={key} style={{ fontSize: '0.78rem', lineHeight: 1.55 }}>
                              <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{key}: </span>
                              <span style={{ color: 'var(--text-secondary)' }}>{val}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips for best results */}
              {guide.tips_for_best_results && guide.tips_for_best_results.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--muted)',
                      fontWeight: 600,
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontFamily: '"Space Mono", monospace',
                    }}
                  >
                    <Lightbulb size={13} className="text-amber-400" /> Tips for Best Results
                  </div>
                  <div
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: 14,
                      background: 'rgba(251,191,36,0.05)',
                      border: '1px solid rgba(251,191,36,0.18)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {guide.tips_for_best_results.map((tip, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        <span style={{ color: '#fbbf24', fontWeight: 600 }}>•</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Support & Contact */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  fontSize: '0.78rem',
                  color: 'var(--muted)',
                  lineHeight: 1.6,
                }}
              >
                <div style={{ marginBottom: 4 }}>
                  <strong style={{ color: 'var(--text)' }}>Support: </strong>
                  {guide.support}
                </div>
                {guide.contact && (
                  <div>
                    <strong style={{ color: 'var(--text)' }}>Contact: </strong>
                    <span style={{ color: 'var(--accent)' }}>{guide.contact}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '1rem 1.75rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
                background: 'rgba(0,0,0,0.2)',
              }}
            >
              <button
                onClick={onClose}
                style={{
                  height: 38,
                  padding: '0 20px',
                  borderRadius: 10,
                  border: '1px solid var(--border-accent)',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                  color: 'var(--accent-fg)',
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(0,210,200,0.3)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.1)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'none';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                Got it, let's explore
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
