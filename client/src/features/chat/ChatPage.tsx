import { Logo } from '@/components/common/Logo';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useChatSession, saveSourcesToCache } from '@/features/chat/ChatContext';
import {
  Globe,
  Shield,
  Cpu,
  Settings,
  CornerDownLeft,
  Download,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Check,
  Brain,
  X,
  AlertTriangle,
  Eye,
  History as HistoryIcon,
} from 'lucide-react';

import { useAuth, useIsMobile } from '@/hooks/useContextHooks';
import { downloadFile, streamQuery, parseQuerySSEStream } from '@/api/query';
import { parseApiError, tokenStore } from '@/api/client';
import type { QueryResponse, Source, QueryRequest } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ScoreBar } from '@/components/ui/ScoreBar';
import { SourceCardSkeleton } from '@/components/ui/Skeleton';
import { Select } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';

type UploadMode = 'global' | 'local' | 'both';
type Stage = 'embedding' | 'retrieving' | 'generating';

/* Safe UUID — crypto.randomUUID() only exists in secure contexts (HTTPS/localhost).
   On plain-HTTP production it's undefined, so we fall back. */
function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* ── Image Lightbox Modal ── */
function ImageLightboxModal({
  source,
  onClose,
}: {
  source: Source;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [loadedUrl, setLoadedUrl] = useState<string>(source.image_data || '');
  const [loading, setLoading] = useState(!source.image_data && !!source.document_url);

  useEffect(() => {
    let active = true;
    if (source.image_data) {
      setLoadedUrl(source.image_data);
      setLoading(false);
    } else if (source.document_url) {
      setLoading(true);
      const token = tokenStore.get();
      fetch(source.document_url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          if (active) {
            const blobUrl = URL.createObjectURL(blob);
            setLoadedUrl(blobUrl);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error('Failed to load image preview:', err);
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [source.image_data, source.document_url]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (loadedUrl) {
        await downloadFile(loadedUrl, source.document_name);
      } else if (source.document_url) {
        await downloadFile(source.document_url, source.document_name);
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.86)',
        backdropFilter: 'blur(16px)',
        padding: '1.5rem',
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '92vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          background: 'linear-gradient(145deg, rgba(15, 16, 20, 0.95) 0%, rgba(7, 8, 10, 0.98) 100%)',
          borderRadius: 20,
          border: '1px solid rgba(0,194,222,0.25)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,194,222,0.1)',
          padding: '1.5rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <ImageIcon size={20} className="text-[#00C2DE]" />
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {source.document_name}
            </div>
            {source.similarity_score !== undefined && (
              <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 999, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border-accent)', fontWeight: 600, flexShrink: 0 }}>
                Match: {(source.similarity_score * 100).toFixed(1)}%
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Button size="sm" variant="primary" loading={downloading} onClick={handleDownload}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Download size={14} /> Download Image</span>
            </Button>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)',
                color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div style={{
          maxHeight: 'calc(80vh - 70px)',
          maxWidth: '86vw',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
          minHeight: 180,
          minWidth: 280,
        }}>
          {loading ? (
            <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: '0.82rem' }}>
              Loading image preview...
            </div>
          ) : loadedUrl ? (
            <img
              src={loadedUrl}
              alt={source.document_name}
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(80vh - 70px)',
                objectFit: 'contain',
                borderRadius: 8,
              }}
            />
          ) : (
            <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: '0.82rem' }}>
              Preview not available. Use download button above.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Source Card ── */
function SourceCard({
  source,
  index,
  expanded,
  onToggle,
  onOpenImage,
}: {
  source: Source;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onOpenImage: (s: Source) => void;
}) {
  const isImg = source.is_image || !!source.image_data || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(source.document_name);
  const [downloading, setDownloading] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(source.image_data || null);

  useEffect(() => {
    let active = true;
    if (source.image_data) {
      setThumbnailUrl(source.image_data);
    } else if (isImg && source.document_url) {
      const token = tokenStore.get();
      fetch(source.document_url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          if (active) {
            const url = URL.createObjectURL(blob);
            setThumbnailUrl(url);
          }
        })
        .catch(() => { /* ignore */ });
    }
    return () => {
      active = false;
    };
  }, [source.image_data, source.document_url, isImg]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      if (thumbnailUrl) {
        await downloadFile(thumbnailUrl, source.document_name);
      } else if (source.document_url) {
        await downloadFile(source.document_url, source.document_name);
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card"
      style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(0,194,222,0.12)' }}
    >
      <div
        onClick={onToggle}
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isImg && <ImageIcon size={14} className="inline mr-1 text-[#00C2DE]" />}
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: '"Inter", sans-serif' }}>
              {source.document_name}
            </div>
            {isImg && (
              <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 999, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border-accent)', fontWeight: 600 }}>
                IMAGE
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <span style={{ fontSize: '0.67rem', color: 'var(--muted)' }}>p.{source.page_number}</span>
            {source.chunk_index !== undefined && <span style={{ fontSize: '0.67rem', color: 'var(--muted)' }}>chunk #{source.chunk_index}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            title={`Download ${source.document_name}`}
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '0.68rem',
              cursor: downloading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s',
              fontFamily: '"Inter", sans-serif',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,194,222,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            {downloading ? 'Downloading...' : 'Download'}
          </button>
          <span style={{ fontSize: '0.68rem', color: 'var(--muted)', flexShrink: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>[{index + 1}]</span> {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>
      </div>

      <ScoreBar score={source.similarity_score} />

      {/* Image Thumbnail Preview */}
      {isImg && (
        <div style={{ marginTop: 10 }}>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenImage({ ...source, image_data: thumbnailUrl || source.image_data });
            }}
            style={{
              cursor: 'zoom-in',
              position: 'relative',
              borderRadius: 8,
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(0,194,222,0.18)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              maxHeight: 180,
              minHeight: 100,
            }}
          >
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={source.document_name}
                style={{
                  width: '100%',
                  maxHeight: 180,
                  objectFit: 'contain',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              />
            ) : (
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem', padding: '1.5rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><ImageIcon size={14} /> Click to preview {source.document_name}</span>
              </div>
            )}
            <div style={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(0,0,0,0.75)',
              border: '1px solid rgba(255,255,255,0.12)',
              fontSize: '0.65rem',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: '"Inter", sans-serif',
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Eye size={12} /> Click to preview</span>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontFamily: '"Inter", sans-serif' }}>
              {source.text_preview}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Sources Rail ── */
function SourcesRail({ sources, loading }: { sources: Source[]; loading?: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [selectedImage, setSelectedImage] = useState<Source | null>(null);

  if (!loading && sources.length === 0) return null;
  return (
    <div style={{ marginTop: 20 }}>
      {/* Lightbox for full image inspection */}
      <AnimatePresence>
        {selectedImage && (
          <ImageLightboxModal
            source={selectedImage}
            onClose={() => setSelectedImage(null)}
          />
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s', fontFamily: '"Inter", sans-serif', fontWeight: 600 }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
      >
        <span>{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        Source Citations
        {sources.length > 0 && (
          <span style={{ padding: '1px 8px', borderRadius: 999, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border-accent)', fontSize: '0.65rem', fontWeight: 600 }}>
            {sources.length}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <SourceCardSkeleton key={i} />)
              : sources.map((s, i) => (
                  <SourceCard
                    key={s.chunk_id}
                    source={s}
                    index={i}
                    expanded={expandedId === s.chunk_id}
                    onToggle={() => setExpandedId((id) => id === s.chunk_id ? null : s.chunk_id)}
                    onOpenImage={(src) => setSelectedImage(src)}
                  />
                ))
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error';
  content: string;
  response?: QueryResponse;
  timestamp: Date;
  animate?: boolean;
  /** True while the SSE stream for this message is still open. */
  isStreaming?: boolean;
  /** Accumulated token text during streaming. */
  streamingAnswer?: string;
  /** Sources received from the 'sources' SSE event (arrive before tokens). */
  streamingSources?: Source[];
}
interface RetrievalSettings {
  topK: number;
  vectorWeight: number;
  language: string;
  systemPrompt: string;
}

const STAGES: { key: Stage; label: string }[] = [
  { key: 'embedding',  label: 'Embedding query'  },
  { key: 'retrieving', label: 'Retrieving chunks' },
  { key: 'generating', label: 'Generating answer' },
];

/* ── Staged Stepper ── */
function StatusStepper({ stage }: { stage: Stage }) {
  const idx = STAGES.findIndex((s) => s.key === stage);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0' }}>
      {STAGES.map((s, i) => {
        const isActive = i === idx, isDone = i < idx;
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 500,
                fontFamily: '"Inter", sans-serif',
                transition: 'all 0.3s ease',
                background: isDone  ? 'var(--success-dim)'
                           : isActive ? 'var(--accent-dim)'
                           : 'var(--surface-2)',
                color:   isDone  ? 'var(--success)'
                       : isActive ? 'var(--accent)'
                       : 'var(--muted)',
                border: isDone  ? '1px solid rgba(52,211,153,0.22)'
                      : isActive ? '1px solid var(--border-accent)'
                      : '1px solid var(--border)',
              }}
            >
              {isActive && <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid currentColor', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />}
              {isDone && <Check size={12} className="inline mr-1 text-emerald-400" />}
              {s.label}
            </div>
            {i < 2 && <div style={{ width: 20, height: 1, background: isDone ? 'var(--success)' : 'var(--border)', transition: 'background 0.4s' }} />}
          </div>
        );
      })}
    </div>
  );
}

/* --- Helpers for parsing <think> / <thought> tags --- */
export interface ParsedAnswer {
  thought: string | null;
  answer: string;
}

export function parseThoughtAndAnswer(rawText?: string | null): ParsedAnswer {
  if (!rawText) return { thought: null, answer: '' };

  const thinkPattern = /<(?:think|thought)>([\s\S]*?)<\/(?:think|thought)>/gi;
  const thoughts: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = thinkPattern.exec(rawText)) !== null) {
    if (match[1]?.trim()) {
      thoughts.push(match[1].trim());
    }
  }

  let cleanedAnswer = rawText.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, '').trim();

  // If there's an unclosed <think> or <thought> tag at the end (e.g. partial response)
  const openMatch = cleanedAnswer.match(/<(?:think|thought)>([\s\S]*)$/i);
  if (openMatch) {
    if (openMatch[1]?.trim()) {
      thoughts.push(openMatch[1].trim());
    }
    cleanedAnswer = cleanedAnswer.replace(/<(?:think|thought)>[\s\S]*$/i, '').trim();
  }

  const combinedThought = thoughts.join('\n\n---\n\n').trim();

  return {
    thought: combinedThought.length > 0 ? combinedThought : null,
    answer: cleanedAnswer.length > 0 ? cleanedAnswer : (combinedThought ? '' : rawText),
  };
}

export function getCleanAnswerText(rawText?: string | null): string {
  const { thought, answer } = parseThoughtAndAnswer(rawText);
  return answer || thought || rawText || '';
}

/* ── Thinking Process Component ── */
function ThinkingBlock({
  thought,
  defaultExpanded = false,
}: {
  thought: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const wordCount = useMemo(() => {
    return thought.trim().split(/\s+/).filter(Boolean).length;
  }, [thought]);

  return (
    <div
      style={{
        marginBottom: 16,
        borderRadius: 14,
        background: 'linear-gradient(145deg, rgba(6,20,28,0.75) 0%, rgba(4,14,22,0.9) 100%)',
        border: expanded ? '1px solid rgba(0,194,222,0.32)' : '1px solid rgba(0,194,222,0.15)',
        boxShadow: expanded
          ? '0 6px 20px rgba(0,0,0,0.35), 0 0 16px rgba(0,194,222,0.06)'
          : '0 2px 10px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Header Bar */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: expanded ? 'rgba(0,194,222,0.05)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          textAlign: 'left',
          transition: 'background 0.2s ease',
          gap: 10,
        }}
        onMouseEnter={(e) => {
          if (!expanded) e.currentTarget.style.background = 'rgba(0,194,222,0.03)';
        }}
        onMouseLeave={(e) => {
          if (!expanded) e.currentTarget.style.background = 'transparent';
        }}
        aria-expanded={expanded}
        aria-label="Toggle thinking process"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(0,194,222,0.18), rgba(168,85,247,0.18))',
              border: '1px solid rgba(0,194,222,0.28)',
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
          >
            <Brain size={15} className="text-[#00C2DE]" /> 
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text)',
                letterSpacing: '-0.01em',
                fontFamily: '"Inter", sans-serif',
              }}
            >
              Thinking Process
            </span>
            <span
              style={{
                fontSize: '0.66rem',
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(168,85,247,0.12)',
                color: '#c084fc',
                border: '1px solid rgba(168,85,247,0.25)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#c084fc',
                  boxShadow: '0 0 6px #c084fc',
                }}
              />
              {wordCount} words
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.72rem',
            color: 'var(--muted)',
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          <span>{expanded ? 'Hide thought' : 'View thought'}</span>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'inline-block', fontSize: '0.65rem', marginLeft: 2 }}
          >
            <ChevronDown size={14} />
          </motion.span>
        </div>
      </button>

      {/* Accordion Body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '12px 14px 14px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(0,0,0,0.28)',
              }}
            >
              <div
                className="prose thinking-prose"
                style={{
                  borderLeft: '2px solid rgba(0,194,222,0.4)',
                  paddingLeft: 12,
                  fontSize: '0.8rem',
                  lineHeight: 1.65,
                  color: 'var(--text-secondary)',
                  fontFamily: '"Inter", sans-serif',
                  maxHeight: 380,
                  overflowY: 'auto',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
              >
                <ReactMarkdown>{thought}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Typewriter ── */
function TypewriterText({ text, onDone }: { text: string; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const idx = useRef(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    idx.current = 0;
    setDisplayed('');
    setDone(false);
    const interval = setInterval(() => {
      if (idx.current < text.length) {
        const chunk = text.slice(idx.current, idx.current + 5);
        setDisplayed((p) => p + chunk);
        idx.current += 5;
      } else {
        clearInterval(interval);
        setDisplayed(text);
        setDone(true);
        onDoneRef.current?.();
      }
    }, 14);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <div className="prose" style={{ fontFamily: '"Inter", sans-serif' }}>
      <ReactMarkdown>{displayed}</ReactMarkdown>
      {!done && <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--accent)', animation: 'pulseOpacity 0.8s infinite', verticalAlign: 'text-bottom', marginLeft: 2 }} />}
    </div>
  );
}

/* ── Answer Bubble ── */
function AnswerBubble({
  response,
  isLoading,
  stage,
  animate = false,
  isStreaming,
  streamingAnswer,
  streamingSources,
}: {
  response?: QueryResponse;
  isLoading: boolean;
  stage: Stage;
  animate?: boolean;
  /** True while the SSE stream is still open (live streaming path). */
  isStreaming?: boolean;
  /** Accumulated token string built character-by-character during streaming. */
  streamingAnswer?: string;
  /** Sources from the 'sources' SSE event — arrive before tokens. */
  streamingSources?: Source[];
}) {
  const [typeDone, setTypeDone] = useState(!animate);
  const handleDone = useCallback(() => setTypeDone(true), []);

  const parsed = useMemo(() => {
    return response ? parseThoughtAndAnswer(response.answer) : { thought: null, answer: '' };
  }, [response]);
  const textToRender = parsed.answer || (parsed.thought ? '' : (response?.answer || ''));

  const bubbleStyle = {
    padding: '1.25rem 1.5rem',
    borderRadius: 16,
    borderColor: 'rgba(0,194,222,0.18)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.32), 0 0 0 1px rgba(0,194,222,0.07)',
  };

  /* --- Live SSE streaming view --- */
  if (isStreaming) {
    const hasTokens = (streamingAnswer?.length ?? 0) > 0;
    return (
      <div className="glass" style={bubbleStyle}>
        {/* StatusStepper only while waiting for first token */}
        {!hasTokens && <StatusStepper stage={stage} />}

        {/* Streaming text with blinking cursor */}
        {hasTokens && (
          <div className="prose" style={{ fontFamily: '"Inter", sans-serif' }}>
            <ReactMarkdown>{streamingAnswer ?? ''}</ReactMarkdown>
            <span style={{
              display: 'inline-block', width: 2, height: '1em',
              background: 'var(--accent)', animation: 'pulseOpacity 0.6s infinite',
              verticalAlign: 'text-bottom', marginLeft: 2, borderRadius: 1,
            }} />
          </div>
        )}

        {/* Sources rail — shown immediately when 'sources' event fires */}
        {(streamingSources?.length ?? 0) > 0 && (
          <SourcesRail sources={streamingSources!} />
        )}
      </div>
    );
  }

  /* --- Fallback loading skeleton (no stream, just boolean isLoading) --- */
  if (isLoading) {
    return (
      <div className="glass" style={bubbleStyle}>
        <StatusStepper stage={stage} />
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[100, 90, 85, 72, 55].map((w, i) => (
            <div key={i} className="skeleton" style={{ height: 12, width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  /* --- Final / history response view (unchanged behaviour) --- */
  return (
    <div className="glass" style={bubbleStyle}>
      {response && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {[`Mode: ${response.query_mode}`, `Sources: ${response.total_sources_found}`, `Lang: ${response.language}`, ...(response.generated_by ? [`Model: ${response.generated_by}`] : [])].map((tag) => (
              <span key={tag} style={{ fontSize: '0.67rem', padding: '2px 10px', borderRadius: 999, color: 'var(--muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', fontFamily: '"Inter", sans-serif', fontWeight: 500 }}>{tag}</span>
            ))}
          </div>

          {parsed.thought && (
            <ThinkingBlock thought={parsed.thought} defaultExpanded={false} />
          )}

          {textToRender && (
            animate && !typeDone ? (
              <TypewriterText text={textToRender} onDone={handleDone} />
            ) : (
              <div className="prose" style={{ fontFamily: '"Inter", sans-serif' }}>
                <ReactMarkdown>{textToRender}</ReactMarkdown>
              </div>
            )
          )}

          {(typeDone || !animate) && (
            <SourcesRail sources={response.sources} />
          )}
        </>
      )}
    </div>
  );
}


const SETTINGS_STORAGE_KEY = 'askmydocs_retrieval_settings';

const DEFAULT_SETTINGS: RetrievalSettings = {
  topK: 5,
  vectorWeight: 0.7,
  language: 'English',
  systemPrompt: '',
};

function loadSavedSettings(): RetrievalSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        topK: typeof parsed.topK === 'number' ? parsed.topK : DEFAULT_SETTINGS.topK,
        vectorWeight: typeof parsed.vectorWeight === 'number' ? parsed.vectorWeight : DEFAULT_SETTINGS.vectorWeight,
        language: typeof parsed.language === 'string' ? parsed.language : DEFAULT_SETTINGS.language,
        systemPrompt: typeof parsed.systemPrompt === 'string' ? parsed.systemPrompt : DEFAULT_SETTINGS.systemPrompt,
      };
    }
  } catch {
    /* fallback to defaults */
  }
  return DEFAULT_SETTINGS;
}

/* ── Settings Content ── */
function SettingsContent({
  initialSettings,
  onApply,
  onCancel,
}: {
  initialSettings: RetrievalSettings;
  onApply: (s: RetrievalSettings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<RetrievalSettings>(initialSettings);

  const kwWeight = +(1 - draft.vectorWeight).toFixed(2);
  const vectorPct = Math.round(draft.vectorWeight * 100);
  const keywordPct = Math.round(kwWeight * 100);

  const handleApply = () => {
    onApply(draft);
  };

  const handleReset = () => {
    setDraft(DEFAULT_SETTINGS);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: '"Inter", sans-serif' }}>
      {/* 1. Top K Results */}
      <div style={{ padding: '16px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e8e6e0' }}>Retrieval Depth (Top K)</div>
            <div style={{ fontSize: '0.74rem', color: '#9a9690', marginTop: 2 }}>Number of highest-ranked chunks passed to the LLM</div>
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#00C2DE', background: 'rgba(0,194,222,0.12)', border: '1px solid rgba(0,194,222,0.25)', padding: '3px 10px', borderRadius: 999 }}>
            K = {draft.topK}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          step={1}
          value={draft.topK}
          onChange={(e) => setDraft({ ...draft, topK: +e.target.value })}
          style={{ width: '100%', accentColor: '#00C2DE', cursor: 'pointer', height: 6 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#5a5852', marginTop: 6, fontFamily: 'Space Mono, monospace' }}>
          <span>1 chunk</span>
          <span>10 chunks</span>
          <span>20 chunks</span>
        </div>
      </div>

      {/* 2. Vector vs Keyword Balance */}
      <div style={{ padding: '16px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e8e6e0' }}>Hybrid Search Balance</div>
            <div style={{ fontSize: '0.74rem', color: '#9a9690', marginTop: 2 }}>Blend dense semantic embeddings with BM25 keywords</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#00C2DE', background: 'rgba(0,194,222,0.12)', border: '1px solid rgba(0,194,222,0.25)', padding: '2px 8px', borderRadius: 999 }}>
              Dense: {vectorPct}%
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#00C2DE', background: 'rgba(0,81,198,0.1)', border: '1px solid rgba(0,81,198,0.2)', padding: '2px 8px', borderRadius: 999 }}>
              BM25: {keywordPct}%
            </span>
          </div>
        </div>

        {/* Visual Balance Bar */}
        <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', marginBottom: 10, background: 'rgba(255,255,255,0.08)' }}>
          <div style={{ width: `${vectorPct}%`, background: 'linear-gradient(90deg, #00C2DE, #38bdf8)', transition: 'width 0.15s' }} />
          <div style={{ width: `${keywordPct}%`, background: 'linear-gradient(90deg, #00C2DE, #5eead4)', transition: 'width 0.15s' }} />
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={draft.vectorWeight}
          onChange={(e) => setDraft({ ...draft, vectorWeight: +e.target.value })}
          style={{ width: '100%', accentColor: '#00C2DE', cursor: 'pointer', height: 6 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#5a5852', marginTop: 6, fontFamily: 'Space Mono, monospace' }}>
          <span>100% Keyword</span>
          <span>50 / 50 Hybrid</span>
          <span>100% Vector</span>
        </div>
      </div>

      {/* 3. Response Language */}
      <div style={{ padding: '16px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Select
          label="Response Synthesis Language"
          value={draft.language}
          onChange={(e) => setDraft({ ...draft, language: e.target.value })}
        >
          {['English', 'Hindi', 'French', 'German', 'Spanish', 'Arabic', 'Chinese', 'Japanese', 'Portuguese'].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </Select>
      </div>

      {/* 4. Custom System Prompt */}
      <div style={{ padding: '16px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Textarea
          label="Custom Agent System Instructions (optional)"
          placeholder="e.g. You are an expert enterprise research assistant. Provide concise, bulleted responses with direct source page citations..."
          rows={3}
          value={draft.systemPrompt}
          onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
        />
      </div>

      {/* 5. Action Footer with Apply & Reset Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 16,
          marginTop: 4,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={handleReset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 10,
            fontSize: '0.8rem',
            fontWeight: 500,
            color: 'var(--muted)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--muted)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          }}
        >
          Reset Defaults
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: '0.82rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 20px',
              borderRadius: 10,
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#000',
              background: 'linear-gradient(135deg, #00C2DE, #38bdf8)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 14px rgba(0, 194, 222, 0.35)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 18px rgba(0, 194, 222, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 14px rgba(0, 194, 222, 0.35)';
            }}
          >
            <Check size={14} />
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- CHAT PAGE --- */
export function ChatPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile(768);
  const displayName = user?.username || user?.email?.split('@')[0] || 'there';
  const { messages, setMessages, activeSessionId, setActiveSessionId, refreshSessions } = useChatSession();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<UploadMode>('global');
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<Stage>('embedding');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [settings, setSettings] = useState<RetrievalSettings>(loadSavedSettings);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleApplySettings = (newSettings: RetrievalSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch {
      /* ignore storage errors */
    }
    setSettingsOpen(false);
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 2500);
  };

  const scrollToBottom = useCallback(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, []);
  useEffect(() => { scrollToBottom(); }, [messages, isLoading, scrollToBottom]);

  const handleSubmit = async (textToSubmit?: string) => {
    const q = (textToSubmit ?? query).trim();
    if (!q || isLoading) return;
    setIsHistoryView(false);

    const userMsg: Message = { id: safeUUID(), type: 'user', content: q, timestamp: new Date() };
    const assistantId = safeUUID();

    setMessages(m => [...m, userMsg]);
    setQuery('');
    setIsLoading(true);
    setStage('embedding');

    // Add the streaming placeholder — renders immediately with the StatusStepper
    setMessages(m => [...m, {
      id: assistantId,
      type: 'assistant',
      content: '',
      isStreaming: true,
      streamingAnswer: '',
      streamingSources: [],
      timestamp: new Date(),
    }]);

    try {
      const payload: QueryRequest = {
        query: q,
        upload_mode: mode,
        top_k: settings.topK,
        vector_weight: settings.vectorWeight,
        keyword_weight: +(1 - settings.vectorWeight).toFixed(2),
        language: settings.language,
        system_prompt: settings.systemPrompt || undefined,
        session_id: activeSessionId || undefined,
      };

      const res = await streamQuery(payload);

      let collectedSources: Source[] = [];
      let accumulatedAnswer = '';

      for await (const event of parseQuerySSEStream(res)) {
        if (event.event === 'sources') {
          collectedSources = event.data || [];
          setStage('generating');
          setMessages(m => m.map(msg =>
            msg.id === assistantId ? { ...msg, streamingSources: collectedSources } : msg
          ));
        } else if (event.event === 'token') {
          accumulatedAnswer += event.data;
          // Ensure stage transitions to 'generating' on first token even if sources arrive at the end
          setStage('generating');
          setMessages(m => m.map(msg =>
            msg.id === assistantId
              ? { ...msg, streamingAnswer: accumulatedAnswer }
              : msg
          ));
        } else if (event.event === 'error') {
          throw new Error(parseApiError(event.data || 'LLM generation failed.'));
        } else if (event.event === 'done') {
          void refreshSessions();
          if (!activeSessionId && event.session_id) {
            setActiveSessionId(event.session_id);
          }
          // Promote the streaming message to a final response message and persist sources
          setMessages(m => m.map(msg => {
            if (msg.id !== assistantId) return msg;
            const sourcesList = collectedSources.length > 0 ? collectedSources : (msg.streamingSources ?? []);
            if (sourcesList.length > 0) {
              saveSourcesToCache(event.session_id || activeSessionId || undefined, q, sourcesList);
            }
            const finalResponse: QueryResponse = {
              answer: accumulatedAnswer || msg.streamingAnswer || '',
              query_mode: mode,
              total_sources_found: sourcesList.length,
              language: settings.language,
              session_id: event.session_id,
              sources: sourcesList,
            };
            return {
              ...msg,
              isStreaming: false,
              content: accumulatedAnswer || msg.streamingAnswer || '',
              response: finalResponse,
              animate: false, // already streamed in real time
            };
          }));
        }
      }
    } catch (err) {
      console.error('Query failed:', err);
      const errMsg = parseApiError(err);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                type: 'error',
                content: errMsg,
                isStreaming: false,
                streamingAnswer: undefined,
                streamingSources: undefined,
                response: undefined,
                animate: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setStage('embedding');
    }
  };


  const handleNewChat = () => {
    setMessages([]);
    setQuery('');
    setActiveSessionId(null);
    setIsHistoryView(false);
  };

  /* ── Query Composer Form ── */
  const renderComposer = (isCentered: boolean = false) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      style={{
        width: '100%',
        maxWidth: 760,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 8 : 12,
      }}
    >
      {/* Action Bar: Prominent + (New Session) button & 5 Feature Pills */}
      <div
        className="mode-pills-scrollable"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 6 : 8,
          width: '100%',
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          justifyContent: isMobile ? 'flex-start' : (isCentered ? 'center' : 'flex-start'),
          overflowX: isMobile ? 'auto' : 'visible',
          paddingBottom: isMobile ? 2 : 0,
        }}
      >
        {/* 1. Knowledge Base */}
        <button
          type="button"
          onClick={() => setMode('global')}
          style={{
            padding: isMobile ? '5px 11px' : '6px 14px', borderRadius: 999, fontSize: isMobile ? '0.70rem' : '0.74rem', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.18s',
            fontFamily: '"Inter", sans-serif', flexShrink: 0, whiteSpace: 'nowrap',
            background: mode === 'global' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
            color: mode === 'global' ? '#04121f' : 'var(--muted)',
            border: mode === 'global' ? '1px solid var(--primary-glow)' : '1px solid var(--border)',
            boxShadow: mode === 'global' ? '0 0 16px rgba(0,194,222,0.45)' : 'none',
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Globe size={14} /> Knowledge Base</span>
        </button>

        {/* 2. Sandbox */}
        <button
          type="button"
          onClick={() => setMode('local')}
          style={{
            padding: isMobile ? '5px 11px' : '6px 14px', borderRadius: 999, fontSize: isMobile ? '0.70rem' : '0.74rem', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.18s',
            fontFamily: '"Inter", sans-serif', flexShrink: 0, whiteSpace: 'nowrap',
            background: mode === 'local' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
            color: mode === 'local' ? '#04121f' : 'var(--muted)',
            border: mode === 'local' ? '1px solid var(--primary-glow)' : '1px solid var(--border)',
            boxShadow: mode === 'local' ? '0 0 16px rgba(0,194,222,0.45)' : 'none',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Shield size={14} /> Sandbox</span>
        </button>

        {/* 3. Hybrid Fusions */}
        <button
          type="button"
          onClick={() => setMode('both')}
          style={{
            padding: isMobile ? '5px 11px' : '6px 14px', borderRadius: 999, fontSize: isMobile ? '0.70rem' : '0.74rem', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.18s',
            fontFamily: '"Inter", sans-serif', flexShrink: 0, whiteSpace: 'nowrap',
            background: mode === 'both' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
            color: mode === 'both' ? '#04121f' : 'var(--muted)',
            border: mode === 'both' ? '1px solid var(--primary-glow)' : '1px solid var(--border)',
            boxShadow: mode === 'both' ? '0 0 16px rgba(0,194,222,0.45)' : 'none',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Cpu size={14} /> Hybrid Fusions</span>
        </button>

        {!isCentered && !isMobile && <div style={{ flex: 1, minWidth: 8 }} />}

        {/* 5. Settings Button */}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: isMobile ? '5px 10px' : '6px 13px', borderRadius: 999,
            fontSize: isMobile ? '0.70rem' : '0.74rem', color: 'var(--muted)',
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
            cursor: 'pointer', transition: 'all 0.18s',
            fontFamily: '"Inter", sans-serif', flexShrink: 0,
            fontWeight: 500, whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(0,194,222,0.08)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,194,222,0.3)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--muted)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Settings size={14} /> <span>Settings</span></span>
        </button>
      </div>

      {/* Main Query Input Box */}
      <div
        style={{
          display: 'flex',
          gap: isMobile ? 6 : 10,
          alignItems: 'flex-end',
          position: 'relative',
          background: '#1A1A1B',
          borderRadius: isMobile ? 16 : 20,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: isMobile ? '6px 8px' : '8px 10px',
          boxShadow: isCentered ? '0 24px 64px -12px rgba(0,0,0,0.8), 0 0 32px -8px rgba(0,194,222,0.18)' : '0 8px 24px rgba(0,0,0,0.4)',
          transition: 'all 0.25s ease',
        }}
      >
        {/* Floating Slash Command Helper */}
        {query.startsWith('/') && (
          <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, padding: 8, borderRadius: 14, background: '#1A1A1B', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 36px rgba(0,0,0,0.8)', zIndex: 120, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: '#6e7681', padding: '2px 8px' }}>ASKMYDOCSAI SHORTCUT COMMANDS</div>
            {[
              { cmd: '/search', label: 'Multi-hop semantic vector search' },
              { cmd: '/deep', label: 'Chain-of-thought deep reasoning' },
              { cmd: '/doc', label: 'Filter query to single document' },
            ].map((s) => (
              <button
                key={s.cmd}
                type="button"
                onClick={() => setQuery(s.cmd + ' ')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: 'none', color: '#f0f6fc', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,194,222,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', color: '#00C2DE', fontWeight: 600, fontSize: '0.78rem' }}>{s.cmd}</span>
                <span style={{ fontSize: '0.72rem', color: '#9da7b3' }}>{s.label}</span>
              </button>
            ))}
          </div>
        )}

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder={isMobile ? "Ask anything about documents..." : "Ask anything about your documents... (Type '/' for shortcuts, Enter to submit)"}
          rows={isCentered ? (isMobile ? 2 : 3) : (isMobile ? 1 : 2)}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: isMobile ? '6px 8px' : '8px 10px',
            borderRadius: 14,
            resize: 'none',
            background: 'transparent',
            border: 'none',
            color: '#e8e6e0',
            caretColor: '#00C2DE',
            fontSize: '16px',
            fontFamily: 'inherit',
            outline: 'none',
            lineHeight: 1.5,
            minHeight: isCentered ? (isMobile ? 56 : 80) : (isMobile ? 38 : 54),
            maxHeight: 160,
          }}
        />
        <Button
          type="submit"
          variant="solid-accent"
          loading={isLoading}
          disabled={!query.trim() || isLoading}
          className="flex-shrink-0 self-end"
          style={{
            height: isCentered ? (isMobile ? 38 : 42) : (isMobile ? 36 : 38),
            padding: isMobile ? '0 14px' : (isCentered ? '0 20px' : '0 16px'),
            fontSize: isCentered ? (isMobile ? '0.80rem' : '0.86rem') : (isMobile ? '0.78rem' : '0.82rem'),
            fontWeight: 700,
            marginBottom: 2,
          }}
        >
          {isLoading ? (
            '...'
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span>Query</span>
              <CornerDownLeft size={13} />
            </span>
          )}
        </Button>
      </div>

      <p style={{ textAlign: 'center', fontSize: isMobile ? '0.62rem' : '0.68rem', color: 'var(--muted)', opacity: 0.7, fontFamily: 'var(--font-mono)' }}>
        Askmydocsai Engine • Grounded across verified vectors & multi-hop citations.
      </p>
    </form>
  );

  /* --- RENDER: Centered Floating Query Box vs. Active Chat Thread --- */
  const isCenteredState = messages.length === 0 && !isLoading;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: isMobile ? 'calc(100% - var(--bottom-tab-h, 0px))' : '100%',
        fontFamily: '"Inter", sans-serif',
        position: 'relative',
        overflow: 'hidden',
        background: '#000000',
        color: '#e8e6e0',
      }}
    >

      {/* --- 1. CENTERED FLOATING STATE (Horizontal & Vertical Center) --- */}
      {isCenteredState ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '1.25rem 0.875rem' : '2rem 1.5rem', overflowY: 'auto', background: '#000000' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%', maxWidth: 760, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
          >
            {/* Header Hero */}
            <div style={{ marginBottom: isMobile ? 12 : 18 }}>
              <Logo size={isMobile ? "md" : "lg"} showText={false} />
            </div>
            <h1 style={{ fontFamily: '"Bricolage Grotesque", "Inter", sans-serif', fontSize: isMobile ? 'clamp(1.4rem, 5.5vw, 1.85rem)' : 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 600, letterSpacing: '-0.03em', color: '#e8e6e0', marginBottom: 8, lineHeight: 1.15 }}>
              Hello, {displayName}. What would you like to query?
            </h1>
            <p style={{ fontSize: isMobile ? '0.82rem' : '0.92rem', color: '#9a9690', maxWidth: 480, margin: isMobile ? '0 auto 1.25rem' : '0 auto 2rem', lineHeight: 1.55 }}>
              Ask questions across your indexed knowledge base, extract data, or generate grounded synthesis with verified citations.
            </p>

            {/* Centered Main Query Input Box */}
            <div style={{ width: '100%', marginBottom: isMobile ? '1.25rem' : '1.75rem' }}>
              {renderComposer(true)}
            </div>

            {/* Quick Suggestions Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: isMobile ? 6 : 8 }}>
              {[
                'Summarise uploaded documents',
                'Extract key compliance requirements',
                'Compare product specifications',
                'Show data governance guidelines',
              ].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => {
                    setQuery(sug);
                    void handleSubmit(sug);
                  }}
                  style={{
                    fontSize: isMobile ? '0.70rem' : '0.76rem',
                    padding: isMobile ? '6px 12px' : '7px 16px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#9a9690',
                    cursor: 'pointer',
                    fontFamily: '"Inter", sans-serif',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#00C2DE';
                    e.currentTarget.style.borderColor = 'rgba(0,194,222,0.3)';
                    e.currentTarget.style.background = 'rgba(0,194,222,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9a9690';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                >
                  {sug}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      ) : (
        /* --- 2. ACTIVE THREAD STATE WITH DOCKED COMPOSER --- */
        <>
          {/* Thread */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0.75rem 0.5rem 0.5rem' : '1rem 0.75rem 0.75rem', background: '#000000' }}>
            <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>

              {/* History View Banner */}
              {isHistoryView && messages.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 14px', borderRadius: 10,
                  background: 'rgba(0,194,222,0.06)', border: '1px solid rgba(0,194,222,0.2)',
                  fontSize: '0.75rem', color: 'var(--muted)',
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><HistoryIcon size={14} /> Viewing saved history — type below to ask a new question</span>
                  <button
                    onClick={handleNewChat}
                    style={{
                      padding: '3px 10px', borderRadius: 8, fontSize: '0.72rem',
                      background: 'var(--accent-dim)', color: 'var(--accent)',
                      border: '1px solid var(--border-accent)', cursor: 'pointer',
                      fontFamily: 'inherit', fontWeight: 600,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><X size={12} /> Clear</span>
                  </button>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: msg.type === 'user' ? 12 : 16, scale: msg.type === 'user' ? 0.97 : 1 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
                  >
                    {msg.type === 'user' && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ maxWidth: isMobile ? '88%' : '82%', padding: isMobile ? '8px 14px' : '10px 16px', borderRadius: '18px 18px 4px 18px', fontSize: isMobile ? '0.84rem' : '0.88rem', lineHeight: 1.55, background: '#0051C6', color: '#FFFFFF', fontWeight: 600 }}>
                          {msg.content}
                        </div>
                      </div>
                    )}
                    {msg.type === 'assistant' && (msg.response || msg.isStreaming) && (
                      <AnswerBubble
                        response={msg.response}
                        isLoading={false}
                        stage={stage}
                        animate={msg.animate ?? false}
                        isStreaming={msg.isStreaming}
                        streamingAnswer={msg.streamingAnswer}
                        streamingSources={msg.streamingSources}
                      />
                    )}
                    {msg.type === 'error' && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '12px 14px',
                          borderRadius: 10,
                          background: 'rgba(245, 158, 11, 0.06)',
                          border: '1px solid rgba(245, 158, 11, 0.18)',
                          color: '#f59e0b',
                          fontSize: '0.84rem',
                          lineHeight: 1.5,
                        }}
                      >
                        <AlertTriangle size={15} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                        <span style={{ flex: 1 }}>{parseApiError(msg.content)}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Docked Composer at bottom */}
          <div
            style={{
              flexShrink: 0,
              borderRadius: 0,
              borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              padding: isMobile ? '0.5rem 0.625rem 0.625rem' : '0.75rem 1rem 1rem',
              background: '#000000',
            }}
          >
            {renderComposer(false)}
          </div>
        </>
      )}

      {/* Settings Dialog Modal */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Retrieval Settings" maxWidth="580px">
        {settingsOpen && (
          <SettingsContent
            initialSettings={settings}
            onApply={handleApplySettings}
            onCancel={() => setSettingsOpen(false)}
          />
        )}
      </Dialog>

      {/* Settings Applied Notification Toast (Unslopped: quiet surface step, no colored glow) */}
      <AnimatePresence>
        {settingsSavedToast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 350,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 8,
              background: '#19191b',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
              color: '#ededed',
              fontSize: '0.82rem',
              fontWeight: 500,
            }}
          >
            <Check size={14} style={{ color: '#00C2DE' }} />
            <span>Retrieval settings applied</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Dialog Modal */}
      </div>
  );
}

