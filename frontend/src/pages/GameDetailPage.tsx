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
  const { currentUser } = useSession();
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
        className="text-body-sm text-fog transition-colors hover:text-white"
      >
        ← Volver
      </button>

      <div className="mt-6 grid gap-10 lg:grid-cols-[380px_1fr]">
        <div>
          <CoverSlot game={game} />

          <dl className="mt-6 flex flex-col gap-3 text-body-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-fog">Publisher</dt>
              <dd className="text-right text-white">{game.publisher?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fog">Desarrolladora</dt>
              <dd className="text-right text-white">{game.developer?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fog">Lanzamiento</dt>
              <dd className="text-right text-white">{formatDate(game.releaseDate)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fog">Clasificación</dt>
              <dd className="text-right text-white">{game.esrbRating}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fog">Género</dt>
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
          <h1 className="text-heading-sm font-semibold text-white">{game.title}</h1>

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

          <div className="mt-10 flex gap-6 border-b border-white/10">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`-mb-px border-b-2 pb-3 text-body-sm transition-colors ${
                  activeTab === tab
                    ? 'border-white text-white'
                    : 'border-transparent text-fog hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {activeTab === 'Descripción' && (
              <div className="max-w-2xl">
                <p className="text-body text-white">
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
                  <article key={edition.id} className="rounded-[4px] bg-graphite p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-body font-semibold text-white">{edition.editionName}</h3>
                      <Badge tone={edition.format === 'DIGITAL' ? 'blue' : 'neutral'}>
                        {humanizeEnum(edition.format)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-body-sm text-fog">
                      {edition.platform?.name} · {formatCurrency(edition.basePrice)}
                    </p>
                    <p className="mt-1 text-caption text-mid-gray">
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
                  <article key={review.id} className="rounded-[4px] bg-graphite p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-body font-semibold text-white">{review.title}</h3>
                      <RatingStars value={review.rating} />
                    </div>
                    <p className="mt-2 text-body-sm text-fog">{review.body}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-caption text-mid-gray">
                      <span>{review.user?.username ?? 'Usuario'}</span>
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
                    description="Añade requisitos mínimos y recomendados desde el catálogo."
                  />
                )}
                {requirements.map((requirement) => (
                  <article key={requirement.id} className="rounded-[4px] bg-graphite p-4">
                    <h3 className="text-body font-semibold text-white">
                      {humanizeEnum(requirement.tier)}
                    </h3>
                    <dl className="mt-3 flex flex-col gap-2 text-body-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-fog">Sistema operativo</dt>
                        <dd className="text-right text-white">{requirement.os}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-fog">Procesador</dt>
                        <dd className="text-right text-white">{requirement.processor}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-fog">Memoria RAM</dt>
                        <dd className="text-right text-white">{requirement.ramGb} GB</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-fog">Tarjeta de video</dt>
                        <dd className="text-right text-white">{requirement.graphicsCard}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-fog">Almacenamiento</dt>
                        <dd className="text-right text-white">{requirement.storageGb} GB</dd>
                      </div>
                      {requirement.directxVersion && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-fog">DirectX</dt>
                          <dd className="text-right text-white">{requirement.directxVersion}</dd>
                        </div>
                      )}
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </div>

          <p className="mt-10 text-caption text-mid-gray">
            Identificador interno: <Link to="/catalog/games" className="text-signal-blue">#{game.id}</Link>
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
            <span className="text-body-sm font-semibold text-white">Calificación</span>
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
