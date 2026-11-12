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
  const { currentUser } = useSession();

  const libraryQuery = useQuery({
    queryKey: ['user-libraries', 'user', currentUser?.id],
    queryFn: () => userLibrariesExtraApi.byUser(currentUser!.id),
    enabled: Boolean(currentUser?.id),
  });

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
        <h1 className="text-heading-sm font-semibold text-white">Biblioteca de {currentUser.username}</h1>
        <p className="mt-2 text-body-sm text-fog">
          Juegos acquisitionados a través de órdenes completadas.
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
                className="rounded-[4px] bg-white px-4 py-2 text-body-sm font-bold text-obsidian"
              >
                Explorar juegos
              </Link>
            }
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <article key={entry.id} className="rounded-[4px] bg-graphite p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-body font-semibold text-white">
                  {entry.gameEdition?.game?.title ?? 'Videojuego'}
                </h2>
                {entry.isRevoked && <Badge tone="danger">Revocado</Badge>}
              </div>
              <p className="mt-1 text-body-sm text-fog">
                {entry.gameEdition?.editionName} · {entry.gameEdition?.platform?.name}
              </p>
              <p className="mt-2 text-caption text-mid-gray">
                Adquirido el {formatDate(entry.acquiredAt)}
              </p>
              {entry.gameEdition?.game && (
                <Link
                  to={`/games/${entry.gameEdition.game.id}`}
                  className="mt-3 inline-block text-body-sm font-semibold text-signal-blue hover:text-white"
                >
                  Ver ficha
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
