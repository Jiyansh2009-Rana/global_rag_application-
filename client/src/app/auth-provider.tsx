import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { authApi } from '@/api/auth';
import { onUnauthorized, tokenStore } from '@/api/client';
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
  signUp: (payload: SignupPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  isAdmin: false,
  isSuperAdmin: false,
  isLoading: true,
  token: null,
  signIn: async () => void 0,
  signUp: async () => void 0,
  signOut: async () => void 0,
  refreshUser: async () => void 0,
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

  // Fetch user profile once we have a token
  const refreshUser = useCallback(async () => {
    const t = tokenStore.get();
    if (!t) { setUser(null); setIsLoading(false); return; }
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // On mount — restore session from persisted token (localStorage) if present
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

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
    await authApi.signup(payload);
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
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
