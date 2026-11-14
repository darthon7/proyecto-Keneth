import type { Game, Promotion } from '@/types';

export interface ActiveGameDiscount {
  hasDiscount: boolean;
  discountPercentage: number;
  campaignName: string | null;
  computePrice: (basePrice: number) => number;
}

export function getActiveGameDiscount(game?: Game | null, now = Date.now()): ActiveGameDiscount {
  const pct = Number(game?.discountPercentage ?? 0);
  if (!game || !Number.isFinite(pct) || pct <= 0) {
    return {
      hasDiscount: false,
      discountPercentage: 0,
      campaignName: null,
      computePrice: (basePrice: number) => basePrice,
    };
  }

  const start = game.discountStartDate ? new Date(game.discountStartDate).getTime() : null;
  const end = game.discountEndDate ? new Date(game.discountEndDate).getTime() : null;
  const startOk = start === null || !Number.isFinite(start) || start <= now;
  const endOk = end === null || !Number.isFinite(end) || end >= now;

  if (!startOk || !endOk) {
    return {
      hasDiscount: false,
      discountPercentage: 0,
      campaignName: null,
      computePrice: (basePrice: number) => basePrice,
    };
  }

  return {
    hasDiscount: true,
    discountPercentage: pct,
    campaignName: game.discountCampaignName ?? 'Oferta especial',
    computePrice: (basePrice: number) => Number((basePrice * (1 - pct / 100)).toFixed(2)),
  };
}

export type CouponStatus = 'active' | 'expiring_soon' | 'expired';

export interface CouponStatusInfo {
  status: CouponStatus;
  daysRemaining: number;
  hoursRemaining: number;
}

const EXPIRING_SOON_MS = 7 * 24 * 60 * 60 * 1000;

export function getCouponStatus(promotion: Promotion, now = Date.now()): CouponStatusInfo {
  const endMs = new Date(promotion.endDate).getTime();
  if (!promotion.isActive || (Number.isFinite(endMs) && endMs < now)) {
    return { status: 'expired', daysRemaining: 0, hoursRemaining: 0 };
  }

  const diffMs = Math.max(0, endMs - now);
  const daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.ceil(diffMs / (60 * 60 * 1000));

  if (Number.isFinite(endMs) && diffMs <= EXPIRING_SOON_MS) {
    return { status: 'expiring_soon', daysRemaining, hoursRemaining };
  }

  return { status: 'active', daysRemaining, hoursRemaining };
}
