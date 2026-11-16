import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Spinner } from '@/components/atoms/Spinner';
import { BudgetSection } from '@/components/molecules/BudgetSection';
import { HeroBannerCarousel } from '@/components/molecules/HeroBannerCarousel';
import { VideoShowcaseSection } from '@/components/molecules/VideoShowcaseSection';
import { gamesApi, promotionsApi } from '@/api';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { countAvailableKeys, getLowestEdition, isNintendoTitle } from '@/utils/domain';
import { getActiveGameDiscount, getCouponStatus } from '@/utils/discount';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Game, GameEdition, Promotion } from '@/types';

function releaseTime(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

const RANKING_TABS = [
  { key: 'new', label: 'Novedades' },
  { key: 'cheapest', label: 'Más Económicos' },
  { key: 'alpha', label: 'Alfabético' },
  { key: 'all', label: 'Todos' },
] as const;

export function HomePage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { currentUser } = useSession();
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { copiedId: copiedCouponId, copy: copyCoupon } = useCopyFeedback<number>();

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

  const gamesQuery = useQuery({
    queryKey: ['games'],
    queryFn: () => gamesApi.list(),
  });

  const promotionsQuery = useQuery({
    queryKey: ['promotions', currentUser?.id],
    queryFn: () => promotionsApi.list(),
  });

  const games = useMemo(() => gamesQuery.data ?? [], [gamesQuery.data]);
  const activePromotions = useMemo(
    () => (promotionsQuery.data ?? []).filter((p) => p.isActive),
    [promotionsQuery.data],
  );

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
      <div className="w-full max-w-[1440px] mx-auto px-8 py-8 space-y-14">
        <HeroBannerCarousel />

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

        {!gamesQuery.isLoading && !gamesQuery.isError && (
          <section aria-labelledby="catalog-grid-title" className="space-y-6">
            <div className="flex flex-row items-end justify-between gap-4 border-b border-[#E2E8F0] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-5 rounded-full bg-[#FF2A5F]" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF2A5F]">
                    Marketplace Digital
                  </span>
                </div>
                <h2
                  id="catalog-grid-title"
                  className="text-2xl font-black uppercase tracking-wide text-[#0F172A]"
                >
                  Catálogo de Videojuegos
                </h2>
              </div>

              <div className="flex flex-row items-center justify-between gap-3 w-auto min-w-0">
                <div
                  role="group"
                  aria-label="Ordenar catálogo"
                  className="flex flex-wrap items-center gap-1 bg-[#FFFFFF] p-1 rounded-xl border border-[#E2E8F0] text-xs font-bold max-w-full shadow-xs"
                >
                  {RANKING_TABS.map((tab) => (
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
                className="grid grid-cols-4 gap-5"
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
                  const availableKeys = countAvailableKeys(lowest);
                  const canQuickAdd = Boolean(lowest && (!hasKeyInfo || availableKeys > 0));

                  return (
                    <article
                      key={game.id}
                      data-testid={`game-card-${game.id}`}
                      className="product-card group flex flex-col justify-between rounded-2xl overflow-hidden bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] hover:-translate-y-0.5 shadow-[0_6px_18px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_28px_rgba(30,27,75,0.12)] transition-all duration-200"
                    >
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

        <VideoShowcaseSection games={games} />

        <BudgetSection />

        <section aria-labelledby="promotions-title" className="space-y-4">
          <div className="flex flex-row items-end justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-5 bg-[#FFC700] rounded-full" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#1E1B4B]">
                  Campañas Activas
                </span>
              </div>
              <h2
                id="promotions-title"
                className="text-2xl font-black uppercase tracking-wide text-[#0F172A]"
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
            <div className="grid grid-cols-3 gap-5">
              {activePromotions.map((promo: Promotion) => {
                const isClaimed = Boolean(promo.isClaimed);
                const isExpired = getCouponStatus(promo).status === 'expired';
                const isUnavailable = isClaimed || isExpired;
                return (
                  <article
                    key={promo.id}
                    data-testid={`home-promotion-card-${promo.id}`}
                    className={`product-card relative rounded-2xl overflow-hidden border p-6 shadow-sm flex flex-col justify-between space-y-5 transition-all ${
                      isUnavailable
                        ? 'bg-[#F8FAFC] border-[#CBD5E1] opacity-85'
                        : 'bg-[#FFFFFF] border-[#E2E8F0] hover:border-[#FF2A5F] hover:-translate-y-0.5'
                    }`}
                  >
                    <div
                      aria-hidden="true"
                      className={`absolute inset-x-0 top-0 h-[3px] ${
                        isUnavailable
                          ? 'bg-[#CBD5E1]'
                          : 'bg-gradient-to-r from-[#FFC700] via-[#FF2A5F] to-[#1E1B4B]'
                      }`}
                    />

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`text-xs font-black uppercase px-2.5 py-1 rounded-md ${
                            isUnavailable
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
                        ) : isExpired ? (
                          <span
                            data-testid={`home-promotion-expired-${promo.id}`}
                            className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]"
                          >
                            Expirado
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
                        {isUnavailable && promo.couponCode ? (
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
                    ) : isExpired ? (
                      <span className="w-full py-2.5 rounded-xl bg-[#E2E8F0] text-[#64748B] font-bold text-xs uppercase tracking-wider text-center cursor-not-allowed">
                        Cupón expirado
                      </span>
                    ) : promo.couponCode ? (
                      <button
                        type="button"
                        onClick={() => void copyCoupon(promo.id, promo.couponCode!)}
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
