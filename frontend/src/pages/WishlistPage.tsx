import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, gamesApi, wishlistsApi, wishlistsExtraApi } from '@/api';
import { useSession } from '@/context/SessionContext';
import { formatDate } from '@/utils/format';

export function WishlistPage() {
  const { currentUser, isLoading: sessionLoading } = useSession();
  const queryClient = useQueryClient();
  const [gameId, setGameId] = useState('');
  const [notifyOnSale, setNotifyOnSale] = useState(true);

  const wishlistQuery = useQuery({
    queryKey: ['wishlists', 'user', currentUser?.id],
    queryFn: () => wishlistsExtraApi.byUser(currentUser!.id),
    enabled: Boolean(currentUser?.id),
  });

  const gamesQuery = useQuery({ queryKey: ['games'], queryFn: () => gamesApi.list() });

  const addMutation = useMutation({
    mutationFn: () =>
      wishlistsApi.create({
        userId: currentUser!.id,
        gameId: Number(gameId),
        notifyOnSale,
      }),
    onSuccess: async () => {
      setGameId('');
      await queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => wishlistsApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    },
  });

  const toggleNotifyMutation = useMutation({
    mutationFn: (wish: { id: number; notifyOnSale: boolean }) =>
      wishlistsApi.update(wish.id, { notifyOnSale: !wish.notifyOnSale }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    },
  });

  if (sessionLoading) {
    return <Spinner label="Verificando sesión…" />;
  }

  if (!currentUser) {
    return (
      <section className="page-container py-16">
        <EmptyState
          title="Inicia sesión"
          description="Entra en tu cuenta desde la barra superior para gestionar tu lista de deseos."
        />
      </section>
    );
  }

  const items = wishlistQuery.data ?? [];

  return (
    <section className="page-container py-16">
      <header>
        <h1 className="text-heading-sm font-extrabold text-[#0F172A]">
          Wishlist de {currentUser.username}
        </h1>
        <p className="mt-2 text-body-sm text-[#475569]">
          Guarda tus títulos favoritos y recibe avisos cuando haya ofertas.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-end gap-4 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-4 shadow-xs">
        <div className="min-w-[240px] flex-1">
          <Select
            label="Añadir videojuego"
            name="gameId"
            value={gameId}
            onChange={(event) => setGameId(event.target.value)}
            placeholder="Selecciona un juego"
            options={(gamesQuery.data ?? []).map((game) => ({
              value: game.id,
              label: game.title,
            }))}
          />
        </div>
        <label className="flex items-center gap-2 pb-3 text-body-sm font-medium text-[#0F172A]">
          <input
            type="checkbox"
            checked={notifyOnSale}
            onChange={(event) => setNotifyOnSale(event.target.checked)}
            className="h-4 w-4 accent-[#FF2A5F]"
          />
          Avisarme de ofertas
        </label>
        <Button
          variant="brand"
          disabled={!gameId}
          isLoading={addMutation.isPending}
          onClick={() => addMutation.mutate()}
        >
          Añadir
        </Button>
      </div>

      {addMutation.isError && (
        <div className="mt-4">
          <ErrorBanner message={errorMessage(addMutation.error)} />
        </div>
      )}

      <div className="mt-10">
        {wishlistQuery.isLoading && <Spinner label="Cargando wishlist…" />}
        {wishlistQuery.isError && (
          <ErrorBanner
            message={errorMessage(wishlistQuery.error)}
            onRetry={() => void wishlistQuery.refetch()}
          />
        )}
        {wishlistQuery.isSuccess && items.length === 0 && (
          <EmptyState
            title="Wishlist vacía"
            description="Añade tu primer videojuego desde el selector de arriba."
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((wish) => (
            <article key={wish.id} className="product-card rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] p-4 shadow-xs transition-all">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-body font-bold text-[#0F172A]">
                  {wish.game?.title ?? 'Videojuego'}
                </h2>
                <Badge tone={wish.notifyOnSale ? 'blue' : 'neutral'}>
                  {wish.notifyOnSale ? 'Aviso activo' : 'Sin aviso'}
                </Badge>
              </div>
              <p className="mt-1 text-body-sm text-[#475569]">
                {wish.game?.publisher?.name ?? 'Sin publisher'}
              </p>
              <p className="mt-2 text-caption text-[#94A3B8]">
                Añadido el {formatDate(wish.addedAt)}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                {wish.game && (
                  <Link
                    to={`/games/${wish.game.id}`}
                    className="text-body-sm font-semibold text-[#1E1B4B] hover:text-[#FF2A5F]"
                  >
                    Ver ficha
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => toggleNotifyMutation.mutate(wish)}
                  className="text-body-sm text-[#475569] transition-colors hover:text-[#0F172A]"
                >
                  {wish.notifyOnSale ? 'Desactivar aviso' : 'Activar aviso de ofertas'}
                </button>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(wish.id)}
                  className="text-body-sm font-semibold text-[#EF4444] hover:text-[#991B1B]"
                >
                  Quitar
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
