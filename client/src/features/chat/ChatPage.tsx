import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/hooks/useContextHooks';
import { queryApi, downloadFile, streamQuery, parseQuerySSEStream } from '@/api/query';
import { parseApiError } from '@/api/client';
import type { QueryResponse, Source, QueryRequest, ChatHistoryItem } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
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
  const imageUrl = source.image_data || source.document_url || '';

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (source.image_data) {
        await downloadFile(source.image_data, source.document_name);
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
          background: 'linear-gradient(145deg, rgba(20,25,35,0.95) 0%, rgba(10,15,25,0.98) 100%)',
          borderRadius: 20,
          border: '1px solid rgba(0,210,200,0.25)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,210,200,0.1)',
          padding: '1.5rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '1.2rem', color: 'var(--accent)' }}>🖼</span>
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
              ⬇ Download Image
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
            >
              ✕
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
        }}>
          <img
            src={imageUrl}
            alt={source.document_name}
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(80vh - 70px)',
              objectFit: 'contain',
              borderRadius: 8,
            }}
          />
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

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      if (source.image_data) {
        await downloadFile(source.image_data, source.document_name);
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
      style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(0,210,200,0.12)' }}
    >
      <div
        onClick={onToggle}
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isImg && <span style={{ fontSize: '0.85rem' }}>🖼</span>}
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
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
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,210,200,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            {downloading ? '⏳ Downloading…' : '⬇ Download'}
          </button>
          <span style={{ fontSize: '0.68rem', color: 'var(--muted)', flexShrink: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>[{index + 1}]</span> {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      <ScoreBar score={source.similarity_score} />

      {/* Image Thumbnail Preview */}
      {isImg && source.image_data && (
        <div style={{ marginTop: 10 }}>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenImage(source);
            }}
            style={{
              cursor: 'zoom-in',
              position: 'relative',
              borderRadius: 8,
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(0,210,200,0.18)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              maxHeight: 180,
            }}
          >
            <img
              src={source.image_data}
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
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}>
              🔍 Click to preview
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
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
        style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600 }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
      >
        <span>{open ? '▼' : '▶'}</span>
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
                fontFamily: '"Plus Jakarta Sans", sans-serif',
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
              {isDone && '✓ '}
              {s.label}
            </div>
            {i < 2 && <div style={{ width: 20, height: 1, background: isDone ? 'var(--success)' : 'var(--border)', transition: 'background 0.4s' }} />}
          </div>
        );
      })}
    </div>
  );
}

