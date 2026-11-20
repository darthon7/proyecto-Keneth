import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { CoverSlot } from '@/components/atoms/CoverSlot';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { RatingStars } from '@/components/atoms/RatingStars';
import { Spinner } from '@/components/atoms/Spinner';
import { GameReviewsSection } from '@/components/organisms/GameReviewsSection';
import { errorMessage, gamesApi, reviewsExtraApi, wishlistsApi, wishlistsExtraApi } from '@/api';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useStockWatch } from '@/hooks/useStockWatch';
import { getActiveGameDiscount } from '@/utils/discount';
import { countAvailableKeys, getLowestEdition, isNintendoTitle } from '@/utils/domain';
import { formatCurrency, formatDate, humanizeEnum } from '@/utils/format';

const TABS = ['Descripción', 'Ediciones', 'Requisitos'] as const;
type Tab = (typeof TABS)[number];

export function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const gameId = Number(id);
  const isValidGameId = Number.isInteger(gameId) && gameId >= 1;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { currentUser } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('Descripción');
  const [selectedEditionId, setSelectedEditionId] = useState<number | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

  const { alerts, dismissAlert } = useStockWatch({
    gameId: isValidGameId ? gameId : undefined,
    intervalMs: 1500,
    enabled: isValidGameId,
  });

  const gameQuery = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => gamesApi.get(gameId),
    enabled: isValidGameId,
  });

  const reviewsQuery = useQuery({
    queryKey: ['reviews', 'game', gameId],
    queryFn: () => reviewsExtraApi.byGame(gameId),
    enabled: isValidGameId,
  });

  const userWishlistQuery = useQuery({
    queryKey: ['wishlists', 'user', currentUser?.id],
    queryFn: () => wishlistsExtraApi.byUser(currentUser!.id),
    enabled: Boolean(currentUser),
  });

  const wishlistEntry = (userWishlistQuery.data ?? []).find((w) => w.game?.id === gameId);
  const isInWishlist = Boolean(wishlistEntry);

  const wishlistMutation = useMutation({
    mutationFn: () =>
      wishlistEntry
        ? wishlistsApi.remove(wishlistEntry.id)
        : wishlistsApi.create({ userId: currentUser!.id, gameId, notifyOnSale: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    },
  });

  if (!isValidGameId) {
    return (
      <section className="page-container py-16">
        <ErrorBanner message="El identificador del videojuego no es válido." />
      </section>
    );
  }

  if (gameQuery.isLoading) return <Spinner label="Cargando videojuego…" />;

  if (gameQuery.isError) {
    return (
      <section className="page-container py-16">
        <ErrorBanner
          message={errorMessage(gameQuery.error)}
          onRetry={() => void gameQuery.refetch()}
        />
      </section>
    );
  }

  const game = gameQuery.data;
  if (!game) return null;

  const gameDiscount = getActiveGameDiscount(game);
  const editions = game.editions ?? [];
  const requirements = game.systemRequirements ?? [];
  const reviews = reviewsQuery.data ?? game.reviews ?? [];

  const primaryEdition = getLowestEdition(game) ?? undefined;
  const activeEdition = editions.find((e) => e.id === selectedEditionId) ?? primaryEdition;
  const activeEditionHasKeyInfo = Boolean(activeEdition && Array.isArray(activeEdition.digitalKeys));
  const activeEditionAvailableKeys = countAvailableKeys(activeEdition);
  const isActiveEditionSoldOut = activeEditionHasKeyInfo && activeEditionAvailableKeys === 0;

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
  const isNintendoGame = isNintendoTitle(game);

  return (
    <section className="page-container py-10">
      <button
        type="button"
        onClick={() => navigate('/games')}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFFFF] border border-[#E2E8F0] px-3.5 py-1.5 text-xs font-semibold text-[#475569] shadow-2xs transition-colors hover:border-[#1E1B4B] hover:text-[#0F172A]"
      >
        ← Volver al catálogo
      </button>

      <div className="mt-6 grid grid-cols-[290px_1fr_320px] gap-6 items-start">
        {/* Left Column: Cover + Metadata */}
        <div className="space-y-4">
          <div className="relative">
            <CoverSlot game={game} />
            {currentUser && (
              <button
                type="button"
                aria-label={isInWishlist ? 'Quitar de wishlist' : 'Añadir a wishlist'}
                aria-pressed={isInWishlist}
                title={isInWishlist ? 'En tu wishlist' : 'Añadir a wishlist'}
                disabled={wishlistMutation.isPending}
                onClick={() => wishlistMutation.mutate()}
                className={`absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition-all cursor-pointer disabled:opacity-60 ${
                  isInWishlist
                    ? 'border-[#FF2A5F] bg-[#FF2A5F] text-white'
                    : 'border-[#E2E8F0] bg-[#FFFFFF]/90 text-[#0F172A] hover:border-[#FF2A5F] hover:text-[#FF2A5F]'
                }`}
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill={isInWishlist ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
            )}
          </div>

          {wishlistMutation.isError && (
            <ErrorBanner message={errorMessage(wishlistMutation.error)} />
          )}

          <dl className="flex flex-col gap-3 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-4 text-body-sm shadow-xs">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#475569]">Publisher</dt>
              <dd className="text-right font-semibold text-[#0F172A]">{game.publisher?.name ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#475569]">Desarrolladora</dt>
              <dd className="text-right font-semibold text-[#0F172A]">{game.developer?.name ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#475569]">Lanzamiento</dt>
              <dd className="text-right font-semibold text-[#0F172A]">{formatDate(game.releaseDate)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#475569]">Clasificación</dt>
              <dd>
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#1E1B4B] px-2 text-[11px] font-black text-white">
                  {game.esrbRating}
                </span>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-[#475569] pt-0.5">Género</dt>
              <dd className="flex flex-wrap justify-end gap-1.5">
                {(game.genres ?? []).map((genre) => (
                  <span
                    key={genre.id}
                    className="rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] px-2.5 py-0.5 text-[11px] font-bold text-[#1E1B4B]"
                  >
                    {genre.name}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </div>

        {/* Center Column: Title, Rating Summary & Tabs */}
        <div className="min-w-0">
          <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">
            {game.title}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <RatingStars value={Math.round(avgRating)} />
            {reviews.length > 0 ? (
              <span className="text-xs font-bold text-[#0F172A]">
                {avgRating.toFixed(1)}/5{' '}
                <span className="font-normal text-[#475569]">
                  ({reviews.length} {reviews.length === 1 ? 'opinión' : 'opiniones'})
                </span>
              </span>
            ) : (
              <span className="text-xs text-[#64748B]">Sin opiniones aún</span>
            )}
          </div>

          <div className="mt-6 flex gap-6 border-b border-[#E2E8F0]">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`-mb-px border-b-2 pb-3 text-body-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? 'border-[#FF2A5F] text-[#FF2A5F]'
                    : 'border-transparent text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {activeTab === 'Descripción' && (
              <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-5 shadow-xs">
                <p className="text-body leading-relaxed text-[#0F172A]">
                  {game.synopsis ?? 'Este videojuego todavía no tiene descripción.'}
                </p>
              </div>
            )}

            {activeTab === 'Ediciones' && (
              <div className="grid grid-cols-2 gap-4">
                {editions.length === 0 && (
                  <EmptyState title="Sin ediciones" description="Publica ediciones digitales para este juego." />
                )}
                {editions.map((edition) => {
                  const hasKeyInfo = Array.isArray(edition.digitalKeys);
                  const availableKeys = countAvailableKeys(edition);
                  const isSoldOut = hasKeyInfo && availableKeys === 0;

                  return (
                    <article key={edition.id} className="product-card rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] p-4 shadow-xs transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-body font-bold text-[#0F172A]">{edition.editionName}</h3>
                        <Badge tone={isSoldOut ? 'danger' : 'blue'}>
                          {isSoldOut ? 'Agotado' : 'Digital'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-body-sm font-semibold text-[#0F172A]">
                        {edition.platform?.name} · {formatCurrency(edition.basePrice)}
                      </p>
                      <p className="mt-1 text-caption text-[#475569]">
                        {hasKeyInfo
                          ? availableKeys > 0
                            ? `Clave digital · ${availableKeys} disponibles`
                            : 'Sin claves digitales disponibles'
                          : 'Entrega digital inmediata'}
                        {edition.isDlc ? ' · DLC' : ''}
                      </p>
                      <Button
                        variant={isNintendoGame || Boolean(edition.platform?.name?.toLowerCase().includes('switch')) ? 'nintendo' : 'brand'}
                        size="sm"
                        className="mt-4"
                        disabled={isSoldOut}
                        onClick={() => addItem(edition.id, 1)}
                      >
                        {isSoldOut ? 'Agotado' : 'Agregar al carrito'}
                      </Button>
                    </article>
                  );
                })}
              </div>
            )}

            {activeTab === 'Requisitos' && (
              <div className="grid grid-cols-2 gap-4">
                {requirements.length === 0 && (
                  <EmptyState
                    title="Sin requisitos"
                    description="Este videojuego todavía no tiene requisitos técnicos publicados."
                  />
                )}
                {requirements.map((requirement) => (
                  <article key={requirement.id} className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-4 shadow-xs">
                    <h3 className="text-body font-bold text-[#0F172A]">
                      {humanizeEnum(requirement.tier)}
                    </h3>
                    <dl className="mt-3 flex flex-col gap-2 text-body-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#475569]">Sistema operativo</dt>
                        <dd className="text-right font-medium text-[#0F172A]">{requirement.os}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#475569]">Procesador</dt>
                        <dd className="text-right font-medium text-[#0F172A]">{requirement.processor}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#475569]">Memoria RAM</dt>
                        <dd className="text-right font-medium text-[#0F172A]">{requirement.ramGb} GB</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#475569]">Tarjeta de video</dt>
                        <dd className="text-right font-medium text-[#0F172A]">{requirement.graphicsCard}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#475569]">Almacenamiento</dt>
                        <dd className="text-right font-medium text-[#0F172A]">{requirement.storageGb} GB</dd>
                      </div>
                      {requirement.directxVersion && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-[#475569]">DirectX</dt>
                          <dd className="text-right font-medium text-[#0F172A]">{requirement.directxVersion}</dd>
                        </div>
                      )}
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Purchase Card */}
        <aside className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                {gameDiscount.hasDiscount ? `Oferta · ${gameDiscount.campaignName}` : 'Precio'}
              </p>
              {activeEdition ? (
                gameDiscount.hasDiscount ? (
                  <div className="mt-1 flex flex-wrap items-baseline gap-2.5">
                    <span className="text-base font-bold text-[#94A3B8] line-through tabular-nums">
                      {formatCurrency(activeEdition.basePrice)}
                    </span>
                    <span className="text-3xl font-black text-[#059669] tabular-nums">
                      {formatCurrency(gameDiscount.computePrice(Number(activeEdition.basePrice)))}
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-3xl font-black text-[#0F172A] tabular-nums">
                    {formatCurrency(activeEdition.basePrice)}
                  </p>
                )
              ) : (
                <p className="mt-1 text-lg font-bold text-[#64748B]">Consultar</p>
              )}
              {activeEdition && (
                <p className="mt-0.5 text-xs text-[#475569]">
                  {activeEdition.editionName} · {activeEdition.platform?.name ?? 'Digital'}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {gameDiscount.hasDiscount && (
                <span className="rounded-lg bg-[#FF2A5F] px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                  OFERTA -{gameDiscount.discountPercentage}%
                </span>
              )}
              {activeEdition && (
                <span className="rounded-lg bg-[#FFC700] px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#0F172A]">
                  Digital
                </span>
              )}
            </div>
          </div>

          {editions.length > 1 && activeEdition && (
            <div className="space-y-1">
              <label
                htmlFor="detail-edition-selector"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]"
              >
                Edición y plataforma
              </label>
              <select
                id="detail-edition-selector"
                value={activeEdition.id}
                onChange={(event) => {
                  setSelectedEditionId(Number(event.target.value));
                  setAddedToCart(false);
                }}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#0F172A] focus:border-[#FF2A5F] focus:outline-none"
              >
                {editions.map((edition) => (
                  <option key={edition.id} value={edition.id}>
                    {edition.editionName} ({edition.platform?.name ?? 'Digital'}) —{' '}
                    {formatCurrency(edition.basePrice)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeEdition && (
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  isActiveEditionSoldOut
                    ? 'bg-[#EF4444]'
                    : activeEditionAvailableKeys <= 2
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-[#10B981]'
                }`}
              />
              <p
                className={`text-xs font-semibold ${
                  isActiveEditionSoldOut ? 'text-[#EF4444]' : 'text-[#065F46]'
                }`}
              >
                {activeEditionHasKeyInfo ? (
                  activeEditionAvailableKeys > 0 ? (
                    <>
                      <span>{activeEditionAvailableKeys}</span> claves digitales disponibles
                    </>
                  ) : (
                    'Sin claves digitales disponibles'
                  )
                ) : (
                  'Entrega digital inmediata'
                )}
              </p>
            </div>
          )}

          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  role="alert"
                  className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold shadow-xs transition-all animate-in fade-in ${
                    alert.type === 'sold_out'
                      ? 'bg-red-500/10 text-red-600 border border-red-500/30'
                      : alert.type === 'restocked'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-700 border border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-current animate-pulse" />
                    <span className="leading-snug">{alert.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissAlert(alert.id)}
                    className="shrink-0 text-[11px] underline font-semibold hover:opacity-75 cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2.5">
            <Button
              variant={isNintendoGame ? 'nintendo' : 'brand'}
              className="w-full"
              disabled={editions.length === 0 || isActiveEditionSoldOut}
              onClick={() => {
                if (activeEdition) addItem(activeEdition.id, 1);
                navigate('/orders');
              }}
            >
              {isActiveEditionSoldOut ? 'Sin stock digital' : 'Comprar ahora'}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              disabled={editions.length === 0 || isActiveEditionSoldOut}
              onClick={() => {
                if (activeEdition) {
                  addItem(activeEdition.id, 1);
                  setAddedToCart(true);
                }
              }}
            >
              {addedToCart ? '¡Añadido al carrito!' : 'Añadir al carrito'}
            </Button>
          </div>
        </aside>
      </div>

      <GameReviewsSection
        gameId={gameId}
        gameTitle={game.title}
        reviews={reviews}
        isLoading={reviewsQuery.isLoading}
        currentUser={currentUser}
      />
    </section>
  );
}
