import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, userLibrariesExtraApi } from '@/api';
import { useSession } from '@/context/SessionContext';
import { formatDate } from '@/utils/format';

export function LibraryPage() {
  const { currentUser, isLoading: sessionLoading } = useSession();

  const libraryQuery = useQuery({
    queryKey: ['user-libraries', 'user', currentUser?.id],
    queryFn: () => userLibrariesExtraApi.byUser(currentUser!.id),
    enabled: Boolean(currentUser?.id),
  });

  if (sessionLoading) {
    return <Spinner label="Verificando sesión…" />;
  }

  if (!currentUser) {
    return (
      <section className="page-container py-16">
        <EmptyState
          title="Inicia sesión"
          description="Entra en tu cuenta desde la barra superior para ver tu biblioteca digital."
        />
      </section>
    );
  }

  const entries = libraryQuery.data ?? [];

  return (
    <section className="page-container py-16">
      <header>
        <h1 className="text-heading-sm font-extrabold text-[#0F172A]">Biblioteca de {currentUser.username}</h1>
        <p className="mt-2 text-body-sm text-[#475569]">
          Juegos adquiridos a través de órdenes completadas.
        </p>
      </header>

      <div className="mt-10">
        {libraryQuery.isLoading && <Spinner label="Cargando biblioteca…" />}
        {libraryQuery.isError && (
          <ErrorBanner
            message={errorMessage(libraryQuery.error)}
            onRetry={() => void libraryQuery.refetch()}
          />
        )}
        {libraryQuery.isSuccess && entries.length === 0 && (
          <EmptyState
            title="Biblioteca vacía"
            description="Compra un juego para que aparezca aquí."
            action={
              <Link
                to="/games"
                className="rounded-lg bg-[#FF2A5F] hover:bg-[#E01E4F] px-4 py-2 text-body-sm font-bold text-white transition-colors"
              >
                Explorar juegos
              </Link>
            }
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <article key={entry.id} className="product-card rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] p-4 shadow-xs transition-all">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-body font-bold text-[#0F172A]">
                  {entry.gameEdition?.game?.title ?? 'Videojuego'}
                </h2>
                {entry.isRevoked && <Badge tone="danger">Revocado</Badge>}
              </div>
              <p className="mt-1 text-body-sm text-[#475569]">
                {entry.gameEdition?.editionName} · {entry.gameEdition?.platform?.name}
              </p>
              <p className="mt-2 text-caption text-[#94A3B8]">
                Adquirido el {formatDate(entry.acquiredAt)}
              </p>
              {entry.gameEdition?.game && (
                <Link
                  to={`/games/${entry.gameEdition.game.id}`}
                  className="mt-3 inline-block text-body-sm font-semibold text-[#1E1B4B] hover:text-[#FF2A5F]"
                >
                  Ver ficha →
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
