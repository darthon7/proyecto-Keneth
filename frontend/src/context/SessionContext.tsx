import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  authApi,
  clearStoredAuthToken,
  errorMessage,
  getStoredAuthToken,
  onUnauthorized,
  setStoredAuthToken,
} from '@/api';
import { UserRole } from '@/types';
import type { AuthResponse, SafeUser } from '@/types';

interface SessionContextValue {
  currentUser: SafeUser | null;
  currentUserId: number | null;
  token: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  setSession: (auth: AuthResponse) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const PROTECTED_QUERY_KEYS = [
  ['auth'],
  ['orders'],
  ['order'],
  ['user-libraries'],
  ['wishlists'],
  ['users'],
  ['user'],
  ['digital-keys'],
] as const;

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => getStoredAuthToken());

  const clearProtectedCache = useCallback(() => {
    for (const queryKey of PROTECTED_QUERY_KEYS) {
      queryClient.removeQueries({ queryKey: [...queryKey] });
    }
  }, [queryClient]);

  const logout = useCallback(() => {
    clearStoredAuthToken();
    setToken(null);
    clearProtectedCache();
  }, [clearProtectedCache]);

  useEffect(() => {
    return onUnauthorized(() => {
      clearStoredAuthToken();
      setToken(null);
      clearProtectedCache();
    });
  }, [clearProtectedCache]);

  const meQuery = useQuery({
    queryKey: ['auth', 'me', token],
    queryFn: () => authApi.me(),
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    if (
      token &&
      meQuery.isError &&
      meQuery.error instanceof ApiError &&
      (meQuery.error.status === 401 || meQuery.error.status === 403)
    ) {
      logout();
    }
  }, [token, meQuery.isError, meQuery.error, logout]);

  const setSession = useCallback(
    (auth: AuthResponse) => {
      setStoredAuthToken(auth.accessToken);
      setToken(auth.accessToken);
      queryClient.setQueryData(['auth', 'me', auth.accessToken], auth.user);
    },
    [queryClient],
  );

  const currentUser = token ? (meQuery.data ?? null) : null;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isLoading = Boolean(token) && meQuery.isLoading;
  const error = token && meQuery.isError ? errorMessage(meQuery.error) : null;

  const value = useMemo<SessionContextValue>(
    () => ({
      currentUser,
      currentUserId: currentUser?.id ?? null,
      token,
      isAdmin,
      isLoading,
      error,
      setSession,
      logout,
    }),
    [currentUser, token, isAdmin, isLoading, error, setSession, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession debe usarse dentro de SessionProvider');
  return context;
}
