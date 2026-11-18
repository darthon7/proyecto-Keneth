import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { CoverSlot } from '@/components/atoms/CoverSlot';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Modal } from '@/components/atoms/Modal';
import { Spinner } from '@/components/atoms/Spinner';
import { GameFilters, type GameFilterValues, EMPTY_FILTERS } from '@/components/molecules/GameFilters';
import { Pagination } from '@/components/molecules/Pagination';
import { GameFormModal } from '@/components/organisms/GameFormModal';
import { GameStockModal } from '@/components/organisms/GameStockModal';
import {
  developersApi,
  errorMessage,
  gameEditionsApi,
  gamesApi,
  genresApi,
  platformsApi,
  publishersApi,
} from '@/api';
import type { Game } from '@/types';
import { getActiveGameDiscount } from '@/utils/discount';
import { countAvailableKeys, getMinBasePrice, isNintendoTitle } from '@/utils/domain';
import { formatCurrency, formatDate } from '@/utils/format';

const PAGE_SIZE = 12;

function getEffectiveMinPrice(game: Game): number | null {
  const minBase = getMinBasePrice(game);
  return minBase === null ? null : getActiveGameDiscount(game).computePrice(minBase);
}

export function GamesAdminPage({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [stockGameId, setStockGameId] = useState<number | null>(null);

  // Vista (tarjetas / tabla) y paginación
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<GameFilterValues>(EMPTY_FILTERS);

  const gamesQuery = useQuery({ queryKey: ['games'], queryFn: () => gamesApi.list() });
  const publishersQuery = useQuery({ queryKey: ['publishers'], queryFn: () => publishersApi.list() });
  const developersQuery = useQuery({ queryKey: ['developers'], queryFn: () => developersApi.list() });
  const genresQuery = useQuery({ queryKey: ['genres'], queryFn: () => genresApi.list() });
  const platformsQuery = useQuery({ queryKey: ['platforms'], queryFn: () => platformsApi.list() });
  const editionsQuery = useQuery({
    queryKey: ['game-editions'],
    queryFn: () => gameEditionsApi.list(),
  });

  const invalidateCatalogQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['games'] }),
      queryClient.invalidateQueries({ queryKey: ['game-editions'] }),
      queryClient.invalidateQueries({ queryKey: ['digital-keys'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'summary'] }),
    ]);
  };

  const deleteMutation = useMutation({
    mutationFn: (game: Game) => gamesApi.remove(game.id),
    onSuccess: async () => {
      await invalidateCatalogQueries();
      setGameToDelete(null);
    },
  });

  const gameIdsByPlatform = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const edition of editionsQuery.data ?? []) {
      const platformId = edition.platform?.id;
      const gameId = edition.game?.id;
      if (platformId === undefined || gameId === undefined) continue;
      const key = String(platformId);
      const bucket = map.get(key) ?? new Set<number>();
      bucket.add(gameId);
      map.set(key, bucket);
    }
    return map;
  }, [editionsQuery.data]);

  const rawGames = useMemo(() => gamesQuery.data ?? [], [gamesQuery.data]);

  const maxPrice = useMemo(() => {
    if (!filters.maxPrice) return null;
    const parsed = Number(filters.maxPrice);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [filters.maxPrice]);

  const filteredGames = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return rawGames.filter((game) => {
      if (normalized) {
        const haystack = [
          game.title,
          game.synopsis ?? '',
          game.publisher?.name ?? '',
          game.developer?.name ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(normalized)) return false;
      }

      if (filters.genreId && !(game.genres ?? []).some((genre) => String(genre.id) === filters.genreId)) {
        return false;
      }

      if (filters.developerId && String(game.developer?.id) !== filters.developerId) {
        return false;
      }

      if (filters.platformId) {
        const matchingGames = gameIdsByPlatform.get(filters.platformId);
        if (!matchingGames?.has(game.id)) return false;
      }

      if (maxPrice !== null) {
        const effectivePrice = getEffectiveMinPrice(game);
        if (effectivePrice === null || effectivePrice > maxPrice) return false;
      }

      return true;
    });
  }, [rawGames, searchTerm, filters, gameIdsByPlatform, maxPrice]);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleGames = filteredGames.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stockGame = useMemo(
    () => rawGames.find((game) => game.id === stockGameId) ?? null,
    [rawGames, stockGameId],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setPage(1);
  };

  return (
    <section className={embedded ? 'space-y-6' : 'page-container py-16'}>
      {/* Encabezado con estética consistente y botón de nuevo videojuego */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <span className="w-2 h-6 bg-[#FF2A5F] rounded-full shrink-0" />
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-[#0F172A]">
              Administrar videojuegos
            </h1>
            <p className="mt-0.5 text-body-sm text-[#475569]">
              Gestiona juegos, ediciones digitales y lotes de claves sin cambiar de pantalla.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de modo de vista: Tarjetas (tipo tienda) o Tabla */}
          <div className="inline-flex rounded-xl bg-[#F4F4F6] p-1 border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Vista de tienda (cuadrícula)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Tarjetas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Vista tabular clásica"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>Tabla</span>
            </button>
          </div>

          <Button
            variant="brand"
            data-testid="games-admin-create-btn"
            onClick={() => {
              setEditingGame(null);
              setIsModalOpen(true);
            }}
          >
            Nuevo videojuego
          </Button>
        </div>
      </header>

      {/* Barra compacta de búsqueda y filtros idéntica a la vista de tienda (Imagen 2) */}
      <section className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] px-3 py-2.5 shadow-xs flex flex-row items-center gap-2.5">
        <form onSubmit={handleSearchSubmit} className="w-72 shrink-0">
          <div className="relative flex items-center bg-[#F4F4F6] rounded-lg px-2.5 py-1.5 border border-[#E2E8F0] focus-within:bg-[#FFFFFF] focus-within:border-[#FF2A5F] focus-within:ring-2 focus-within:ring-[#FF2A5F]/20 transition-all">
            <svg
              className="w-3.5 h-3.5 text-[#94A3B8] mr-2 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              maxLength={100}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar título, estudio..."
              className="w-full bg-transparent text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
            />
            <button
              type="submit"
              className="ml-1.5 px-2.5 py-0.5 rounded-md bg-[#FF2A5F] hover:bg-[#E01E4F] text-[11px] font-bold text-white transition-colors shrink-0 cursor-pointer"
            >
              Buscar
            </button>
          </div>
        </form>

        <div className="w-px h-6 bg-[#E2E8F0] shrink-0" aria-hidden="true" />

        <GameFilters
          value={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
          genres={genresQuery.data ?? []}
          platforms={platformsQuery.data ?? []}
          developers={developersQuery.data ?? []}
          onReset={() => {
            setFilters(EMPTY_FILTERS);
            setSearchTerm('');
            setSearchInput('');
            setPage(1);
          }}
        />
      </section>

      {/* Contenido principal de videojuegos */}
      <div>
        {gamesQuery.isLoading && <Spinner label="Cargando videojuegos…" />}
        {gamesQuery.isError && (
          <ErrorBanner
            message={errorMessage(gamesQuery.error)}
            onRetry={() => void gamesQuery.refetch()}
          />
        )}
        {gamesQuery.isSuccess && filteredGames.length === 0 && (
          <EmptyState
            title="Sin videojuegos"
            description={
              rawGames.length === 0
                ? 'Crea el primer juego del catálogo.'
                : 'No encontramos videojuegos con esos filtros o criterios de búsqueda.'
            }
          />
        )}

        {/* Vista Cuadrícula de Tarjetas: Perspectiva compacta con 5 columnas visibles a simple vista */}
        {viewMode === 'cards' && visibleGames.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 gap-3">
            {visibleGames.map((game) => {
              const isPlaceholder = game.id <= 0;
              const editionsCount = game.editions?.length ?? 0;
              const availableKeys = (game.editions ?? []).reduce(
                (sum, edition) => sum + countAvailableKeys(edition),
                0,
              );
              const price = getMinBasePrice(game);
              const discount = getActiveGameDiscount(game);
              const discountedPrice = price !== null ? discount.computePrice(price) : null;
              const isNintendo = isNintendoTitle(game);

              return (
                <article
                  key={game.id}
                  className={`product-card group flex flex-col justify-between rounded-xl overflow-hidden bg-[#FFFFFF] border hover:border-[#FF2A5F] hover:-translate-y-0.5 shadow-xs hover:shadow-[0_8px_18px_-4px_rgba(30,27,75,0.12)] transition-all duration-200 p-2.5 ${
                    isPlaceholder ? 'border-amber-300 ring-1 ring-amber-200/60' : 'border-[#E2E8F0]'
                  }`}
                >
                  <div>
                    {/* Hueco de portada idéntico al catálogo de la tienda pero en formato compacto */}
                    <div className="relative overflow-hidden rounded-lg bg-[#F4F4F6]">
                      <CoverSlot game={game} className="!aspect-[4/3] !rounded-lg" />

                      {/* Badge de stock de administración en esquina superior izquierda */}
                      <div className="absolute top-1.5 left-1.5 z-10">
                        <Badge
                          tone={
                            isPlaceholder
                              ? 'neutral'
                              : editionsCount === 0 || availableKeys === 0
                                ? 'danger'
                                : availableKeys < 3
                                  ? 'warning'
                                  : 'success'
                          }
                          className="!text-[9px] !px-1.5 !py-0.5"
                        >
                          {isPlaceholder
                            ? 'Placeholder'
                            : `${editionsCount} ed. · ${availableKeys} claves`}
                        </Badge>
                      </div>

                      {/* Badge de oferta especial en esquina superior derecha si aplica */}
                      {discount.hasDiscount && (
                        <span
                          data-testid={`game-card-offer-badge-${game.id}`}
                          className="absolute top-1.5 right-1.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FF2A5F] text-white shadow-xs z-10"
                        >
                          -{discount.discountPercentage}%
                        </span>
                      )}
                    </div>

                    {/* Ficha de información: Título, publisher y fecha */}
                    <div className="mt-2 space-y-0.5">
                      <h3
                        className="text-xs sm:text-sm font-black text-[#0F172A] transition-colors group-hover:text-[#FF2A5F] line-clamp-1"
                        title={game.title}
                      >
                        {game.title}
                      </h3>
                      <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                        <span className="truncate font-medium text-[#475569]" title={game.publisher?.name ?? 'Sin publisher'}>
                          {game.publisher?.name ?? '—'}
                        </span>
                        {game.releaseDate && (
                          <span className="shrink-0 text-[10px] text-[#94A3B8]">
                            {formatDate(game.releaseDate)}
                          </span>
                        )}
                      </div>
                      {game.genres && game.genres.length > 0 && (
                        <p className="text-[10px] text-[#94A3B8] truncate">
                          {game.genres.map((g) => g.name).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Zona inferior: Precio a la izquierda, botón Editar a la derecha */}
                  <div className="mt-2 pt-2 border-t border-[#E2E8F0] space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <div>
                        {price !== null && discountedPrice !== null ? (
                          discount.hasDiscount ? (
                            <div className="flex items-baseline gap-1">
                              <span className="text-[10px] font-semibold text-[#94A3B8] line-through tabular-nums">
                                {formatCurrency(price)}
                              </span>
                              <span className="text-xs sm:text-sm font-black text-[#059669] tabular-nums">
                                {formatCurrency(discountedPrice)}
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm font-black text-[#0F172A] tabular-nums">
                              {formatCurrency(price)}
                            </p>
                          )
                        ) : (
                          <span className="text-[10px] text-[#94A3B8] font-semibold">Consultar</span>
                        )}
                      </div>

                      {/* Botón Editar que permite abrir el modal con los datos del videojuego o placeholder */}
                      <Button
                        variant={isNintendo ? 'nintendo' : 'brand'}
                        size="sm"
                        className="!px-2.5 !py-1 !text-xs !h-auto font-bold"
                        data-testid={`games-admin-edit-btn-${game.id}`}
                        onClick={() => {
                          setEditingGame(game);
                          setIsModalOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                    </div>

                    {/* Acciones operativas adicionales del panel de control de administrador */}
                    <div className="pt-1.5 border-t border-[#F1F5F9] flex items-center justify-between text-[10px]">
                      <button
                        type="button"
                        data-testid={`games-admin-stock-btn-${game.id}`}
                        onClick={() => setStockGameId(game.id)}
                        className="font-bold text-[#065F46] hover:text-[#10B981] transition-colors inline-flex items-center gap-0.5 cursor-pointer"
                      >
                        Stock y Claves
                      </button>
                      <button
                        type="button"
                        data-testid={`games-admin-delete-btn-${game.id}`}
                        onClick={() => setGameToDelete(game)}
                        className="font-semibold text-[#EF4444] hover:text-[#991B1B] transition-colors cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Vista Tabular clásica (disponible mediante selector de vista) */}
        {viewMode === 'table' && visibleGames.length > 0 && (
          <div className="overflow-x-auto rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-xs px-4 py-2">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                    Título
                  </th>
                  <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                    Publisher / Estudio
                  </th>
                  <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                    Ediciones / Stock Digital
                  </th>
                  <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                    Géneros
                  </th>
                  <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                    Lanzamiento
                  </th>
                  <th scope="col" className="px-3 py-3 text-right text-caption font-bold uppercase tracking-wider text-[#475569]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleGames.map((game) => {
                  const editionsCount = game.editions?.length ?? 0;
                  const availableKeys = (game.editions ?? []).reduce(
                    (sum, edition) => sum + countAvailableKeys(edition),
                    0,
                  );

                  return (
                    <tr key={game.id} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-3 py-3 text-body-sm font-semibold text-[#0F172A]">{game.title}</td>
                      <td className="px-3 py-3 text-body-sm text-[#475569]">
                        <div className="font-medium text-[#0F172A]">{game.publisher?.name ?? '—'}</div>
                        <div className="text-xs text-[#64748B]">{game.developer?.name ?? '—'}</div>
                      </td>
                      <td className="px-3 py-3 text-body-sm">
                        <Badge
                          tone={
                            editionsCount === 0 || availableKeys === 0
                              ? 'danger'
                              : availableKeys < 3
                                ? 'warning'
                                : 'success'
                          }
                        >
                          {editionsCount} ed. · {availableKeys} claves disp.
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-body-sm text-[#475569]">
                        {(game.genres ?? []).map((genre) => genre.name).join(', ') || '—'}
                      </td>
                      <td className="px-3 py-3 text-body-sm text-[#475569]">{formatDate(game.releaseDate)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            data-testid={`games-admin-stock-btn-${game.id}`}
                            onClick={() => setStockGameId(game.id)}
                            className="text-body-sm font-bold text-[#065F46] hover:text-[#10B981] btn-nintendo-animation cursor-pointer"
                          >
                            Stock y Claves
                          </button>
                          <button
                            type="button"
                            data-testid={`games-admin-edit-btn-${game.id}`}
                            onClick={() => {
                              setEditingGame(game);
                              setIsModalOpen(true);
                            }}
                            className="text-body-sm font-semibold text-[#1E1B4B] hover:text-[#FF2A5F] btn-nintendo-animation cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            data-testid={`games-admin-delete-btn-${game.id}`}
                            onClick={() => setGameToDelete(game)}
                            className="text-body-sm font-semibold text-[#EF4444] hover:text-[#991B1B] btn-nintendo-animation cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
          className="mt-8"
        />
      </div>

      {/* Modales de funcionalidad administrativa */}
      <GameFormModal
        isOpen={isModalOpen}
        editingGame={editingGame}
        publishers={publishersQuery.data ?? []}
        developers={developersQuery.data ?? []}
        genres={genresQuery.data ?? []}
        platforms={platformsQuery.data ?? []}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGame(null);
        }}
        onSaved={invalidateCatalogQueries}
      />

      <GameStockModal
        stockGame={stockGame}
        platforms={platformsQuery.data ?? []}
        onClose={() => setStockGameId(null)}
        onInvalidate={invalidateCatalogQueries}
      />

      <Modal
        isOpen={gameToDelete !== null}
        onClose={() => setGameToDelete(null)}
        title="Eliminar videojuego"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setGameToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              data-testid="games-admin-confirm-delete-btn"
              isLoading={deleteMutation.isPending}
              onClick={() => gameToDelete && deleteMutation.mutate(gameToDelete)}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-fog">
          Se eliminará «{gameToDelete?.title}» y sus datos relacionados no podrá deshacerse.
        </p>
        {deleteMutation.isError && (
          <div className="mt-4">
            <ErrorBanner message={errorMessage(deleteMutation.error)} />
          </div>
        )}
      </Modal>
    </section>
  );
}
