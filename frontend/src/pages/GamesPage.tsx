import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { EmptyState } from '@/components/atoms/EmptyState';
import { Spinner } from '@/components/atoms/Spinner';
import { Button } from '@/components/atoms/Button';
import { Pagination } from '@/components/molecules/Pagination';
import { GameFilters } from '@/components/molecules/GameFilters';
import type { GameFilterValues } from '@/components/molecules/GameFilters';
import { GameCard } from '@/components/molecules/GameCard';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { getActiveGameDiscount } from '@/utils/discount';
import {
  developersApi,
  errorMessage,
  gameEditionsApi,
  gamesApi,
  genresApi,
  platformsApi,
} from '@/api';
import type { Game } from '@/types';

const PAGE_SIZE = 12;

function getEffectiveMinPrice(game: Game): number | null {
  const prices = (game.editions ?? [])
    .map((edition) => Number(edition.basePrice))
    .filter((price) => Number.isFinite(price));
  if (prices.length === 0) return null;
  const minBase = Math.min(...prices);
  return getActiveGameDiscount(game).computePrice(minBase);
}

export function GamesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isAdmin } = useSession();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '');

  const maxPriceParam = searchParams.get('maxPrice');
  const parsedMaxPrice = maxPriceParam ? Number(maxPriceParam) : null;
  const maxPrice =
    parsedMaxPrice !== null && Number.isFinite(parsedMaxPrice) && parsedMaxPrice > 0
      ? parsedMaxPrice
      : null;

  const filters: GameFilterValues = {
    genreId: searchParams.get('genreId') ?? '',
    platformId: searchParams.get('platformId') ?? '',
    maxPrice: maxPrice !== null ? String(maxPrice) : '',
    developerId: searchParams.get('developerId') ?? '',
  };
  const term = searchParams.get('q') ?? '';

  const gamesQuery = useQuery({ queryKey: ['games'], queryFn: () => gamesApi.list() });
  const genresQuery = useQuery({ queryKey: ['genres'], queryFn: () => genresApi.list() });
  const platformsQuery = useQuery({ queryKey: ['platforms'], queryFn: () => platformsApi.list() });
  const developersQuery = useQuery({ queryKey: ['developers'], queryFn: () => developersApi.list() });
  const editionsQuery = useQuery({
    queryKey: ['game-editions'],
    queryFn: () => gameEditionsApi.list(),
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

  const filtered = useMemo(() => {
    const games = gamesQuery.data ?? [];
    const normalized = term.trim().toLowerCase();

    return games.filter((game) => {
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
  }, [gamesQuery.data, term, filters, gameIdsByPlatform, maxPrice]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const updateFilters = (next: GameFilterValues) => {
    const params = new URLSearchParams(searchParams);
    for (const key of Object.keys(next) as (keyof GameFilterValues)[]) {
      if (next[key]) params.set(key, next[key]);
      else params.delete(key);
    }
    setSearchParams(params);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput.trim()) params.set('q', searchInput.trim());
    else params.delete('q');
    setSearchParams(params);
    setPage(1);
  };

  const handleAddToCart = (game: Game) => {
    const firstEdition = game.editions?.[0];
    if (firstEdition) {
      addItem(firstEdition.id, 1);
    } else {
      navigate(`/games/${game.id}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F4F4F6] text-[#0F172A] font-sans antialiased py-5 sm:py-6">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-5">
        {/* Header Strip */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <span className="w-2 h-5 bg-[#FF2A5F] rounded-full" />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-[#0F172A]">
                Catálogo de Videojuegos
              </h1>
              <p className="text-xs text-[#475569]">
                {gamesQuery.isSuccess
                  ? `${filtered.length} títulos disponibles en la plataforma`
                  : 'Cargando catálogo…'}
              </p>
            </div>
          </div>

          {isAdmin && (
            <Button
              variant="brand"
              size="sm"
              onClick={() => navigate('/admin/games')}
              className="self-start sm:self-auto uppercase tracking-wider font-black"
            >
              Administrar Juegos
            </Button>
          )}
        </header>

        {/* Compact Search & Filters Toolbar */}
        <section className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] px-3 py-2.5 shadow-sm flex flex-col xl:flex-row xl:items-center gap-2.5">
          <form onSubmit={handleSearchSubmit} className="xl:w-72 shrink-0">
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
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar título, estudio..."
                className="w-full bg-transparent text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
              />
              <button
                type="submit"
                className="ml-1.5 px-2.5 py-0.5 rounded-md bg-[#FF2A5F] hover:bg-[#E01E4F] text-[11px] font-bold text-white transition-colors shrink-0"
              >
                Buscar
              </button>
            </div>
          </form>

          <div className="hidden xl:block w-px h-6 bg-[#E2E8F0] shrink-0" aria-hidden="true" />

          <GameFilters
            value={filters}
            onChange={updateFilters}
            genres={genresQuery.data ?? []}
            platforms={platformsQuery.data ?? []}
            developers={developersQuery.data ?? []}
            onReset={() => {
              setSearchParams(new URLSearchParams());
              setSearchInput('');
              setPage(1);
            }}
          />
        </section>

        {/* Content Section */}
        <section className="space-y-6">
          {gamesQuery.isLoading && (
            <div className="py-24 text-center">
              <Spinner label="Sincronizando catálogo con la base de datos…" />
            </div>
          )}

          {gamesQuery.isError && (
            <ErrorBanner
              message={errorMessage(gamesQuery.error)}
              onRetry={() => void gamesQuery.refetch()}
            />
          )}

          {gamesQuery.isSuccess && visible.length === 0 && (
            <EmptyState
              title="Sin resultados"
              description="No encontramos videojuegos con esos filtros. Prueba con otros criterios de búsqueda."
            />
          )}

          {visible.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {visible.map((game) => (
                <GameCard key={game.id} game={game} onAddToCart={handleAddToCart} />
              ))}
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-12"
          />
        </section>
      </div>
    </div>
  );
}
