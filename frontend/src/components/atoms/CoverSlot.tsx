import type { Game } from '@/types';

interface CoverSlotProps {
  game: Game;
  className?: string;
}

/**
 * Hueco de portada de una ficha: muestra la imagen del juego cuando existe y,
 * cuando no, deja el hueco de portada vacío.
 */
export function CoverSlot({ game, className = '' }: CoverSlotProps) {
  return (
    <div
      className={`relative aspect-square w-full overflow-hidden rounded-[18px] bg-[#141824] border border-white/5 ${className}`}
    >
      {game.coverImageUrl ? (
        <img
          src={game.coverImageUrl}
          alt={game.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : null}
    </div>
  );
}
