import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useContextHooks';
import { getConsent, uploadDocumentSSE, parseUploadSSEStream } from '@/api/upload';
import { getGlobalUploadSetting } from '@/api/admin';
import { parseApiError, tokenStore } from '@/api/client';
import type { ConsentResponse, FileUploadState } from '@/api/types';
import { Button } from '@/components/ui/Button';

type UploadMode = 'global' | 'local';

const MAX_FILES = 5;

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

/* ── Per-file Progress Card ── */
function FileProgressCard({ state, index }: { state: FileUploadState; index: number }) {
  const { file, phase, progress, totalPages, processedPages, chunksCreated, docId, aliasDetected, aliasMessage, error } = state;

  const isSpinning = phase === 'uploading' || phase === 'ocr' || phase === 'processing';

  const phaseConfig: Record<FileUploadState['phase'], { icon: string; label: string; color: string; bg: string }> = {
    pending:    { icon: '🕐', label: 'Queued',       color: 'var(--muted)',    bg: 'rgba(255,255,255,0.05)' },
    uploading:  { icon: '↑',  label: 'Sending…',     color: 'var(--accent)',   bg: 'var(--accent-dim)'      },
    ocr:        { icon: '🔍', label: 'Running OCR…', color: 'var(--accent)',   bg: 'var(--accent-dim)'      },
    processing: { icon: '⚙',  label: 'Processing…',  color: 'var(--accent)',   bg: 'var(--accent-dim)'      },
    done:       { icon: '✓',  label: 'Indexed',      color: 'var(--success)',  bg: 'var(--success-dim)'     },
    error:      { icon: '⚠',  label: 'Error',        color: 'var(--danger)',   bg: 'var(--danger-dim)'      },
  };
  const cfg = phaseConfig[phase];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      style={{ ...glassPanel, padding: '1rem 1.25rem', borderRadius: 14 }}
    >
      {/* ── Header row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          {/* Spinner or static icon */}
          {isSpinning ? (
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              border: '2.5px solid rgba(255,255,255,0.10)',
              borderTopColor: 'var(--accent)',
              animation: 'spin 0.8s linear infinite',
              boxShadow: '0 0 10px rgba(0,210,200,0.20)',
            }} />
          ) : (
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: cfg.bg, border: `1px solid ${cfg.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.78rem', color: cfg.color,
            }}>
              {cfg.icon}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 2 }}>
              {(file.size / 1024).toFixed(1)} KB{phase === 'ocr' ? ' · Running OCR…' : ''}
            </div>
          </div>
        </div>

        {/* Phase badge */}
        <span style={{
          fontSize: '0.68rem', fontWeight: 600, padding: '2px 10px', borderRadius: 999,
          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33`, flexShrink: 0,
        }}>
          {cfg.label}
        </span>
      </div>

      {/* ── Alias warning ── */}
      {aliasDetected && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, marginBottom: 8,
          background: 'var(--warning-dim)', border: '1px solid rgba(251,191,36,0.22)',
          color: 'var(--warning)', fontSize: '0.72rem', fontWeight: 500,
        }}>
          ⚠ {aliasMessage ?? 'Duplicate filename detected — file was aliased.'}
        </div>
      )}

      {/* ── Progress bar (processing phase) ── */}
      {phase === 'processing' && totalPages > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 5 }}>
            <span>Pages processed</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{processedPages} / {totalPages}</span>
          </div>
          <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--accent), rgba(168,85,247,0.7))' }}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* ── Done stats ── */}
      {phase === 'done' && (
        <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
          {[
            { label: 'Doc ID',        value: docId ?? '—',           mono: true  },
            { label: 'Chunks Created', value: String(chunksCreated), accent: true },
            { label: 'Total Pages',   value: String(totalPages)                  },
            { label: 'Status',        value: 'Indexed ✓',            accent: true },
          ].map(({ label, value, mono, accent }) => (
            <div key={label} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,210,200,0.10)' }}>
              <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
              <div style={{
                fontSize: '0.78rem', fontWeight: 700,
                color: accent ? 'var(--success)' : 'var(--text)',
                fontFamily: mono ? 'monospace' : 'inherit',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
              }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {phase === 'error' && error && (
        <div style={{ fontSize: '0.74rem', color: 'var(--danger)', padding: '8px 10px', borderRadius: 8, background: 'var(--danger-dim)', marginTop: 4, lineHeight: 1.5 }}>
          {error}
        </div>
      )}
    </motion.div>
  );
}

/* ── Multi-file Dropzone ── */
function Dropzone({
  files,
  onAddFiles,
  onRemoveFile,
  onClearAll,
  disabled,
}: {
  files: File[];
  onAddFiles: (f: File[]) => void;
  onRemoveFile: (index: number) => void;
  onClearAll: () => void;
  disabled?: boolean;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleRaw = (raw: FileList | null) => {
    if (!raw || disabled) return;
    onAddFiles(Array.from(raw));
  };

  const getFileIcon = (name: string) => {
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) return '🖼';
    if (/\.pdf$/i.test(name)) return '📕';
    if (/\.(docx?|txt|rtf)$/i.test(name)) return '📄';
    if (/\.(xlsx?|csv)$/i.test(name)) return '📊';
    if (/\.(pptx?)$/i.test(name)) return '📑';
    return '📁';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openPicker = () => {
    if (disabled || files.length >= MAX_FILES) return;
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  const borderColor = drag ? 'var(--accent)' : 'rgba(0,210,200,0.22)';
  const bg = drag ? 'rgba(0,210,200,0.07)' : files.length > 0 ? 'rgba(0,210,200,0.03)' : 'rgba(255,255,255,0.025)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        onClick={openPicker}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleRaw(e.dataTransfer.files); }}
        style={{
          position: 'relative', border: `2px dashed ${borderColor}`,
          borderRadius: 18, padding: files.length > 0 ? '1.75rem 1.5rem' : '3rem 2rem', textAlign: 'center',
          cursor: disabled ? 'not-allowed' : files.length >= MAX_FILES ? 'default' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          background: bg, backdropFilter: 'blur(18px)',
          transition: 'all 0.25s ease',
          boxShadow: drag ? '0 0 50px rgba(0,210,200,0.18), inset 0 0 40px rgba(0,210,200,0.06)' : '0 4px 24px rgba(0,0,0,0.3)',
        }}
        onMouseEnter={e => {
          if (!disabled && !drag && files.length < MAX_FILES) {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,210,200,0.45)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(0,210,200,0.05)';
          }
        }}
        onMouseLeave={e => {
          if (!disabled && !drag) {
            (e.currentTarget as HTMLElement).style.borderColor = borderColor;
            (e.currentTarget as HTMLElement).style.background = bg;
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.pptx,.txt,.html,.png,.jpg,.jpeg,.gif,.webp"
          style={{ position: 'absolute', inset: 0, opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
          onChange={e => handleRaw(e.target.files)}
        />

        {/* Icon */}
        <div style={{ fontSize: files.length > 0 ? '2.2rem' : '3rem', marginBottom: 10, filter: `drop-shadow(0 0 16px rgba(0,210,200,${drag ? 0.6 : 0.35}))`, transition: 'filter 0.3s' }}>
          {files.length > 0 ? '📋' : '📁'}
        </div>

        {files.length === 0 ? (
          <>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8, color: 'var(--text)' }}>
              Drop files or click to browse
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              Select up to {MAX_FILES} files (one by one or all at once) · PDF, DOCX, XLSX, PPTX, TXT, HTML, Images
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4, color: 'var(--accent)' }}>
              {files.length} of {MAX_FILES} files selected
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              {files.length < MAX_FILES ? (
                <span>Click or drop files to add more ({MAX_FILES - files.length} slots remaining)</span>
              ) : (
                <span>Maximum limit reached ({MAX_FILES} files queued)</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Selected files list chips */}
      {files.length > 0 && !disabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <span>Queued Files ({files.length}/{MAX_FILES})</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClearAll(); }}
              style={{
                background: 'none', border: 'none', color: 'var(--danger)',
                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', padding: '2px 6px', borderRadius: 6,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}
            >
              Clear all
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {files.map((file, idx) => (
              <motion.div
                key={`${file.name}-${file.size}-${file.lastModified}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.18 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 10, padding: '8px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid rgba(0,210,200,0.15)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{getFileIcon(file.name)}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--muted)' }}>
                      {formatSize(file.size)}
                    </div>
                  </div>
                </div>

                {/* Remove single file */}
                <button
                  type="button"
                  title="Remove file"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(idx);
                  }}
                  style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    color: 'var(--muted)', fontSize: '0.75rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--danger-dim)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.3)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--danger)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--muted)';
                  }}
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   UPLOAD PAGE
─────────────────────────────────────────────────────────────────────────────── */
export function UploadPage() {
  const { isAdmin } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<UploadMode>('local');
  const [canUserGlobalUpload, setCanUserGlobalUpload] = useState(false);
  const [consent, setConsent] = useState<ConsentResponse | null>(null);
  const [consentLoading, setConsentLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [fileStates, setFileStates] = useState<FileUploadState[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overLimitWarning, setOverLimitWarning] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    getGlobalUploadSetting()
      .then(res => setCanUserGlobalUpload(res.allow_user_global_upload))
      .catch(() => setCanUserGlobalUpload(false));
  }, []);

  const isGlobalAllowed = isAdmin || canUserGlobalUpload;

  useEffect(() => {
    if (mode === 'global' && !isGlobalAllowed) setMode('local');
  }, [mode, isGlobalAllowed]);

  const fetchConsent = useCallback(async (m: UploadMode) => {
    setConsentLoading(true); setConsent(null); setConfirmed(false); setGlobalError(null);
    try { setConsent(await getConsent(m)); }
    catch (err) { setGlobalError(parseApiError(err)); }
    finally { setConsentLoading(false); }
  }, []);

  useEffect(() => { void fetchConsent(mode); }, [mode, fetchConsent]);

  const handleAddFiles = (incoming: File[]) => {
    if (isUploading) return;
    setFiles(prev => {
      const existingKeys = new Set(prev.map(f => `${f.name}-${f.size}-${f.lastModified}`));
      const uniqueIncoming = incoming.filter(f => !existingKeys.has(`${f.name}-${f.size}-${f.lastModified}`));
      
      const combined = [...prev, ...uniqueIncoming];
      if (combined.length > MAX_FILES) {
        setOverLimitWarning(true);
        return combined.slice(0, MAX_FILES);
      }
      setOverLimitWarning(false);
      return combined;
    });
    setFileStates([]);
    setGlobalError(null);
  };

  const handleRemoveFile = (index: number) => {
    if (isUploading) return;
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileStates([]);
    setOverLimitWarning(false);
  };

  const handleClearAll = () => {
    if (isUploading) return;
    setFiles([]);
    setFileStates([]);
    setOverLimitWarning(false);
  };

  const handleUpload = async () => {
    if (!files.length || !confirmed || isUploading) return;
    setIsUploading(true);
    setGlobalError(null);

    const token = tokenStore.get();

    // Initialize all file states
    const initialStates: FileUploadState[] = files.map(file => ({
      file,
      phase: 'pending',
      totalPages: 0,
      processedPages: 0,
      chunksCreated: 0,
      progress: 0,
      docId: null,
      aliasDetected: false,
      aliasMessage: null,
      error: null,
    }));
    setFileStates(initialStates);

    // Track pending set page counts per-file (local closure — not in React state)
    const pendingSetPages: number[] = files.map(() => 0);

    const uploadTask = async (file: File, idx: number) => {
      /** Patch a single file's state entry by index. */
      const patch = (update: Partial<FileUploadState>) =>
        setFileStates(prev => prev.map((s, i) => i === idx ? { ...s, ...update } : s));

      try {
        patch({ phase: 'uploading' });
        const res = await uploadDocumentSSE(file, mode, token);

        for await (const event of parseUploadSSEStream(res)) {
          switch (event.status) {
            case 'extracting_text':
              patch({ phase: 'ocr' });
              break;

            case 'extraction_complete':
              patch({ phase: 'processing', totalPages: event.total_pages });
              break;

            case 'processing_set':
              // Store page count for this set — used when set_complete fires
              pendingSetPages[idx] = event.pages.length;
              break;

            case 'set_complete': {
              const completedInSet = pendingSetPages[idx];
              setFileStates(prev => prev.map((s, i) => {
                if (i !== idx) return s;
                const newProcessed = s.processedPages + completedInSet;
                const progress = s.totalPages > 0
                  ? Math.min(Math.round((newProcessed / s.totalPages) * 100), 99)
                  : s.progress;
                return {
                  ...s,
                  processedPages: newProcessed,
                  chunksCreated: s.chunksCreated + (event.report?.chunks_created ?? 0),
                  progress,
                };
              }));
              break;
            }

            case 'alias_detected':
              patch({ aliasDetected: true, aliasMessage: event.message ?? null });
              break;

            case 'upload_complete':
              patch({ phase: 'done', docId: event.doc_id, progress: 100 });
              break;
          }
        }
      } catch (err) {
        patch({ phase: 'error', error: parseApiError(err) });
      }
    };

    // Fire all uploads concurrently — allSettled so one failure doesn't cancel others
    await Promise.allSettled(files.map((file, idx) => uploadTask(file, idx)));
    setIsUploading(false);
  };

  const handleReset = () => {
    setFiles([]);
    setFileStates([]);
    setConfirmed(false);
    setOverLimitWarning(false);
    setGlobalError(null);
    setIsUploading(false);
  };

  const isAllSettled = fileStates.length > 0 && fileStates.every(s => s.phase === 'done' || s.phase === 'error');
  const canUpload = files.length > 0 && confirmed && !isUploading;

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
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem calc(4rem + var(--bottom-tab-h, 0px))', overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 740, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* PAGE HEADER */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem',
              background: 'linear-gradient(135deg, rgba(0,210,200,0.18), rgba(168,85,247,0.14))',
              border: '1px solid rgba(0,210,200,0.22)', boxShadow: '0 4px 16px rgba(0,210,200,0.14)',
            }}>↑</div>
            <div>
              <h1 style={{ fontFamily: '"Comfortaa", "Outfit", "Plus Jakarta Sans", sans-serif', fontSize: '1.65rem', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text)', lineHeight: 1.15 }}>
                Upload Documents
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 3 }}>
                Upload up to {MAX_FILES} files at once. Each file streams its own OCR & indexing progress in real time.
              </p>
            </div>
          </div>
        </motion.div>

        {/* OVER-LIMIT WARNING */}
        <AnimatePresence>
          {overLimitWarning && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '10px 14px', borderRadius: 12,
                background: 'var(--warning-dim)', border: '1px solid rgba(251,191,36,0.25)',
                color: 'var(--warning)', fontSize: '0.8rem', fontWeight: 500,
              }}
            >
              <span>⚠ Only the first {MAX_FILES} files will be uploaded. Extra files were removed.</span>
              <button
                onClick={() => setOverLimitWarning(false)}
                style={{ background: 'none', border: 'none', color: 'var(--warning)', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}
              >✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DROPZONE */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Dropzone
            files={files}
            onAddFiles={handleAddFiles}
            onRemoveFile={handleRemoveFile}
            onClearAll={handleClearAll}
            disabled={isUploading}
          />
        </motion.div>

        {/* MODE SELECTOR */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}
          className="mobile-stack"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
        >
          {MODES.map(({ key, icon, title, desc, disabled, badge }) => {
            const selected = mode === key;
            return (
              <div
                key={key}
                onClick={() => !disabled && !isUploading && setMode(key)}
                title={disabled ? 'Global upload is disabled for standard users by your Admin.' : undefined}
                style={{
                  padding: '1.5rem 1.75rem', textAlign: 'center',
                  cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.38 : 1,
                  transition: 'all 0.22s ease',
                  ...glassPanel, borderRadius: 16,
                  border: selected ? '1.5px solid rgba(0,210,200,0.45)' : '1px solid rgba(0,210,200,0.14)',
                  borderTopColor: selected ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.20)',
                  background: selected ? 'linear-gradient(145deg, rgba(0,210,200,0.14) 0%, rgba(0,180,200,0.08) 100%)' : glassPanel.background,
                  boxShadow: selected ? '0 0 32px rgba(0,210,200,0.18), 0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10)' : glassPanel.boxShadow,
                  transform: selected ? 'translateY(-2px)' : 'translateY(0)',
                }}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>{icon}</div>
                <div style={{ fontFamily: '"Comfortaa", "Outfit", "Plus Jakarta Sans", sans-serif', fontWeight: 600, fontSize: '0.95rem', color: selected ? 'var(--accent)' : 'var(--text)', marginBottom: 6, letterSpacing: '-0.015em' }}>
                  {title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</div>
                {badge && (
                  <div style={{
                    marginTop: 10, fontSize: '0.68rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, display: 'inline-block',
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

        {/* CONSENT CARD */}
        {consentLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: 'var(--muted)', padding: '1rem 0' }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.12)', borderTopColor: 'var(--accent)', animation: 'spin 0.75s linear infinite', display: 'inline-block', flexShrink: 0 }} />
            Loading consent information…
          </div>
        )}

        <AnimatePresence>
          {consent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{
                ...glassPanel, padding: '1.75rem 2rem',
                borderColor: 'rgba(0,210,200,0.25)', borderTopColor: 'rgba(255,255,255,0.20)',
                background: 'linear-gradient(145deg, rgba(0,210,200,0.08) 0%, rgba(0,180,200,0.05) 100%)',
              }}
            >
              <div style={{ fontFamily: '"Plus Jakarta Sans", "Outfit", sans-serif', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--accent)', fontSize: '1rem' }}>ℹ</span>
                {consent.title}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.68, marginBottom: 12 }}>
                {consent.message}
              </p>
              {consent.warning_label && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--warning)', fontWeight: 500, marginBottom: 16, padding: '8px 12px', borderRadius: 10, background: 'var(--warning-dim)', border: '1px solid rgba(251,191,36,0.20)' }}>
                  <span>⚠</span> {consent.warning_label}
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: isUploading ? 'not-allowed' : 'pointer', marginTop: 4 }}>
                <div
                  onClick={() => !isUploading && setConfirmed(c => !c)}
                  style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    border: `2px solid ${confirmed ? 'var(--accent)' : 'rgba(255,255,255,0.22)'}`,
                    background: confirmed ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: isUploading ? 'not-allowed' : 'pointer', transition: 'all 0.18s ease',
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

        {/* GLOBAL ERROR */}
        <AnimatePresence>
          {globalError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', borderRadius: 14,
                background: 'var(--danger-dim)', border: '1px solid rgba(248,113,113,0.22)',
                color: 'var(--danger)', fontSize: '0.85rem', lineHeight: 1.5,
              }}
            >
              <span style={{ flexShrink: 0, fontWeight: 700, marginTop: 1 }}>⚠</span>
              <span>{globalError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* UPLOAD BUTTON */}
        <AnimatePresence mode="wait">
          {!isUploading && !isAllSettled && (
            <motion.div key="upload-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button variant="primary" size="md" fullWidth disabled={!canUpload} onClick={() => void handleUpload()}>
                {files.length > 1 ? `Upload & Index ${files.length} Files` : 'Upload & Index'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FILE PROGRESS QUEUE */}
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(0,210,200,0.12) 0%, rgba(168,85,247,0.10) 100%)',
                border: '1px solid rgba(0,210,200,0.30)',
                boxShadow: '0 4px 20px rgba(0,210,200,0.10)',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: 'rgba(0,210,200,0.18)', border: '1px solid rgba(0,210,200,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem'
              }}>ℹ</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--accent)' }}>Processing files:</strong> If you upload large files, it takes time to process (OCR text extraction & chunk indexing). Please keep this window open.
              </div>
            </motion.div>
          )}

          {fileStates.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {/* Queue header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                <span>Upload Queue</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fileStates.filter(s => s.phase === 'done').length} / {fileStates.length} done
                </span>
              </div>
              {fileStates.map((state, i) => (
                <FileProgressCard key={state.file.name + i} state={state} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* RESET BUTTON — shown after all files settle */}
        {isAllSettled && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Button variant="ghost" size="md" fullWidth onClick={handleReset}>
              Upload another batch
            </Button>
          </motion.div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.38, letterSpacing: '0.04em', marginTop: 4 }}>
          Documents are scanned for format compatibility before indexing. Max {MAX_FILES} files per batch.
        </p>
      </div>
    </div>
  );
}
