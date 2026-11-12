import { Link } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { CoverSlot } from '@/components/atoms/CoverSlot';
import type { Game } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';

interface GameCardProps {
  game: Game;
  onAddToCart?: (game: Game) => void;
  variant?: 'cover' | 'typographic';
}

function priceFromEditions(game: Game): number | null {
  const prices = (game.editions ?? [])
    .map((edition) => Number(edition.basePrice))
    .filter((price) => Number.isFinite(price));
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

export function GameCard({ game, onAddToCart, variant = 'cover' }: GameCardProps) {
  const price = priceFromEditions(game);
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
          <div className="overflow-hidden rounded-xl">
            <CoverSlot game={game} />
          </div>
          <h3 className="mt-4 line-clamp-2 text-lg font-bold text-[#0F172A] transition-colors group-hover:text-[#FF2A5F]">
            {game.title}
          </h3>
          {price !== null && (
            <p className="mt-2 text-base font-extrabold text-[#0F172A] tabular-nums">
              {formatCurrency(price)}
            </p>
          )}
          <p className="mt-1 text-xs text-[#475569]">
            {game.publisher?.name ?? 'Sin publisher'}
          </p>
        </Link>
      </article>
    );
  }

  return (
    <article className="product-card group flex flex-col justify-between rounded-2xl overflow-hidden bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] hover:-translate-y-0.5 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.07),0_2px_4px_-2px_rgba(15,23,42,0.05)] hover:shadow-[0_12px_24px_-4px_rgba(30,27,75,0.12)] transition-all duration-200 p-4">
      <Link to={`/games/${game.id}`} className="block relative overflow-hidden rounded-xl aspect-[16/10] bg-[#F4F4F6]">
        <CoverSlot game={game} />
        {game.genres?.[0] && (
          <span className="absolute top-2.5 left-2.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFC700] text-[#0F172A] shadow-sm">
            {game.genres[0].name}
          </span>
        )}
      </Link>

      <div className="mt-4 flex flex-col gap-2">
        <div className="space-y-1">
          <Link to={`/games/${game.id}`}>
            <h3 className="text-sm sm:text-base font-black text-[#0F172A] transition-colors group-hover:text-[#FF2A5F] line-clamp-1">
              {game.title}
            </h3>
          </Link>
          <div className="flex items-center justify-between text-xs text-[#475569]">
            <span className="truncate">{game.publisher?.name ?? 'Sin publisher'}</span>
            <span className="text-[11px] text-[#94A3B8]">{formatDate(game.releaseDate)}</span>
          </div>
        </div>

        <div className="pt-2.5 border-t border-[#E2E8F0] flex items-center justify-between">
          <div>
            {price !== null ? (
              <p className="text-sm sm:text-base font-black text-[#0F172A] tabular-nums">
                {formatCurrency(price)}
              </p>
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
