import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useContextHooks';
import { getConsent, uploadDocumentXHR } from '@/api/upload';
import { getGlobalUploadSetting } from '@/api/admin';
import { parseApiError, tokenStore } from '@/api/client';
import type { ConsentResponse, UploadReport } from '@/api/types';
import { Button } from '@/components/ui/Button';

type UploadMode = 'global' | 'local';
type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

/* ─── Shared glass panel style ─── */
const glassPanel = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(0,180,200,0.04) 50%, rgba(255,255,255,0.025) 100%)',
  backdropFilter: 'blur(32px) saturate(170%)',
  WebkitBackdropFilter: 'blur(32px) saturate(170%)',
  border: '1px solid rgba(0,210,200,0.14)',
  borderTopColor: 'rgba(255,255,255,0.20)',
  borderRadius: 20,
  boxShadow: '0 8px 40px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.09) inset, 0 0 0 1px rgba(0,210,200,0.06)',
} as const;

/* ── Animated Progress Ring ── */
function ProgressRing({ pct }: { pct: number }) {
  const r = 34, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
      <svg width={88} height={88} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={44} cy={44} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={5} />
        <motion.circle cx={44} cy={44} r={r} fill="none" stroke="var(--accent)" strokeWidth={5}
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
          transition={{ duration: 0.35 }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.85rem', fontWeight: 700,
        color: 'var(--accent)', fontVariantNumeric: 'tabular-nums',
      }}>
        {pct}%
      </div>
    </div>
  );
}

