import { Link } from 'react-router-dom';
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

  if (variant === 'typographic') {
    return (
      <article className="group flex flex-col rounded-2xl overflow-hidden bg-[#161a24] hover:bg-[#1a202d] border border-white/10 hover:border-blue-400/30 shadow-lg hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)] transition-all duration-300 p-4">
        <Link to={`/games/${game.id}`} className="flex flex-col">
          <div className="overflow-hidden rounded-xl">
            <CoverSlot game={game} />
          </div>
          <h3 className="mt-4 line-clamp-2 text-lg font-bold text-white transition-colors group-hover:text-[#aec6ff]">
            {game.title}
          </h3>
          {price !== null && (
            <p className="mt-2 text-base font-extrabold text-emerald-400 tabular-nums">
              {formatCurrency(price)}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            {game.publisher?.name ?? 'Sin publisher'}
          </p>
        </Link>
      </article>
    );
  }

  return (
    <article className="group flex flex-col justify-between rounded-2xl overflow-hidden bg-[#161a24] hover:bg-[#1c2230] border border-white/10 hover:border-blue-400/40 shadow-xl hover:shadow-[0_16px_36px_rgba(0,0,0,0.7)] transition-all duration-300 hover:-translate-y-1 p-4">
      <Link to={`/games/${game.id}`} className="block relative overflow-hidden rounded-xl aspect-[16/10] bg-black/40">
        <CoverSlot game={game} />
        {game.genres?.[0] && (
          <span className="absolute top-2.5 left-2.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/75 backdrop-blur-md text-[#aec6ff] border border-white/10">
            {game.genres[0].name}
          </span>
        )}
      </Link>

      <div className="mt-4 flex flex-col gap-2">
        <div className="space-y-1">
          <Link to={`/games/${game.id}`}>
            <h3 className="text-sm sm:text-base font-black text-white transition-colors group-hover:text-[#aec6ff] line-clamp-1">
              {game.title}
            </h3>
          </Link>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="truncate">{game.publisher?.name ?? 'Sin publisher'}</span>
            <span className="text-[11px] text-slate-500">{formatDate(game.releaseDate)}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
          <div>
            {price !== null ? (
              <p className="text-sm sm:text-base font-black text-emerald-400 tabular-nums">
                {formatCurrency(price)}
              </p>
            ) : (
              <span className="text-xs text-slate-500 font-semibold">Consultar</span>
            )}
          </div>

          {onAddToCart && (
            <button
              type="button"
              onClick={() => onAddToCart(game)}
              className="py-1.5 px-3 rounded-lg bg-[#4f8eff] hover:bg-blue-400 text-[#00275e] hover:text-black text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-sm flex items-center gap-1.5"
            >
              Comprar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
