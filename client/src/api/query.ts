import { apiPost } from './client';
import type { QueryRequest, QueryResponse } from './types';

export const queryApi = {
  ask: (payload: QueryRequest) =>
    apiPost<QueryResponse>('/query', payload),
};
