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
  { border: 'border-[#E2E8F0] hover:border-[#FF2A5F]', text: 'text-[#0F172A] group-hover:text-[#FF2A5F]', dot: 'bg-[#FF2A5F]' },
  { border: 'border-[#E2E8F0] hover:border-[#1E1B4B]', text: 'text-[#0F172A] group-hover:text-[#1E1B4B]', dot: 'bg-[#1E1B4B]' },
  { border: 'border-[#E2E8F0] hover:border-[#FFC700]', text: 'text-[#0F172A] group-hover:text-[#1E1B4B]', dot: 'bg-[#FFC700]' },
  { border: 'border-[#E2E8F0] hover:border-[#10B981]', text: 'text-[#0F172A] group-hover:text-[#065F46]', dot: 'bg-[#10B981]' },
  { border: 'border-[#E2E8F0] hover:border-[#0070D1]', text: 'text-[#0F172A] group-hover:text-[#0070D1]', dot: 'bg-[#0070D1]' },
  { border: 'border-[#E2E8F0] hover:border-[#E60012]', text: 'text-[#0F172A] group-hover:text-[#E60012]', dot: 'bg-[#E60012]' },
];

function getPlatformAccent(nameOrCode: string): string {
  const lower = nameOrCode.toLowerCase();
  if (lower.includes('nintendo') || lower.includes('switch')) {
    return 'bg-[#E60012] text-white';
  }
  if (lower.includes('playstation') || lower.includes('ps')) {
    return 'bg-[#0070D1] text-white';
  }
  if (lower.includes('xbox')) {
    return 'bg-[#107C10] text-white';
  }
  return 'bg-[#334155] text-white';
}

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

const ZELDA_BANNER_REMOTE_URL = 'https://media.vandal.net/i/1280x720/11-2026/20261128195549_1.jpg.webp';
const ZELDA_BANNER_FALLBACK_URL = '/Banner__Zelda_Ocarina_Vandal.webp';

