import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gameEditionsApi, promotionsApi, promotionsExtraApi } from '@/api';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import type { GameEdition } from '@/types';
import { getActiveGameDiscount } from '@/utils/discount';

export function useCartSummary(
  couponCode = '',
  options?: { excludeClaimed?: boolean },
) {
  const { currentUser } = useSession();
  const { items } = useCart();
  const excludeClaimed = options?.excludeClaimed ?? false;

  const editionsQuery = useQuery({
    queryKey: ['game-editions'],
    queryFn: () => gameEditionsApi.list(),
  });

  const promotionsQuery = useQuery({
    queryKey: ['promotions', currentUser?.id ?? 'guest'],
    queryFn: () => (currentUser ? promotionsExtraApi.myCoupons() : promotionsApi.list()),
  });

  const editionsById = useMemo(() => {
    const map = new Map<number, GameEdition>();
    for (const edition of editionsQuery.data ?? []) {
      map.set(edition.id, edition);
    }
    return map;
  }, [editionsQuery.data]);

  const cartLines = useMemo(
    () =>
      items
        .map((item) => {
          const edition = editionsById.get(item.gameEditionId);
          if (!edition) return null;
          const discount = getActiveGameDiscount(edition.game);
          const unitPrice = discount.computePrice(Number(edition.basePrice));
          return {
            ...item,
            edition,
            unitPrice,
            lineTotal: unitPrice * item.quantity,
          };
        })
        .filter((line): line is NonNullable<typeof line> => line !== null),
    [items, editionsById],
  );

  const subtotal = useMemo(
    () => cartLines.reduce((acc, line) => acc + line.lineTotal, 0),
    [cartLines],
  );

  const matchedPromotion = useMemo(() => {
    const normalized = couponCode.trim().toLowerCase();
    if (!normalized) return null;
    const now = Date.now();
    return (
      (promotionsQuery.data ?? []).find((promotion) => {
        if (!promotion.isActive || promotion.couponCode?.toLowerCase() !== normalized) {
          return false;
        }
        const start = new Date(promotion.startDate).getTime();
        const end = new Date(promotion.endDate).getTime();
        return (!Number.isFinite(start) || start <= now) && (!Number.isFinite(end) || end >= now);
      }) ?? null
    );
  }, [couponCode, promotionsQuery.data]);

  const isCouponAlreadyClaimed = Boolean(matchedPromotion?.isClaimed);
  const activePromotion =
    excludeClaimed && isCouponAlreadyClaimed ? null : matchedPromotion;
  const discountPercentage = activePromotion ? Number(activePromotion.discountPercentage) : 0;
  const discount = (subtotal * discountPercentage) / 100;
  const total = subtotal - discount;

  return {
    editionsQuery,
    promotionsQuery,
    cartLines,
    subtotal,
    matchedPromotion,
    isCouponAlreadyClaimed,
    activePromotion,
    discountPercentage,
    discount,
    total,
  };
}
