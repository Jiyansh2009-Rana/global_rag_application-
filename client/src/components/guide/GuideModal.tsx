import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPlatformGuide } from '@/api/guide';
import type { PlatformGuide } from '@/api/types';

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
}

const fallbackGuide: PlatformGuide = {
  title: 'Welcome to the Enterprise RAG Platform',
  introduction:
    'This platform acts as your intelligent document assistant. You can securely upload your documents (PDFs, Word docs, Spreadsheets, Presentations, etc.) and ask AI questions to instantly find answers based strictly on your files.',
  how_to_use_steps: [
    {
      step: 1,
      title: '🔐 Create an Account & Log In',
      description: "Start by signing up with your email. Once logged in, you'll be securely assigned to your organization's workspace.",
    },
    {
      step: 2,
      title: '📂 Upload Documents (Local vs. Global)',
      description: 'You have two ways to upload documents, depending on your needs:',
      details: {
        'Local Mode (Private & Temporary)': 'Perfect for sensitive, one-off analysis. Documents are visible ONLY to you and are permanently deleted after 1 hour.',
        'Global Mode (Org-Wide)': "Available for Admins. Documents uploaded globally act as a shared knowledge base for everyone in your organization.",
      },
    },
    {
      step: 3,
      title: '💬 Ask Questions (Querying)',
      description: 'Head over to the chat interface to ask questions. You can filter where the AI searches for answers:',
      details: {
        'Local': 'Searches only your temporarily uploaded files.',
        'Global': "Searches your organization's permanent knowledge base.",
        'Both': "Searches across both your private session files and the organization's files.",
      },
    },
    {
      step: 4,
      title: '📜 View Chat History',
      description: "Whenever you ask questions in 'Global' or 'Both' modes, your chat history is safely stored. You can revisit your past questions and answers at any time in the History tab.",
    },
  ],
  tips_for_best_results: [
    'Be specific with your questions.',
    "If the AI doesn't know the answer, it will tell you. It will never make up information.",
    'You can ask the AI to answer in different languages!',
  ],
  support: "If you need elevated access (like Global Upload permissions), please contact your Organization's Admin.",
  contact: 'if you see any issue or you have any suggestion then contact this email mcode1929@gmail.com',
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
                borderBottom: '1px solid var(--border)',
                background: 'linear-gradient(180deg, rgba(0,210,200,0.06) 0%, transparent 100%)',
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
                    fontSize: '1.15rem',
                    background: 'linear-gradient(135deg, rgba(0,210,200,0.22), rgba(168,85,247,0.18))',
                    border: '1px solid rgba(0,210,200,0.3)',
                    boxShadow: '0 0 16px rgba(0,210,200,0.2)',
                  }}
                >
                  📖
                </div>
                <div>
                  <h2
                    style={{
                      fontFamily: '"Comfortaa", "Outfit", "Plus Jakarta Sans", sans-serif',
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
                      How to use the Global RAG Platform &amp; Best Practices
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
                  border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--muted)',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
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
                ✕
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
                  background: 'linear-gradient(135deg, rgba(0,210,200,0.08) 0%, rgba(168,85,247,0.05) 100%)',
                  border: '1px solid rgba(0,210,200,0.18)',
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
                    letterSpacing: '0.12em',
                    color: 'var(--muted)',
                    fontWeight: 600,
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: '"Comfortaa", "Quicksand", sans-serif',
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
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'rgba(0,210,200,0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                      }}
                    >
                      <div
                        style={{
                          fontFamily: '"Comfortaa", "Outfit", "Plus Jakarta Sans", sans-serif',
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
                      letterSpacing: '0.12em',
                      color: 'var(--muted)',
                      fontWeight: 600,
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ color: '#fbbf24' }}>💡</span> Tips for Best Results
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
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
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
