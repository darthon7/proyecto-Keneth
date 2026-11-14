import { Link } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { CoverSlot } from '@/components/atoms/CoverSlot';
import type { Game } from '@/types';
import { getActiveGameDiscount } from '@/utils/discount';
import { formatCurrency } from '@/utils/format';

interface GameCardProps {
  game: Game;
  onAddToCart?: (game: Game) => void;
  variant?: 'cover' | 'typographic';
  compact?: boolean;
}

function priceFromEditions(game: Game): number | null {
  const prices = (game.editions ?? [])
    .map((edition) => Number(edition.basePrice))
    .filter((price) => Number.isFinite(price));
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

export function GameCard({ game, onAddToCart, variant = 'cover', compact = false }: GameCardProps) {
  const price = priceFromEditions(game);
  const discount = getActiveGameDiscount(game);
  const discountedPrice = price !== null ? discount.computePrice(price) : null;
  const isNintendo =
    game.publisher?.name?.toLowerCase().includes('nintendo') ||
    game.developer?.name?.toLowerCase().includes('nintendo') ||
    (game.editions ?? []).some(
      (e) =>
        e.platform?.name?.toLowerCase().includes('switch') ||
        e.platform?.name?.toLowerCase().includes('nintendo'),
    );

  if (variant === 'typographic') {
    return (
      <article className="product-card group flex flex-col rounded-2xl overflow-hidden bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] hover:-translate-y-0.5 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.07),0_2px_4px_-2px_rgba(15,23,42,0.05)] hover:shadow-[0_12px_24px_-4px_rgba(30,27,75,0.12)] transition-all duration-200 p-4">
        <Link to={`/games/${game.id}`} className="flex flex-col">
          <div className="relative overflow-hidden rounded-xl">
            <CoverSlot game={game} />
            {discount.hasDiscount && (
              <span className="absolute top-2.5 right-2.5 rounded-md bg-[#FF2A5F] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                OFERTA -{discount.discountPercentage}%
              </span>
            )}
          </div>
          <h3 className="mt-4 line-clamp-2 text-lg font-bold text-[#0F172A] transition-colors group-hover:text-[#FF2A5F]">
            {game.title}
          </h3>
          {price !== null && discountedPrice !== null && (
            <div className="mt-2 flex items-baseline gap-2">
              {discount.hasDiscount ? (
                <>
                  <span className="text-xs font-semibold text-[#94A3B8] line-through tabular-nums">
                    {formatCurrency(price)}
                  </span>
                  <span className="text-base font-black text-[#059669] tabular-nums">
                    {formatCurrency(discountedPrice)}
                  </span>
                </>
              ) : (
                <span className="text-base font-extrabold text-[#0F172A] tabular-nums">
                  {formatCurrency(price)}
                </span>
              )}
            </div>
          )}
          <p className="mt-1 text-xs text-[#475569]">
            {game.publisher?.name ?? 'Sin publisher'}
          </p>
        </Link>
      </article>
    );
  }

  return (
    <article
      className={`product-card group flex flex-col justify-between rounded-2xl overflow-hidden bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] hover:-translate-y-0.5 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.07),0_2px_4px_-2px_rgba(15,23,42,0.05)] hover:shadow-[0_12px_24px_-4px_rgba(30,27,75,0.12)] transition-all duration-200 ${
        compact ? 'p-2.5' : 'p-3'
      }`}
    >
      <Link
        to={`/games/${game.id}`}
        className={`block relative overflow-hidden rounded-xl bg-[#F4F4F6] ${
          compact ? 'aspect-[16/10]' : ''
        }`}
      >
        <CoverSlot game={game} />
        {discount.hasDiscount && (
          <span
            data-testid={`game-card-offer-badge-${game.id}`}
            className="absolute top-2 right-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#FF2A5F] text-white shadow-sm"
          >
            OFERTA -{discount.discountPercentage}%
          </span>
        )}
      </Link>

      <div className={`${compact ? 'mt-2 gap-1.5' : 'mt-3 gap-2'} flex flex-col`}>
        <Link to={`/games/${game.id}`}>
          <h3
            className={`${
              compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
            } font-black text-[#0F172A] transition-colors group-hover:text-[#FF2A5F] line-clamp-1`}
          >
            {game.title}
          </h3>
        </Link>

        <div className={`${compact ? 'pt-2' : 'pt-2.5'} border-t border-[#E2E8F0] flex items-center justify-between gap-2`}>
          <div>
            {price !== null && discountedPrice !== null ? (
              discount.hasDiscount ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold text-[#94A3B8] line-through tabular-nums">
                    {formatCurrency(price)}
                  </span>
                  <span className="text-sm sm:text-base font-black text-[#059669] tabular-nums">
                    {formatCurrency(discountedPrice)}
                  </span>
                </div>
              ) : (
                <p className="text-sm sm:text-base font-black text-[#0F172A] tabular-nums">
                  {formatCurrency(price)}
                </p>
              )
            ) : (
              <span className="text-xs text-[#94A3B8] font-semibold">Consultar</span>
            )}
          </div>

          {onAddToCart && (
            <Button
              variant={isNintendo ? 'nintendo' : 'brand'}
              size="sm"
              onClick={() => onAddToCart(game)}
            >
              Comprar
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
