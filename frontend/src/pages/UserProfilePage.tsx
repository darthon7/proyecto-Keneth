import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { RatingStars } from '@/components/atoms/RatingStars';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, usersApi } from '@/api';
import { formatCurrency, formatDate } from '@/utils/format';

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);

  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.get(userId),
    enabled: Number.isFinite(userId),
  });

  if (userQuery.isLoading) return <Spinner label="Cargando perfil…" />;

  if (userQuery.isError) {
    return (
      <section className="page-container py-16">
        <ErrorBanner
          message={errorMessage(userQuery.error)}
          onRetry={() => void userQuery.refetch()}
        />
      </section>
    );
  }

  const user = userQuery.data;
  if (!user) return null;

  const libraries = user.userLibraries ?? [];
  const wishlists = user.wishlists ?? [];
  const reviews = user.reviews ?? [];
  const orders = user.orders ?? [];

  return (
    <section className="page-container py-16">
      <Link to="/users" className="text-body-sm font-medium text-[#475569] transition-colors hover:text-[#FF2A5F]">
        ← Volver a usuarios
      </Link>

      <header className="mt-6">
        <h1 className="text-heading-sm font-extrabold text-[#0F172A]">{user.username}</h1>
        <p className="mt-2 text-body-sm text-[#475569]">{user.email}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={user.isActive ? 'success' : 'neutral'}>
            {user.isActive ? 'Activo' : 'Inactivo'}
          </Badge>
          <Badge>{user.countryCode}</Badge>
          <span className="text-caption text-[#94A3B8]">
            Registrado el {formatDate(user.createdAt)}
          </span>
        </div>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-subheading font-extrabold text-[#0F172A]">Órdenes</h2>
          <div className="mt-4 flex flex-col gap-2">
            {orders.length === 0 && <p className="text-body-sm text-[#475569]">Sin órdenes.</p>}
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center justify-between gap-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] p-3 transition-colors hover:border-[#FF2A5F]"
              >
                <span className="text-body-sm font-bold text-[#0F172A]">{order.orderNumber}</span>
                <span className="text-body-sm font-semibold text-[#475569]">{formatCurrency(order.totalAmount)}</span>
              </Link>
            ))}
          </div>

          <h2 className="mt-10 text-subheading font-extrabold text-[#0F172A]">Biblioteca</h2>
          <div className="mt-4 flex flex-col gap-2">
            {libraries.length === 0 && <p className="text-body-sm text-[#475569]">Sin juegos en la biblioteca.</p>}
            {libraries.map((entry) => (
              <div key={entry.id} className="rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] p-3">
                <p className="text-body-sm font-bold text-[#0F172A]">
                  {entry.gameEdition?.game?.title ?? 'Videojuego'}
                </p>
                <p className="text-caption text-[#475569]">
                  {entry.gameEdition?.platform?.name} · {entry.gameEdition?.editionName}
                </p>
                {entry.isRevoked && <Badge tone="danger">Revocado</Badge>}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-subheading font-extrabold text-[#0F172A]">Wishlist</h2>
          <div className="mt-4 flex flex-col gap-2">
            {wishlists.length === 0 && <p className="text-body-sm text-[#475569]">Sin elementos.</p>}
            {wishlists.map((wish) => (
              <Link
                key={wish.id}
                to={`/games/${wish.game?.id}`}
                className="flex items-center justify-between gap-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] p-3 transition-colors hover:border-[#FF2A5F]"
              >
                <span className="text-body-sm font-bold text-[#0F172A]">{wish.game?.title ?? 'Videojuego'}</span>
                <span className="text-caption text-[#475569]">
                  {wish.notifyOnSale ? 'Aviso de oferta' : 'Sin aviso'}
                </span>
              </Link>
            ))}
          </div>

          <h2 className="mt-10 text-subheading font-extrabold text-[#0F172A]">Reseñas</h2>
          <div className="mt-4 flex flex-col gap-3">
            {reviews.length === 0 && <p className="text-body-sm text-[#475569]">Sin reseñas.</p>}
            {reviews.map((review) => (
              <article key={review.id} className="rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-body-sm font-bold text-[#0F172A]">{review.title}</h3>
                  <RatingStars value={review.rating} size={14} />
                </div>
                <p className="mt-1 text-body-sm text-[#475569]">{review.body}</p>
                <p className="mt-2 text-caption text-[#94A3B8]">
                  {review.game?.title} · {review.rating} de 5 estrellas
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