export function HomePage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [selectedEditionId, setSelectedEditionId] = useState<number | null>(null);
  const [rankingTab, setRankingTab] = useState<'new' | 'cheapest' | 'alpha' | 'all'>('new');
  const [addedGameId, setAddedGameId] = useState<number | null>(null);
  const [failedCoverIds, setFailedCoverIds] = useState<Set<number>>(() => new Set());
  const [zeldaBannerSrc, setZeldaBannerSrc] = useState(ZELDA_BANNER_REMOTE_URL);

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
    <div className="relative min-h-screen overflow-x-hidden bg-[#F4F4F6] text-[#0F172A] font-sans antialiased selection:bg-[#FF2A5F] selection:text-white">
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-14">
        {/* HERO BANNER PRINCIPAL: ZELDA OCARINA OF TIME PANORAMIC SPOTLIGHT */}
        <section
          aria-labelledby="hero-zelda-heading"
          data-testid="hero-zelda-banner"
          className="relative rounded-2xl overflow-hidden bg-[#1E1B4B] border border-[#1E1B4B] hover:border-[#FF2A5F] shadow-[0_14px_34px_rgba(30,27,75,0.16)] transition-colors duration-300"
        >
          {/* Retro Pop Top Accent Hairline */}
          <div
            aria-hidden="true"
            className="h-[3px] w-full bg-gradient-to-r from-[#FF2A5F] via-[#FFC700] to-[#FF2A5F]"
          />

          {/* Panoramic Banner Artwork with Coordinate-Locked "YA DISPONIBLE" Lockup */}
          <div className="relative w-full overflow-hidden bg-[#0F122E] lg:h-[440px] flex items-center justify-center">
            {/* Ambient edge extension for wide viewports */}
            <img
              src={zeldaBannerSrc}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="hidden lg:block absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-80 brightness-75 select-none pointer-events-none"
            />
            <div
              aria-hidden="true"
              className="hidden lg:block absolute inset-0 bg-gradient-to-r from-[#1E1B4B]/70 via-transparent to-[#1E1B4B]/70 pointer-events-none"
            />

            {/* Coordinate-locked 16:9 visual stage */}
            <div className="relative w-full aspect-video lg:h-full lg:w-auto max-w-full shrink-0">
              <img
                src={zeldaBannerSrc}
                alt="The Legend of Zelda: Ocarina of Time — Ya Disponible"
                referrerPolicy="no-referrer"
                onError={() => {
                  if (zeldaBannerSrc !== ZELDA_BANNER_FALLBACK_URL) {
                    setZeldaBannerSrc(ZELDA_BANNER_FALLBACK_URL);
                  }
                }}
                className="w-full h-full object-cover select-none pointer-events-none lg:[mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)] lg:[-webkit-mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)]"
              />

              {/* Classic Zelda Gold Serif "YA DISPONIBLE" directly beneath the logo */}
              <div
                className="absolute left-[9.5%] w-[38%] top-[61%] flex justify-center pointer-events-none select-none"
                style={{ filter: 'drop-shadow(0 3px 10px rgba(0, 0, 0, 0.96))' }}
              >
                <span
                  className="font-serif font-semibold uppercase tracking-[0.12em] whitespace-nowrap bg-gradient-to-b from-[#FCE892] via-[#D8A634] to-[#946416] bg-clip-text text-transparent text-[clamp(0.7rem,2.45vw,1.5rem)] lg:text-[1.45rem]"
                  style={{ fontFamily: "Georgia, 'Palatino Linotype', 'Book Antiqua', serif" }}
                >
                  <span className="text-[1.22em]">Y</span>A{' '}
                  <span className="text-[1.22em]">D</span>ISPONIBLE
                </span>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#1E1B4B]/85 via-transparent to-[#1E1B4B]/20 pointer-events-none"
            />
          </div>

          {/* Integrated High-Conversion Action Bar (Retro Pop Indigo Contrast Zone) */}
          <div className="px-5 sm:px-8 py-5 bg-[#1E1B4B] border-t border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#FFC700] text-[#0F172A] text-[10px] font-mono font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF2A5F] animate-pulse" />
                  Destacado Oficial
                </span>
                {activePromotions[0] && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#10B981] text-[#0F172A] text-[10px] font-mono font-bold uppercase tracking-wider">
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
              <p className="text-xs sm:text-sm text-indigo-200 max-w-2xl">
                Claves digitales de activación instantánea, ediciones de colección y catálogo verificado.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to="/catalog/promotions"
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Ver Ofertas
              </Link>

              <Link
                to={zeldaTargetPath}
                data-testid="hero-zelda-cta"
                className="px-6 py-2.5 rounded-full bg-[#FF2A5F] hover:bg-[#E01E4F] text-white shadow-[0_4px_16px_rgba(255,42,95,0.35)] btn-nintendo-animation btn-nintendo-shine text-xs font-black uppercase tracking-wider inline-flex items-center gap-2"
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

        {/* SECTION 2: CATÁLOGO / GRID DE PRODUCTOS */}
        {!gamesQuery.isLoading && !gamesQuery.isError && (
          <section aria-labelledby="catalog-grid-title" className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E2E8F0] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-5 rounded-full bg-[#FF2A5F]" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF2A5F]">
                    Marketplace Digital
                  </span>
                </div>
                <h2
                  id="catalog-grid-title"
                  className="text-xl sm:text-2xl font-black uppercase tracking-wide text-[#0F172A]"
                >
                  Catálogo de Videojuegos
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full lg:w-auto min-w-0">
                {/* Filter Buttons */}
                <div
                  role="group"
                  aria-label="Ordenar catálogo"
                  className="flex flex-wrap items-center gap-1 bg-[#FFFFFF] p-1 rounded-xl border border-[#E2E8F0] text-xs font-bold max-w-full shadow-xs"
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
                          ? 'bg-[#1E1B4B] text-white border border-[#1E1B4B]'
                          : 'text-[#475569] hover:text-[#0F172A] border border-transparent'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <Link
                  to="/games"
                  className="text-xs font-bold uppercase tracking-wider text-[#1E1B4B] hover:text-[#FF2A5F] transition-colors inline-flex items-center gap-1"
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
                    ? 'text-[#475569] border-[#E2E8F0] bg-[#F4F4F6]/95'
                    : lowest.format === EditionFormat.DIGITAL
                      ? 'text-[#1E1B4B] border-[#C7D2FE] bg-[#EEF2FF]/95'
                      : physicalStock > 0
                        ? 'text-[#065F46] border-[#A7F3D0] bg-[#D1FAE5]/95'
                        : 'text-[#991B1B] border-[#FECACA] bg-[#FEE2E2]/95';

                  return (
                    <article
                      key={game.id}
                      data-testid={`game-card-${game.id}`}
                      className="product-card group flex flex-col justify-between rounded-2xl overflow-hidden bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] hover:-translate-y-0.5 shadow-[0_6px_18px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_28px_rgba(30,27,75,0.12)] transition-all duration-200"
                    >
                      {/* Clean 16:10 Key-Art Header (No dark invasive overlays over artwork) */}
                      <div>
                        <Link
                          to={`/games/${game.id}`}
                          className="relative block aspect-[16/10] w-full overflow-hidden bg-[#F4F4F6] border-b border-[#E2E8F0]"
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
                            <div className="w-full h-full flex flex-col items-center justify-center bg-[#F4F4F6] px-4 text-center">
                              <span className="text-lg font-black uppercase tracking-widest text-[#94A3B8]">
                                {game.title.slice(0, 3)}
                              </span>
                            </div>
                          )}

                          {/* Top Micro-Badges */}
                          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-2 pointer-events-none">
                            {game.genres?.[0] ? (
                              <span className="px-2 py-0.5 rounded-md bg-[#FFC700] text-[10px] font-extrabold uppercase tracking-wider text-[#0F172A] shadow-xs truncate max-w-[50%]">
                                {game.genres[0].name}
                              </span>
                            ) : (
                              <span />
                            )}

                            <span
                              className={`px-2 py-0.5 rounded-md backdrop-blur-sm text-[10px] font-mono font-bold uppercase tracking-wider border ${availabilityStyle}`}
                            >
                              {availabilityLabel}
                            </span>
                          </div>
                        </Link>

                        {/* Product Info Hierarchy */}
                        <div className="px-4 pt-3 pb-2 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <Link to={`/games/${game.id}`} className="min-w-0 flex-1">
                              <h3 className="text-[15px] font-extrabold text-[#0F172A] group-hover:text-[#FF2A5F] transition-colors line-clamp-1">
                                {game.title}
                              </h3>
                            </Link>

                            {reviewStats && (
                              <span
                                className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FFC700] text-[10px] font-black text-[#0F172A]"
                                title={`${reviewStats.total} reseñas`}
                              >
                                ★ {reviewStats.percent}%
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 text-xs text-[#475569]">
                            <span className="truncate">
                              {game.developer?.name || game.publisher?.name || 'Estudio verificado'}
                            </span>
                            {game.esrbRating && (
                              <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F4F4F6] border border-[#E2E8F0] text-[#475569] font-semibold">
                                {game.esrbRating}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                            <span className="truncate">
                              {lowest ? lowest.editionName : 'Ficha informativa'}
                            </span>
                            {editionCount > 1 && (
                              <span className="shrink-0 text-[#1E1B4B] font-bold">
                                +{editionCount - 1} ed.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Conversion Price & Action Footer */}
                      <div className="px-4 py-3.5 mt-1 border-t border-[#E2E8F0] bg-[#FFFFFF] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
                            {lowest ? 'Desde' : 'Precio'}
                          </p>
                          <p className="text-lg font-black text-[#0F172A] tabular-nums leading-tight">
                            {lowest ? formatCurrency(lowest.basePrice) : 'Consultar'}
                          </p>
                        </div>

                        <button
                          type="button"
                          data-testid={`card-add-to-cart-${game.id}`}
                          onClick={() => handleAddToCart(game, lowest)}
                          className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 btn-nintendo-animation btn-nintendo-shine ${
                            isAdded
                              ? 'bg-[#10B981] text-[#0F172A] shadow-[0_4px_14px_rgba(16,185,129,0.35)]'
                              : isNintendo
                                ? 'bg-[#E60012] hover:bg-[#cc0010] text-white shadow-[0_4px_14px_rgba(230,0,18,0.3)] hover:shadow-[0_8px_20px_rgba(230,0,18,0.45)]'
                                : 'bg-[#FF2A5F] hover:bg-[#E01E4F] text-white shadow-[0_4px_14px_rgba(255,42,95,0.28)] hover:shadow-[0_8px_20px_rgba(255,42,95,0.42)]'
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
              <div className="p-10 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] text-center space-y-2 shadow-xs">
                <p className="text-sm font-bold text-[#0F172A]">Aún no hay videojuegos registrados en el catálogo</p>
                <p className="text-xs text-[#475569]">
                  Agrega títulos desde el módulo de gestión para verlos aquí.
                </p>
              </div>
            )}
          </section>
        )}

        {/* SECTION 3: DESTACADOS Y RECOMENDADOS */}
        {activeSpotlight && (
          <section aria-labelledby="hero-carousel-title" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-6 bg-[#1E1B4B] rounded-full" />
                <div>
                  <h2
                    id="hero-carousel-title"
                    className="text-xl sm:text-2xl font-black uppercase tracking-wide text-[#0F172A]"
                  >
                    Destacados y Recomendados
                  </h2>
                  <p className="text-xs text-[#475569]">
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
                    className="p-2 rounded-xl bg-[#FFFFFF] text-[#475569] hover:text-[#0F172A] hover:border-[#FF2A5F] btn-nintendo-animation border border-[#E2E8F0] shadow-xs"
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
                            ? 'w-6 bg-[#FF2A5F]'
                            : 'w-2 bg-[#CBD5E1] hover:bg-[#94A3B8]'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextSpotlight}
                    aria-label="Siguiente juego"
                    className="p-2 rounded-xl bg-[#FFFFFF] text-[#475569] hover:text-[#0F172A] hover:border-[#FF2A5F] btn-nintendo-animation border border-[#E2E8F0] shadow-xs"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Split Spotlight Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden bg-[#FFFFFF] border border-[#E2E8F0] shadow-[0_10px_28px_rgba(15,23,42,0.08)] group">
              {/* Main Visual Column (Col 1-8) */}
              <div className="lg:col-span-8 relative min-h-[380px] lg:min-h-[460px] flex flex-col justify-between p-6 sm:p-8 overflow-hidden bg-[#1E1B4B]">
                {activeSpotlight.coverImageUrl && !failedCoverIds.has(activeSpotlight.id) ? (
                  <img
                    src={activeSpotlight.coverImageUrl}
                    alt={activeSpotlight.title}
                    onError={() => markCoverFailed(activeSpotlight.id)}
                    className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#1E1B4B]">
                    <p className="text-2xl font-black text-indigo-200 tracking-wider uppercase">
                      {activeSpotlight.title}
                    </p>
                  </div>
                )}

                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#1E1B4B]/95 via-[#1E1B4B]/55 to-[#1E1B4B]/20"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-[#1E1B4B]/80 via-transparent to-transparent hidden lg:block"
                />

                {/* Top Metatags */}
                <div className="relative z-10 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md bg-[#FFC700] text-[#0F172A] font-black">
                    Lanzamiento Destacado
                  </span>
                  <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#1E1B4B]/85 backdrop-blur-md text-white border border-white/20 font-bold">
                    ESRB: {activeSpotlight.esrbRating || 'Pendiente'}
                  </span>
                  {activeSpotlight.developer && (
                    <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#1E1B4B]/85 backdrop-blur-md text-[#FFC700] border border-white/20 font-bold">
                      Desarrollo: {activeSpotlight.developer.name}
                    </span>
                  )}
                </div>

                {/* Bottom Info Area */}
                <div className="relative z-10 space-y-3 mt-auto max-w-xl">
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                    {activeSpotlight.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-indigo-100 line-clamp-2">
                    {activeSpotlight.synopsis || 'Sin descripción disponible para este título.'}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(activeSpotlight.genres ?? []).map((genre) => (
                      <Link
                        key={genre.id}
                        to={`/games?genreId=${genre.id}`}
                        className="text-xs px-2.5 py-1 rounded-lg bg-[#1E1B4B]/80 hover:bg-[#FF2A5F] text-white border border-white/20 hover:border-[#FF2A5F] transition-colors font-medium backdrop-blur-md"
                      >
                        {genre.name}
                      </Link>
                    ))}
                    {activeSpotlight.releaseDate && (
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-[#1E1B4B]/85 text-indigo-100 border border-white/20">
                        Lanzamiento: {formatDate(activeSpotlight.releaseDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Side Edition & Checkout Panel (Col 9-12) */}
              <div className="lg:col-span-4 bg-[#FFFFFF] border-t lg:border-t-0 lg:border-l border-[#E2E8F0] flex flex-col justify-between p-6 sm:p-7 space-y-5">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#065F46] font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                      Disponible en Catálogo
                    </span>
                    <h4 className="text-lg font-extrabold text-[#0F172A]">
                      {currentEdition?.editionName ?? 'Edición Principal'}
                    </h4>
                    <p className="text-xs text-[#475569]">
                      {activeSpotlight.publisher
                        ? `Publisher oficial: ${activeSpotlight.publisher.name}`
                        : 'Publisher independiente'}
                      {currentEdition?.format ? ` · Formato ${currentEdition.format}` : ''}
                    </p>
                  </div>

                  {/* Dynamic Editions Selector */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#94A3B8]">
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
                                  ? 'bg-[#FFF1F2] border-[#FF2A5F] shadow-[0_0_0_1px_rgba(255,42,95,0.18)]'
                                  : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#1E1B4B]'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <p className="text-xs font-bold text-[#0F172A] truncate">
                                  {edition.editionName}
                                </p>
                                <p className="text-[10px] text-[#475569]">
                                  {edition.format} {edition.platform ? `· ${edition.platform.name}` : ''}
                                </p>
                              </div>
                              <span className="text-xs font-black text-[#0F172A] tabular-nums shrink-0">
                                {formatCurrency(edition.basePrice)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-[#F4F4F6] text-xs text-[#475569] border border-[#E2E8F0]">
                        Sin ediciones registradas para este título
                      </div>
                    )}
                  </div>

                  {/* Reviews & Platforms */}
                  <div className="space-y-2 pt-3 border-t border-[#E2E8F0] text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#475569]">Reseñas:</span>
                      {spotlightReviewStats ? (
                        <span className="px-2 py-0.5 rounded bg-[#FFC700] text-[#0F172A] font-bold flex items-center gap-1">
                          ★ {spotlightReviewStats.avg} · {spotlightReviewStats.percent}% positivas (
                          {spotlightReviewStats.total}{' '}
                          {spotlightReviewStats.total === 1 ? 'opinión' : 'opiniones'})
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] font-medium">Sin reseñas registradas</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#475569]">Plataformas:</span>
                      <div className="text-[#0F172A] font-semibold truncate max-w-[190px]">
                        {activeSpotlight.editions && activeSpotlight.editions.length > 0 ? (
                          Array.from(
                            new Set(
                              activeSpotlight.editions
                                .map((e) => e.platform?.name)
                                .filter(Boolean),
                            ),
                          ).join(' · ') || 'Ver ficha'
                        ) : (
                          <span className="text-[#94A3B8]">A definir</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price and Action Module */}
                <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between bg-[#F4F4F6] p-3 rounded-xl border border-[#E2E8F0]">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-[#475569]">Precio actual</p>
                      <p className="text-xl font-black text-[#0F172A] tabular-nums">
                        {currentEdition ? formatCurrency(currentEdition.basePrice) : 'Consultar'}
                      </p>
                    </div>

                    <Link
                      to={`/games/${activeSpotlight.id}`}
                      className="text-xs text-[#1E1B4B] hover:text-[#FF2A5F] px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] transition-colors font-bold"
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
                        ? 'bg-[#10B981] text-[#0F172A] shadow-[0_6px_18px_rgba(16,185,129,0.35)]'
                        : isNintendoSpotlight
                          ? 'bg-[#E60012] hover:bg-[#cc0010] text-white shadow-[0_4px_14px_rgba(230,0,18,0.3)] hover:shadow-[0_8px_20px_rgba(230,0,18,0.45)]'
                          : 'bg-[#FF2A5F] hover:bg-[#E01E4F] text-white shadow-[0_4px_16px_rgba(255,42,95,0.28)] hover:shadow-[0_8px_24px_rgba(255,42,95,0.42)]'
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

        {/* SECTION 4: PROMOCIONES Y DESCUENTOS */}
        <section aria-labelledby="promotions-title" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-5 bg-[#FFC700] rounded-full" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#1E1B4B]">
                  Campañas Activas
                </span>
              </div>
              <h2
                id="promotions-title"
                className="text-xl sm:text-2xl font-black uppercase tracking-wide text-[#0F172A]"
              >
                Promociones y Descuentos
              </h2>
            </div>

            <Link
              to="/catalog/promotions"
              className="text-xs font-bold uppercase tracking-wider text-[#1E1B4B] hover:text-[#FF2A5F] transition-colors inline-flex items-center gap-1"
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
                  className="product-card relative rounded-2xl overflow-hidden bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] hover:-translate-y-0.5 p-6 shadow-sm flex flex-col justify-between space-y-5 transition-all"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#FFC700] via-[#FF2A5F] to-[#1E1B4B]"
                  />

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black uppercase px-2.5 py-1 rounded-md bg-[#FFC700] text-[#0F172A]">
                        -{promo.discountPercentage}% OFF
                      </span>
                      {promo.couponCode && (
                        <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-[#F4F4F6] text-[#1E1B4B] border border-[#E2E8F0]">
                          Cupón: {promo.couponCode}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-extrabold text-[#0F172A]">{promo.name}</h3>
                    <p className="text-xs text-[#475569]">
                      Válido desde {formatDate(promo.startDate)} hasta {formatDate(promo.endDate)}.
                    </p>
                  </div>

                  <Link
                    to="/games"
                    className="w-full py-2.5 rounded-xl bg-[#1E1B4B] hover:bg-[#FF2A5F] text-white font-bold text-xs uppercase tracking-wider text-center transition-colors"
                  >
                    Ver Juegos Aplicables
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-6 text-center space-y-2 shadow-xs">
              <p className="text-sm font-bold text-[#0F172A]">No hay promociones activas en este momento</p>
              <p className="text-xs text-[#475569] max-w-md mx-auto">
                Los títulos del catálogo están disponibles con su precio estándar. Puedes consultar todas las ediciones o crear una nueva promoción desde el panel de catálogo.
              </p>
              <div className="pt-2">
                <Link
                  to="/games"
                  className="inline-block px-4 py-2 rounded-xl bg-[#F4F4F6] hover:bg-[#FF2A5F] border border-[#E2E8F0] hover:border-[#FF2A5F] text-xs font-bold text-[#0F172A] hover:text-white transition-colors"
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
                <span className="w-1.5 h-5 bg-[#10B981] rounded-full" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#065F46]">
                  Categorías
                </span>
              </div>
              <h2
                id="genres-title"
                className="text-xl sm:text-2xl font-black uppercase tracking-wide text-[#0F172A]"
              >
                Explorar por Género
              </h2>
            </div>

            <Link
              to="/catalog/genres"
              className="text-xs font-bold uppercase tracking-wider text-[#1E1B4B] hover:text-[#FF2A5F] transition-colors"
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
                    className={`product-card rounded-2xl p-4 flex flex-col justify-between h-36 bg-[#FFFFFF] border ${accent.border} hover:-translate-y-0.5 shadow-xs transition-all group`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`w-2.5 h-2.5 rounded-full ${accent.dot}`} />
                      <span className="text-[10px] font-mono uppercase text-[#94A3B8] group-hover:text-[#475569] transition-colors">
                        {genre.slug}
                      </span>
                    </div>

                    <div>
                      <h3 className={`text-sm font-black uppercase ${accent.text} transition-colors line-clamp-1`}>
                        {genre.name}
                      </h3>
                      <p className="text-[11px] text-[#475569] mt-0.5 line-clamp-1">
                        {genre.description || (count !== null ? `${count} ${count === 1 ? 'juego' : 'juegos'}` : 'Explorar')}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] text-center text-xs text-[#475569]">
              No hay géneros creados aún en la base de datos.
            </div>
          )}
        </section>

        {/* SECTION 6: PLATAFORMAS SOPORTADAS */}
        <section className="rounded-2xl overflow-hidden bg-[#FFFFFF] border border-[#E2E8F0] shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded bg-[#FFC700] text-[#0F172A] font-bold tracking-widest">
                Compatibilidad
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#0F172A]">Plataformas Soportadas</h2>
              <p className="text-xs text-[#475569]">
                Consulta los videojuegos agrupados por plataforma y ediciones de lanzamiento
              </p>
            </div>

            <Link
              to="/catalog/platforms"
              className="text-xs font-bold uppercase tracking-wider text-[#1E1B4B] hover:text-[#FF2A5F] transition-colors"
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
                  className="p-4 rounded-xl bg-[#F4F4F6] hover:bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {platform.iconUrl ? (
                      <img
                        src={platform.iconUrl}
                        alt=""
                        aria-hidden="true"
                        className="w-5 h-5 object-contain shrink-0"
                      />
                    ) : (
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${getPlatformAccent(platform.name || platform.code)}`}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0F172A] group-hover:text-[#FF2A5F] transition-colors truncate">
                        {platform.name}
                      </p>
                      <span
                        className={`inline-block mt-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${getPlatformAccent(platform.name || platform.code)}`}
                      >
                        {platform.code}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-[#475569] font-medium shrink-0">
                    {platform.editions?.length ? `${platform.editions.length} ed.` : 'Explorar'}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-[#F4F4F6] border border-[#E2E8F0] text-center text-xs text-[#475569]">
              No hay plataformas registradas en este momento.
            </div>
          )}

          <div className="pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-[#475569]">
              ¿Gestionas nuevos títulos o ediciones? Accede a los módulos de administración.
            </p>
            <div className="flex items-center gap-3">
              <Link
                to="/catalog/games"
                className="px-4 py-2 rounded-xl bg-[#FF2A5F] hover:bg-[#E01E4F] text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Administrar Videojuegos
              </Link>
              <Link
                to="/library"
                className="px-4 py-2 rounded-xl bg-[#F4F4F6] hover:bg-[#1E1B4B] border border-[#E2E8F0] text-[#0F172A] hover:text-white font-bold text-xs uppercase tracking-wider transition-colors"
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
