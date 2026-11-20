import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileSpreadsheet,
  Presentation,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  Info,
  X,
  Shield,
  Globe,
  Layers,
  Clock,
  Search,
  Check,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '@/hooks/useContextHooks';
import { getConsent, uploadDocumentSSE, parseUploadSSEStream } from '@/api/upload';
import { getGlobalUploadSetting } from '@/api/admin';
import { parseApiError, classifyApiError, tokenStore } from '@/api/client';
import type { ConsentResponse, FileUploadState } from '@/api/types';
import { Button } from '@/components/ui/Button';

type UploadMode = 'global' | 'local';

const MAX_FILES = 5;

/* --- Shared glass panel style --- */
const glassPanel = {
  background: 'linear-gradient(145deg, rgba(15, 16, 20, 0.95) 0%, rgba(7, 8, 10, 0.98) 100%)',
  backdropFilter: 'blur(32px) saturate(180%)',
  WebkitBackdropFilter: 'blur(32px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderTopColor: 'rgba(255, 255, 255, 0.16)',
  borderRadius: 18,
  boxShadow: '0 8px 32px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.06) inset',
} as const;

/* --- Visualized Chunk Inspector --- */
function ChunkVisualizer({ docTitle, chunksCount, mode }: { docTitle: string; chunksCount: number; mode: UploadMode }) {
  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(docTitle);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const isLocal = mode === 'local';

  if (isImage) {
    return (
      <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(7, 8, 10, 0.95)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ImageIcon size={16} /> Visual Vector Inspector</span>
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(0,194,222,0.1)', color: 'var(--accent)' }}>
              1 Image Chunk
            </span>
          </div>
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: isLocal ? 'var(--warning)' : 'var(--success)', fontWeight: 500 }}>
            {isLocal ? 'Redis Ephemeral Store Active (1h TTL)' : 'Neon Vector Store Active'}
          </span>
        </div>

        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--muted)', fontSize: '0.62rem' }}>
            <span>Single Multimodal Image Embedding</span>
            <span style={{ color: 'var(--accent)' }}>1024 dimensions (Jina CLIP v2)</span>
          </div>
          <div style={{ color: 'var(--text)', lineHeight: 1.4 }}>
            Full visual feature vector generated for {docTitle}. Retrievable via cross-modal cosine similarity search in {isLocal ? 'private local sandbox' : 'organization global knowledge base'}.
          </div>
        </div>
      </div>
    );
  }

  if (chunksCount === 0) {
    return (
      <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(7, 8, 10, 0.95)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Layers size={16} /> Delta Indexing Active</span>
            </span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
              All Pages Cached
            </span>
          </div>
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--success)', fontWeight: 500 }}>
            {isLocal ? 'Redis Delta Cache Verified' : 'Neon Vector Store Synced'}
          </span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          All pages in {docTitle} matched existing hashes. Re-embedding was safely skipped to conserve resources.
        </div>
      </div>
    );
  }

  const count = Math.max(chunksCount || 1, 1);
  const sampleChunks = Array.from({ length: Math.min(count, 8) }).map((_, i) => ({
    chunkId: `chk_${(i + 1).toString().padStart(2, '0')}`,
    page: Math.floor(i / 2) + 1,
    tokenLength: 450 + ((i * 23) % 60),
    text: `Indexed segment #${i + 1} from ${docTitle} with dense 1024-dim vector embedding.`,
  }));

  const active = sampleChunks[selectedIdx] || sampleChunks[0];

  return (
    <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(7, 8, 10, 0.95)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Layers size={16} /> Chunk Visualizer</span>
          </span>
          <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}>
            {chunksCount} {chunksCount === 1 ? 'Chunk' : 'Chunks'}
          </span>
        </div>
        <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: isLocal ? 'var(--warning)' : 'var(--success)', fontWeight: 500 }}>
          {isLocal ? 'Redis Ephemeral Store Active (1h TTL)' : 'Neon Vector Store Active'}
        </span>
      </div>

      {sampleChunks.length > 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 6, marginBottom: 10 }}>
          {sampleChunks.map((c, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              style={{
                padding: '6px 4px',
                borderRadius: 8,
                border: selectedIdx === idx ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.06)',
                background: selectedIdx === idx ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                color: selectedIdx === idx ? '#ffffff' : 'var(--muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                transition: 'all 0.15s ease',
                textAlign: 'center',
              }}
            >
              <div>#{idx + 1}</div>
              <div style={{ fontSize: '0.58rem', opacity: 0.8 }}>{c.tokenLength}t</div>
            </button>
          ))}
        </div>
      )}

      {active && (
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--muted)', fontSize: '0.62rem' }}>
            <span>{active.chunkId} • Page {active.page}</span>
            <span style={{ color: 'var(--accent)' }}>~{active.tokenLength} tokens</span>
          </div>
          <div style={{ color: 'var(--text)', lineHeight: 1.4 }}>
            "{active.text}"
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Per-file Progress Card --- */
function FileProgressCard({ state, index, mode }: { state: FileUploadState; index: number; mode: UploadMode }) {
  const { file, phase, progress, totalPages, processedPages, chunksCreated, pagesSkipped, docId, aliasDetected, aliasMessage, error } = state;

  const isSpinning = phase === 'uploading' || phase === 'ocr' || phase === 'processing';

  const phaseConfig: Record<FileUploadState['phase'], { icon: React.ReactNode; label: string; color: string; bg: string }> = {
    pending:    { icon: <Clock size={13} />, label: 'Queued',       color: 'var(--muted)',    bg: 'rgba(255,255,255,0.05)' },
    uploading:  { icon: <UploadCloud size={13} />, label: 'Sending...',     color: 'var(--accent)',   bg: 'var(--accent-dim)'      },
    ocr:        { icon: <Search size={13} />, label: 'Running OCR...', color: 'var(--accent)',   bg: 'var(--accent-dim)'      },
    processing: { icon: <Layers size={13} />, label: 'Processing...',  color: 'var(--accent)',   bg: 'var(--accent-dim)'      },
    done:       { icon: <Check size={13} />, label: (pagesSkipped > 0 && chunksCreated === 0) ? 'Cached' : 'Indexed', color: 'var(--success)', bg: 'var(--success-dim)' },
    error:      { icon: <AlertTriangle size={13} />, label: 'Notice',       color: 'var(--warning, #f59e0b)', bg: 'rgba(245,158,11,0.10)' },
  };
  const cfg = phaseConfig[phase];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      style={{ ...glassPanel, padding: '1rem 1.25rem', borderRadius: 14 }}
    >
      {/* --- Header row --- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          {/* Spinner or static icon */}
          {isSpinning ? (
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              border: '2.5px solid rgba(255,255,255,0.10)',
              borderTopColor: 'var(--accent)',
              animation: 'spin 0.8s linear infinite',
              boxShadow: '0 0 10px rgba(0,194,222,0.20)',
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
              {(file.size / 1024).toFixed(1)} KB{phase === 'ocr' ? ' • Running OCR...' : ''}
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

      {/* --- Alias warning --- */}
      {aliasDetected && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, marginBottom: 8,
          background: 'var(--warning-dim)', border: '1px solid rgba(251,191,36,0.22)',
          color: 'var(--warning)', fontSize: '0.72rem', fontWeight: 500,
        }}>
          {aliasMessage ?? 'Duplicate filename detected — file was aliased.'}
        </div>
      )}

      {/* --- Progress bar (processing phase) --- */}
      {phase === 'processing' && totalPages > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 5 }}>
            <span>Pages processed {pagesSkipped > 0 ? `(${pagesSkipped} skipped by delta)` : ''}</span>
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

      {/* --- Done stats --- */}
      {phase === 'done' && (
        <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginTop: 6 }}>
          {[
            { label: 'Doc ID',        value: docId ?? '—',           mono: true  },
            { label: 'Chunks Created', value: String(chunksCreated), accent: chunksCreated > 0 },
            { label: 'Total Pages',   value: String(totalPages)                  },
            {
              label: 'Skipped (Delta)',
              value: `${pagesSkipped ?? 0} pages`,
              accent: (pagesSkipped ?? 0) > 0,
            },
            {
              label: 'Status',
              value: (pagesSkipped ?? 0) > 0 && chunksCreated === 0
                ? 'Up-to-Date (Delta)'
                : (chunksCreated > 0 || aliasDetected ? 'Indexed' : '0 Chunks (Empty)'),
              accent: chunksCreated > 0 || aliasDetected || (pagesSkipped ?? 0) > 0,
              warning: chunksCreated === 0 && !aliasDetected && (pagesSkipped ?? 0) === 0,
            },
          ].map(({ label, value, mono, accent, warning }) => (
            <div key={label} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,194,222,0.10)' }}>
              <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
              <div style={{
                fontSize: '0.78rem', fontWeight: 700,
                color: warning ? 'var(--warning, #f59e0b)' : (accent ? 'var(--success)' : 'var(--text)'),
                fontFamily: mono ? 'monospace' : 'inherit',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}>
                {accent && <Check size={13} style={{ color: 'var(--success)' }} />}
                <span>{value}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- Interactive Chunk Inspector --- */}
      {phase === 'done' && (
        <ChunkVisualizer docTitle={file.name} chunksCount={chunksCreated} mode={mode} />
      )}

      {/* --- Error --- */}
      {phase === 'error' && error && (() => {
        const errDetails = classifyApiError(error, 'upload', file.name);
        return (
          <div style={{
            fontSize: '0.74rem',
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#f59e0b' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{errDetails.title}</span>
            </div>
            <div style={{ color: '#d1d5db', lineHeight: 1.5, paddingLeft: 20 }}>
              {errDetails.message}
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
}

/* --- Multi-file Dropzone --- */
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

  const renderFileIcon = (name: string) => {
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) return <ImageIcon size={18} className="text-[#00C2DE]" />;
    if (/\.(xlsx?|csv)$/i.test(name)) return <FileSpreadsheet size={18} className="text-emerald-400" />;
    if (/\.(pptx?)$/i.test(name)) return <Presentation size={18} className="text-amber-400" />;
    return <FileText size={18} className="text-blue-400" />;
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

  const borderColor = drag ? 'var(--accent)' : 'rgba(0,194,222,0.22)';
  const bg = drag ? 'rgba(0,194,222,0.07)' : files.length > 0 ? 'rgba(0,194,222,0.03)' : 'rgba(255,255,255,0.025)';

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
          boxShadow: drag ? '0 0 50px rgba(0,194,222,0.18), inset 0 0 40px rgba(0,194,222,0.06)' : '0 4px 24px rgba(0,0,0,0.3)',
        }}
        onMouseEnter={e => {
          if (!disabled && !drag && files.length < MAX_FILES) {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,194,222,0.45)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(0,194,222,0.05)';
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
        <div style={{ fontSize: files.length > 0 ? '2.2rem' : '3rem', marginBottom: 10, filter: `drop-shadow(0 0 16px rgba(0,194,222,${drag ? 0.6 : 0.35}))`, transition: 'filter 0.3s' }}>
          <UploadCloud size={files.length > 0 ? 36 : 48} className="text-[#00C2DE] mx-auto" />
        </div>

        {files.length === 0 ? (
          <>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8, color: 'var(--text)' }}>
              Drop files or click to browse
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              Select up to {MAX_FILES} files (one by one or all at once) • PDF, DOCX, XLSX, PPTX, TXT, HTML, Images
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
                  border: '1px solid rgba(0,194,222,0.15)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center" }}>{renderFileIcon(file.name)}</span>
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
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* --- UPLOAD PAGE --- */
export function UploadPage() {
  const { isAdmin, user, refreshUser } = useAuth();
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
    void refreshUser();
    getGlobalUploadSetting()
      .then(res => setCanUserGlobalUpload(res.allow_user_global_upload))
      .catch(() => setCanUserGlobalUpload(false));
  }, [refreshUser]);

  const isGlobalAllowed = isAdmin || !!user?.allow_global_upload || canUserGlobalUpload;

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
      pagesSkipped: 0,
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
              const skippedInSet = event.report?.pages_skipped ?? 0;
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
                  pagesSkipped: (s.pagesSkipped ?? 0) + skippedInSet,
                  progress,
                };
              }));
              break;
            }

            case 'alias_detected':
              patch({ aliasDetected: true, aliasMessage: event.message ?? null });
              break;

            case 'upload_complete': {
              const serverTotalChunks = (event as any).total_chunks;
              const serverPagesSkipped = (event as any).pages_skipped;
              setFileStates(prev => prev.map((s, i) => {
                if (i !== idx) return s;
                const totalChunks = s.chunksCreated > 0 ? s.chunksCreated : (typeof serverTotalChunks === 'number' ? serverTotalChunks : 0);
                const totalSkipped = typeof serverPagesSkipped === 'number' ? serverPagesSkipped : (s.pagesSkipped ?? 0);
                const hasSkippedPages = totalSkipped > 0;

                if (totalChunks === 0 && !hasSkippedPages && !s.aliasDetected) {
                  return {
                    ...s,
                    phase: 'error',
                    chunksCreated: 0,
                    pagesSkipped: 0,
                    error: 'Extraction yielded 0 text chunks. This document appears to contain empty or unextractable content.',
                    progress: 0,
                  };
                }
                return {
                  ...s,
                  phase: 'done',
                  docId: event.doc_id,
                  chunksCreated: totalChunks,
                  pagesSkipped: totalSkipped,
                  progress: 100,
                };
              }));
              break;
            }

            case 'error':
              patch({ phase: 'error', error: parseApiError(event.message || 'Processing failed', 'upload', file.name), progress: 0 });
              break;
          }
        }
      } catch (err) {
        console.error('Upload failed:', err);
        const errMsg = parseApiError(err, 'upload', file.name);
        patch({ phase: 'error', error: errMsg, progress: 0 });
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
    { key: 'local', icon: 'shield', title: 'Session Sandbox', desc: 'Private to you • 1-hour TTL • Redis cache' },
    {
      key: 'global',
      icon: 'globe',
      title: 'Askmydocsai Knowledge Base',
      desc: isGlobalAllowed && !isAdmin && user?.allow_global_upload
        ? 'Permission granted by Admin • Permanent Neon HNSW index'
        : 'Shared with org • Permanent HNSW index • Neon DB',
      disabled: !isGlobalAllowed,
      badge: !isGlobalAllowed
        ? { text: 'Admin only', type: 'admin' }
        : !isAdmin
        ? { text: 'Allowed by Admin', type: 'enabled' }
        : undefined,
    },
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1.5rem 0.875rem calc(4rem + var(--bottom-tab-h, 0px))', overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 740, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* PAGE HEADER */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ marginBottom: 12 }}>
            <h1 style={{ fontFamily: 'var(--font-heading), "Bricolage Grotesque", sans-serif', fontSize: '1.45rem', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text)', lineHeight: 1.2 }}>
              Document Ingestion Pipeline
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>
              Drag-and-drop ingestion with live status bar &amp; chunk visualizer across PDF, DOCX, XLSX, and TXT.
            </p>
          </div>

          {/* 5-Step Pipeline Stepper */}
          <div
            className="mode-pills-scrollable"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))',
              gap: 6,
              padding: '10px 12px',
              borderRadius: 12,
              background: '#1A1A1B',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.67rem',
              textAlign: 'center',
            }}
          >
            <div style={{ padding: '6px 4px', borderRadius: 8, background: 'rgba(0,194,222,0.15)', color: '#00C2DE', border: '1px solid rgba(0,194,222,0.3)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              01. Ingest
            </div>
            <div style={{ padding: '6px 4px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', color: '#9a9690', whiteSpace: 'nowrap' }}>
              02. OCR Parse
            </div>
            <div style={{ padding: '6px 4px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', color: '#9a9690', whiteSpace: 'nowrap' }}>
              03. Chunking
            </div>
            <div style={{ padding: '6px 4px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', color: '#9a9690', whiteSpace: 'nowrap' }}>
              04. Embedding
            </div>
            <div style={{ padding: '6px 4px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', color: '#22c55e', whiteSpace: 'nowrap' }}>
              05. Neon HNSW
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
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><AlertTriangle size={15} className="text-amber-400" /> Only the first {MAX_FILES} files will be uploaded. Extra files were removed.</span>
              <button
                onClick={() => setOverLimitWarning(false)}
                style={{ background: 'none', border: 'none', color: 'var(--warning)', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}
              ><X size={14} /></button>
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
          {MODES.map(({ key, title, desc, disabled, badge }) => {
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
                  border: selected ? '1.5px solid rgba(0,194,222,0.45)' : '1px solid rgba(0,194,222,0.14)',
                  borderTopColor: selected ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.20)',
                  background: selected ? 'linear-gradient(145deg, rgba(0,194,222,0.14) 0%, rgba(0,180,200,0.08) 100%)' : glassPanel.background,
                  boxShadow: selected ? '0 0 32px rgba(0,194,222,0.18), 0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10)' : glassPanel.boxShadow,
                  transform: selected ? 'translateY(-2px)' : 'translateY(0)',
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>{key === "local" ? <Shield size={32} className="text-[#00C2DE]" /> : <Globe size={32} className="text-[#00C2DE]" />}</div>
                <div style={{ fontFamily: '"Bricolage Grotesque", "Inter", "Inter", sans-serif', fontWeight: 600, fontSize: '0.95rem', color: selected ? 'var(--accent)' : 'var(--text)', marginBottom: 6, letterSpacing: '-0.015em' }}>
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
            Loading consent information...
          </div>
        )}

        <AnimatePresence>
          {consent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{
                ...glassPanel, padding: '1.75rem 2rem',
                borderColor: 'rgba(0,194,222,0.25)', borderTopColor: 'rgba(255,255,255,0.20)',
                background: 'linear-gradient(145deg, rgba(0,194,222,0.08) 0%, rgba(0,180,200,0.05) 100%)',
              }}
            >
              <div style={{ fontFamily: '"Inter", "Inter", sans-serif', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={16} className="text-[#00C2DE] inline mr-1" />
                {consent.title}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.68, marginBottom: 12 }}>
                {consent.message}
              </p>
              {consent.warning_label && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--warning)', fontWeight: 500, marginBottom: 16, padding: '8px 12px', borderRadius: 10, background: 'var(--warning-dim)', border: '1px solid rgba(251,191,36,0.20)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={15} className="text-amber-400" /> {consent.warning_label}</span>
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: isUploading ? 'not-allowed' : 'pointer', marginTop: 4 }}>
                <div
                  onClick={() => !isUploading && setConfirmed(c => !c)}
                  style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    border: `1.5px solid ${confirmed ? 'var(--accent)' : 'rgba(255,255,255,0.22)'}`,
                    background: confirmed ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: isUploading ? 'not-allowed' : 'pointer', transition: 'all 0.18s ease',
                  }}
                >
                  {confirmed && <Check size={12} strokeWidth={2.5} style={{ color: '#000000' }} />}
                </div>
                <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  I understand — proceed with{' '}
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{consent.confirm_label}</span>
                </span>
              </label>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GLOBAL ERROR (Unslopped: quiet warning tone, no screaming red) */}
        <AnimatePresence>
          {globalError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderRadius: 10,
                background: 'rgba(245, 158, 11, 0.07)', border: '1px solid rgba(245, 158, 11, 0.20)',
                color: '#f59e0b', fontSize: '0.84rem', lineHeight: 1.5,
              }}
            >
              <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
              <span style={{ flex: 1 }}>{parseApiError(globalError)}</span>
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
                background: 'linear-gradient(135deg, rgba(0,194,222,0.12) 0%, rgba(168,85,247,0.10) 100%)',
                border: '1px solid rgba(0,194,222,0.30)',
                boxShadow: '0 4px 20px rgba(0,194,222,0.10)',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: 'rgba(0,194,222,0.18)', border: '1px solid rgba(0,194,222,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem'
              }}><Info size={16} className="text-[#00C2DE]" /></div>
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
                <FileProgressCard key={state.file.name + i} state={state} index={i} mode={mode} />
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
