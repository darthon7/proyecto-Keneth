import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Spinner } from '@/components/atoms/Spinner';
import { VideoShowcaseSection } from '@/components/molecules/VideoShowcaseSection';
import { BudgetSection } from '@/components/molecules/BudgetSection';
import { gamesApi, promotionsApi } from '@/api';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { formatCurrency, formatDate } from '@/utils/format';
import { getActiveGameDiscount } from '@/utils/discount';
import { KeyStatus } from '@/types';
import type { Game, GameEdition, Promotion } from '@/types';

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
const GTA6_BANNER_URL = '/banner-gta-6.jpg';
const CASTLEVANIA_BANNER_URL = '/banner-castlevania.jpg';
const HERO_SLIDE_INTERVAL_MS = 5000;
const EXTRA_HERO_SLIDES = [
  { index: 1, src: GTA6_BANNER_URL, alt: 'Grand Theft Auto VI' },
  { index: 2, src: CASTLEVANIA_BANNER_URL, alt: "Castlevania: Belmont's Curse" },
] as const;
const HERO_SLIDE_COUNT = 1 + EXTRA_HERO_SLIDES.length;

export function HomePage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { currentUser } = useSession();
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [rankingTab, setRankingTab] = useState<'new' | 'cheapest' | 'alpha' | 'all'>('new');
  const [addedGameId, setAddedGameId] = useState<number | null>(null);
  const [copiedCouponId, setCopiedCouponId] = useState<number | null>(null);
  const [failedCoverIds, setFailedCoverIds] = useState<Set<number>>(() => new Set());
  const [zeldaBannerSrc, setZeldaBannerSrc] = useState(ZELDA_BANNER_REMOTE_URL);
  const [heroSlide, setHeroSlide] = useState(0);

  const handleCopyCoupon = async (promoId: number, code: string) => {
    try {
      await navigator.clipboard?.writeText(code);
      setCopiedCouponId(promoId);
      setTimeout(() => {
        setCopiedCouponId((current) => (current === promoId ? null : current));
      }, 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const markCoverFailed = (gameId: number) => {
    setFailedCoverIds((prev) => {
      if (prev.has(gameId)) return prev;
      const next = new Set(prev);
      next.add(gameId);
      return next;
    });
  };

  const prevHeroSlide = () => {
    setHeroSlide((prev) => (prev - 1 + HERO_SLIDE_COUNT) % HERO_SLIDE_COUNT);
  };

  const nextHeroSlide = () => {
    setHeroSlide((prev) => (prev + 1) % HERO_SLIDE_COUNT);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % HERO_SLIDE_COUNT);
    }, HERO_SLIDE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [heroSlide]);

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

  const promotionsQuery = useQuery({
    queryKey: ['promotions', currentUser?.id],
    queryFn: () => promotionsApi.list(),
  });

  const games = useMemo(() => gamesQuery.data ?? [], [gamesQuery.data]);
  const promotions = useMemo(() => promotionsQuery.data ?? [], [promotionsQuery.data]);

  // Active promotions from backend
  const activePromotions = useMemo(() => {
    return promotions.filter((p) => p.isActive);
  }, [promotions]);

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
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-14">
        {/* HERO BANNER PRINCIPAL: ZELDA OCARINA OF TIME PANORAMIC SPOTLIGHT */}
        <section
          aria-labelledby="hero-zelda-heading"
          data-testid="hero-zelda-banner"
          className="relative rounded-2xl overflow-hidden bg-[#1E1B4B] border border-[#1E1B4B] shadow-[0_14px_34px_rgba(30,27,75,0.16)]"
        >
          <h1 id="hero-zelda-heading" className="sr-only">
            El Pibes — Tienda de Videojuegos y Catálogo Destacado
          </h1>
          {/* Retro Pop Top Accent Hairline */}
          <div
            aria-hidden="true"
            className="h-[3px] w-full bg-gradient-to-r from-[#FF2A5F] via-[#FFC700] to-[#FF2A5F]"
          />

          {/* Panoramic Banner Carousel (Zelda Ocarina of Time <-> GTA VI every 5s) */}
          <div className="relative w-full overflow-hidden bg-[#0F122E] aspect-video lg:aspect-auto lg:h-[440px]">
            {/* Slide 0: Zelda Ocarina of Time */}
            <div
              aria-hidden={heroSlide !== 0}
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
                heroSlide === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={zeldaBannerSrc}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                className="hidden lg:block absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-80 brightness-75 select-none pointer-events-none hero-backdrop-motion"
              />
              <div
                aria-hidden="true"
                className="hidden lg:block absolute inset-0 bg-gradient-to-r from-[#1E1B4B]/70 via-transparent to-[#1E1B4B]/70 pointer-events-none"
              />

              <div className="relative w-full aspect-video lg:h-full lg:w-auto max-w-full shrink-0 overflow-hidden">
                <img
                  src={zeldaBannerSrc}
                  alt="The Legend of Zelda: Ocarina of Time — Ya Disponible"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    if (zeldaBannerSrc !== ZELDA_BANNER_FALLBACK_URL) {
                      setZeldaBannerSrc(ZELDA_BANNER_FALLBACK_URL);
                    }
                  }}
                  className="w-full h-full object-cover select-none pointer-events-none hero-motion-0 lg:[mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)] lg:[-webkit-mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)]"
                />

                {/* Classic Zelda Gold Serif "YA DISPONIBLE" directly beneath the logo */}
                <div
                  aria-hidden="true"
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
            </div>

            {/* Slides 1..N: Grand Theft Auto VI & Castlevania: Belmont's Curse */}
            {EXTRA_HERO_SLIDES.map((slide) => (
              <div
                key={slide.index}
                aria-hidden={heroSlide !== slide.index}
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
                  heroSlide === slide.index ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <img
                  src={slide.src}
                  alt=""
                  aria-hidden="true"
                  className="hidden lg:block absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-80 brightness-75 select-none pointer-events-none hero-backdrop-motion"
                />
                <div
                  aria-hidden="true"
                  className="hidden lg:block absolute inset-0 bg-gradient-to-r from-[#1E1B4B]/70 via-transparent to-[#1E1B4B]/70 pointer-events-none"
                />

                <div className="relative w-full aspect-video lg:h-full lg:w-auto max-w-full shrink-0 overflow-hidden">
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    className={`w-full h-full object-cover select-none pointer-events-none hero-motion-${slide.index} lg:[mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)] lg:[-webkit-mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)]`}
                  />
                </div>
              </div>
            ))}

            <div
              aria-hidden="true"
              className="absolute inset-0 z-20 bg-gradient-to-t from-[#1E1B4B]/85 via-transparent to-[#1E1B4B]/20 pointer-events-none"
            />

            {/* Directional Arrows */}
            <button
              type="button"
              aria-label="Banner anterior"
              onClick={prevHeroSlide}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#0F122E]/55 hover:bg-[#FF2A5F] text-white border border-white/15 backdrop-blur-sm flex items-center justify-center transition-all shadow-lg cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Banner siguiente"
              onClick={nextHeroSlide}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#0F122E]/55 hover:bg-[#FF2A5F] text-white border border-white/15 backdrop-blur-sm flex items-center justify-center transition-all shadow-lg cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Slide Indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
              {[
                { index: 0, label: 'Ver banner de The Legend of Zelda' },
                ...EXTRA_HERO_SLIDES.map((slide) => ({
                  index: slide.index,
                  label: `Ver banner de ${slide.alt}`,
                })),
              ].map((slide) => (
                <button
                  key={slide.index}
                  type="button"
                  aria-label={slide.label}
                  aria-pressed={heroSlide === slide.index}
                  onClick={() => setHeroSlide(slide.index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    heroSlide === slide.index
                      ? 'w-7 bg-[#FF2A5F]'
                      : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
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
                  const discount = getActiveGameDiscount(game);
                  const discountedPrice = lowest
                    ? discount.computePrice(Number(lowest.basePrice))
                    : null;
                  const isNintendo = isNintendoTitle(game);
                  const isAdded = addedGameId === game.id;

                  const hasKeyInfo = Boolean(lowest && Array.isArray(lowest.digitalKeys));
                  const availableKeys = (lowest?.digitalKeys ?? []).filter(
                    (key) => key.status === KeyStatus.AVAILABLE,
                  ).length;
                  const canQuickAdd = Boolean(lowest && (!hasKeyInfo || availableKeys > 0));

                  return (
                    <article
                      key={game.id}
                      data-testid={`game-card-${game.id}`}
                      className="product-card group flex flex-col justify-between rounded-2xl overflow-hidden bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] hover:-translate-y-0.5 shadow-[0_6px_18px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_28px_rgba(30,27,75,0.12)] transition-all duration-200"
                    >
                      {/* Clean 16:10 Key-Art Header */}
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

                          {discount.hasDiscount && (
                            <span
                              data-testid={`home-game-offer-badge-${game.id}`}
                              className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md bg-[#FF2A5F] text-[10px] font-black uppercase tracking-wider text-white shadow-xs pointer-events-none"
                            >
                              OFERTA -{discount.discountPercentage}%
                            </span>
                          )}
                        </Link>

                        <div className="px-4 pt-3 pb-1">
                          <Link to={`/games/${game.id}`} className="block">
                            <h3 className="text-[15px] font-extrabold text-[#0F172A] group-hover:text-[#FF2A5F] transition-colors line-clamp-1">
                              {game.title}
                            </h3>
                          </Link>
                        </div>
                      </div>

                      {/* Conversion Price & Action Footer */}
                      <div className="px-4 py-3.5 mt-1 border-t border-[#E2E8F0] bg-[#FFFFFF] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
                            {lowest ? (discount.hasDiscount ? 'Oferta campaña' : 'Desde') : 'Precio'}
                          </p>
                          {lowest && discountedPrice !== null ? (
                            discount.hasDiscount ? (
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs font-bold text-[#94A3B8] line-through tabular-nums">
                                  {formatCurrency(lowest.basePrice)}
                                </span>
                                <span className="text-lg font-black text-[#059669] tabular-nums leading-tight">
                                  {formatCurrency(discountedPrice)}
                                </span>
                              </div>
                            ) : (
                              <p className="text-lg font-black text-[#0F172A] tabular-nums leading-tight">
                                {formatCurrency(lowest.basePrice)}
                              </p>
                            )
                          ) : (
                            <p className="text-lg font-black text-[#0F172A] tabular-nums leading-tight">
                              Consultar
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          data-testid={`card-add-to-cart-${game.id}`}
                          onClick={() => handleAddToCart(game, canQuickAdd ? lowest : null)}
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
                          <span>{isAdded ? '¡Listo!' : canQuickAdd ? 'Añadir' : 'Ver'}</span>
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

        {/* SECTION 2.5: TRAILER / VIDEO SHOWCASE ESTILO STEAM */}
        <VideoShowcaseSection games={games} />

        {/* SECTION 2.75: PRESUPUESTO */}
        <BudgetSection />

        {/* SECTION 3: CUPONES Y DESCUENTOS */}
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
              to="/promotions"
              className="text-xs font-bold uppercase tracking-wider text-[#1E1B4B] hover:text-[#FF2A5F] transition-colors inline-flex items-center gap-1"
            >
              <span>Ver todas las ofertas</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {activePromotions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activePromotions.map((promo: Promotion) => {
                const isClaimed = Boolean(promo.isClaimed);
                return (
                  <article
                    key={promo.id}
                    data-testid={`home-promotion-card-${promo.id}`}
                    className={`product-card relative rounded-2xl overflow-hidden border p-6 shadow-sm flex flex-col justify-between space-y-5 transition-all ${
                      isClaimed
                        ? 'bg-[#F8FAFC] border-[#CBD5E1] opacity-85'
                        : 'bg-[#FFFFFF] border-[#E2E8F0] hover:border-[#FF2A5F] hover:-translate-y-0.5'
                    }`}
                  >
                    <div
                      aria-hidden="true"
                      className={`absolute inset-x-0 top-0 h-[3px] ${
                        isClaimed
                          ? 'bg-[#CBD5E1]'
                          : 'bg-gradient-to-r from-[#FFC700] via-[#FF2A5F] to-[#1E1B4B]'
                      }`}
                    />

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`text-xs font-black uppercase px-2.5 py-1 rounded-md ${
                            isClaimed
                              ? 'bg-[#E2E8F0] text-[#64748B]'
                              : 'bg-[#FFC700] text-[#0F172A]'
                          }`}
                        >
                          -{promo.discountPercentage}% OFF
                        </span>
                        {isClaimed ? (
                          <span
                            data-testid={`home-promotion-claimed-${promo.id}`}
                            className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#E2E8F0] text-[#475569] border border-[#CBD5E1]"
                          >
                            Ya reclamado
                          </span>
                        ) : (
                          promo.couponCode && (
                            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-[#F4F4F6] text-[#1E1B4B] border border-[#E2E8F0]">
                              Cupón: {promo.couponCode}
                            </span>
                          )
                        )}
                      </div>

                      <h3 className="text-lg font-extrabold text-[#0F172A]">{promo.name}</h3>
                      <div className="space-y-1">
                        <p className="text-xs text-[#475569]">
                          Válido desde {formatDate(promo.startDate)} hasta {formatDate(promo.endDate)}.
                        </p>
                        {isClaimed && promo.couponCode ? (
                          <p className="text-[11px] font-mono font-semibold text-[#94A3B8] line-through">
                            Cupón: {promo.couponCode}
                          </p>
                        ) : (
                          <p className="text-[11px] font-semibold text-[#64748B]">
                            Límite: 1 uso por usuario
                          </p>
                        )}
                      </div>
                    </div>

                    {isClaimed ? (
                      <span className="w-full py-2.5 rounded-xl bg-[#E2E8F0] text-[#64748B] font-bold text-xs uppercase tracking-wider text-center cursor-not-allowed">
                        Ya reclamado
                      </span>
                    ) : promo.couponCode ? (
                      <button
                        type="button"
                        onClick={() => void handleCopyCoupon(promo.id, promo.couponCode!)}
                        className="w-full py-2.5 rounded-xl bg-[#1E1B4B] hover:bg-[#FF2A5F] text-white font-bold text-xs uppercase tracking-wider text-center transition-colors cursor-pointer"
                      >
                        {copiedCouponId === promo.id ? '¡Copiado!' : 'Copiar'}
                      </button>
                    ) : (
                      <Link
                        to="/games"
                        className="w-full py-2.5 rounded-xl bg-[#1E1B4B] hover:bg-[#FF2A5F] text-white font-bold text-xs uppercase tracking-wider text-center transition-colors"
                      >
                        Ver Juegos Aplicables
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-6 text-center space-y-2 shadow-xs">
              <p className="text-sm font-bold text-[#0F172A]">No hay promociones activas en este momento</p>
              <p className="text-xs text-[#475569] max-w-md mx-auto">
                Los títulos del catálogo están disponibles con su precio estándar. Explora todas las ediciones disponibles en la tienda.
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
      </div>
    </div>
  );
}
