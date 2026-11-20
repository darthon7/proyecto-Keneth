import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { gamesApi } from '@/api';
import type { Game } from '@/types';
import { countAvailableKeys } from '@/utils/domain';

export interface StockAlert {
  id: string;
  editionId: number;
  editionName: string;
  type: 'sold_out' | 'restocked' | 'low_stock';
  message: string;
  timestamp: number;
}

export interface UseStockWatchOptions {
  gameId?: number;
  intervalMs?: number;
  enabled?: boolean;
}

/**
 * Hook de client-side long-polling / adaptive polling para monitoreo de stock en tiempo real
 * sin requerir cambios en el backend.
 *
 * Características:
 * - Ciclo asíncrono con control de cancelación limpia (AbortController).
 * - Pausa automática cuando la ventana está oculta (document.hidden) para optimizar recursos.
 * - Backoff exponencial si se presentan fallas de red.
 * - Detección de cambios de stock por edición (Agotado, Reabastecido, Últimas unidades).
 * - Sincronización reactiva con cache de React Query.
 */
export function useStockWatch(options: UseStockWatchOptions = {}) {
  const { gameId, intervalMs = 4000, enabled = true } = options;
  const queryClient = useQueryClient();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const lastStockByEditionRef = useRef<Map<number, number>>(new Map());
  const isInitialSnapshotRef = useRef<boolean>(true);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((current) => current.filter((a) => a.id !== alertId));
  }, []);

  useEffect(() => {
    if (!enabled || !gameId || !Number.isInteger(gameId) || gameId < 1) {
      return;
    }

    let isMounted = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let failureCount = 0;
    const controller = new AbortController();

    const compareAndNotify = (game: Game) => {
      const editions = game.editions ?? [];
      const prevMap = lastStockByEditionRef.current;
      const nextMap = new Map<number, number>();
      const newAlerts: StockAlert[] = [];
      const isInitial = isInitialSnapshotRef.current;
      let hasStockChanged = false;

      for (const edition of editions) {
        const availableCount = countAvailableKeys(edition);
        nextMap.set(edition.id, availableCount);

        if (!isInitial && prevMap.get(edition.id) !== availableCount) {
          hasStockChanged = true;
        }

        if (!isInitial && prevMap.has(edition.id)) {
          const previousCount = prevMap.get(edition.id)!;
          const editionLabel = edition.editionName || (edition.platform?.name ? `Edición ${edition.platform.name}` : `Edición #${edition.id}`);

          if (previousCount > 0 && availableCount === 0) {
            newAlerts.push({
              id: `${edition.id}-sold-out-${Date.now()}`,
              editionId: edition.id,
              editionName: editionLabel,
              type: 'sold_out',
              message: `¡Se han agotado las claves digitales para ${editionLabel}!`,
              timestamp: Date.now(),
            });
          } else if (previousCount === 0 && availableCount > 0) {
            newAlerts.push({
              id: `${edition.id}-restocked-${Date.now()}`,
              editionId: edition.id,
              editionName: editionLabel,
              type: 'restocked',
              message: `¡Nuevas claves disponibles para ${editionLabel}! (Stock: ${availableCount})`,
              timestamp: Date.now(),
            });
          } else if (previousCount > 2 && availableCount > 0 && availableCount <= 2) {
            newAlerts.push({
              id: `${edition.id}-low-stock-${Date.now()}`,
              editionId: edition.id,
              editionName: editionLabel,
              type: 'low_stock',
              message: `¡Últimas ${availableCount} ${availableCount === 1 ? 'clave disponible' : 'claves disponibles'} para ${editionLabel}!`,
              timestamp: Date.now(),
            });
          }
        }
      }

      lastStockByEditionRef.current = nextMap;
      if (isInitial) {
        isInitialSnapshotRef.current = false;
      }

      if (newAlerts.length > 0) {
        setAlerts((curr) => [...newAlerts, ...curr].slice(0, 5));
      }

      if (hasStockChanged || newAlerts.length > 0) {
        queryClient.setQueryData(['game', gameId], game);
      }
    };

    const poll = async () => {
      if (!isMounted) return;

      // Si la pestaña está en segundo plano / oculta, pausar temporalmente
      if (typeof document !== 'undefined' && document.hidden) {
        timerId = setTimeout(poll, intervalMs);
        return;
      }

      try {
        const updatedGame = await gamesApi.get(gameId);
        if (!isMounted) return;

        failureCount = 0;
        compareAndNotify(updatedGame);

        // Agendamos el siguiente sondeo
        timerId = setTimeout(poll, intervalMs);
      } catch (err) {
        if (!isMounted) return;
        failureCount++;
        // Backoff exponencial ante fallos para proteger la red
        const backoffMs = Math.min(intervalMs * Math.pow(1.5, failureCount), 30000);
        timerId = setTimeout(poll, backoffMs);
      }
    };

    // Iniciar el sondeo
    poll();

    // Reanudar inmediatamente si la pestaña vuelve a ser visible
    const handleVisibilityChange = () => {
      if (!document.hidden && isMounted) {
        if (timerId) clearTimeout(timerId);
        poll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      controller.abort();
      if (timerId) clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameId, intervalMs, enabled, queryClient]);

  return {
    alerts,
    dismissAlert,
    currentStockMap: lastStockByEditionRef.current,
  };
}
