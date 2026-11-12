import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/api';
import type { User } from '@/types';

const STORAGE_KEY = 'keneth.currentUserId';

interface SessionContextValue {
  currentUser: User | null;
  currentUserId: number | null;
  users: User[];
  isLoading: boolean;
  error: string | null;
  selectUser: (userId: number) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<number | null>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? Number(stored) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  });

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  // La sesión solo existe si el usuario la inició desde el modal de acceso.
  // Si la cuenta guardada se borró de la base de datos, la sesión se cierra.
  useEffect(() => {
    if (currentUserId === null || users.length === 0) return;
    if (users.some((user) => user.id === currentUserId)) return;
    setCurrentUserId(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, [currentUserId, users]);

  const selectUser = useCallback((userId: number) => {
    setCurrentUserId(userId);
    window.localStorage.setItem(STORAGE_KEY, String(userId));
  }, []);

  const logout = useCallback(() => {
    setCurrentUserId(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      currentUser: users.find((user) => user.id === currentUserId) ?? null,
      currentUserId,
      users,
      isLoading,
      error: error instanceof Error ? error.message : null,
      selectUser,
      logout,
    }),
    [users, currentUserId, isLoading, error, selectUser, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession debe usarse dentro de SessionProvider');
  return context;
}
