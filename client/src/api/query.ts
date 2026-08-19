import { apiGet, apiPost } from './client';
import type { QueryRequest, QueryResponse, ChatHistoryItem } from './types';

export const queryApi = {
  ask: (payload: QueryRequest) =>
    apiPost<QueryResponse>('/query', payload),

  getHistory: async (limit = 50): Promise<ChatHistoryItem[]> => {
    const res = await apiGet<{ history: ChatHistoryItem[] }>(`/chat/history?limit=${limit}`);
    return res.history ?? [];
  },
};
