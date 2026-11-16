import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { Modal } from '@/components/atoms/Modal';
import { RatingStars } from '@/components/atoms/RatingStars';
import { Spinner } from '@/components/atoms/Spinner';
import { Textarea } from '@/components/atoms/Textarea';
import { errorMessage, reviewsApi } from '@/api';
import type { Review, SafeUser } from '@/types';
import { formatDate } from '@/utils/format';
import { reviewFormSchema, type ReviewFormValues } from '@/utils/schemas';

const DEFAULT_REVIEW: ReviewFormValues = {
  rating: 5,
  title: '',
  body: '',
};

interface GameReviewsSectionProps {
  gameId: number;
  gameTitle: string;
  reviews: Review[];
  isLoading: boolean;
  currentUser: SafeUser | null;
}

export function GameReviewsSection({
  gameId,
  gameTitle,
  reviews,
  isLoading,
  currentUser,
}: GameReviewsSectionProps) {
  const queryClient = useQueryClient();
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: DEFAULT_REVIEW,
  });

  const { reset } = form;
  const { errors } = form.formState;
  const watchedRating = form.watch('rating');

  const positivePercent =
    reviews.length > 0
      ? Math.round((reviews.filter((r) => r.rating >= 4).length / reviews.length) * 100)
      : 0;

  const reviewMutation = useMutation({
    mutationFn: (values: ReviewFormValues) =>
      reviewsApi.create({
        userId: currentUser!.id,
        gameId,
        rating: values.rating,
        title: values.title,
        body: values.body,
      }),
    onSuccess: async () => {
      setIsReviewOpen(false);
      reset(DEFAULT_REVIEW);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const handleOpenReview = () => {
    setFormError(null);
    reset(DEFAULT_REVIEW);
    setIsReviewOpen(true);
  };

  const handlePublishReview = form.handleSubmit((values) => {
    setFormError(null);
    reviewMutation.mutate(values);
  });

  return (
    <>
      <section
        aria-labelledby="game-reviews-heading"
        className="mt-10 border-t border-[#E2E8F0] pt-8 space-y-5"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {currentUser ? (
              <Button variant="outline" size="sm" onClick={handleOpenReview}>
                Escribir una reseña
              </Button>
            ) : (
              <p className="text-xs font-medium text-[#64748B]">
                Inicia sesión para escribir una reseña.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <h2 id="game-reviews-heading" className="text-xl font-black text-[#0F172A]">
              Opiniones de la comunidad ({reviews.length})
            </h2>
            {reviews.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="h-2 w-44 overflow-hidden rounded-full bg-[#E2E8F0]">
                  <div
                    className="h-full rounded-full bg-[#1E1B4B]"
                    style={{ width: `${positivePercent}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-[#475569]">
                  {positivePercent}% de comentarios positivos
                </span>
              </div>
            ) : (
              <p className="text-xs text-[#475569]">
                Opiniones verificadas y comentarios de la comunidad sobre {gameTitle}.
              </p>
            )}
          </div>
        </div>

        {isLoading && <Spinner label="Cargando reseñas…" />}
        {!isLoading && reviews.length === 0 && (
          <EmptyState
            title="Sin reseñas"
            description="Sé la primera persona en opinar sobre este juego."
          />
        )}
        {reviews.length > 0 && (
          <div className="grid gap-4 grid-cols-3">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-4 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0F172A] truncate">
                        {review.user?.username ?? 'Usuario'}
                      </p>
                      <div className="mt-0.5">
                        <RatingStars value={review.rating} />
                      </div>
                    </div>
                    {review.isVerifiedPurchase && <Badge tone="success">Verificada</Badge>}
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-[#0F172A]">{review.title}</h3>
                  <p className="mt-1 text-body-sm text-[#475569] line-clamp-3">{review.body}</p>
                </div>
                <p className="mt-3 text-[11px] text-[#94A3B8]">{formatDate(review.createdAt)}</p>
              </article>
            ))}
          </div>
        )}
      </section>

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
              onClick={handlePublishReview}
            >
              Publicar
            </Button>
          </>
        }
      >
        <form onSubmit={handlePublishReview} className="flex flex-col gap-4" noValidate>
          {formError && <ErrorBanner message={formError} />}

          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-semibold text-[#0F172A]">Calificación</span>
            <RatingStars
              value={watchedRating}
              interactive
              onChange={(value) =>
                form.setValue('rating', value, { shouldValidate: form.formState.isSubmitted })
              }
            />
            {errors.rating && <p className="text-caption text-[#EF4444]">{errors.rating.message}</p>}
          </div>

          <Input
            label="Título"
            placeholder="Resumen de tu opinión"
            error={errors.title?.message}
            {...form.register('title')}
          />

          <Textarea
            label="Reseña"
            rows={5}
            placeholder="¿Qué te pareció el juego?"
            error={errors.body?.message}
            {...form.register('body')}
          />
        </form>
      </Modal>
    </>
  );
}
