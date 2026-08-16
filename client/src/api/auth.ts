import { apiGet, apiPost } from './client';
import type { LoginPayload, LoginResponse, SignupPayload, UserMe } from './types';

export const authApi = {
  login: (payload: LoginPayload) =>
    apiPost<LoginResponse>('/auth/login', payload),

  signup: (payload: SignupPayload) =>
    apiPost<{ message?: string }>('/auth/signup', payload),

  logout: () =>
    apiPost<void>('/auth/logout', {}),

  me: () =>
    apiGet<UserMe>('/auth/me'),
};
