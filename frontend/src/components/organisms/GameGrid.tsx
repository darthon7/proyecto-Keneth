import type { Game } from '@/types';
import { GameCard } from '@/components/molecules/GameCard';

interface GameGridProps {
  games: Game[];
  onAddToCart?: (game: Game) => void;
  variant?: 'cover' | 'typographic';
}

export function GameGrid({ games, onAddToCart, variant = 'cover' }: GameGridProps) {
  const layout =
    variant === 'typographic'
      ? 'grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6';

  return (
    <div className={layout}>
      {games.map((game) => (
        <GameCard key={game.id} game={game} onAddToCart={onAddToCart} variant={variant} />
      ))}
    </div>
  );
}
