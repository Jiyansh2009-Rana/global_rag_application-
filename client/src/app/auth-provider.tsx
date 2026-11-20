import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { authApi } from '@/api/auth';
import { onUnauthorized, tokenStore, refreshAccessToken } from '@/api/client';
import type { UserMe, SignupPayload } from '@/api/types';

type Role = 'User' | 'Admin' | 'Super Admin';

interface AuthContextValue {
  user: UserMe | null;
  role: Role | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: SignupPayload) => Promise<{ detail: string }>;
  verifySignup: (email: string, otp: string) => Promise<{ detail: string; user_id?: string }>;
  forgotPassword: (email: string) => Promise<{ detail: string }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ detail: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // ── Google OAuth: called after the authorization code is exchanged ──
  // Stores the returned platform JWT, then re-fetches the current user profile.
  signInWithGoogle: (authorizationCode: string, redirectUri: string, orgId?: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  isAdmin: false,
  isSuperAdmin: false,
  isLoading: true,
  token: null,
  signIn: async () => void 0,
  signUp: async () => ({ detail: '' }),
  verifySignup: async () => ({ detail: '' }),
  forgotPassword: async () => ({ detail: '' }),
  resetPassword: async () => ({ detail: '' }),
  signOut: async () => void 0,
  refreshUser: async () => void 0,
  signInWithGoogle: async () => void 0,
});

export function AuthProvider({
  children,
  onLogout,
}: {
  children: React.ReactNode;
  onLogout?: () => void;
}) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_tokenState, setTokenState] = useState<string | null>(tokenStore.get());
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;

  // Fetch user profile once we have a token (or try refresh token cookie)
  const refreshUser = useCallback(async () => {
    let t = tokenStore.get();
    if (!t) {
      t = await refreshAccessToken();
      if (!t) {
        setUser(null);
        setTokenState(null);
        setIsLoading(false);
        return;
      }
      setTokenState(t);
    }
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // On mount — restore session from persisted token or refresh cookie
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  // Proactive silent refresh: access token is valid for 15 minutes, refresh at 14 minutes
  useEffect(() => {
    if (!_tokenState) return;
    const REFRESH_INTERVAL_MS = 14 * 60 * 1000;
    const interval = setInterval(async () => {
      try {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          setTokenState(refreshed);
        }
      } catch {
        // Handled in refreshAccessToken
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [_tokenState]);

  // Subscribe to 401 events
  useEffect(() => {
    const unsub = onUnauthorized.subscribe(() => {
      setUser(null);
      setTokenState(null);
      setIsLoading(false);
      logoutRef.current?.();
    });
    return () => { unsub(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    tokenStore.set(data.access_token);
    setTokenState(data.access_token);
    setIsLoading(true);
    await refreshUser();
  }, [refreshUser]);

  const signUp = useCallback(async (payload: SignupPayload) => {
    return await authApi.signup(payload);
  }, []);

  const verifySignup = useCallback(async (email: string, otp: string) => {
    return await authApi.verifySignup({ email, otp });
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    return await authApi.forgotPassword({ email });
  }, []);

  const resetPassword = useCallback(async (email: string, otp: string, newPassword: string) => {
    return await authApi.resetPassword({ email, otp, new_password: newPassword });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout
    } finally {
      tokenStore.clear();
      setTokenState(null);
      setUser(null);
      logoutRef.current?.();
    }
  }, []);

  // ── Google OAuth: Step 4 callback handler ──
  // Called from the OAuth callback page with the authorization code from Google.
  // Exchanges the code for a platform JWT via the backend, persists the token,
  // and loads the authenticated user profile.
  const signInWithGoogle = useCallback(async (
    authorizationCode: string,
    redirectUri: string,
    orgId?: string,
  ) => {
    // Exchange authorization code → platform access_token + refresh_token cookies
    const tokenResponse = await authApi.exchangeGoogleCode(authorizationCode, redirectUri, orgId);
    // Persist the platform JWT access token to localStorage for subsequent requests
    tokenStore.set(tokenResponse.access_token);
    setTokenState(tokenResponse.access_token);
    setIsLoading(true);
    // Re-fetch full user profile from /auth/me using the new token
    await refreshUser();
  }, [refreshUser]);

  const role = (user?.role as Role) ?? null;
  const isAdmin = role === 'Admin' || role === 'Super Admin';
  const isSuperAdmin = role === 'Super Admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isSuperAdmin,
        isLoading,
        token: tokenStore.get(),
        signIn,
        signUp,
        verifySignup,
        forgotPassword,
        resetPassword,
        signOut,
        refreshUser,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
