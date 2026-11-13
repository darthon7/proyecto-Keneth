import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { Modal } from '@/components/atoms/Modal';
import { RatingStars } from '@/components/atoms/RatingStars';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { Textarea } from '@/components/atoms/Textarea';
import { errorMessage, gamesApi, reviewsApi } from '@/api';
import { useSession } from '@/context/SessionContext';
import type { Review } from '@/types';
import { formatDate } from '@/utils/format';

export function ReviewsPage() {
  const { currentUser, isAdmin } = useSession();
  const queryClient = useQueryClient();

  const [gameFilter, setGameFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);

  const [gameId, setGameId] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const reviewsQuery = useQuery({
    queryKey: ['reviews'],
    queryFn: () => reviewsApi.list(),
  });

  const gamesQuery = useQuery({
    queryKey: ['games'],
    queryFn: () => gamesApi.list(),
  });

  const filteredReviews = useMemo(() => {
    const list = reviewsQuery.data ?? [];
    if (!gameFilter) return list;
    return list.filter((review) => String(review.game?.id) === gameFilter);
  }, [reviewsQuery.data, gameFilter]);

  const openCreate = () => {
    setEditingReview(null);
    setGameId('');
    setRating(5);
    setTitle('');
    setBody('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (review: Review) => {
    setEditingReview(review);
    setGameId(String(review.game?.id ?? ''));
    setRating(review.rating);
    setTitle(review.title);
    setBody(review.body);
    setFormError(null);
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) {
        throw new Error('Debes iniciar sesión para publicar una reseña.');
      }
      const trimmedTitle = title.trim();
      const trimmedBody = body.trim();
      const parsedGameId = Number(gameId);

      if (!editingReview && (!Number.isFinite(parsedGameId) || parsedGameId <= 0)) {
        throw new Error('Selecciona un videojuego.');
      }
      if (!trimmedTitle) {
        throw new Error('El título es obligatorio.');
      }
      if (!trimmedBody) {
        throw new Error('El texto de la reseña es obligatorio.');
      }

      if (editingReview) {
        return reviewsApi.update(editingReview.id, {
          rating,
          title: trimmedTitle,
          body: trimmedBody,
        });
      }

      return reviewsApi.create({
        userId: currentUser.id,
        gameId: parsedGameId,
        rating,
        title: trimmedTitle,
        body: trimmedBody,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setIsModalOpen(false);
      setEditingReview(null);
      setFormError(null);
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (review: Review) => reviewsApi.remove(review.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setReviewToDelete(null);
    },
  });

  return (
    <section data-testid="reviews-page" className="page-container py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF2A5F]">
            Comunidad
          </span>
          <h1 className="mt-1 text-heading-sm font-extrabold text-[#0F172A]">Reseñas de jugadores</h1>
          <p className="mt-2 max-w-2xl text-body-sm text-[#475569]">
            Opiniones reales de la comunidad. El backend marca automáticamente las compras
            verificadas consultando la biblioteca del jugador.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentUser ? (
            <Button
              variant="brand"
              data-testid="reviews-create-btn"
              onClick={openCreate}
            >
              Escribir reseña
            </Button>
          ) : (
            <p className="text-caption font-medium text-[#475569]">
              Inicia sesión desde la barra superior para publicar una reseña.
            </p>
          )}
        </div>
      </header>

      <div className="mt-6 max-w-xs">
        <Select
          label="Filtrar por videojuego"
          name="gameFilter"
          data-testid="reviews-game-filter"
          value={gameFilter}
          onChange={(event) => setGameFilter(event.target.value)}
          placeholder="Todos los videojuegos"
          options={(gamesQuery.data ?? []).map((game) => ({
            value: game.id,
            label: game.title,
          }))}
        />
      </div>

      <div className="mt-8">
        {reviewsQuery.isLoading && <Spinner label="Cargando reseñas…" />}

        {reviewsQuery.isError && (
          <ErrorBanner
            message={errorMessage(reviewsQuery.error)}
            onRetry={() => void reviewsQuery.refetch()}
          />
        )}

        {reviewsQuery.isSuccess && filteredReviews.length === 0 && (
          <EmptyState
            title="Sin reseñas"
            description="Todavía no hay reseñas publicadas para este criterio."
            action={
              currentUser ? (
                <Button variant="brand" onClick={openCreate}>
                  Escribir la primera
                </Button>
              ) : undefined
            }
          />
        )}

        {filteredReviews.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredReviews.map((review) => {
              const canManage = Boolean(
                currentUser && (isAdmin || review.user?.id === currentUser.id),
              );

              return (
                <article
                  key={review.id}
                  data-testid={`review-card-${review.id}`}
                  className="flex flex-col justify-between gap-4 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-5 shadow-xs"
                >
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-body font-bold text-[#0F172A]">{review.title}</h2>
                        {review.game && (
                          <Link
                            to={`/games/${review.game.id}`}
                            className="text-caption font-semibold text-[#1E1B4B] hover:text-[#FF2A5F]"
                          >
                            {review.game.title}
                          </Link>
                        )}
                      </div>
                      <RatingStars value={review.rating} size={15} />
                    </div>

                    <p className="mt-3 text-body-sm text-[#475569]">{review.body}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] pt-3 text-caption text-[#94A3B8]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#0F172A]">
                        {review.user?.username ?? 'Jugador'}
                      </span>
                      {review.isVerifiedPurchase && (
                        <Badge tone="success">Compra verificada</Badge>
                      )}
                      <span>· {formatDate(review.createdAt)}</span>
                    </div>

                    {canManage && (
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(review)}
                          className="font-semibold text-[#1E1B4B] hover:text-[#FF2A5F]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewToDelete(review)}
                          className="font-semibold text-[#EF4444] hover:text-[#991B1B]"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingReview ? 'Editar reseña' : 'Escribir reseña'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="brand"
              isLoading={saveMutation.isPending}
              onClick={() => {
                setFormError(null);
                saveMutation.mutate();
              }}
            >
              {editingReview ? 'Guardar cambios' : 'Publicar'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {formError && <ErrorBanner message={formError} />}

          {!editingReview && (
            <Select
              label="Videojuego"
              name="gameId"
              value={gameId}
              onChange={(event) => setGameId(event.target.value)}
              placeholder="Selecciona un videojuego"
              options={(gamesQuery.data ?? []).map((game) => ({
                value: game.id,
                label: game.title,
              }))}
            />
          )}

          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-semibold text-[#0F172A]">Calificación</span>
            <RatingStars value={rating} interactive onChange={setRating} />
          </div>

          <Input
            label="Título"
            name="reviewTitle"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Resumen de tu opinión"
            maxLength={150}
          />

          <Textarea
            label="Reseña"
            name="reviewBody"
            rows={4}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="¿Qué te pareció el juego?"
          />
        </div>
      </Modal>

      <Modal
        isOpen={reviewToDelete !== null}
        onClose={() => setReviewToDelete(null)}
        title="Eliminar reseña"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => reviewToDelete && deleteMutation.mutate(reviewToDelete)}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-[#475569]">
          ¿Seguro que quieres eliminar la reseña «{reviewToDelete?.title}»?
        </p>
        {deleteMutation.isError && (
          <div className="mt-4">
            <ErrorBanner message={errorMessage(deleteMutation.error)} />
          </div>
        )}
      </Modal>
    </section>
  );
}
