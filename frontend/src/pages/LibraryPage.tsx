import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AccountHeroHeader } from '@/components/molecules/AccountHeroHeader';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, userLibrariesExtraApi } from '@/api';
import { useSession } from '@/context/SessionContext';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { formatDate } from '@/utils/format';

type LibraryFilter = 'all' | 'active' | 'revoked';

function maskLicenseCode(code: string): string {
  const trimmed = code.trim();
  if (trimmed.length <= 4) return '••••';
  return `••••-••••-••••-${trimmed.slice(-4)}`;
}

export function LibraryPage() {
  const { currentUser, isLoading: sessionLoading } = useSession();
  const [revealedIds, setRevealedIds] = useState<Set<number>>(() => new Set());
  const { copiedId, copy: copyLicenseCode } = useCopyFeedback<number>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LibraryFilter>('all');

  const libraryQuery = useQuery({
    queryKey: ['user-libraries', 'user', currentUser?.id],
    queryFn: () => userLibrariesExtraApi.byUser(currentUser!.id),
    enabled: Boolean(currentUser?.id),
  });

  const toggleReveal = (entryId: number) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  const entries = useMemo(() => libraryQuery.data ?? [], [libraryQuery.data]);

  const stats = useMemo(() => {
    const activeCount = entries.filter((entry) => !entry.isRevoked).length;
    return {
      total: entries.length,
      activeCount,
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return entries.filter((entry) => {
      if (statusFilter === 'active' && entry.isRevoked) return false;
      if (statusFilter === 'revoked' && !entry.isRevoked) return false;
      if (!normalized) return true;
      const haystack = [
        entry.gameEdition?.game?.title ?? '',
        entry.gameEdition?.editionName ?? '',
        entry.gameEdition?.platform?.name ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [entries, searchTerm, statusFilter]);

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

  return (
    <section
      data-testid="library-page"
      className="page-container min-h-[calc(100vh-14rem)] py-12 space-y-6"
    >
      <AccountHeroHeader
        eyebrow="Tu Colección Digital"
        title={`Biblioteca de ${currentUser.username}`}
        description="Accede a tus videojuegos adquiridos, consulta la plataforma de cada edición y gestiona tus claves digitales de activación."
        stats={[
          { label: 'Juegos', value: stats.total, tone: 'default' },
        ]}
        actions={
          <Link to="/games">
            <Button variant="brand" size="sm">Explorar tienda</Button>
          </Link>
        }
      />

      {/* Search & Status Filter Bar */}
      {entries.length > 0 && (
        <div className="flex flex-row items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-3 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <svg
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              maxLength={100}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar juego, edición o plataforma…"
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 py-2 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-[#FFFFFF] focus:border-[#FF2A5F] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: `Todos (${entries.length})` },
                { id: 'active', label: `Activos (${stats.activeCount})` },
                { id: 'revoked', label: `Revocados (${entries.length - stats.activeCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#1E1B4B] text-white'
                    : 'bg-[#F4F4F6] text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
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
            description="Compra un juego para que aparezca aquí con su clave de activación."
            action={
              <Link to="/games">
                <Button variant="brand">Explorar juegos</Button>
              </Link>
            }
          />
        )}

        {libraryQuery.isSuccess && entries.length > 0 && filteredEntries.length === 0 && (
          <EmptyState
            title="Sin coincidencias"
            description="Prueba con otro término de búsqueda o cambia el filtro de estado."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
              >
                Restablecer filtros
              </Button>
            }
          />
        )}

        <div className="grid grid-cols-4 gap-4">
          {filteredEntries.map((entry) => {
            const matchedItem = entry.order?.items?.find(
              (item) =>
                item.gameEdition?.id === entry.gameEdition?.id &&
                Boolean(item.digitalKey?.code),
            );
            const licenseCode = matchedItem?.digitalKey?.code ?? null;
            const isRevealed = revealedIds.has(entry.id);
            const isCopied = copiedId === entry.id;
            const game = entry.gameEdition?.game;

            return (
              <article
                key={entry.id}
                className="group rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <Link
                    to={game ? `/games/${game.id}` : '/library'}
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
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="rounded-md bg-[#0F122E]/85 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white border border-white/15">
                        {entry.gameEdition?.platform?.name ?? 'Digital'}
                      </span>
                    </div>
                    <div className="absolute top-2.5 right-2.5">
                      {entry.isRevoked ? (
                        <Badge tone="danger">Revocado</Badge>
                      ) : (
                        <Badge tone="success">Digital</Badge>
                      )}
                    </div>
                  </Link>

                  <div className="p-4 pb-2 space-y-1">
                    <h2 className="text-sm font-extrabold text-[#0F172A] line-clamp-1">
                      {game?.title ?? 'Videojuego'}
                    </h2>
                    <p className="text-xs font-medium text-[#475569] line-clamp-1">
                      {entry.gameEdition?.editionName}
                    </p>
                    <p className="text-[11px] text-[#94A3B8]">
                      Adquirido el {formatDate(entry.acquiredAt)}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-2 space-y-3">
                  {licenseCode ? (
                    <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-3 text-[#0F172A] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#475569]">
                          Clave de activación
                        </span>
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      </div>
                      <p
                        data-testid={`library-key-code-${entry.id}`}
                        className="font-mono text-xs font-bold tracking-wide text-[#0F172A] break-all select-all"
                      >
                        {isRevealed ? licenseCode : maskLicenseCode(licenseCode)}
                      </p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => toggleReveal(entry.id)}
                          className="flex-1 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] hover:bg-[#F4F4F6] hover:border-[#1E1B4B] px-2.5 py-1.5 text-[11px] font-bold text-[#0F172A] transition-colors cursor-pointer"
                        >
                          {isRevealed ? 'Ocultar' : 'Revelar clave'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void copyLicenseCode(entry.id, licenseCode, () =>
                              setRevealedIds((prev) => new Set(prev).add(entry.id)),
                            )
                          }
                          className="flex-1 rounded-lg bg-[#FF2A5F] hover:bg-[#E01E4F] px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors cursor-pointer"
                        >
                          {isCopied ? '¡Copiada!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  ) : entry.order ? (
                    <Link
                      to={`/orders/${entry.order.id}`}
                      className="block rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-center text-xs font-bold text-[#1E1B4B] hover:border-[#FF2A5F] hover:text-[#FF2A5F] transition-colors"
                    >
                      Ver clave en orden {entry.order.orderNumber} →
                    </Link>
                  ) : null}

                  {game && (
                    <Link
                      to={`/games/${game.id}`}
                      className="block w-full rounded-xl bg-[#F4F4F6] hover:bg-[#1E1B4B] py-2 text-center text-xs font-bold text-[#1E1B4B] hover:text-white transition-colors"
                    >
                      Ver ficha del juego →
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
