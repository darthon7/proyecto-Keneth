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
      <article className="group flex flex-col">
        <Link to={`/games/${game.id}`} className="flex flex-col">
          <CoverSlot game={game} />
          <h3 className="mt-5 line-clamp-2 text-subheading font-semibold text-white transition-colors group-hover:text-jade">
            {game.title}
          </h3>
          {price !== null && (
            <p className="mt-3 text-body-sm font-semibold text-white tabular-nums">
              {formatCurrency(price)}
            </p>
          )}
          <p className="mt-1 text-body-sm text-mist">
            {game.publisher?.name ?? 'Sin publisher'}
          </p>
        </Link>
      </article>
    );
  }

  return (
    <article className="group flex flex-col">
      <Link to={`/games/${game.id}`} className="block">
        <CoverSlot game={game} />
      </Link>

      <div className="mt-4 flex flex-col gap-1">
        <Link to={`/games/${game.id}`}>
          <h3 className="text-body-sm font-semibold text-white transition-colors group-hover:text-jade">
            {game.title}
          </h3>
        </Link>
        <p className="text-body-sm text-mist">{game.publisher?.name ?? 'Sin publisher'}</p>
        {price !== null && (
          <p className="text-body-sm font-semibold text-white tabular-nums">
            {formatCurrency(price)}
          </p>
        )}
        <p className="text-caption text-mist">{formatDate(game.releaseDate)}</p>
        {onAddToCart && (
          <button
            type="button"
            onClick={() => onAddToCart(game)}
            className="mt-1 self-start text-body-sm font-semibold text-jade transition-colors hover:text-white"
          >
            Comprar
          </button>
        )}
      </div>
    </article>
  );
}
