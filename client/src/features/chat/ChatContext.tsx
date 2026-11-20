import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { queryApi } from '@/api/query';
import { parseApiError } from '@/api/client';
import type { ChatHistoryItem, QueryResponse, Source } from '@/api/types';

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error';
  content: string;
  response?: QueryResponse;
  timestamp: Date;
  animate?: boolean;
  isStreaming?: boolean;
  streamingAnswer?: string;
  streamingSources?: Source[];
}

export interface ChatSession {
  sessionId: string;
  messages: ChatHistoryItem[];
  firstQuery: string;
  lastAnswer: string;
  mode: string;
  lastAt?: string;
}

export function getCleanAnswerText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .trim();
}

/* ── Source Cache Persistence for Chat History ── */
const SOURCES_CACHE_KEY = 'askmydocs_chat_sources_cache';

export function saveSourcesToCache(sessionId: string | undefined, query: string, sources: Source[]): void {
  if (!sources || sources.length === 0) return;
  try {
    const raw = localStorage.getItem(SOURCES_CACHE_KEY);
    const cache: Record<string, Source[]> = raw ? JSON.parse(raw) : {};
    if (sessionId) cache[`sid_${sessionId}`] = sources;
    if (query) {
      const qKey = `q_${query.trim().toLowerCase().slice(0, 80)}`;
      cache[qKey] = sources;
    }
    // Cap cache to latest 120 queries to avoid unbounded storage growth
    const keys = Object.keys(cache);
    if (keys.length > 120) {
      delete cache[keys[0]];
    }
    localStorage.setItem(SOURCES_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to cache sources to localStorage:', e);
  }
}

export function getSourcesFromCache(sessionId?: string, query?: string): Source[] {
  try {
    const raw = localStorage.getItem(SOURCES_CACHE_KEY);
    if (!raw) return [];
    const cache: Record<string, Source[]> = JSON.parse(raw);
    if (sessionId && cache[`sid_${sessionId}`]?.length) {
      return cache[`sid_${sessionId}`];
    }
    if (query) {
      const qKey = `q_${query.trim().toLowerCase().slice(0, 80)}`;
      if (cache[qKey]?.length) return cache[qKey];
    }
  } catch {
    // ignore parse error
  }
  return [];
}

interface ChatContextType {
  sessions: ChatSession[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  loadingSessions: boolean;
  loadingMore: boolean;
  hasMoreHistory: boolean;
  loadMoreHistory: () => Promise<void>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  refreshSessions: () => Promise<void>;
  startNewChat: () => void;
  selectSession: (sessionId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({
  children,
  onNavigateToChat,
}: {
  children: React.ReactNode;
  onNavigateToChat?: () => void;
}) {
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const fetchHistory = useCallback(async () => {
    setLoadingSessions(true);
    setCurrentPage(1);
    try {
      const res = await queryApi.getHistory(1);
      setHistory(res.history);
      setHasMoreHistory(res.has_more);
    } catch (err) {
      console.warn('Could not load chat history:', parseApiError(err));
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const loadMoreHistory = useCallback(async () => {
    if (loadingMore || !hasMoreHistory) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const res = await queryApi.getHistory(nextPage);
      setHistory((prev) => {
        const existingKeys = new Set(prev.map((i) => i.id || `${i.session_id}_${i.query}_${i.created_at}`));
        const newItems = res.history.filter((i) => !existingKeys.has(i.id || `${i.session_id}_${i.query}_${i.created_at}`));
        return [...prev, ...newItems];
      });
      setCurrentPage(nextPage);
      setHasMoreHistory(res.has_more);
    } catch (err) {
      console.warn('Could not load more chat history:', parseApiError(err));
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, hasMoreHistory, loadingMore]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

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

  const startNewChat = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    onNavigateToChat?.();
  }, [onNavigateToChat]);

  const selectSession = useCallback(
    (sessionId: string) => {
      const target = sessions.find((s) => s.sessionId === sessionId);
      if (!target) return;

      const msgs: Message[] = [];
      for (const row of target.messages) {
        msgs.push({
          id: `hist_q_${row.id}`,
          type: 'user',
          content: row.query,
          timestamp: new Date(row.created_at || Date.now()),
        });

        // Restore sources from backend payload if present, or fallback to persistent client cache
        const rowSources: Source[] =
          ((row as any).sources && Array.isArray((row as any).sources) && (row as any).sources.length > 0)
            ? (row as any).sources
            : getSourcesFromCache(row.session_id, row.query);

        msgs.push({
          id: `hist_a_${row.id}`,
          type: 'assistant',
          content: getCleanAnswerText(row.answer),
          response: {
            answer: getCleanAnswerText(row.answer),
            query_mode: (row.query_mode as any) || 'global',
            total_sources_found: rowSources.length,
            language: 'English',
            session_id: row.session_id,
            sources: rowSources,
          },
          timestamp: new Date(row.created_at || Date.now()),
          animate: false,
        });
      }

      setMessages(msgs);
      setActiveSessionId(sessionId);
      onNavigateToChat?.();
    },
    [sessions, onNavigateToChat]
  );

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSessionId,
        setActiveSessionId,
        loadingSessions,
        loadingMore,
        hasMoreHistory,
        loadMoreHistory,
        messages,
        setMessages,
        refreshSessions: fetchHistory,
        startNewChat,
        selectSession,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatSession() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatSession must be used within a ChatProvider');
  }
  return ctx;
}
