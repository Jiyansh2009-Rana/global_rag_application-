import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Dialog({ open, onClose, title, children, maxWidth = '520px' }: DialogProps) {
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
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Card */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative flex flex-col overflow-hidden rounded-[20px] border border-[var(--border)] shadow-[0_32px_80px_rgba(0,0,0,0.65)]"
            style={{
              maxWidth,
              width: '100%',
              maxHeight: '85vh',
              background: 'linear-gradient(145deg, rgba(18,40,36,0.93) 0%, rgba(10,24,21,0.97) 100%)',
              backdropFilter: 'blur(48px) saturate(200%)',
              WebkitBackdropFilter: 'blur(48px) saturate(200%)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
                <h2 className="font-semibold text-[0.95rem] text-[var(--text)] tracking-tight">{title}</h2>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-sm text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-all duration-150"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
