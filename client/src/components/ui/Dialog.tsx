import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  maxWidth = '580px',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-center justify-center p-2.5 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Deep blur backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Glass Card */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="relative flex flex-col overflow-hidden rounded-[20px] sm:rounded-[22px]"
            style={{
              maxWidth: `min(${maxWidth}, calc(100vw - 20px))`,
              width: '100%',
              maxHeight: '88vh',
              background: 'linear-gradient(165deg, rgba(16, 18, 22, 0.96) 0%, rgba(9, 10, 13, 0.98) 100%)',
              backdropFilter: 'blur(32px) saturate(180%)',
              WebkitBackdropFilter: 'blur(32px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.85), 0 0 32px rgba(70,183,255,0.08)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.015)',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#46b7ff', boxShadow: '0 0 8px #46b7ff' }} />
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#e8e6e0', letterSpacing: '-0.02em', fontFamily: '"Bricolage Grotesque", "Inter", sans-serif', margin: 0 }}>
                    {title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    color: '#9a9690',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#e8e6e0';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9a9690';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }}
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>
            )}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 18px 20px',
                color: '#e8e6e0',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
