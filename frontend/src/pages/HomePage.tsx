import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Spinner } from '@/components/atoms/Spinner';
import { gamesApi, genresApi, platformsApi, promotionsApi, reviewsApi } from '@/api';
import { useCart } from '@/context/CartContext';
import { formatCurrency, formatDate } from '@/utils/format';
import { EditionFormat } from '@/types';
import type { Game, GameEdition, Genre, Platform, Promotion } from '@/types';

const GENRE_ACCENTS = [
  { border: 'border-cyan-400/25 hover:border-cyan-400/60', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  { border: 'border-purple-400/25 hover:border-purple-400/60', text: 'text-purple-300', dot: 'bg-purple-400' },
  { border: 'border-emerald-400/25 hover:border-emerald-400/60', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  { border: 'border-amber-400/25 hover:border-amber-400/60', text: 'text-amber-300', dot: 'bg-amber-400' },
  { border: 'border-sky-400/25 hover:border-sky-400/60', text: 'text-sky-300', dot: 'bg-sky-400' },
  { border: 'border-fuchsia-400/25 hover:border-fuchsia-400/60', text: 'text-fuchsia-300', dot: 'bg-fuchsia-400' },
];

function releaseTime(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getLowestEdition(game: Game): GameEdition | null {
  if (!game.editions || game.editions.length === 0) return null;
  const sorted = [...game.editions].sort((a, b) => {
    const priceA = Number(a.basePrice);
    const priceB = Number(b.basePrice);
    const safeA = Number.isFinite(priceA) ? priceA : Number.MAX_SAFE_INTEGER;
    const safeB = Number.isFinite(priceB) ? priceB : Number.MAX_SAFE_INTEGER;
    return safeA - safeB;
  });
  return sorted[0] ?? null;
}

function isNintendoTitle(game?: Game): boolean {
  if (!game) return false;
  return Boolean(
    game.publisher?.name?.toLowerCase().includes('nintendo') ||
      game.developer?.name?.toLowerCase().includes('nintendo') ||
      game.editions?.some(
        (edition) =>
          edition.platform?.name?.toLowerCase().includes('switch') ||
          edition.platform?.name?.toLowerCase().includes('nintendo'),
      ),
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [selectedEditionId, setSelectedEditionId] = useState<number | null>(null);
  const [rankingTab, setRankingTab] = useState<'new' | 'cheapest' | 'alpha' | 'all'>('new');
  const [addedGameId, setAddedGameId] = useState<number | null>(null);
  const [failedCoverIds, setFailedCoverIds] = useState<Set<number>>(() => new Set());

  const markCoverFailed = (gameId: number) => {
    setFailedCoverIds((prev) => {
      if (prev.has(gameId)) return prev;
      const next = new Set(prev);
      next.add(gameId);
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (addedTimerRef.current !== null) {
        clearTimeout(addedTimerRef.current);
      }
    };
  }, []);

  // Queries fetching real backend entities
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

  const promotionsQuery = useQuery({
    queryKey: ['promotions'],
    queryFn: () => promotionsApi.list(),
  });

  const reviewsQuery = useQuery({
    queryKey: ['reviews'],
    queryFn: () => reviewsApi.list(),
  });

  const games = useMemo(() => gamesQuery.data ?? [], [gamesQuery.data]);
  const genres = useMemo(() => genresQuery.data ?? [], [genresQuery.data]);
  const platforms = useMemo(() => platformsQuery.data ?? [], [platformsQuery.data]);
  const promotions = useMemo(() => promotionsQuery.data ?? [], [promotionsQuery.data]);
  const allReviews = useMemo(() => reviewsQuery.data ?? [], [reviewsQuery.data]);

  // Active promotions from backend
  const activePromotions = useMemo(() => {
    return promotions.filter((p) => p.isActive);
  }, [promotions]);

  const featuredGames = useMemo(() => {
    if (games.length === 0) return [];
    return [...games].slice(0, 5);
  }, [games]);

  // Resolve real Zelda catalog link if a Zelda game exists in the backend
  const zeldaTargetPath = useMemo(() => {
    const exactOcarina = games.find((g) => g.title.toLowerCase().includes('ocarina'));
    if (exactOcarina) return `/games/${exactOcarina.id}`;
    const anyZelda = games.find(
      (g) => g.title.toLowerCase().includes('zelda') || g.slug.toLowerCase().includes('zelda'),
    );
    if (anyZelda) return `/games/${anyZelda.id}`;
    return '/games';
  }, [games]);

  const safeSpotlightIndex =
    featuredGames.length > 0 ? Math.min(spotlightIndex, featuredGames.length - 1) : 0;
  const activeSpotlight: Game | undefined = featuredGames[safeSpotlightIndex];
  const isNintendoSpotlight = isNintendoTitle(activeSpotlight);

  // Selected edition for spotlight game
  const currentEdition: GameEdition | null = useMemo(() => {
    if (!activeSpotlight?.editions || activeSpotlight.editions.length === 0) return null;
    if (selectedEditionId !== null) {
      const match = activeSpotlight.editions.find((e) => e.id === selectedEditionId);
      if (match) return match;
    }
    return getLowestEdition(activeSpotlight);
  }, [activeSpotlight, selectedEditionId]);

  // Review statistics for active spotlight
  const spotlightReviewStats = useMemo(() => {
    if (!activeSpotlight) return null;
    const gameReviews = allReviews.filter((r) => r.game?.id === activeSpotlight.id);
    if (gameReviews.length === 0) return null;
    const positiveCount = gameReviews.filter((r) => r.rating >= 4).length;
    const percent = Math.round((positiveCount / gameReviews.length) * 100);
    const avg = (gameReviews.reduce((acc, r) => acc + r.rating, 0) / gameReviews.length).toFixed(1);
    return {
      total: gameReviews.length,
      percent,
      avg,
    };
  }, [activeSpotlight, allReviews]);

  const reviewStatsByGame = useMemo(() => {
    const map = new Map<number, { total: number; percent: number }>();
    const grouped = new Map<number, { total: number; positive: number }>();

    for (const review of allReviews) {
      const gameId = review.game?.id;
      if (typeof gameId !== 'number') continue;
      const entry = grouped.get(gameId) ?? { total: 0, positive: 0 };
      entry.total += 1;
      if (review.rating >= 4) entry.positive += 1;
      grouped.set(gameId, entry);
    }

    for (const [gameId, counts] of grouped.entries()) {
      map.set(gameId, {
        total: counts.total,
        percent: Math.round((counts.positive / counts.total) * 100),
      });
    }
    return map;
  }, [allReviews]);

  const handlePrevSpotlight = () => {
    if (featuredGames.length === 0) return;
    setSpotlightIndex((prev) => (prev - 1 + featuredGames.length) % featuredGames.length);
    setSelectedEditionId(null);
  };

  const handleNextSpotlight = () => {
    if (featuredGames.length === 0) return;
    setSpotlightIndex((prev) => (prev + 1) % featuredGames.length);
    setSelectedEditionId(null);
  };

  const handleAddToCart = (game: Game, edition?: GameEdition | null) => {
    const targetEdition = edition ?? getLowestEdition(game);
    if (targetEdition) {
      addItem(targetEdition.id, 1);
      setAddedGameId(game.id);
      if (addedTimerRef.current !== null) {
        clearTimeout(addedTimerRef.current);
      }
      addedTimerRef.current = setTimeout(() => {
        setAddedGameId(null);
        addedTimerRef.current = null;
      }, 2000);
    } else {
      navigate(`/games/${game.id}`);
    }
  };

  // Real ranked games based on active tab
  const rankedGames = useMemo(() => {
    if (games.length === 0) return [];
    const copy = [...games];
    switch (rankingTab) {
      case 'new':
        return copy.sort((a, b) => releaseTime(b.releaseDate) - releaseTime(a.releaseDate)).slice(0, 8);
      case 'cheapest':
        return copy
          .sort((a, b) => {
            const rawA = Number(getLowestEdition(a)?.basePrice);
            const rawB = Number(getLowestEdition(b)?.basePrice);
            const priceA = Number.isFinite(rawA) ? rawA : Number.MAX_SAFE_INTEGER;
            const priceB = Number.isFinite(rawB) ? rawB : Number.MAX_SAFE_INTEGER;
            return priceA - priceB;
          })
          .slice(0, 8);
      case 'alpha':
        return copy.sort((a, b) => a.title.localeCompare(b.title)).slice(0, 8);
      case 'all':
      default:
        return copy.slice(0, 8);
    }
  }, [games, rankingTab]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0B0C10] text-[#e1e2ec] font-sans antialiased selection:bg-cyan-400 selection:text-[#0B0C10]">
      {/* Subtle Controlled Dark Cyberpunk Ambient Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-36 left-1/4 w-[520px] h-[520px] bg-cyan-500/[0.06] rounded-full blur-[160px] -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[540px] -right-28 w-[460px] h-[460px] bg-purple-600/[0.06] rounded-full blur-[160px] -z-10"
      />

      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-14">
        {/* HERO BANNER PRINCIPAL: ZELDA OCARINA OF TIME PANORAMIC SPOTLIGHT */}
        <section
          aria-labelledby="hero-zelda-heading"
          data-testid="hero-zelda-banner"
          className="relative rounded-2xl overflow-hidden bg-[#12151E] border border-white/10 hover:border-cyan-400/35 shadow-[0_24px_60px_rgba(0,0,0,0.75)] transition-colors duration-300"
        >
          {/* Controlled Top HUD Accent */}
          <div
            aria-hidden="true"
            className="h-[2px] w-full bg-gradient-to-r from-cyan-400/80 via-purple-400/60 to-transparent"
          />

          {/* Panoramic Banner Artwork (exact crop hiding outer white canvas margins) */}
          <div className="relative w-full aspect-[916/246] overflow-hidden bg-[#0E1119]">
            <img
              src="/Banner__Zelda_Disponible_MVK-scaled.jpg"
              alt="The Legend of Zelda: Ocarina of Time — Ya Disponible"
              className="absolute max-w-none select-none pointer-events-none"
              style={{
                width: '111.79%',
                height: '142.28%',
                left: '-5.90%',
                top: '-21.14%',
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#12151E] via-transparent to-[#0B0C10]/20 pointer-events-none"
            />
          </div>

          {/* Integrated High-Conversion Action Bar */}
          <div className="px-5 sm:px-8 py-5 bg-[#12151E] border-t border-white/[0.07] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-cyan-400/10 text-cyan-300 border border-cyan-400/25 text-[10px] font-mono font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Destacado Oficial
                </span>
                {activePromotions[0] && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-400/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                    Promo Activa -{activePromotions[0].discountPercentage}%
                  </span>
                )}
              </div>

              <h1
                id="hero-zelda-heading"
                className="text-lg sm:text-2xl font-black text-white tracking-tight"
              >
                The Legend of Zelda: Ocarina of Time &amp; Colección Destacada
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
                Claves digitales de activación instantánea, ediciones de colección y catálogo verificado.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to="/catalog/promotions"
                className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/10 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Ver Ofertas
              </Link>

              <Link
                to={zeldaTargetPath}
                data-testid="hero-zelda-cta"
                className="px-6 py-2.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-[#0B0C10] shadow-[0_4px_18px_rgba(34,211,238,0.28)] hover:shadow-[0_8px_24px_rgba(34,211,238,0.45)] btn-nintendo-animation btn-nintendo-shine text-xs font-black uppercase tracking-wider inline-flex items-center gap-2"
              >
                <span>Explorar Catálogo</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Loading & Error States */}
        {gamesQuery.isLoading && (
          <div className="py-20 text-center">
            <Spinner label="Consultando videojuegos en la base de datos…" />
          </div>
        )}

        {gamesQuery.isError && (
          <ErrorBanner
            message="No se pudo cargar el catálogo de videojuegos. Comprueba la conexión con el servidor backend."
            onRetry={() => void gamesQuery.refetch()}
          />
        )}

        {/* SECTION 2: CATÁLOGO / GRID DE PRODUCTOS (ESTILO G2A / STEAM) */}
        {!gamesQuery.isLoading && !gamesQuery.isError && (
          <section aria-labelledby="catalog-grid-title" className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/[0.07] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-5 rounded-full bg-cyan-400" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">
                    Marketplace Digital
                  </span>
                </div>
                <h2
                  id="catalog-grid-title"
                  className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white"
                >
                  Catálogo de Videojuegos
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full lg:w-auto min-w-0">
                {/* Filter Buttons */}
                <div
                  role="group"
                  aria-label="Ordenar catálogo"
                  className="flex flex-wrap items-center gap-1 bg-[#12151E] p-1 rounded-xl border border-white/[0.08] text-xs font-bold max-w-full"
                >
                  {(
                    [
                      { key: 'new', label: 'Novedades' },
                      { key: 'cheapest', label: 'Más Económicos' },
                      { key: 'alpha', label: 'Alfabético' },
                      { key: 'all', label: 'Todos' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      aria-pressed={rankingTab === tab.key}
                      onClick={() => setRankingTab(tab.key)}
                      className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors whitespace-nowrap ${
                        rankingTab === tab.key
                          ? 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/30'
                          : 'text-slate-400 hover:text-white border border-transparent'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <Link
                  to="/games"
                  className="text-xs font-bold uppercase tracking-wider text-cyan-300 hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  <span>Ver todo</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            {rankedGames.length > 0 ? (
              <div
                data-testid="catalog-grid"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              >
                {rankedGames.map((game) => {
                  const lowest = getLowestEdition(game);
                  const reviewStats = reviewStatsByGame.get(game.id) ?? null;
                  const isNintendo = isNintendoTitle(game);
                  const isAdded = addedGameId === game.id;
                  const editionCount = game.editions?.length ?? 0;

                  const physicalStock = Number(lowest?.stockPhysical ?? 0);
                  const availabilityLabel = !lowest
                    ? 'CATÁLOGO'
                    : lowest.format === EditionFormat.DIGITAL
                      ? 'KEY DIGITAL'
                      : physicalStock > 0
                        ? `STOCK: ${physicalStock}`
                        : 'AGOTADO';

                  const availabilityStyle = !lowest
                    ? 'text-slate-300 border-white/15 bg-[#0B0C10]/80'
                    : lowest.format === EditionFormat.DIGITAL
                      ? 'text-cyan-300 border-cyan-400/35 bg-[#0B0C10]/85'
                      : physicalStock > 0
                        ? 'text-emerald-300 border-emerald-400/35 bg-[#0B0C10]/85'
                        : 'text-rose-300 border-rose-400/35 bg-[#0B0C10]/85';

                  return (
                    <article
                      key={game.id}
                      data-testid={`game-card-${game.id}`}
                      className="group flex flex-col justify-between rounded-2xl overflow-hidden bg-[#12151E] hover:bg-[#161B26] border border-white/[0.08] hover:border-cyan-400/40 shadow-[0_12px_32px_rgba(0,0,0,0.55)] hover:shadow-[0_18px_42px_rgba(0,0,0,0.75)] transition-all duration-300"
                    >
                      {/* Clean 16:10 Key-Art Header */}
                      <div>
                        <Link
                          to={`/games/${game.id}`}
                          className="relative block aspect-[16/10] w-full overflow-hidden bg-[#0E1118]"
                        >
                          {game.coverImageUrl && !failedCoverIds.has(game.id) ? (
                            <img
                              src={game.coverImageUrl}
                              alt={game.title}
                              loading="lazy"
                              onError={() => markCoverFailed(game.id)}
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#191F2E] to-[#0B0C10] px-4 text-center">
                              <span className="text-lg font-black uppercase tracking-widest text-slate-500">
                                {game.title.slice(0, 3)}
                              </span>
                            </div>
                          )}

                          {/* Bottom Subtle Edge Blend */}
                          <div
                            aria-hidden="true"
                            className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#12151E] to-transparent pointer-events-none"
                          />

                          {/* Top Micro-Badges */}
                          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-2 pointer-events-none">
                            {game.genres?.[0] ? (
                              <span className="px-2 py-0.5 rounded-md bg-[#0B0C10]/80 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-slate-200 border border-white/10 truncate max-w-[50%]">
                                {game.genres[0].name}
                              </span>
                            ) : (
                              <span />
                            )}

                            <span
                              className={`px-2 py-0.5 rounded-md backdrop-blur-md text-[10px] font-mono font-bold uppercase tracking-wider border ${availabilityStyle}`}
                            >
                              {availabilityLabel}
                            </span>
                          </div>
                        </Link>

                        {/* Product Info Hierarchy */}
                        <div className="px-4 pt-3 pb-2 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <Link to={`/games/${game.id}`} className="min-w-0 flex-1">
                              <h3 className="text-[15px] font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                                {game.title}
                              </h3>
                            </Link>

                            {reviewStats && (
                              <span
                                className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-400/25 text-[10px] font-bold text-emerald-300"
                                title={`${reviewStats.total} reseñas`}
                              >
                                ★ {reviewStats.percent}%
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                            <span className="truncate">
                              {game.developer?.name || game.publisher?.name || 'Estudio verificado'}
                            </span>
                            {game.esrbRating && (
                              <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-300">
                                {game.esrbRating}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="truncate">
                              {lowest ? lowest.editionName : 'Ficha informativa'}
                            </span>
                            {editionCount > 1 && (
                              <span className="shrink-0 text-purple-300 font-semibold">
                                +{editionCount - 1} ed.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Conversion Price & Action Footer */}
                      <div className="px-4 py-3.5 mt-1 border-t border-white/[0.06] bg-[#0F121A]/70 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                            {lowest ? 'Desde' : 'Precio'}
                          </p>
                          <p className="text-lg font-black text-emerald-400 tabular-nums leading-tight">
                            {lowest ? formatCurrency(lowest.basePrice) : 'Consultar'}
                          </p>
                        </div>

                        <button
                          type="button"
                          data-testid={`card-add-to-cart-${game.id}`}
                          onClick={() => handleAddToCart(game, lowest)}
                          className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 btn-nintendo-animation btn-nintendo-shine ${
                            isAdded
                              ? 'bg-emerald-400 text-[#0B0C10] shadow-[0_4px_16px_rgba(52,211,153,0.4)]'
                              : isNintendo
                                ? 'bg-[#e60012] hover:bg-[#ff1a1a] text-white shadow-[0_4px_14px_rgba(230,0,18,0.35)] hover:shadow-[0_8px_20px_rgba(230,0,18,0.5)]'
                                : 'bg-cyan-400 hover:bg-cyan-300 text-[#0B0C10] shadow-[0_4px_14px_rgba(34,211,238,0.24)] hover:shadow-[0_8px_20px_rgba(34,211,238,0.42)]'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.2}
                              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          <span>{isAdded ? '¡Listo!' : lowest ? 'Añadir' : 'Ver'}</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="p-10 rounded-2xl bg-[#12151E] border border-white/[0.08] text-center space-y-2">
                <p className="text-sm font-bold text-white">Aún no hay videojuegos registrados en el catálogo</p>
                <p className="text-xs text-slate-400">
                  Agrega títulos desde el módulo de gestión para verlos aquí.
                </p>
              </div>
            )}
          </section>
        )}

        {/* SECTION 3: DESTACADOS Y RECOMENDADOS (STEAM SPLIT SPOTLIGHT) */}
        {activeSpotlight && (
          <section aria-labelledby="hero-carousel-title" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-6 bg-purple-400 rounded-full" />
                <div>
                  <h2
                    id="hero-carousel-title"
                    className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white"
                  >
                    Destacados y Recomendados
                  </h2>
                  <p className="text-xs text-slate-400">
                    Comparativa rápida de ediciones, reseñas y disponibilidad
                  </p>
                </div>
              </div>

              {/* Carousel Controls */}
              {featuredGames.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevSpotlight}
                    aria-label="Juego anterior"
                    className="p-2 rounded-xl bg-[#161B26] text-slate-300 hover:text-white hover:bg-[#1E2535] btn-nintendo-animation border border-white/10"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="hidden sm:flex items-center gap-1.5 px-2">
                    {featuredGames.map((game, idx) => (
                      <button
                        key={game.id}
                        type="button"
                        onClick={() => {
                          setSpotlightIndex(idx);
                          setSelectedEditionId(null);
                        }}
                        aria-label={`Ver destacado ${game.title}`}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === safeSpotlightIndex
                            ? 'w-6 bg-cyan-400'
                            : 'w-2 bg-slate-700 hover:bg-slate-500'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextSpotlight}
                    aria-label="Siguiente juego"
                    className="p-2 rounded-xl bg-[#161B26] text-slate-300 hover:text-white hover:bg-[#1E2535] btn-nintendo-animation border border-white/10"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Split Spotlight Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden bg-[#12151E] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.75)] group">
              {/* Main Visual Column (Col 1-8) */}
              <div className="lg:col-span-8 relative min-h-[380px] lg:min-h-[460px] flex flex-col justify-between p-6 sm:p-8 overflow-hidden bg-[#0E1118]">
                {activeSpotlight.coverImageUrl && !failedCoverIds.has(activeSpotlight.id) ? (
                  <img
                    src={activeSpotlight.coverImageUrl}
                    alt={activeSpotlight.title}
                    onError={() => markCoverFailed(activeSpotlight.id)}
                    className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#161C2C] via-[#10131C] to-[#0B0C10]">
                    <p className="text-2xl font-black text-slate-500 tracking-wider uppercase">
                      {activeSpotlight.title}
                    </p>
                  </div>
                )}

                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-[#0B0C10]/65 to-[#0B0C10]/20"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-[#0B0C10]/85 via-transparent to-[#12151E]/90 hidden lg:block"
                />

                {/* Top Metatags */}
                <div className="relative z-10 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md bg-cyan-400 text-[#0B0C10] font-black">
                    Lanzamiento Destacado
                  </span>
                  <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#0B0C10]/75 backdrop-blur-md text-slate-100 border border-white/10 font-bold">
                    ESRB: {activeSpotlight.esrbRating || 'Pendiente'}
                  </span>
                  {activeSpotlight.developer && (
                    <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#0B0C10]/75 backdrop-blur-md text-cyan-300 border border-white/10 font-bold">
                      Desarrollo: {activeSpotlight.developer.name}
                    </span>
                  )}
                </div>

                {/* Bottom Info Area */}
                <div className="relative z-10 space-y-3 mt-auto max-w-xl">
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                    {activeSpotlight.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-200 line-clamp-2">
                    {activeSpotlight.synopsis || 'Sin descripción disponible para este título.'}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(activeSpotlight.genres ?? []).map((genre) => (
                      <Link
                        key={genre.id}
                        to={`/games?genreId=${genre.id}`}
                        className="text-xs px-2.5 py-1 rounded-lg bg-[#0B0C10]/70 hover:bg-cyan-400/20 text-slate-200 hover:text-cyan-200 border border-white/10 hover:border-cyan-400/40 transition-colors font-medium backdrop-blur-md"
                      >
                        {genre.name}
                      </Link>
                    ))}
                    {activeSpotlight.releaseDate && (
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-[#161B26]/90 text-slate-300 border border-white/10">
                        Lanzamiento: {formatDate(activeSpotlight.releaseDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Side Edition & Checkout Panel (Col 9-12) */}
              <div className="lg:col-span-4 bg-[#12151E] border-t lg:border-t-0 lg:border-l border-white/[0.08] flex flex-col justify-between p-6 sm:p-7 space-y-5">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Disponible en Catálogo
                    </span>
                    <h4 className="text-lg font-bold text-white">
                      {currentEdition?.editionName ?? 'Edición Principal'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {activeSpotlight.publisher
                        ? `Publisher oficial: ${activeSpotlight.publisher.name}`
                        : 'Publisher independiente'}
                      {currentEdition?.format ? ` · Formato ${currentEdition.format}` : ''}
                    </p>
                  </div>

                  {/* Dynamic Editions Selector */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                      Ediciones Registradas
                    </p>
                    {activeSpotlight.editions && activeSpotlight.editions.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {activeSpotlight.editions.map((edition) => {
                          const isSelected = (currentEdition?.id ?? 0) === edition.id;
                          return (
                            <button
                              key={edition.id}
                              type="button"
                              onClick={() => setSelectedEditionId(edition.id)}
                              className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#192030] border-cyan-400/70 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]'
                                  : 'bg-[#0E1118] border-white/[0.06] hover:border-white/20'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <p className="text-xs font-bold text-white truncate">
                                  {edition.editionName}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {edition.format} {edition.platform ? `· ${edition.platform.name}` : ''}
                                </p>
                              </div>
                              <span className="text-xs font-black text-emerald-400 tabular-nums shrink-0">
                                {formatCurrency(edition.basePrice)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-[#0E1118] text-xs text-slate-400 border border-white/[0.06]">
                        Sin ediciones registradas para este título
                      </div>
                    )}
                  </div>

                  {/* Reviews & Platforms */}
                  <div className="space-y-2 pt-3 border-t border-white/[0.06] text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Reseñas:</span>
                      {spotlightReviewStats ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          ★ {spotlightReviewStats.avg} · {spotlightReviewStats.percent}% positivas (
                          {spotlightReviewStats.total}{' '}
                          {spotlightReviewStats.total === 1 ? 'opinión' : 'opiniones'})
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">Sin reseñas registradas</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Plataformas:</span>
                      <div className="text-slate-300 font-medium truncate max-w-[190px]">
                        {activeSpotlight.editions && activeSpotlight.editions.length > 0 ? (
                          Array.from(
                            new Set(
                              activeSpotlight.editions
                                .map((e) => e.platform?.name)
                                .filter(Boolean),
                            ),
                          ).join(' · ') || 'Ver ficha'
                        ) : (
                          <span className="text-slate-500">A definir</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price and Action Module */}
                <div className="pt-4 border-t border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between bg-[#0B0C10]/70 p-3 rounded-xl border border-white/[0.07]">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-slate-400">Precio actual</p>
                      <p className="text-xl font-black text-emerald-400 tabular-nums">
                        {currentEdition ? formatCurrency(currentEdition.basePrice) : 'Consultar'}
                      </p>
                    </div>

                    <Link
                      to={`/games/${activeSpotlight.id}`}
                      className="text-xs text-cyan-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.07] transition-colors font-semibold"
                    >
                      Ver Ficha →
                    </Link>
                  </div>

                  <button
                    type="button"
                    data-testid="spotlight-add-to-cart"
                    onClick={() => handleAddToCart(activeSpotlight, currentEdition)}
                    className={`w-full py-3 px-4 rounded-full font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 btn-nintendo-animation btn-nintendo-shine ${
                      addedGameId === activeSpotlight.id
                        ? 'bg-emerald-400 text-[#0B0C10] shadow-[0_0_20px_rgba(52,211,153,0.45)]'
                        : isNintendoSpotlight
                          ? 'bg-[#e60012] hover:bg-[#ff1a1a] text-white shadow-[0_4px_14px_rgba(230,0,18,0.35)] hover:shadow-[0_8px_20px_rgba(230,0,18,0.5)]'
                          : 'bg-cyan-400 hover:bg-cyan-300 text-[#0B0C10] shadow-[0_4px_16px_rgba(34,211,238,0.28)] hover:shadow-[0_8px_24px_rgba(34,211,238,0.45)]'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <span>
                      {addedGameId === activeSpotlight.id ? '¡Añadido al Carrito!' : 'Agregar al Carrito'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 4: PROMOCIONES Y DESCUENTOS (100% DATABASE DRIVEN) */}
        <section aria-labelledby="promotions-title" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-5 bg-amber-400 rounded-full" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-300">
                  Campañas Activas
                </span>
              </div>
              <h2
                id="promotions-title"
                className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white"
              >
                Promociones y Descuentos
              </h2>
            </div>

            <Link
              to="/catalog/promotions"
              className="text-xs font-bold uppercase tracking-wider text-cyan-300 hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <span>Administrar promociones</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {activePromotions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activePromotions.map((promo: Promotion) => (
                <article
                  key={promo.id}
                  className="relative rounded-2xl overflow-hidden bg-[#12151E] border border-white/[0.08] hover:border-amber-400/40 p-6 shadow-xl flex flex-col justify-between space-y-5 transition-colors"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400/80 via-purple-400/40 to-transparent"
                  />

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black uppercase px-2.5 py-1 rounded-md bg-amber-400 text-[#0B0C10]">
                        -{promo.discountPercentage}% OFF
                      </span>
                      {promo.couponCode && (
                        <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#0B0C10] text-cyan-300 border border-cyan-400/25">
                          Cupón: {promo.couponCode}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white">{promo.name}</h3>
                    <p className="text-xs text-slate-400">
                      Válido desde {formatDate(promo.startDate)} hasta {formatDate(promo.endDate)}.
                    </p>
                  </div>

                  <Link
                    to="/games"
                    className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white font-bold text-xs uppercase tracking-wider text-center transition-colors"
                  >
                    Ver Juegos Aplicables
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#12151E] border border-white/[0.08] p-6 text-center space-y-2">
              <p className="text-sm font-bold text-white">No hay promociones activas en este momento</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Los títulos del catálogo están disponibles con su precio estándar. Puedes consultar todas las ediciones o crear una nueva promoción desde el panel de catálogo.
              </p>
              <div className="pt-2">
                <Link
                  to="/games"
                  className="inline-block px-4 py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 text-xs font-bold text-white transition-colors"
                >
                  Explorar Catálogo Completo
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 5: EXPLORAR POR GÉNERO */}
        <section aria-labelledby="genres-title" className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-5 bg-emerald-400 rounded-full" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300">
                  Categorías
                </span>
              </div>
              <h2
                id="genres-title"
                className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white"
              >
                Explorar por Género
              </h2>
            </div>

            <Link
              to="/catalog/genres"
              className="text-xs font-bold uppercase tracking-wider text-cyan-300 hover:text-white transition-colors"
            >
              Ver todos los géneros →
            </Link>
          </div>

          {genres.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {genres.slice(0, 6).map((genre: Genre, index: number) => {
                const accent = GENRE_ACCENTS[index % GENRE_ACCENTS.length] ?? GENRE_ACCENTS[0]!;
                const count = genre.games ? genre.games.length : null;

                return (
                  <Link
                    key={genre.id}
                    to={`/games?genreId=${genre.id}`}
                    className={`rounded-2xl p-4 flex flex-col justify-between h-36 bg-[#12151E] hover:bg-[#161B26] border ${accent.border} transition-colors group`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`w-2 h-2 rounded-full ${accent.dot}`} />
                      <span className="text-[10px] font-mono uppercase text-slate-500 group-hover:text-slate-300 transition-colors">
                        {genre.slug}
                      </span>
                    </div>

                    <div>
                      <h3 className={`text-sm font-black uppercase ${accent.text} line-clamp-1`}>
                        {genre.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {genre.description || (count !== null ? `${count} ${count === 1 ? 'juego' : 'juegos'}` : 'Explorar')}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#12151E] border border-white/[0.08] text-center text-xs text-slate-400">
              No hay géneros creados aún en la base de datos.
            </div>
          )}
        </section>

        {/* SECTION 6: PLATAFORMAS SOPORTADAS */}
        <section className="rounded-2xl overflow-hidden bg-[#12151E] border border-white/[0.08] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded bg-cyan-400/15 text-cyan-300 border border-cyan-400/25 font-bold tracking-widest">
                Compatibilidad
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">Plataformas Soportadas</h2>
              <p className="text-xs text-slate-400">
                Consulta los videojuegos agrupados por plataforma y ediciones de lanzamiento
              </p>
            </div>

            <Link
              to="/catalog/platforms"
              className="text-xs font-bold uppercase tracking-wider text-cyan-300 hover:text-white transition-colors"
            >
              Ver todas las plataformas →
            </Link>
          </div>

          {platforms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {platforms.map((platform: Platform) => (
                <Link
                  key={platform.id}
                  to={`/games?platformId=${platform.id}`}
                  className="p-4 rounded-xl bg-[#161B26] hover:bg-[#1B2230] border border-white/[0.06] hover:border-cyan-400/35 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {platform.iconUrl && (
                      <img
                        src={platform.iconUrl}
                        alt=""
                        aria-hidden="true"
                        className="w-5 h-5 object-contain shrink-0 opacity-85"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {platform.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">{platform.code}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {platform.editions?.length ? `${platform.editions.length} ed.` : 'Explorar'}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-[#161B26] border border-white/[0.06] text-center text-xs text-slate-400">
              No hay plataformas registradas en este momento.
            </div>
          )}

          <div className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              ¿Gestionas nuevos títulos o ediciones? Accede a los módulos de administración.
            </p>
            <div className="flex items-center gap-3">
              <Link
                to="/catalog/games"
                className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#0B0C10] font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Administrar Videojuegos
              </Link>
              <Link
                to="/library"
                className="px-4 py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Mi Biblioteca
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
