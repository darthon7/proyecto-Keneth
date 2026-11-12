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

const PAGE_SIZE = 12;

export function GamesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '');

  const filters: GameFilterValues = {
    genreId: searchParams.get('genreId') ?? '',
    platformId: searchParams.get('platformId') ?? '',
    publisherId: searchParams.get('publisherId') ?? '',
    developerId: searchParams.get('developerId') ?? '',
  };
  const term = searchParams.get('q') ?? '';

  const gamesQuery = useQuery({ queryKey: ['games'], queryFn: () => gamesApi.list() });
  const genresQuery = useQuery({ queryKey: ['genres'], queryFn: () => genresApi.list() });
  const platformsQuery = useQuery({ queryKey: ['platforms'], queryFn: () => platformsApi.list() });
  const publishersQuery = useQuery({ queryKey: ['publishers'], queryFn: () => publishersApi.list() });
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

      if (filters.publisherId && String(game.publisher?.id) !== filters.publisherId) {
        return false;
      }

      if (filters.developerId && String(game.developer?.id) !== filters.developerId) {
        return false;
      }

      if (filters.platformId) {
        const matchingGames = gameIdsByPlatform.get(filters.platformId);
        if (!matchingGames?.has(game.id)) return false;
      }

      return true;
    });
  }, [gamesQuery.data, term, filters, gameIdsByPlatform]);

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
    <div className="relative min-h-screen bg-[#0b0e15] text-[#e1e2ec] font-sans antialiased py-10">
      {/* Ambient background glow blobs */}
      <div className="absolute top-10 left-1/3 w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-96 -right-20 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none -z-10" />

      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Strip */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-6 bg-blue-400 rounded-full shadow-[0_0_12px_#60a5fa]" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
                Catálogo de Videojuegos
              </h1>
              <p className="text-xs text-slate-400">
                {gamesQuery.isSuccess
                  ? `${filtered.length} títulos disponibles en la plataforma`
                  : 'Cargando catálogo…'}
              </p>
            </div>
          </div>

          <Button
            variant="brand"
            size="sm"
            onClick={() => navigate('/catalog/games')}
            className="self-start sm:self-auto uppercase tracking-wider font-black"
          >
            Administrar Juegos
          </Button>
        </header>

        {/* Search & Filters Card */}
        <section className="bg-[#141824] rounded-2xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-6">
          <form onSubmit={handleSearchSubmit} className="relative max-w-2xl">
            <div className="relative flex items-center bg-[#1c2232] rounded-xl px-4 py-2.5 border border-white/10 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/30 transition-all">
              <svg
                className="w-4 h-4 text-slate-400 mr-3 shrink-0"
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
                placeholder="Busca por título, publisher o desarrolladora..."
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="ml-2 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
              >
                Buscar
              </button>
            </div>
          </form>

          {/* Filters Selects */}
          <div className="border-t border-white/5 pt-4">
            <GameFilters
              value={filters}
              onChange={updateFilters}
              genres={genresQuery.data ?? []}
              platforms={platformsQuery.data ?? []}
              publishers={publishersQuery.data ?? []}
              developers={developersQuery.data ?? []}
              onReset={() => {
                setSearchParams(new URLSearchParams());
                setSearchInput('');
                setPage(1);
              }}
            />
          </div>
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
