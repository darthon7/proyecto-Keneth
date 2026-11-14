import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AccountHeroHeader } from '@/components/molecules/AccountHeroHeader';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, wishlistsApi, wishlistsExtraApi } from '@/api';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { getActiveGameDiscount } from '@/utils/discount';
import { formatCurrency, formatDate } from '@/utils/format';

export function WishlistPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { currentUser, isLoading: sessionLoading } = useSession();
  const queryClient = useQueryClient();

  const wishlistQuery = useQuery({
    queryKey: ['wishlists', 'user', currentUser?.id],
    queryFn: () => wishlistsExtraApi.byUser(currentUser!.id),
    enabled: Boolean(currentUser?.id),
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

  const items = useMemo(() => wishlistQuery.data ?? [], [wishlistQuery.data]);

  const stats = useMemo(() => {
    const onSaleCount = items.filter(
      (wish) => wish.game && getActiveGameDiscount(wish.game).hasDiscount,
    ).length;
    const notifyCount = items.filter((wish) => wish.notifyOnSale).length;
    return {
      total: items.length,
      onSaleCount,
      notifyCount,
    };
  }, [items]);

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

  return (
    <section
      data-testid="wishlist-page"
      className="page-container min-h-[calc(100vh-14rem)] py-8 sm:py-12 space-y-6"
    >
      <AccountHeroHeader
        eyebrow="Seguimiento de Precios"
        title={`Wishlist de ${currentUser.username}`}
        description="Guarda tus títulos favoritos, detecta al instante cuando entran en oferta y añádelos al carrito con un clic."
        stats={[
          { label: 'Guardados', value: stats.total, tone: 'default' },
          { label: 'En oferta', value: stats.onSaleCount, tone: 'pink' },
          { label: 'Con aviso', value: stats.notifyCount, tone: 'gold' },
        ]}
        actions={
          <Link to="/games">
            <Button variant="brand" size="sm">Explorar catálogo</Button>
          </Link>
        }
      />

      <div>
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
            description="Explora el catálogo y guarda tus juegos favoritos desde la ficha de cada título."
            action={
              <Link to="/games">
                <Button variant="brand">Ver catálogo</Button>
              </Link>
            }
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((wish) => {
            const game = wish.game;
            const editions = game?.editions ?? [];
            const sortedEditions = [...editions].sort(
              (a, b) => Number(a.basePrice) - Number(b.basePrice),
            );
            const lowestEdition = sortedEditions[0] ?? null;
            const minPrice = lowestEdition ? Number(lowestEdition.basePrice) : null;
            const discount = game
              ? getActiveGameDiscount(game)
              : { hasDiscount: false, discountPercentage: 0 };
            const discountedPrice =
              minPrice !== null && discount.hasDiscount
                ? Number((minPrice * (1 - discount.discountPercentage / 100)).toFixed(2))
                : minPrice;

            return (
              <article
                key={wish.id}
                className="group rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <Link
                    to={game ? `/games/${game.id}` : '/games'}
                    className="relative block aspect-[16/9] w-full overflow-hidden bg-[#1E1B4B]"
                  >
                    {game?.coverImageUrl ? (
                      <img
                        src={game.coverImageUrl}
                        alt={game.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : null}
                    <div className="absolute top-2.5 left-2.5">
                      <Badge tone={wish.notifyOnSale ? 'blue' : 'neutral'}>
                        {wish.notifyOnSale ? 'Aviso activo' : 'Sin aviso'}
                      </Badge>
                    </div>
                    {discount.hasDiscount && (
                      <span className="absolute top-2.5 right-2.5 rounded-md bg-[#FF2A5F] px-2 py-0.5 text-[11px] font-black text-white shadow-sm">
                        OFERTA -{discount.discountPercentage}%
                      </span>
                    )}
                  </Link>

                  <div className="p-4 pb-2 space-y-1.5">
                    <Link
                      to={game ? `/games/${game.id}` : '/games'}
                      className="block text-base font-extrabold text-[#0F172A] hover:text-[#FF2A5F] line-clamp-1 transition-colors"
                    >
                      {game?.title ?? 'Videojuego'}
                    </Link>
                    <p className="text-xs text-[#475569]">
                      {game?.publisher?.name ?? 'Catálogo digital'} · Añadido el{' '}
                      {formatDate(wish.addedAt)}
                    </p>

                    {discountedPrice !== null && (
                      <div className="flex items-baseline gap-2 pt-1">
                        {discount.hasDiscount && minPrice !== null && (
                          <span className="text-xs font-medium text-[#94A3B8] line-through">
                            {formatCurrency(minPrice)}
                          </span>
                        )}
                        <span
                          className={`text-base font-black ${
                            discount.hasDiscount ? 'text-[#059669]' : 'text-[#0F172A]'
                          }`}
                        >
                          {formatCurrency(discountedPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-3 space-y-2.5">
                  {lowestEdition ? (
                    <button
                      type="button"
                      onClick={() => {
                        addItem(lowestEdition.id, 1);
                        navigate('/orders');
                      }}
                      className="w-full rounded-xl bg-[#FF2A5F] hover:bg-[#E01E4F] py-2.5 text-xs font-black uppercase tracking-wider text-white transition-colors cursor-pointer"
                    >
                      Comprar ahora
                    </button>
                  ) : (
                    game && (
                      <Link
                        to={`/games/${game.id}`}
                        className="block w-full rounded-xl bg-[#1E1B4B] hover:bg-[#FF2A5F] py-2.5 text-center text-xs font-black uppercase tracking-wider text-white transition-colors"
                      >
                        Ver ficha del juego
                      </Link>
                    )
                  )}

                  <div className="flex items-center justify-between gap-2 border-t border-[#E2E8F0] pt-2.5 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleNotifyMutation.mutate(wish)}
                      className="font-semibold text-[#475569] transition-colors hover:text-[#1E1B4B] cursor-pointer"
                    >
                      {wish.notifyOnSale ? 'Silenciar aviso' : 'Activar aviso'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(wish.id)}
                      className="font-bold text-[#EF4444] hover:text-[#991B1B] cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
