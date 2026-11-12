import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { SectionHeader } from '@/components/atoms/SectionHeader';
import { Spinner } from '@/components/atoms/Spinner';
import { GameGrid } from '@/components/organisms/GameGrid';
import { HeroSection } from '@/components/organisms/HeroSection';
import { errorMessage, gamesApi, genresApi, platformsApi } from '@/api';

function releaseTime(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function HomePage() {
  const navigate = useNavigate();

  const gamesQuery = useQuery({
    queryKey: ['games'],
    queryFn: () => gamesApi.list(),
  });

  const genresQuery = useQuery({
    queryKey: ['genres'],
    queryFn: () => genresApi.list(),
  });

  const platformsQuery = useQuery({
    queryKey: ['platforms'],
    queryFn: () => platformsApi.list(),
  });

  const games = useMemo(() => gamesQuery.data ?? [], [gamesQuery.data]);
  const latest = useMemo(
    () =>
      [...games]
        .sort((a, b) => releaseTime(b.releaseDate) - releaseTime(a.releaseDate))
        .slice(0, 8),
    [games],
  );

  const handleSearch = (value: string) => {
    navigate(`/games${value ? `?q=${encodeURIComponent(value)}` : ''}`);
  };

  return (
    <>
      <HeroSection
        onExplore={() => navigate('/games')}
        onSearch={handleSearch}
        onPublish={() => navigate('/catalog/games')}
      />

      <section className="page-container">
        <SectionHeader
          title="Lo último en salir"
          description="Los títulos más recientes disponibles en El Pibes."
          action={
            <Link
              to="/games"
              className="text-body-sm font-semibold text-jade transition-colors hover:text-white"
            >
              Ver todo el catálogo
            </Link>
          }
        />

        <div className="mt-12">
          {gamesQuery.isLoading && <Spinner label="Cargando videojuegos…" />}
          {gamesQuery.isError && (
            <ErrorBanner
              message={errorMessage(gamesQuery.error)}
              onRetry={() => void gamesQuery.refetch()}
            />
          )}
          {gamesQuery.isSuccess && latest.length === 0 && (
            <div className="border-t border-white/10 pt-8">
              <p className="text-body text-mist">
                Aún no hay títulos publicados en El Pibes.
              </p>
            </div>
          )}
          {latest.length > 0 && <GameGrid games={latest} variant="typographic" />}
        </div>
      </section>

      <section className="mt-24 bg-bone text-obsidian">
        <div className="page-container grid gap-12 py-20 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="text-heading font-thin text-obsidian">
              Nunca dejes de jugar
            </h2>
            <p className="mt-4 max-w-md text-body text-obsidian/80">
              Tu biblioteca digital siempre a la mano: ediciones descargables,
              actualizaciones y codes listos para usar cuando los necesites.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Link to="/library">
                <Button variant="brand">Ver mi biblioteca</Button>
              </Link>
              <Link
                to="/catalog/editions"
                className="text-body-sm font-semibold text-forest transition-colors hover:text-forest-deep"
              >
                Explorar ediciones
              </Link>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <p className="text-body-sm text-obsidian/60">Géneros</p>
              <ul className="mt-4 flex flex-col gap-2">
                {(genresQuery.data ?? []).slice(0, 8).map((genre) => (
                  <li key={genre.id}>
                    <Link
                      to={`/games?genreId=${genre.id}`}
                      className="text-body-sm font-semibold text-forest transition-colors hover:text-forest-deep"
                    >
                      {genre.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-body-sm text-obsidian/60">Plataformas</p>
              <ul className="mt-4 flex flex-col gap-2">
                {(platformsQuery.data ?? []).slice(0, 6).map((platform) => (
                  <li key={platform.id}>
                    <Link
                      to={`/games?platformId=${platform.id}`}
                      className="text-body-sm font-semibold text-forest transition-colors hover:text-forest-deep"
                    >
                      {platform.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
