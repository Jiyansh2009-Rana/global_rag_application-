import { apiGet, apiPost, tokenStore } from './client';
import type { QueryRequest, QueryResponse, ChatHistoryItem } from './types';

export const queryApi = {
  ask: (payload: QueryRequest) =>
    apiPost<QueryResponse>('/query', payload),

  getHistory: async (limit = 50): Promise<ChatHistoryItem[]> => {
    const res = await apiGet<{ history: ChatHistoryItem[] }>(`/chat/history?limit=${limit}`);
    return res.history ?? [];
  },
};

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
