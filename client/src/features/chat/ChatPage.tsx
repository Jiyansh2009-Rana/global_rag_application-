import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { queryApi } from '@/api/query';
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

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error';
  content: string;
  response?: QueryResponse;
  timestamp: Date;
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

/* ── Typewriter ── */
function TypewriterText({ text, onDone }: { text: string; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0; setDisplayed(''); setDone(false);
    const interval = setInterval(() => {
      if (idx.current < text.length) {
        const chunk = text.slice(idx.current, idx.current + 5);
        setDisplayed((p) => p + chunk);
        idx.current += 5;
      } else {
        clearInterval(interval);
        setDisplayed(text);
        setDone(true);
        onDone?.();
      }
    }, 14);
    return () => clearInterval(interval);
  }, [text, onDone]);

  return (
    <div className="prose" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <ReactMarkdown>{displayed}</ReactMarkdown>
      {!done && <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--accent)', animation: 'pulseOpacity 0.8s infinite', verticalAlign: 'text-bottom', marginLeft: 2 }} />}
    </div>
  );
}

/* ── Source Card ── */
function SourceCard({ source, index, expanded, onToggle }: { source: Source; index: number; expanded: boolean; onToggle: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      onClick={onToggle}
      className="glass-card"
      style={{ padding: '14px 16px', cursor: 'pointer', borderRadius: 12 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{source.document_name}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <span style={{ fontSize: '0.67rem', color: 'var(--muted)' }}>p.{source.page_number}</span>
            {source.chunk_index !== undefined && <span style={{ fontSize: '0.67rem', color: 'var(--muted)' }}>chunk #{source.chunk_index}</span>}
          </div>
        </div>
        <span style={{ fontSize: '0.68rem', color: 'var(--muted)', flexShrink: 0 }}>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>[{index + 1}]</span> {expanded ? '▲' : '▼'}
        </span>
      </div>
      <ScoreBar score={source.similarity_score} />
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
  if (!loading && sources.length === 0) return null;
  return (
    <div style={{ marginTop: 20 }}>
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
                  <SourceCard key={s.chunk_id} source={s} index={i} expanded={expandedId === s.chunk_id} onToggle={() => setExpandedId((id) => id === s.chunk_id ? null : s.chunk_id)} />
                ))
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Answer Bubble ── */
function AnswerBubble({ response, isLoading, stage }: { response?: QueryResponse; isLoading: boolean; stage: Stage }) {
  const [typeDone, setTypeDone] = useState(false);
  useEffect(() => { if (response) setTypeDone(false); }, [response]);

  return (
    <div
      className="glass"
      style={{
        padding: '1.25rem 1.5rem',
        borderRadius: 16,
        borderColor: 'rgba(0,210,200,0.18)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.32), 0 0 0 1px rgba(0,210,200,0.07)',
      }}
    >
      {isLoading && (
        <>
          <StatusStepper stage={stage} />
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[100, 90, 85, 72, 55].map((w, i) => (
              <div key={i} className="skeleton" style={{ height: 12, width: `${w}%` }} />
            ))}
          </div>
        </>
      )}
      {response && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {[`Mode: ${response.query_mode}`, `Sources: ${response.total_sources_found}`, `Lang: ${response.language}`, ...(response.generated_by ? [`Model: ${response.generated_by}`] : [])].map((tag) => (
              <span key={tag} style={{ fontSize: '0.67rem', padding: '2px 10px', borderRadius: 999, color: 'var(--muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 500 }}>{tag}</span>
            ))}
          </div>
          <TypewriterText text={response.answer} onDone={() => setTypeDone(true)} />
          <AnimatePresence>
            {typeDone && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                <SourcesRail sources={response.sources} />
              </motion.div>
            )}
          </AnimatePresence>
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
function HistoryContent({
  onSelectHistory,
}: {
  onSelectHistory: (item: ChatHistoryItem) => void;
}) {
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await queryApi.getHistory(50);
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

  const filtered = useMemo(() => {
    if (!search.trim()) return history;
    const s = search.toLowerCase();
    return history.filter(
      (h) =>
        h.query?.toLowerCase().includes(s) ||
        h.answer?.toLowerCase().includes(s) ||
        h.query_mode?.toLowerCase().includes(s)
    );
  }, [history, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      {/* Search & Refresh */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Search past queries..."
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

      {!loading && filtered.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)', fontSize: '0.82rem' }}>
          {search ? 'No matching questions found.' : 'No chat history recorded yet.'}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
          {filtered.map((item, idx) => (
            <div
              key={item.id ?? idx}
              onClick={() => onSelectHistory(item)}
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
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: item.query_mode === 'global' ? 'var(--accent-dim)' : 'var(--surface-2)',
                    color: item.query_mode === 'global' ? 'var(--accent)' : 'var(--muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {item.query_mode ?? 'global'}
                </span>
                {item.created_at && (
                  <span style={{ fontSize: '0.67rem', color: 'var(--muted)' }}>
                    {new Date(item.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4, lineHeight: 1.4 }}>
                {item.query}
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
                {item.answer}
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
      <h2 style={{ fontFamily: '"Comfortaa", "Outfit", "Plus Jakarta Sans", sans-serif', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8, color: 'var(--text)' }}>
        Ask anything
      </h2>
      <p style={{ fontSize: '0.84rem', color: 'var(--muted)', maxWidth: 360, lineHeight: 1.65, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
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
    if (isHistoryView) {
      setMessages([]);
      setIsHistoryView(false);
    }
    const userMsg: Message = { id: crypto.randomUUID(), type: 'user', content: q, timestamp: new Date() };
    const assistantId = crypto.randomUUID();
    setMessages((m) => [...m, userMsg]);
    setQuery('');
    setIsLoading(true);
    setStage('embedding');
    const t1 = setTimeout(() => setStage('retrieving'), 900);
    const t2 = setTimeout(() => setStage('generating'), 2000);
    try {
      const payload: QueryRequest = { query: q, upload_mode: mode, top_k: settings.topK, vector_weight: settings.vectorWeight, keyword_weight: +(1 - settings.vectorWeight).toFixed(2), language: settings.language, system_prompt: settings.systemPrompt || undefined };
      const response = await queryApi.ask(payload);
      clearTimeout(t1); clearTimeout(t2);
      setMessages((m) => [...m, { id: assistantId, type: 'assistant', content: response.answer, response, timestamp: new Date() }]);
    } catch (err) {
      clearTimeout(t1); clearTimeout(t2);
      setMessages((m) => [...m, { id: assistantId, type: 'error', content: parseApiError(err), timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  };

  const handleNewChat = () => {
    setMessages([]);
    setQuery('');
    setIsHistoryView(false);
  };

  const handleSelectHistory = (item: ChatHistoryItem) => {
    setHistoryOpen(false);
    setIsHistoryView(true);
    setQuery('');
    const userMsg: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: item.query,
      timestamp: item.created_at ? new Date(item.created_at) : new Date(),
    };
    const mockResponse: QueryResponse = {
      answer: item.answer,
      language: 'English',
      query_mode: (item.query_mode as 'global' | 'local' | 'both') || 'global',
      sources: [],
      total_sources_found: 0,
    };
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      type: 'assistant',
      content: item.answer,
      response: mockResponse,
      timestamp: item.created_at ? new Date(item.created_at) : new Date(),
    };
    setMessages([userMsg, assistantMsg]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      {/* Thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem 1rem' }}>
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
                    <div style={{ maxWidth: '74%', padding: '10px 16px', borderRadius: '18px 18px 4px 18px', fontSize: '0.88rem', lineHeight: 1.6, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: 'var(--accent-fg)', fontWeight: 500 }}>
                      {msg.content}
                    </div>
                  </div>
                )}
                {msg.type === 'assistant' && msg.response && <AnswerBubble response={msg.response} isLoading={false} stage="generating" />}
                {msg.type === 'error' && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'var(--danger-dim)', border: '1px solid rgba(248,113,113,0.22)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                    <span>⚠</span><span>{msg.content}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
              <AnswerBubble isLoading stage={stage} />
            </motion.div>
          )}
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
          padding: '1rem 1.25rem 1.25rem',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Mode pills + settings + history */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {(['global', 'local', 'both'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '5px 14px', borderRadius: 999, fontSize: '0.74rem', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.18s',
                  fontFamily: 'inherit',
                  background: mode === m ? 'var(--accent)' : 'var(--surface-2)',
                  color: mode === m ? 'var(--accent-fg)' : 'var(--muted)',
                  border: mode === m ? 'none' : '1px solid var(--border)',
                  boxShadow: mode === m ? '0 2px 10px rgba(0,210,200,0.3)' : 'none',
                }}
              >
                {m === 'global' ? '🌐 Global' : m === 'local' ? '💾 Local' : '🔀 Both'}
              </button>
            ))}
            <div style={{ flex: 1 }} />

            {/* New Chat Button */}
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 10,
                  fontSize: '0.74rem', color: 'var(--muted)',
                  background: 'transparent', border: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'all 0.18s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                ✏ New Chat
              </button>
            )}

            {/* History Button */}
            <button
              onClick={() => setHistoryOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 10,
                fontSize: '0.74rem', color: 'var(--muted)',
                background: 'transparent', border: '1px solid var(--border)',
                cursor: 'pointer', transition: 'all 0.18s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              📜 History
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setSettingsOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 10,
                fontSize: '0.74rem', color: 'var(--muted)',
                background: 'transparent', border: '1px solid var(--border)',
                cursor: 'pointer', transition: 'all 0.18s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              ⚙ Settings
            </button>
          </div>

          {/* Input row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void handleSubmit(); }}
              placeholder="Ask anything about your documents… (⌘↵ to send)"
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
              variant="primary"
              size="md"
              loading={isLoading}
              disabled={!query.trim() || isLoading}
              onClick={() => void handleSubmit()}
              className="flex-shrink-0 self-end"
            >
              {isLoading ? 'Asking…' : 'Ask →'}
            </Button>
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.6 }}>
            Answers are grounded in your indexed documents only.
          </p>
        </div>
      </div>

      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Retrieval Settings" width="360px">
        <SettingsContent settings={settings} onChange={setSettings} />
      </Sheet>

      {/* History Sheet */}
      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Chat History" width="400px">
        <HistoryContent onSelectHistory={handleSelectHistory} />
      </Sheet>
    </div>
  );
}
