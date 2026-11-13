import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { CoverSlot } from '@/components/atoms/CoverSlot';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Modal } from '@/components/atoms/Modal';
import { RatingStars } from '@/components/atoms/RatingStars';
import { Spinner } from '@/components/atoms/Spinner';
import { Textarea } from '@/components/atoms/Textarea';
import { Input } from '@/components/atoms/Input';
import { errorMessage, gamesApi, reviewsApi, reviewsExtraApi, wishlistsApi } from '@/api';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { formatCurrency, formatDate, humanizeEnum } from '@/utils/format';

const TABS = ['Descripción', 'Ediciones', 'Reseñas', 'Requisitos'] as const;
type Tab = (typeof TABS)[number];

export function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const gameId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { currentUser, isAdmin } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('Descripción');
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const gameQuery = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => gamesApi.get(gameId),
    enabled: Number.isFinite(gameId),
  });

  const reviewsQuery = useQuery({
    queryKey: ['reviews', 'game', gameId],
    queryFn: () => reviewsExtraApi.byGame(gameId),
    enabled: Number.isFinite(gameId),
  });

  const wishlistMutation = useMutation({
    mutationFn: () =>
      wishlistsApi.create({ userId: currentUser!.id, gameId, notifyOnSale: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      reviewsApi.create({
        userId: currentUser!.id,
        gameId,
        rating,
        title: reviewTitle,
        body: reviewBody,
      }),
    onSuccess: async () => {
      setIsReviewOpen(false);
      setReviewTitle('');
      setReviewBody('');
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

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

  const editions = game.editions ?? [];
  const requirements = game.systemRequirements ?? [];
  const reviews = game.reviews ?? [];

  const isNintendoGame = Boolean(
    game.publisher?.name?.toLowerCase().includes('nintendo') ||
    game.developer?.name?.toLowerCase().includes('nintendo') ||
    editions.some(
      (e) =>
        e.platform?.name?.toLowerCase().includes('switch') ||
        e.platform?.name?.toLowerCase().includes('nintendo'),
    ),
  );

  return (
    <section className="page-container py-16">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-body-sm font-medium text-[#475569] transition-colors hover:text-[#FF2A5F]"
      >
        ← Volver
      </button>

      <div className="mt-6 grid gap-10 lg:grid-cols-[380px_1fr]">
        <div>
          <CoverSlot game={game} />

          <dl className="mt-6 flex flex-col gap-3 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-4 text-body-sm shadow-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-[#475569]">Publisher</dt>
              <dd className="text-right font-semibold text-[#0F172A]">{game.publisher?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#475569]">Desarrolladora</dt>
              <dd className="text-right font-semibold text-[#0F172A]">{game.developer?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#475569]">Lanzamiento</dt>
              <dd className="text-right font-semibold text-[#0F172A]">{formatDate(game.releaseDate)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#475569]">Clasificación</dt>
              <dd className="text-right font-semibold text-[#0F172A]">{game.esrbRating}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#475569]">Género</dt>
              <dd className="flex flex-wrap justify-end gap-1">
                {(game.genres ?? []).map((genre) => (
                  <Badge key={genre.id} tone="blue">
                    {genre.name}
                  </Badge>
                ))}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h1 className="text-heading-sm font-extrabold text-[#0F172A]">{game.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant={isNintendoGame ? 'nintendo' : 'brand'}
              disabled={editions.length === 0}
              onClick={() => {
                const first = editions[0];
                if (first) addItem(first.id, 1);
                navigate('/orders');
              }}
            >
              Comprar ahora
            </Button>
            <Button
              variant="outline"
              disabled={!currentUser}
              isLoading={wishlistMutation.isPending}
              onClick={() => currentUser && wishlistMutation.mutate()}
            >
              Añadir a wishlist
            </Button>
            <Button variant="ghost" onClick={() => setIsReviewOpen(true)} disabled={!currentUser}>
              Escribir reseña
            </Button>
          </div>

          {wishlistMutation.isError && (
            <div className="mt-4">
              <ErrorBanner message={errorMessage(wishlistMutation.error)} />
            </div>
          )}

          <div className="mt-10 flex gap-6 border-b border-[#E2E8F0]">
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

          <div className="mt-6">
            {activeTab === 'Descripción' && (
              <div className="max-w-2xl rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-5 shadow-xs">
                <p className="text-body text-[#0F172A]">
                  {game.synopsis ?? 'Este videojuego todavía no tiene descripción.'}
                </p>
              </div>
            )}

            {activeTab === 'Ediciones' && (
              <div className="grid gap-4 sm:grid-cols-2">
                {editions.length === 0 && (
                  <EmptyState title="Sin ediciones" description="Publica ediciones para este juego." />
                )}
                {editions.map((edition) => (
                  <article key={edition.id} className="product-card rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] p-4 shadow-xs transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-body font-bold text-[#0F172A]">{edition.editionName}</h3>
                      <Badge tone={edition.format === 'DIGITAL' ? 'blue' : 'neutral'}>
                        {humanizeEnum(edition.format)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-body-sm font-semibold text-[#0F172A]">
                      {edition.platform?.name} · {formatCurrency(edition.basePrice)}
                    </p>
                    <p className="mt-1 text-caption text-[#475569]">
                      {edition.format === 'PHYSICAL'
                        ? `Stock físico: ${edition.stockPhysical}`
                        : 'Entrega digital inmediata'}
                      {edition.isDlc ? ' · DLC' : ''}
                    </p>
                    <Button
                      variant={isNintendoGame || Boolean(edition.platform?.name?.toLowerCase().includes('switch')) ? 'nintendo' : 'brand'}
                      size="sm"
                      className="mt-4"
                      onClick={() => addItem(edition.id, 1)}
                    >
                      Agregar al carrito
                    </Button>
                  </article>
                ))}
              </div>
            )}

            {activeTab === 'Reseñas' && (
              <div className="flex flex-col gap-4">
                {reviewsQuery.isLoading && <Spinner label="Cargando reseñas…" />}
                {reviews.length === 0 && (
                  <EmptyState title="Sin reseñas" description="Sé la primera persona en opinar." />
                )}
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-4 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-body font-bold text-[#0F172A]">{review.title}</h3>
                      <RatingStars value={review.rating} />
                    </div>
                    <p className="mt-2 text-body-sm text-[#475569]">{review.body}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-caption text-[#94A3B8]">
                      <span className="font-medium text-[#475569]">{review.user?.username ?? 'Usuario'}</span>
                      {review.isVerifiedPurchase && (
                        <Badge tone="success">Compra verificada</Badge>
                      )}
                      <span>{formatDate(review.createdAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {activeTab === 'Requisitos' && (
              <div className="grid gap-4 lg:grid-cols-2">
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

          <p className="mt-10 text-caption text-[#94A3B8]">
            Identificador interno:{' '}
            {isAdmin ? (
              <Link to="/admin/games" className="text-[#1E1B4B] font-semibold hover:text-[#FF2A5F]">
                #{game.id}
              </Link>
            ) : (
              <span className="font-semibold text-[#475569]">#{game.id}</span>
            )}
          </p>
        </div>
      </div>

      <Modal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        title="Escribir reseña"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsReviewOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="brand"
              isLoading={reviewMutation.isPending}
              onClick={() => {
                setFormError(null);
                reviewMutation.mutate();
              }}
            >
              Publicar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {formError && <ErrorBanner message={formError} />}

          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-semibold text-[#0F172A]">Calificación</span>
            <RatingStars value={rating} interactive onChange={setRating} />
          </div>

          <Input
            label="Título"
            value={reviewTitle}
            onChange={(event) => setReviewTitle(event.target.value)}
            placeholder="Resumen de tu opinión"
          />

          <Textarea
            label="Reseña"
            rows={5}
            value={reviewBody}
            onChange={(event) => setReviewBody(event.target.value)}
            placeholder="¿Qué te pareció el juego?"
          />
        </div>
      </Modal>
    </section>
  );
}
