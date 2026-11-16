import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Spinner } from '@/components/atoms/Spinner';
import { GameCard } from '@/components/molecules/GameCard';
import { errorMessage, gamesApi } from '@/api';
import { useCart } from '@/context/CartContext';
import type { Game } from '@/types';
import { getActiveGameDiscount } from '@/utils/discount';
import { getLowestEdition } from '@/utils/domain';

export function PromotionsPublicPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();

  const gamesQuery = useQuery({
    queryKey: ['games'],
    queryFn: () => gamesApi.list(),
  });

  const campaignGames = useMemo(
    () =>
      (gamesQuery.data ?? [])
        .filter((game) => getActiveGameDiscount(game).hasDiscount)
        .sort(
          (a, b) =>
            getActiveGameDiscount(b).discountPercentage -
            getActiveGameDiscount(a).discountPercentage,
        ),
    [gamesQuery.data],
  );

  const handleQuickAdd = (game: Game) => {
    const lowest = getLowestEdition(game);
    if (!lowest) {
      navigate(`/games/${game.id}`);
      return;
    }
    addItem(lowest.id, 1);
    navigate('/orders');
  };

  return (
    <section data-testid="promotions-public-page" className="page-container py-8 space-y-8">
      {/* Videojuegos en Campaña de Descuento */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black uppercase tracking-wide text-[#0F172A]">
              Juegos en Descuento
            </h1>
            <p className="text-xs text-[#475569]">
              {gamesQuery.isSuccess
                ? `${campaignGames.length} títulos disponibles con precio especial de oferta.`
                : 'Todos los títulos con precio especial de oferta.'}
            </p>
          </div>
        </div>

        {gamesQuery.isLoading && <Spinner label="Cargando juegos en campaña…" />}
        {gamesQuery.isError && (
          <ErrorBanner
            message={errorMessage(gamesQuery.error)}
            onRetry={() => void gamesQuery.refetch()}
          />
        )}

        {gamesQuery.isSuccess && campaignGames.length === 0 && (
          <EmptyState
            title="Sin juegos en campaña de descuento activa"
            description="Un administrador puede asignar descuentos de campaña a múltiples títulos desde el Panel de Control."
            action={
              <Link to="/games">
                <Button variant="brand" size="sm">Ver catálogo completo</Button>
              </Link>
            }
          />
        )}

        {campaignGames.length > 0 && (
          <div
            data-testid="promotions-campaign-games-grid"
            className="grid grid-cols-5 gap-3.5"
          >
            {campaignGames.map((game) => (
              <GameCard key={game.id} game={game} onAddToCart={handleQuickAdd} compact />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
