import { apiGet, apiPost } from './client';
import type {
  LoginPayload,
  LoginResponse,
  SignupPayload,
  VerifySignupPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  RefreshResponse,
  UserMe,
} from './types';

export const authApi = {
  login: (payload: LoginPayload) =>
    apiPost<LoginResponse>('/auth/login', payload),

  signup: (payload: SignupPayload) =>
    apiPost<{ detail: string }>('/auth/signup', payload),

  verifySignup: (payload: VerifySignupPayload) =>
    apiPost<{ detail: string; user_id?: string; email?: string; org_id?: string }>(
      '/auth/verify-signup',
      payload,
    ),

  forgotPassword: (payload: ForgotPasswordPayload) =>
    apiPost<{ detail: string }>('/auth/forgot-password', payload),

  resetPassword: (payload: ResetPasswordPayload) =>
    apiPost<{ detail: string }>('/auth/reset-password', payload),

  refresh: () =>
    apiPost<RefreshResponse>('/auth/refresh', {}),

  logout: () =>
    apiPost<void>('/auth/logout', {}),

  me: () =>
    apiGet<UserMe>('/auth/me'),
};
