import { apiGet, apiPost, tokenStore, BASE_URL, onUnauthorized } from './client';
import type { QueryRequest, QueryResponse, ChatHistoryItem, QuerySSEEvent } from './types';

/* ── Legacy blocking ask — kept for history replay ── */
export const queryApi = {
  ask: (payload: QueryRequest) =>
    apiPost<QueryResponse>('/query', payload),

  getHistory: async (limit = 50): Promise<ChatHistoryItem[]> => {
    const res = await apiGet<{ history: ChatHistoryItem[] }>(`/chat/history?limit=${limit}`);
    return res.history ?? [];
  },
};

/**
 * Initiate a streaming SSE query request.
 * Returns the raw Response — the caller must stream it via parseQuerySSEStream().
 */
export async function streamQuery(payload: QueryRequest): Promise<Response> {
  const token = tokenStore.get();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    tokenStore.clear();
    onUnauthorized.notify();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const text = await res.text();
      const data = JSON.parse(text) as Record<string, unknown>;
      if (typeof data['detail'] === 'string') detail = data['detail'];
    } catch { /* ignore parse errors */ }
    throw new Error(detail);
  }

  return res;
}

/**
 * Async generator that reads a query SSE response body and yields typed
 * QuerySSEEvent objects (sources | token | done).
 * Events are delimited by "\n\n" and prefixed with "data: ".
 */
export async function* parseQuerySSEStream(
  res: Response,
): AsyncGenerator<QuerySSEEvent> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';
      for (const chunk of chunks) {
        const line = chunk.trim();
        if (!line.startsWith('data:')) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;
        try {
          yield JSON.parse(jsonStr) as QuerySSEEvent;
        } catch { /* skip malformed events */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/* ── File download helper (unchanged) ── */
export async function downloadFile(docUrlOrDataUrl: string, filename: string): Promise<void> {
  if (docUrlOrDataUrl.startsWith('data:image/') || docUrlOrDataUrl.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = docUrlOrDataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }
  const token = tokenStore.get();
  const res = await fetch(docUrlOrDataUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}