/* ── Helpers for parsing <think> / <thought> tags ── */
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
        border: expanded ? '1px solid rgba(0,210,200,0.32)' : '1px solid rgba(0,210,200,0.15)',
        boxShadow: expanded
          ? '0 6px 20px rgba(0,0,0,0.35), 0 0 16px rgba(0,210,200,0.06)'
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
          background: expanded ? 'rgba(0,210,200,0.05)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          textAlign: 'left',
          transition: 'background 0.2s ease',
          gap: 10,
        }}
        onMouseEnter={(e) => {
          if (!expanded) e.currentTarget.style.background = 'rgba(0,210,200,0.03)';
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
              background: 'linear-gradient(135deg, rgba(0,210,200,0.18), rgba(168,85,247,0.18))',
              border: '1px solid rgba(0,210,200,0.28)',
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
          >
            🧠
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text)',
                letterSpacing: '-0.01em',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
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
            ▼
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
                  borderLeft: '2px solid rgba(0,210,200,0.4)',
                  paddingLeft: 12,
                  fontSize: '0.8rem',
                  lineHeight: 1.65,
                  color: 'var(--text-secondary)',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
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
    <div className="prose" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
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
    borderColor: 'rgba(0,210,200,0.18)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.32), 0 0 0 1px rgba(0,210,200,0.07)',
  };

  /* ── Live SSE streaming view ── */
  if (isStreaming) {
    const hasTokens = (streamingAnswer?.length ?? 0) > 0;
    return (
      <div className="glass" style={bubbleStyle}>
        {/* StatusStepper only while waiting for first token */}
        {!hasTokens && <StatusStepper stage={stage} />}

        {/* Streaming text with blinking cursor */}
        {hasTokens && (
          <div className="prose" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
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

  /* ── Fallback loading skeleton (no stream, just boolean isLoading) ── */
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

  /* ── Final / history response view (unchanged behaviour) ── */
  return (
    <div className="glass" style={bubbleStyle}>
      {response && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {[`Mode: ${response.query_mode}`, `Sources: ${response.total_sources_found}`, `Lang: ${response.language}`, ...(response.generated_by ? [`Model: ${response.generated_by}`] : [])].map((tag) => (
              <span key={tag} style={{ fontSize: '0.67rem', padding: '2px 10px', borderRadius: 999, color: 'var(--muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 500 }}>{tag}</span>
            ))}
          </div>

          {parsed.thought && (
            <ThinkingBlock thought={parsed.thought} defaultExpanded={false} />
          )}

          {textToRender && (
            animate && !typeDone ? (
              <TypewriterText text={textToRender} onDone={handleDone} />
            ) : (
              <div className="prose" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
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


/* ── Settings Content ── */
function SettingsContent({ settings, onChange }: { settings: RetrievalSettings; onChange: (s: RetrievalSettings) => void }) {
  const kwWeight = +(1 - settings.vectorWeight).toFixed(2);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 500 }}>Top K Results</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{settings.topK}</span>
        </div>
        <input type="range" min={1} max={20} step={1} value={settings.topK} onChange={(e) => onChange({ ...settings, topK: +e.target.value })} style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--muted)', marginTop: 4 }}><span>1</span><span>20</span></div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>Vector {Math.round(settings.vectorWeight * 100)}%</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>Keyword {Math.round(kwWeight * 100)}%</span>
        </div>
        <input type="range" min={0} max={1} step={0.05} value={settings.vectorWeight} onChange={(e) => onChange({ ...settings, vectorWeight: +e.target.value })} style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
        <p style={{ fontSize: '0.62rem', color: 'var(--muted)', marginTop: 6 }}>Weights always sum to 1.0.</p>
      </div>
      <Select label="Response Language" value={settings.language} onChange={(e) => onChange({ ...settings, language: e.target.value })}>
        {['English','Hindi','French','German','Spanish','Arabic','Chinese','Japanese','Portuguese'].map((l) => <option key={l} value={l}>{l}</option>)}
      </Select>
      <Textarea label="Custom System Prompt (optional)" placeholder="You are a helpful assistant…" rows={4} value={settings.systemPrompt} onChange={(e) => onChange({ ...settings, systemPrompt: e.target.value })} />
    </div>
  );
}

/* ── Chat History Drawer Content ── */
interface ChatSession {
  sessionId: string;
  messages: ChatHistoryItem[];
  firstQuery: string;
  lastAnswer: string;
  mode: string;
  lastAt?: string;
}

function HistoryContent({
  onSelectSession,
}: {
  onSelectSession: (sessionId: string, messages: ChatHistoryItem[]) => void;
}) {
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await queryApi.getHistory(100);
      setHistory(items);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  // Group individual rows into sessions by session_id
  const sessions = useMemo<ChatSession[]>(() => {
    const map: Record<string, ChatHistoryItem[]> = {};
    for (const row of history) {
      const sid = row.session_id || row.id || 'legacy';
      if (!map[sid]) map[sid] = [];
      map[sid].push(row);
    }

    return Object.entries(map)
      .map(([sid, msgs]) => {
        const sorted = [...msgs].sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeA - timeB;
        });
        const lastMsg = sorted[sorted.length - 1];
        return {
          sessionId: sid,
          messages: sorted,
          firstQuery: sorted[0]?.query || 'Untitled Question',
          lastAnswer: getCleanAnswerText(lastMsg?.answer || ''),
          mode: sorted[0]?.query_mode || 'global',
          lastAt: lastMsg?.created_at,
        };
      })
      .sort((a, b) => {
        const timeA = a.lastAt ? new Date(a.lastAt).getTime() : 0;
        const timeB = b.lastAt ? new Date(b.lastAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [history]);

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions;
    const s = search.toLowerCase();
    return sessions.filter((session) =>
      session.messages.some(
        (m) =>
          m.query?.toLowerCase().includes(s) ||
          getCleanAnswerText(m.answer).toLowerCase().includes(s) ||
          m.query_mode?.toLowerCase().includes(s)
      )
    );
  }, [sessions, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      {/* Search & Refresh */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Search past conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 10,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontSize: '0.8rem',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={() => void fetchHistory()}
          disabled={loading}
          style={{
            padding: '0 12px',
            borderRadius: 10,
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
            fontSize: '0.78rem',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text)';
            e.currentTarget.style.background = 'var(--surface-2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--muted)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {loading ? '…' : '↻'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--danger-dim)', border: '1px solid rgba(248,113,113,0.22)', color: 'var(--danger)', fontSize: '0.78rem' }}>
          ⚠ {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {!loading && filteredSessions.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)', fontSize: '0.82rem' }}>
          {search ? 'No matching conversations found.' : 'No chat history recorded yet.'}
        </div>
      )}

      {!loading && filteredSessions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
          {filteredSessions.map((session) => (
            <div
              key={session.sessionId}
              onClick={() => onSelectSession(session.sessionId, session.messages)}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,210,200,0.08)';
                e.currentTarget.style.borderColor = 'rgba(0,210,200,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: session.mode === 'global' ? 'var(--accent-dim)' : 'var(--surface-2)',
                      color: session.mode === 'global' ? 'var(--accent)' : 'var(--muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {session.mode}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
                    {session.messages.length} msg{session.messages.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {session.lastAt && (
                  <span style={{ fontSize: '0.67rem', color: 'var(--muted)' }}>
                    {new Date(session.lastAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4, lineHeight: 1.4 }}>
                {session.firstQuery}
              </div>

              <div
                style={{
                  fontSize: '0.74rem',
                  color: 'var(--muted)',
                  lineHeight: 1.45,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {session.lastAnswer}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Empty State ── */
function EmptyState({ onSelectSuggestion }: { onSelectSuggestion: (q: string) => void }) {
  const { user } = useAuth();
  const displayName = user?.username || user?.email?.split('@')[0] || 'there';

  const suggestions = [
    'Summarise Q3 results',
    'What is the refund policy?',
    'List all product features',
    'Show compliance requirements',
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '5rem 2rem', flex: 1 }}>
      <div className="glass" style={{ width: 68, height: 68, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.65rem', marginBottom: 20, boxShadow: '0 0 32px rgba(0,210,200,0.18)' }}>
        ◆
      </div>
      <h2 style={{ fontFamily: '"Comfortaa", "Outfit", "Plus Jakarta Sans", sans-serif', fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8, color: 'var(--text)' }}>
        Hello {displayName}! How can I help you today?
      </h2>
      <p style={{ fontSize: '0.84rem', color: 'var(--muted)', maxWidth: 420, lineHeight: 1.65, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
        Query your organisation's indexed documents. Use the mode pills to switch between your global org index, local session index, or both.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 24 }}>
        {suggestions.map((h) => (
          <button
            key={h}
            onClick={() => onSelectSuggestion(h)}
            style={{
              fontSize: '0.74rem',
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.borderColor = 'var(--border-accent)';
              e.currentTarget.style.background = 'var(--accent-dim)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--muted)';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            }}
          >
            {h}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CHAT PAGE
─────────────────────────────────────────────────────────────────────────────── */
export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<UploadMode>('global');
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<Stage>('embedding');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [settings, setSettings] = useState<RetrievalSettings>({ topK: 5, vectorWeight: 0.7, language: 'English', systemPrompt: '' });
  const bottomRef = useRef<HTMLDivElement>(null);

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

      for await (const event of parseQuerySSEStream(res)) {
        if (event.event === 'sources') {
          // Sources arrived → retrieval is done, generation is starting
          setStage('generating');
          setMessages(m => m.map(msg =>
            msg.id === assistantId ? { ...msg, streamingSources: event.data } : msg
          ));
        } else if (event.event === 'token') {
          setMessages(m => m.map(msg =>
            msg.id === assistantId
              ? { ...msg, streamingAnswer: (msg.streamingAnswer ?? '') + event.data }
              : msg
          ));
        } else if (event.event === 'done') {
          if (!activeSessionId && event.session_id) {
            setActiveSessionId(event.session_id);
          }
          // Promote the streaming message to a final response message
          setMessages(m => m.map(msg => {
            if (msg.id !== assistantId) return msg;
            const finalResponse: QueryResponse = {
              answer: msg.streamingAnswer ?? '',
              query_mode: mode,
              total_sources_found: (msg.streamingSources ?? []).length,
              language: settings.language,
              session_id: event.session_id,
              sources: msg.streamingSources ?? [],
            };
            return {
              ...msg,
              isStreaming: false,
              content: msg.streamingAnswer ?? '',
              response: finalResponse,
              animate: false, // already streamed in real time
            };
          }));
        }
      }
    } catch (err) {
      // Replace the placeholder with an error entry
      setMessages(m => m.map(msg =>
        msg.id === assistantId
          ? { id: assistantId, type: 'error' as const, content: parseApiError(err), timestamp: new Date() }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };


  const handleNewChat = () => {
    setMessages([]);
    setQuery('');
    setActiveSessionId(null);
    setIsHistoryView(false);
  };

  const handleSelectSession = (sessionId: string, sessionMessages: ChatHistoryItem[]) => {
    setHistoryOpen(false);
    setIsHistoryView(true);
    setActiveSessionId(sessionId);
    setQuery('');

    const loadedMessages: Message[] = [];
    for (const item of sessionMessages) {
      const userMsg: Message = {
        id: safeUUID(),
        type: 'user',
        content: item.query,
        timestamp: item.created_at ? new Date(item.created_at) : new Date(),
      };
      const mockResponse: QueryResponse = {
        answer: item.answer,
        language: 'English',
        query_mode: (item.query_mode as 'global' | 'local' | 'both') || 'global',
        session_id: sessionId,
        sources: [],
        total_sources_found: 0,
      };
      const assistantMsg: Message = {
        id: safeUUID(),
        type: 'assistant',
        content: item.answer,
        response: mockResponse,
        timestamp: item.created_at ? new Date(item.created_at) : new Date(),
        animate: false,
      };
      loadedMessages.push(userMsg, assistantMsg);
    }
    setMessages(loadedMessages);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px - var(--bottom-tab-h, 0px))', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      {/* Thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.75rem 0.75rem' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── History View Banner ── */}
          {isHistoryView && messages.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 14px', borderRadius: 10,
              background: 'rgba(0,210,200,0.06)', border: '1px solid rgba(0,210,200,0.2)',
              fontSize: '0.75rem', color: 'var(--muted)',
            }}>
              <span>📜 Viewing saved history — type below to ask a new question</span>
              <button
                onClick={handleNewChat}
                style={{
                  padding: '3px 10px', borderRadius: 8, fontSize: '0.72rem',
                  background: 'var(--accent-dim)', color: 'var(--accent)',
                  border: '1px solid var(--border-accent)', cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: 600,
                }}
              >
                ✕ Clear
              </button>
            </div>
          )}

          {messages.length === 0 && !isLoading && (
            <EmptyState onSelectSuggestion={(q) => setQuery(q)} />
          )}
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                {msg.type === 'user' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ maxWidth: '82%', padding: '10px 16px', borderRadius: '18px 18px 4px 18px', fontSize: '0.88rem', lineHeight: 1.6, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: 'var(--accent-fg)', fontWeight: 500 }}>
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
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'var(--danger-dim)', border: '1px solid rgba(248,113,113,0.22)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                    <span>⚠</span><span>{msg.content}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {/* Note: no separate loading bubble — the streaming placeholder message
              renders its own StatusStepper via AnswerBubble's isStreaming path. */}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Composer ── */}
      <div
        className="glass"
        style={{
          flexShrink: 0,
          borderRadius: 0,
          borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
          borderTop: '1px solid var(--border)',
          padding: '0.75rem 1rem 1rem',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {/* Mode pills + settings + history (horizontally scrollable on small screens) */}
          <div className="mode-pills-scrollable" style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
            {(['global', 'local', 'both'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  padding: '5px 12px', borderRadius: 999, fontSize: '0.74rem', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.18s',
                  fontFamily: 'inherit', flexShrink: 0,
                  background: mode === m ? 'var(--accent)' : 'var(--surface-2)',
                  color: mode === m ? 'var(--accent-fg)' : 'var(--muted)',
                  border: mode === m ? 'none' : '1px solid var(--border)',
                  boxShadow: mode === m ? '0 2px 10px rgba(0,210,200,0.3)' : 'none',
                }}
              >
                {m === 'global' ? '🌐 Global' : m === 'local' ? '💾 Local' : '🔀 Both'}
              </button>
            ))}
            <div style={{ flex: 1, minWidth: 8 }} />

            {/* New Chat Button */}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleNewChat}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 10,
                  fontSize: '0.74rem', color: 'var(--muted)',
                  background: 'transparent', border: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'all 0.18s',
                  fontFamily: 'inherit', flexShrink: 0,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                ✏ <span className="hide-mobile">New Chat</span>
              </button>
            )}

            {/* History Button */}
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 10,
                fontSize: '0.74rem', color: 'var(--muted)',
                background: 'transparent', border: '1px solid var(--border)',
                cursor: 'pointer', transition: 'all 0.18s',
                fontFamily: 'inherit', flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              📜 <span className="hide-mobile">History</span>
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 10,
                fontSize: '0.74rem', color: 'var(--muted)',
                background: 'transparent', border: '1px solid var(--border)',
                cursor: 'pointer', transition: 'all 0.18s',
                fontFamily: 'inherit', flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              ⚙ <span className="hide-mobile">Settings</span>
            </button>
          </div>

          {/* Input row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="Ask anything about your documents… (Enter to send, Shift+Enter for new line)"
              rows={2}
              disabled={isLoading}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 14, resize: 'none',
                background: 'var(--input-bg)', backdropFilter: 'blur(12px)',
                border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: '0.88rem', fontFamily: 'inherit',
                outline: 'none', transition: 'all 0.2s', lineHeight: 1.6,
                minHeight: 68, maxHeight: 160,
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,210,200,0.45)'; e.currentTarget.style.boxShadow = 'var(--input-focus-ring)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              disabled={!query.trim() || isLoading}
              className="flex-shrink-0 self-end h-[46px] sm:h-[52px] px-4 sm:px-6 min-w-[80px] sm:min-w-[105px] text-xs sm:text-sm font-semibold rounded-xl"
              >
            {isLoading ? 'Asking…' : 'Ask →'}
            </Button>
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.6 }}>
            Answers are grounded in your indexed documents only.
          </p>
        </form>
      </div>

      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Retrieval Settings" width="360px">
        {settingsOpen && <SettingsContent settings={settings} onChange={setSettings} />}
      </Sheet>

      {/* History Sheet */}
      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Chat History" width="400px">
        {historyOpen && <HistoryContent onSelectSession={handleSelectSession} />}
      </Sheet>
    </div>
  );
}
