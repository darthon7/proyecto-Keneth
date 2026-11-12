import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Spinner } from '@/components/atoms/Spinner';
import { gamesApi, genresApi, platformsApi, promotionsApi, reviewsApi } from '@/api';
import { useCart } from '@/context/CartContext';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Game, GameEdition, Genre, Platform, Promotion } from '@/types';

const GENRE_ACCENTS = [
  { border: 'border-blue-500/30', text: 'text-blue-400', bg: 'from-blue-600/20 via-[#141824] to-[#0b0e15]' },
  { border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'from-emerald-600/20 via-[#141824] to-[#0b0e15]' },
  { border: 'border-amber-500/30', text: 'text-amber-400', bg: 'from-amber-600/20 via-[#141824] to-[#0b0e15]' },
  { border: 'border-purple-500/30', text: 'text-purple-400', bg: 'from-purple-600/20 via-[#141824] to-[#0b0e15]' },
  { border: 'border-rose-500/30', text: 'text-rose-400', bg: 'from-rose-600/20 via-[#141824] to-[#0b0e15]' },
  { border: 'border-sky-500/30', text: 'text-sky-400', bg: 'from-sky-600/20 via-[#141824] to-[#0b0e15]' },
];

function releaseTime(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getLowestEdition(game: Game): GameEdition | null {
  if (!game.editions || game.editions.length === 0) return null;
  const sorted = [...game.editions].sort((a, b) => Number(a.basePrice) - Number(b.basePrice));
  return sorted[0] ?? null;
}

export function HomePage() {
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [selectedEditionId, setSelectedEditionId] = useState<number | null>(null);
  const [rankingTab, setRankingTab] = useState<'new' | 'cheapest' | 'alpha' | 'all'>('new');
  const [addedGameId, setAddedGameId] = useState<number | null>(null);

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

  // Active promotion (if any)
  const activePromotions = useMemo(() => {
    return promotions.filter((p) => p.isActive);
  }, [promotions]);

  const featuredGames = useMemo(() => {
    if (games.length === 0) return [];
    return [...games].slice(0, 5);
  }, [games]);

  const activeSpotlight: Game | undefined = featuredGames[spotlightIndex] ?? featuredGames[0];

  // Selected edition for spotlight game
  const currentEdition: GameEdition | null = useMemo(() => {
    if (!activeSpotlight?.editions || activeSpotlight.editions.length === 0) return null;
    if (selectedEditionId !== null) {
      const match = activeSpotlight.editions.find((e) => e.id === selectedEditionId);
      if (match) return match;
    }
    return getLowestEdition(activeSpotlight);
  }, [activeSpotlight, selectedEditionId]);

  // Review statistics calculated dynamically from real reviews for the active spotlight
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

  // Review statistics helper for any game
  const getGameReviewStats = (gameId: number) => {
    const gameReviews = allReviews.filter((r) => r.game?.id === gameId);
    if (gameReviews.length === 0) return null;
    const positiveCount = gameReviews.filter((r) => r.rating >= 4).length;
    const percent = Math.round((positiveCount / gameReviews.length) * 100);
    return {
      total: gameReviews.length,
      percent,
    };
  };

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
      setTimeout(() => setAddedGameId(null), 2000);
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
        return copy.sort((a, b) => releaseTime(b.releaseDate) - releaseTime(a.releaseDate)).slice(0, 6);
      case 'cheapest':
        return copy
          .sort((a, b) => {
            const priceA = getLowestEdition(a)?.basePrice ?? 999999;
            const priceB = getLowestEdition(b)?.basePrice ?? 999999;
            return Number(priceA) - Number(priceB);
          })
          .slice(0, 6);
      case 'alpha':
        return copy.sort((a, b) => a.title.localeCompare(b.title)).slice(0, 6);
      case 'all':
      default:
        return copy.slice(0, 6);
    }
  }, [games, rankingTab]);

  return (
    <div className="relative min-h-screen bg-[#0b0e15] text-[#e1e2ec] font-sans antialiased selection:bg-[#4f8eff] selection:text-[#00275e]">
      {/* Ambient Atmospheric Backdrop */}
      <div className="absolute -top-32 left-1/4 w-[520px] h-[520px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[480px] -right-24 w-[460px] h-[460px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute top-[1100px] -left-32 w-[580px] h-[580px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none -z-10" />

      {/* Main Container */}
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        {/* Loading and Error States */}
        {gamesQuery.isLoading && (
          <div className="py-24 text-center">
            <Spinner label="Consultando videojuegos en la base de datos…" />
          </div>
        )}

        {gamesQuery.isError && (
          <ErrorBanner
            message="No se pudo cargar el catálogo de videojuegos. Comprueba la conexión con el servidor backend."
            onRetry={() => void gamesQuery.refetch()}
          />
        )}

        {/* SECTION 1: DESTACADOS Y RECOMENDADOS (HERO SHOWCASE) */}
        {activeSpotlight && (
          <section aria-labelledby="hero-carousel-title" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-6 bg-blue-400 rounded-full shadow-[0_0_12px_#aec6ff]" />
                <h2
                  id="hero-carousel-title"
                  className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white"
                >
                  Destacados y Recomendados
                </h2>
              </div>

              {/* Carousel Controls */}
              {featuredGames.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevSpotlight}
                    aria-label="Juego anterior"
                    className="p-2 rounded-xl bg-[#272a32]/70 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-white/5"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-1.5 px-2">
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
                          idx === spotlightIndex
                            ? 'w-6 bg-[#aec6ff] shadow-[0_0_8px_#aec6ff]'
                            : 'w-2 bg-[#32353d] hover:bg-slate-500'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextSpotlight}
                    aria-label="Siguiente juego"
                    className="p-2 rounded-xl bg-[#272a32]/70 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-white/5"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Split Spotlight Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden bg-[#161a24] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.7)] group">
              {/* Main Visual Column (Col 1-8) */}
              <div className="lg:col-span-8 relative min-h-[420px] lg:min-h-[520px] flex flex-col justify-between p-6 sm:p-8 overflow-hidden bg-gradient-to-br from-[#1c2232] to-[#0f121a]">
                {activeSpotlight.coverImageUrl ? (
                  <img
                    src={activeSpotlight.coverImageUrl}
                    alt={activeSpotlight.title}
                    className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 -z-10"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center -z-10 bg-gradient-to-br from-blue-950/40 via-[#121622] to-black opacity-90">
                    <div className="text-center space-y-2 p-8">
                      <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-blue-400">
                        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-5 9h2v-2h2v2h2v2h-2v2H9v-2H7v-2zm10 2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-2-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                        </svg>
                      </div>
                      <p className="text-2xl font-black text-slate-300 tracking-wider">
                        {activeSpotlight.title}
                      </p>
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e15] via-[#0b0e15]/60 to-transparent -z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e15]/80 via-transparent to-[#161a24] lg:block hidden -z-10" />

                {/* Top Metatags */}
                <div className="flex flex-wrap items-center gap-2 z-10">
                  <span className="text-[11px] uppercase tracking-wider px-2.5 py-1 rounded bg-[#4f8eff] text-[#00275e] font-extrabold shadow-[0_0_12px_rgba(79,142,255,0.4)]">
                    LANZAMIENTO DESTACADO
                  </span>
                  <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-white border border-white/10 font-bold">
                    ESRB: {activeSpotlight.esrbRating || 'Pendiente'}
                  </span>
                  {activeSpotlight.developer && (
                    <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[#aec6ff] border border-white/10 font-bold">
                      Desarrollo: {activeSpotlight.developer.name}
                    </span>
                  )}
                </div>

                {/* Bottom Left Info Area */}
                <div className="z-10 space-y-3 mt-auto max-w-xl">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                    {activeSpotlight.title}
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                    {activeSpotlight.synopsis || 'Sin descripción disponible para este título.'}
                  </p>

                  {/* Genres Cloud */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(activeSpotlight.genres ?? []).map((genre) => (
                      <Link
                        key={genre.id}
                        to={`/games?genreId=${genre.id}`}
                        className="text-xs px-2.5 py-1 rounded-lg bg-black/60 hover:bg-blue-600/60 text-slate-200 hover:text-white border border-white/10 transition-colors font-medium backdrop-blur-md"
                      >
                        {genre.name}
                      </Link>
                    ))}
                    {activeSpotlight.releaseDate && (
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-white/5">
                        Lanzamiento: {formatDate(activeSpotlight.releaseDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Side Preview Pane (Col 9-12) */}
              <div className="lg:col-span-4 bg-[#141722] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col justify-between p-6 sm:p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wider text-emerald-400 font-extrabold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Disponible en Catálogo
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      {currentEdition?.editionName ?? 'Edición Principal'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {activeSpotlight.publisher
                        ? `Publisher oficial: ${activeSpotlight.publisher.name}`
                        : 'Publisher independiente'}
                      {currentEdition?.format ? ` · Formato ${currentEdition.format}` : ''}
                    </p>
                  </div>

                  {/* Dynamic Editions Selector */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
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
                                  ? 'bg-[#1c2234] border-[#aec6ff] shadow-sm'
                                  : 'bg-[#10131d] border-white/5 hover:border-white/20'
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
                              <span className="text-xs font-black text-emerald-400 shrink-0">
                                {formatCurrency(edition.basePrice)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-black/40 text-xs text-slate-500 border border-white/5">
                        Sin ediciones registradas para este título
                      </div>
                    )}
                  </div>

                  {/* Real Reviews & Platform Details */}
                  <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Reseñas:</span>
                      {spotlightReviewStats ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a2 2 0 00-.8 1.4z" />
                          </svg>
                          {spotlightReviewStats.percent}% positivas ({spotlightReviewStats.total} {spotlightReviewStats.total === 1 ? 'opinión' : 'opiniones'})
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">Sin reseñas registradas</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Plataformas:</span>
                      <div className="flex items-center gap-1.5 text-slate-300 font-medium truncate max-w-[180px]">
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
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between bg-black/50 p-3 rounded-xl border border-white/5">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Precio actual</p>
                      <p className="text-xl font-black text-white">
                        {currentEdition
                          ? formatCurrency(currentEdition.basePrice)
                          : 'Consultar'}
                      </p>
                    </div>

                    <Link
                      to={`/games/${activeSpotlight.id}`}
                      className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors font-semibold"
                    >
                      Ver Ficha Técnica →
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(activeSpotlight, currentEdition)}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
                        addedGameId === activeSpotlight.id
                          ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                          : 'bg-[#4f8eff] hover:bg-blue-400 text-[#00275e] hover:text-black shadow-[0_0_20px_rgba(79,142,255,0.4)]'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      {addedGameId === activeSpotlight.id ? '¡Añadido al Carrito!' : 'Agregar al Carrito'}
                    </button>

                    <Link
                      to={`/games/${activeSpotlight.id}`}
                      className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/5 transition-colors"
                      title="Ver todos los detalles del juego"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 2: PROMOCIONES Y OFERTAS (DRIVEN 100% BY DATABASE PROMOTIONS) */}
        <section aria-labelledby="promotions-title" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-6 bg-amber-500 rounded-full shadow-[0_0_12px_#f59e0b]" />
              <div>
                <h2
                  id="promotions-title"
                  className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white"
                >
                  Promociones y Descuentos
                </h2>
                <p className="text-xs text-slate-400">
                  Campañas activas en la tienda registradas por los administradores
                </p>
              </div>
            </div>

            <Link
              to="/catalog/promotions"
              className="text-xs font-bold uppercase tracking-wider text-[#aec6ff] hover:text-white transition-colors flex items-center gap-1"
            >
              Administrar promociones
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

          {activePromotions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activePromotions.map((promo: Promotion) => (
                <article
                  key={promo.id}
                  className="rounded-2xl overflow-hidden bg-[#161a24] border border-white/10 p-6 shadow-xl flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase px-2.5 py-1 rounded bg-amber-500 text-black">
                        -{promo.discountPercentage}% OFF
                      </span>
                      {promo.couponCode && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/60 text-slate-300 border border-white/10">
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
                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider text-center transition-colors"
                  >
                    Ver Juegos Aplicables
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#141824] border border-white/10 p-6 text-center space-y-2">
              <p className="text-sm font-bold text-white">No hay promociones activas en este momento</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Los títulos del catálogo están disponibles con su precio estándar. Puedes consultar todas las ediciones o crear una nueva promoción desde el panel de catálogo.
              </p>
              <div className="pt-2">
                <Link
                  to="/games"
                  className="inline-block px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                >
                  Explorar Catálogo Completo
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 3: EXPLORAR POR GÉNERO (DRIVEN 100% BY DATABASE GENRES) */}
        <section aria-labelledby="genres-title" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-6 bg-emerald-400 rounded-full shadow-[0_0_12px_#34d399]" />
              <div>
                <h2
                  id="genres-title"
                  className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white"
                >
                  Explorar por Género
                </h2>
                <p className="text-xs text-slate-400">
                  {genres.length > 0
                    ? `${genres.length} géneros disponibles para filtrar títulos`
                    : 'Categorías registradas en la base de datos'}
                </p>
              </div>
            </div>

            <Link
              to="/catalog/genres"
              className="text-xs font-bold uppercase tracking-wider text-[#aec6ff] hover:text-white transition-colors"
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
                    className={`relative rounded-2xl overflow-hidden p-4 sm:p-5 flex flex-col justify-between h-40 bg-gradient-to-br ${accent.bg} border ${accent.border} group hover:scale-[1.03] transition-all shadow-lg`}
                  >
                    <div className="p-2 rounded-xl bg-black/60 w-fit text-white border border-white/10">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>

                    <div>
                      <span className={`text-[10px] uppercase font-black tracking-wider ${accent.text}`}>
                        {genre.slug}
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-white uppercase group-hover:text-white transition-colors line-clamp-1">
                        {genre.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {genre.description || (count !== null ? `${count} ${count === 1 ? 'juego' : 'juegos'}` : 'Explorar')}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#141824] border border-white/10 text-center text-xs text-slate-400">
              No hay géneros creados aún en la base de datos.
            </div>
          )}
        </section>

        {/* SECTION 4: TENDENCIAS Y NOVEDADES (REAL TABBED GAMES LIST) */}
        <section aria-labelledby="catalog-list-title" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-6 bg-[#aec6ff] rounded-full shadow-[0_0_12px_#aec6ff]" />
              <h2
                id="catalog-list-title"
                className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white"
              >
                Títulos del Catálogo
              </h2>
            </div>

            {/* Real Filter Tabs */}
            <div className="flex items-center bg-[#151924] p-1 rounded-xl border border-white/10 text-xs font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => setRankingTab('new')}
                className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all ${
                  rankingTab === 'new'
                    ? 'bg-[#272a32] text-[#aec6ff] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Novedades
              </button>
              <button
                type="button"
                onClick={() => setRankingTab('cheapest')}
                className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all ${
                  rankingTab === 'cheapest'
                    ? 'bg-[#272a32] text-[#aec6ff] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Más Económicos
              </button>
              <button
                type="button"
                onClick={() => setRankingTab('alpha')}
                className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all ${
                  rankingTab === 'alpha'
                    ? 'bg-[#272a32] text-[#aec6ff] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Alfabético
              </button>
              <button
                type="button"
                onClick={() => setRankingTab('all')}
                className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all ${
                  rankingTab === 'all'
                    ? 'bg-[#272a32] text-[#aec6ff] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
            </div>
          </div>

          {/* Dynamic Ranked Games List */}
          <div className="space-y-2">
            {rankedGames.length > 0 ? (
              rankedGames.map((game, idx) => {
                const lowest = getLowestEdition(game);
                const reviewStats = getGameReviewStats(game.id);

                return (
                  <div
                    key={game.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl bg-[#141822] hover:bg-[#1a202d] border border-white/5 hover:border-white/15 shadow-md transition-all duration-200 group gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm sm:text-base font-black text-slate-500 w-6 text-center">
                        #{idx + 1}
                      </span>

                      <div className="relative w-28 sm:w-36 h-16 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 border border-white/10 flex items-center justify-center">
                        {game.coverImageUrl ? (
                          <img
                            src={game.coverImageUrl}
                            alt={game.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-500 uppercase">
                            {game.title.slice(0, 3)}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Link to={`/games/${game.id}`}>
                          <h3 className="text-sm sm:text-base font-black text-white group-hover:text-[#aec6ff] transition-colors line-clamp-1">
                            {game.title}
                          </h3>
                        </Link>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-slate-400">
                            {game.genres?.map((g) => g.name).join(', ') || 'General'}
                          </span>
                          {game.developer && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400">{game.developer.name}</span>
                            </>
                          )}
                          {reviewStats && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-emerald-400 font-bold">
                                {reviewStats.percent}% positivas
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-end">
                      <span className="text-base font-black text-white">
                        {lowest ? formatCurrency(lowest.basePrice) : 'Consultar'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleAddToCart(game, lowest)}
                        className="p-2.5 rounded-lg bg-slate-800 hover:bg-[#4f8eff] hover:text-[#00275e] text-white border border-white/5 transition-colors"
                        title="Añadir al carrito"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 rounded-xl bg-[#141822] border border-white/5 text-center text-xs text-slate-400">
                Aún no hay videojuegos disponibles en esta categoría.
              </div>
            )}
          </div>
        </section>

        {/* SECTION 5: PLATAFORMAS REGISTRADAS EN LA BASE DE DATOS */}
        <section className="rounded-3xl overflow-hidden bg-[#141824] border border-white/10 p-8 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase px-2.5 py-0.5 rounded bg-blue-500 text-black font-extrabold tracking-wider">
                COMPATIBILIDAD
              </span>
              <h2 className="text-2xl font-black text-white">Plataformas Soportadas</h2>
              <p className="text-xs text-slate-400">
                Consulta los videojuegos agrupados por plataforma y ediciones de lanzamiento
              </p>
            </div>

            <Link
              to="/catalog/platforms"
              className="text-xs font-bold uppercase tracking-wider text-[#aec6ff] hover:text-white transition-colors"
            >
              Ver todas las plataformas →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {platforms.map((platform: Platform) => (
              <Link
                key={platform.id}
                to={`/games?platformId=${platform.id}`}
                className="p-4 rounded-xl bg-[#1c2234] border border-white/5 hover:border-blue-400/30 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-[#aec6ff] transition-colors">
                    {platform.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">{platform.code}</p>
                </div>
                <span className="text-xs text-slate-400">
                  {platform.editions?.length ? `${platform.editions.length} ed.` : 'Explorar'}
                </span>
              </Link>
            ))}
          </div>

          <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              ¿Gestionas nuevos títulos o ediciones? Accede a los módulos de administración.
            </p>
            <div className="flex items-center gap-3">
              <Link
                to="/catalog/games"
                className="px-4 py-2 rounded-xl bg-[#4f8eff] text-[#00275e] hover:bg-blue-400 font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Administrar Videojuegos
              </Link>
              <Link
                to="/library"
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors"
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
