import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'right' | 'left';
  width?: string;
}

export function Sheet({ open, onClose, title, children, side = 'right', width = '360px' }: SheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const slideX = side === 'right' ? '100%' : '-100%';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: slideX, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: slideX, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{ width }}
            className={`
              fixed top-0 ${side}-0 bottom-0 z-[201]
              flex flex-col
              bg-[var(--surface)] border-l border-[var(--border)]
              shadow-[0_0_60px_rgba(0,0,0,0.5)]
              overflow-hidden
            `}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
                <h2 className="font-semibold text-sm tracking-tight text-[var(--text)]">{title}</h2>
                <button
                  onClick={onClose}
                  className="
                    w-7 h-7 rounded-md flex items-center justify-center
                    text-[var(--muted)] hover:text-[var(--text)]
                    bg-transparent hover:bg-[var(--surface-2)]
                    transition-all duration-150 text-sm
                  "
                  aria-label="Close panel"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-5">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