/* ── Upload Report Card ── */
function ReportCard({ report }: { report: UploadReport }) {
  const indexedPct = report.total_pages > 0
    ? (report.pages_newly_indexed / report.total_pages) * 100
    : 0;

  const stats = [
    { label: 'Document ID',   value: report.doc_id,                         mono: true  },
    { label: 'File',          value: report.file_name                                    },
    { label: 'Type',          value: report.doc_type                                     },
    { label: 'Mode',          value: report.upload_mode                                  },
    { label: 'Total Pages',   value: String(report.total_pages)                          },
    { label: 'Newly Indexed', value: String(report.pages_newly_indexed), accent: true    },
    { label: 'Pages Skipped', value: String(report.pages_skipped)                        },
    { label: 'Chunks Created',value: String(report.chunks_created),    accent: true      },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ ...glassPanel, padding: '1.75rem 2rem' }}
    >
      {/* Success header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        marginBottom: 22, paddingBottom: 18,
        borderBottom: '1px solid rgba(0,210,200,0.12)',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem',
          background: 'var(--success-dim)',
          border: '1px solid rgba(52,211,153,0.30)',
          boxShadow: '0 0 18px rgba(52,211,153,0.20)',
        }}>
          ✓
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)', marginBottom: 3 }}>
            Document indexed successfully
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{report.status}</div>
        </div>
      </div>

      {/* Pages bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 10 }}>
          <span>Pages indexed</span>
          <span style={{ fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
            {report.pages_newly_indexed} / {report.total_pages}
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--success), var(--accent))' }}
            initial={{ width: '0%' }}
            animate={{ width: `${indexedPct}%` }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {stats.map(({ label, value, mono, accent }) => (
          <div key={label} style={{
            padding: '14px 16px', borderRadius: 13,
            background: 'rgba(255,255,255,0.038)',
            border: '1px solid rgba(0,210,200,0.10)',
            borderTopColor: 'rgba(255,255,255,0.10)',
          }}>
            <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted)', marginBottom: 6 }}>
              {label}
            </div>
            <div style={{
              fontSize: '0.9rem', fontWeight: 700,
              color: accent ? 'var(--accent)' : 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontFamily: mono ? 'monospace' : 'inherit',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Dropzone ── */
function Dropzone({ file, onFile }: { file: File | null; onFile: (f: File) => void }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      style={{
        position: 'relative',
        border: `2px dashed ${drag ? 'var(--accent)' : 'rgba(0,210,200,0.22)'}`,
        borderRadius: 18,
        padding: '3.5rem 2.5rem',
        textAlign: 'center',
        cursor: 'pointer',
        background: drag ? 'rgba(0,210,200,0.07)' : 'rgba(255,255,255,0.025)',
        backdropFilter: 'blur(18px)',
        transition: 'all 0.25s ease',
        boxShadow: drag
          ? '0 0 50px rgba(0,210,200,0.18), inset 0 0 40px rgba(0,210,200,0.06)'
          : '0 4px 24px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={e => {
        if (!drag) {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,210,200,0.45)';
          (e.currentTarget as HTMLElement).style.background = 'rgba(0,210,200,0.05)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 32px rgba(0,0,0,0.35), 0 0 24px rgba(0,210,200,0.10)';
        }
      }}
      onMouseLeave={e => {
        if (!drag) {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,210,200,0.22)';
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        style={{ position: 'absolute', inset: 0, opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        accept=".pdf,.docx,.xlsx,.pptx,.txt,.html,.png,.jpg,.jpeg,.gif,.webp"
      />

      {/* Icon */}
      <div style={{
        fontSize: '3.2rem', marginBottom: 16,
        filter: `drop-shadow(0 0 16px rgba(0,210,200,${drag ? 0.6 : 0.35}))`,
        transition: 'filter 0.3s',
      }}>
        {file ? '📋' : '📄'}
      </div>

      <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8, color: 'var(--text)' }}>
        {file ? file.name : 'Drop a file or click to browse'}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>
        {file
          ? `${(file.size / 1024).toFixed(1)} KB · ${file.type || 'unknown type'}`
          : 'PDF, DOCX, XLSX, PPTX, TXT, HTML, PNG, JPG, GIF, WEBP'
        }
      </div>

      {/* Change hint when file selected */}
      {file && (
        <div style={{ marginTop: 14, fontSize: '0.72rem', color: 'var(--accent)', opacity: 0.7 }}>
          Click to change file
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   UPLOAD PAGE — centered, generous glass layout
─────────────────────────────────────────────────────────────────────────────── */
export function UploadPage() {
  const { isAdmin } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<UploadMode>('local');
  const [canUserGlobalUpload, setCanUserGlobalUpload] = useState(false);
  const [consent, setConsent] = useState<ConsentResponse | null>(null);
  const [consentLoading, setConsentLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<UploadReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGlobalUploadSetting()
      .then(res => setCanUserGlobalUpload(res.allow_user_global_upload))
      .catch(() => setCanUserGlobalUpload(false));
  }, []);

  const isGlobalAllowed = isAdmin || canUserGlobalUpload;

  useEffect(() => {
    if (mode === 'global' && !isGlobalAllowed) {
      setMode('local');
    }
  }, [mode, isGlobalAllowed]);

  const fetchConsent = useCallback(async (m: UploadMode) => {
    setConsentLoading(true); setConsent(null); setConfirmed(false); setError(null);
    try { setConsent(await getConsent(m)); }
    catch (err) { setError(parseApiError(err)); }
    finally { setConsentLoading(false); }
  }, []);

  useEffect(() => { void fetchConsent(mode); }, [mode, fetchConsent]);

  const handleUpload = async () => {
    if (!file || !confirmed) return;
    setPhase('uploading'); setProgress(0); setError(null); setReport(null);
    try {
      const token = tokenStore.get();
      const data = await uploadDocumentXHR(file, mode, token, (pct) => {
        setProgress(pct);
        if (pct >= 100) setPhase('processing');
      });
      setReport(data); setPhase('done');
    } catch (err) {
      setError(parseApiError(err)); setPhase('error');
    }
  };

  const MODES: {
    key: UploadMode;
    title: string;
    desc: string;
    icon: string;
    disabled?: boolean;
    badge?: { text: string; type: 'admin' | 'enabled' };
  }[] = [
    { key: 'local', icon: '💾', title: 'Local Session', desc: 'Private to you · 1-hour TTL · Redis' },
    {
      key: 'global',
      icon: '🌐',
      title: 'Global Org',
      desc: 'Shared with org · Permanent · Neon DB',
      disabled: !isGlobalAllowed,
      badge: !isGlobalAllowed
        ? { text: 'Admin only', type: 'admin' }
        : !isAdmin
        ? { text: 'Enabled by Admin', type: 'enabled' }
        : undefined,
    },
  ];

  return (
    /* ── FULL VIEWPORT: horizontally centred, top-padded ── */
    <div
      style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '3rem 1.5rem 4rem',
        overflowY: 'auto',
      }}
    >
      {/* ── Constrained column ── */}
      <div style={{ width: '100%', maxWidth: 740, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* PAGE HEADER */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.15rem',
              background: 'linear-gradient(135deg, rgba(0,210,200,0.18), rgba(168,85,247,0.14))',
              border: '1px solid rgba(0,210,200,0.22)',
              boxShadow: '0 4px 16px rgba(0,210,200,0.14)',
            }}>
              ↑
            </div>
            <div>
              <h1 style={{
                fontFamily: '"Comfortaa", "Outfit", "Plus Jakarta Sans", sans-serif',
                fontSize: '1.65rem', fontWeight: 600,
                letterSpacing: '-0.025em', color: 'var(--text)', lineHeight: 1.15,
              }}>
                Upload Document
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 3 }}>
                Index documents globally (permanent, org-wide) or locally (session-private, 1-hour TTL).
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── DROPZONE CARD ── */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Dropzone
            file={file}
            onFile={(f) => { setFile(f); setReport(null); setPhase('idle'); setError(null); }}
          />
        </motion.div>

        {/* ── MODE SELECTOR ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
        >
          {MODES.map(({ key, icon, title, desc, disabled, badge }) => {
            const selected = mode === key;
            return (
              <div
                key={key}
                onClick={() => !disabled && setMode(key)}
                title={disabled ? 'Global upload is disabled for standard users by your Admin.' : undefined}
                style={{
                  padding: '1.5rem 1.75rem',
                  textAlign: 'center',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.38 : 1,
                  transition: 'all 0.22s ease',
                  ...glassPanel,
                  borderRadius: 16,
                  border: selected
                    ? '1.5px solid rgba(0,210,200,0.45)'
                    : '1px solid rgba(0,210,200,0.14)',
                  borderTopColor: selected ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.20)',
                  background: selected
                    ? 'linear-gradient(145deg, rgba(0,210,200,0.14) 0%, rgba(0,180,200,0.08) 100%)'
                    : glassPanel.background,
                  boxShadow: selected
                    ? '0 0 32px rgba(0,210,200,0.18), 0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10)'
                    : glassPanel.boxShadow,
                  transform: selected ? 'translateY(-2px)' : 'translateY(0)',
                }}
                onMouseEnter={e => {
                  if (!disabled && !selected) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(0,210,200,0.06)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.5)';
                  }
                }}
                onMouseLeave={e => {
                  if (!disabled && !selected) {
                    (e.currentTarget as HTMLElement).style.background = glassPanel.background;
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = glassPanel.boxShadow;
                  }
                }}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>{icon}</div>
                <div style={{
                  fontFamily: '"Comfortaa", "Outfit", "Plus Jakarta Sans", sans-serif',
                  fontWeight: 600, fontSize: '0.95rem',
                  color: selected ? 'var(--accent)' : 'var(--text)',
                  marginBottom: 6,
                  letterSpacing: '-0.015em',
                }}>
                  {title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</div>
                {badge && (
                  <div style={{
                    marginTop: 10, fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '3px 10px', borderRadius: 999,
                    display: 'inline-block',
                    background: badge.type === 'admin' ? 'var(--danger-dim)' : 'var(--accent-dim)',
                    color: badge.type === 'admin' ? 'var(--danger)' : 'var(--accent)',
                    border: `1px solid ${badge.type === 'admin' ? 'rgba(248,113,113,0.20)' : 'var(--border-accent)'}`,
                  }}>
                    {badge.text}
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>

        {/* ── CONSENT CARD ── */}
        {consentLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: 'var(--muted)', padding: '1rem 0' }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.12)', borderTopColor: 'var(--accent)', animation: 'spin 0.75s linear infinite', display: 'inline-block', flexShrink: 0 }} />
            Loading consent information…
          </div>
        )}

        <AnimatePresence>
          {consent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                ...glassPanel,
                padding: '1.75rem 2rem',
                borderColor: 'rgba(0,210,200,0.25)',
                borderTopColor: 'rgba(255,255,255,0.20)',
                background: 'linear-gradient(145deg, rgba(0,210,200,0.08) 0%, rgba(0,180,200,0.05) 100%)',
              }}
            >
              {/* Consent title */}
              <div style={{
                fontFamily: '"Plus Jakarta Sans", "Outfit", sans-serif',
                fontWeight: 600, fontSize: '0.95rem',
                color: 'var(--text)', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ color: 'var(--accent)', fontSize: '1rem' }}>ℹ</span>
                {consent.title}
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.68, marginBottom: 12 }}>
                {consent.message}
              </p>

              {consent.warning_label && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: '0.78rem', color: 'var(--warning)',
                  fontWeight: 500, marginBottom: 16,
                  padding: '8px 12px', borderRadius: 10,
                  background: 'var(--warning-dim)',
                  border: '1px solid rgba(251,191,36,0.20)',
                }}>
                  <span>⚠</span> {consent.warning_label}
                </div>
              )}

              {/* Checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginTop: 4 }}>
                <div
                  onClick={() => setConfirmed(c => !c)}
                  style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    border: `2px solid ${confirmed ? 'var(--accent)' : 'rgba(255,255,255,0.22)'}`,
                    background: confirmed ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.18s ease',
                    boxShadow: confirmed ? '0 0 12px rgba(0,210,200,0.40)' : 'none',
                  }}
                >
                  {confirmed && <span style={{ color: 'var(--accent-fg)', fontSize: '0.72rem', fontWeight: 800 }}>✓</span>}
                </div>
                <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  I understand — proceed with{' '}
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{consent.confirm_label}</span>
                </span>
              </label>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ERROR ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 18px', borderRadius: 14,
                background: 'var(--danger-dim)',
                border: '1px solid rgba(248,113,113,0.22)',
                color: 'var(--danger)', fontSize: '0.85rem', lineHeight: 1.5,
              }}
            >
              <span style={{ flexShrink: 0, fontWeight: 700, marginTop: 1 }}>⚠</span>
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ACTIONS & STATUS ── */}
        <AnimatePresence mode="wait">
          {(phase === 'idle' || phase === 'error') && (
            <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button
                variant="primary" size="md" fullWidth
                disabled={!file || !confirmed}
                onClick={() => void handleUpload()}
              >
                Upload &amp; Index
              </Button>
            </motion.div>
          )}

          {phase === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ ...glassPanel, padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: 22 }}
            >
              <ProgressRing pct={progress} />
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 5 }}>Uploading…</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Transferring file to server</div>
              </div>
            </motion.div>
          )}

          {phase === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ ...glassPanel, padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: 22 }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                border: '3px solid rgba(255,255,255,0.08)',
                borderTopColor: 'var(--accent)',
                animation: 'spin 0.9s linear infinite',
                boxShadow: '0 0 20px rgba(0,210,200,0.25)',
              }} />
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 5 }}>
                  Processing document…
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  OCR · chunking · embedding · indexing
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── REPORT ── */}
        {phase === 'done' && report && <ReportCard report={report} />}

        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Button
              variant="ghost" size="md" fullWidth
              onClick={() => { setFile(null); setReport(null); setConfirmed(false); setPhase('idle'); setError(null); }}
            >
              Upload another document
            </Button>
          </motion.div>
        )}

        {/* Footer */}
        <p style={{
          textAlign: 'center', fontSize: '0.65rem',
          color: 'var(--muted)', opacity: 0.38,
          letterSpacing: '0.04em', marginTop: 4,
        }}>
          Documents are scanned for format compatibility before indexing.
        </p>
      </div>
    </div>
  );
}
