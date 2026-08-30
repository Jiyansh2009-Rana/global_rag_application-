import { tokenStore, apiFetch, BASE_URL, onUnauthorized } from './client';
import type { ConsentResponse, UploadSSEEvent } from './types';

export const getConsent = (upload_mode: 'global' | 'local') =>
  apiFetch<ConsentResponse>(`/upload/consent?upload_mode=${upload_mode}`, { method: 'GET' });

/**
 * Fire an SSE upload request.
 * Returns the raw Response — the caller must stream it via parseUploadSSEStream().
 */
export async function uploadDocumentSSE(
  file: File,
  upload_mode: 'global' | 'local',
  token: string | null,
): Promise<Response> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_mode', upload_mode);
  fd.append('confirmed', 'true');

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/upload/document`, {
    method: 'POST',
    headers,
    body: fd,
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
 * Async generator that reads an upload SSE response body and yields
 * parsed UploadSSEEvent objects. Events are delimited by double newlines
 * and prefixed with "data: ".
 */
export async function* parseUploadSSEStream(
  res: Response,
): AsyncGenerator<UploadSSEEvent> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE events are separated by blank lines (\n\n)
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';
      for (const chunk of chunks) {
        const line = chunk.trim();
        if (!line.startsWith('data:')) continue;
        const jsonStr = line.slice(5).trim(); // strip "data:" prefix
        if (!jsonStr) continue;
        try {
          yield JSON.parse(jsonStr) as UploadSSEEvent;
        } catch { /* skip malformed events */ }
      }
    }
    // Flush any remaining buffer content
    const remaining = buffer.trim();
    if (remaining.startsWith('data:')) {
      const jsonStr = remaining.slice(5).trim();
      if (jsonStr) {
        try { yield JSON.parse(jsonStr) as UploadSSEEvent; } catch { /* ignore */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
