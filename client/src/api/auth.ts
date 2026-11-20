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

  // ── Google OAuth: Step 2 — fetch Google consent/authorization URL ──
  // The backend constructs the full Google consent URL with scopes, client_id,
  // redirect_uri, and CSRF state token. We redirect the browser there.
  getGoogleAuthUrl: (redirectUri?: string) =>
    apiGet<{ authorization_url: string }>(
      redirectUri
        ? `/auth/google/authorize-url?redirect_uri=${encodeURIComponent(redirectUri)}`
        : '/auth/google/authorize-url',
    ),

  // ── Google OAuth: Step 4 — exchange authorization code for platform JWT ──
  // After Google redirects back with ?code=..., the frontend sends that code
  // here. The backend exchanges it with Google for an access token, fetches
  // the user profile, then issues our own JWT cookies.
  exchangeGoogleCode: (
    authorizationCode: string,
    redirectUri: string,
    organizationIdentifier?: string,
  ) =>
    apiPost<LoginResponse>('/auth/google/exchange', {
      authorization_code: authorizationCode,
      redirect_uri: redirectUri,
      organization_identifier: organizationIdentifier,
    }),
};
