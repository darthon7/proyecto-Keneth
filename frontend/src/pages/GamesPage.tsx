import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { EmptyState } from '@/components/atoms/EmptyState';
import { Spinner } from '@/components/atoms/Spinner';
import { Pagination } from '@/components/molecules/Pagination';
import { GameFilters } from '@/components/molecules/GameFilters';
import type { GameFilterValues } from '@/components/molecules/GameFilters';
import { SearchBar } from '@/components/molecules/SearchBar';
import { GameGrid } from '@/components/organisms/GameGrid';
import {
  developersApi,
  errorMessage,
  gameEditionsApi,
  gamesApi,
  genresApi,
  platformsApi,
  publishersApi,
} from '@/api';

const PAGE_SIZE = 12;

export function GamesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

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

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set('q', value);
    else params.delete('q');
    setSearchParams(params);
    setPage(1);
  };

  return (
    <section className="page-container py-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-white">Videojuegos</h1>
          <p className="mt-2 text-body-sm text-fog">
            {gamesQuery.isSuccess ? `${filtered.length} títulos disponibles` : 'Cargando catálogo…'}
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/catalog/games')}>
          Administrar juegos
        </Button>
      </header>

      <div className="mt-8 max-w-3xl">
        <SearchBar
          onSearch={handleSearch}
          initialValue={term}
          placeholder="Busca por título, publisher o desarrolladora"
          actionLabel="Publica el tuyo"
          onAction={() => navigate('/catalog/games')}
        />
      </div>

      <div className="mt-8">
        <GameFilters
          value={filters}
          onChange={updateFilters}
          genres={genresQuery.data ?? []}
          platforms={platformsQuery.data ?? []}
          publishers={publishersQuery.data ?? []}
          developers={developersQuery.data ?? []}
          onReset={() => {
            setSearchParams(new URLSearchParams());
            setPage(1);
          }}
        />
      </div>

      <div className="mt-10">
        {gamesQuery.isLoading && <Spinner />}
        {gamesQuery.isError && (
          <ErrorBanner
            message={errorMessage(gamesQuery.error)}
            onRetry={() => void gamesQuery.refetch()}
          />
        )}
        {gamesQuery.isSuccess && visible.length === 0 && (
          <EmptyState
            title="Sin resultados"
            description="No encontramos videojuegos con esos filtros. Prueba con otros criterios."
          />
        )}
        {visible.length > 0 && <GameGrid games={visible} />}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
        className="mt-12"
      />
    </section>
  );
}
