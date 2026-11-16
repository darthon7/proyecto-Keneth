import { KeyStatus, PaymentStatus } from '@/types';
import type { Game, GameEdition } from '@/types';

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  [PaymentStatus.COMPLETED]: { label: 'Completada', tone: 'success' },
  [PaymentStatus.PENDING]: { label: 'Pendiente', tone: 'warning' },
  [PaymentStatus.FAILED]: { label: 'Fallida', tone: 'danger' },
  [PaymentStatus.REFUNDED]: { label: 'Reembolsada', tone: 'neutral' },
};

export function isNintendoTitle(game?: Game | null): boolean {
  if (!game) return false;
  return Boolean(
    game.publisher?.name?.toLowerCase().includes('nintendo') ||
      game.developer?.name?.toLowerCase().includes('nintendo') ||
      game.editions?.some(
        (edition) =>
          edition.platform?.name?.toLowerCase().includes('switch') ||
          edition.platform?.name?.toLowerCase().includes('nintendo'),
      ),
  );
}

export function getLowestEdition(game?: Game | null): GameEdition | null {
  if (!game?.editions || game.editions.length === 0) return null;
  return game.editions.reduce<GameEdition | null>((best, current) => {
    if (!best) return current;
    const bestPrice = Number(best.basePrice);
    const currPrice = Number(current.basePrice);
    if (!Number.isFinite(currPrice)) return best;
    if (!Number.isFinite(bestPrice) || currPrice < bestPrice) return current;
    return best;
  }, null);
}

export function getMinBasePrice(game?: Game | null): number | null {
  const prices = (game?.editions ?? [])
    .map((edition) => Number(edition.basePrice))
    .filter((price) => Number.isFinite(price));
  return prices.length > 0 ? Math.min(...prices) : null;
}

export function countAvailableKeys(edition?: GameEdition | null): number {
  return (edition?.digitalKeys ?? []).filter((key) => key.status === KeyStatus.AVAILABLE).length;
}
