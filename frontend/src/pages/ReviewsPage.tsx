import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { RatingStars } from '@/components/atoms/RatingStars';
import { gamesApi, reviewsApi, usersApi } from '@/api';
import type { CreateReviewPayload, Review } from '@/types';
import { formatDate } from '@/utils/format';
import type { FieldConfig } from '@/utils/fields';

export function ReviewsPage() {
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() });
  const gamesQuery = useQuery({ queryKey: ['games'], queryFn: () => gamesApi.list() });

  const fields = useMemo<FieldConfig[]>(
    () => [
      {
        name: 'userId',
        label: 'Usuario',
        type: 'select',
        required: true,
        options: (usersQuery.data ?? []).map((user) => ({
          value: user.id,
          label: user.username,
        })),
      },
      {
        name: 'gameId',
        label: 'Videojuego',
        type: 'select',
        required: true,
        options: (gamesQuery.data ?? []).map((game) => ({ value: game.id, label: game.title })),
      },
      {
        name: 'rating',
        label: 'Calificación (1-5)',
        type: 'number',
        required: true,
        min: 1,
        max: 5,
        step: 1,
      },
      { name: 'title', label: 'Título', type: 'text', required: true, maxLength: 150 },
      { name: 'body', label: 'Reseña', type: 'textarea', required: true },
      { name: 'helpfulCount', label: 'Votos útiles', type: 'number', min: 0 },
    ],
    [usersQuery.data, gamesQuery.data],
  );

  return (
    <CrudResourcePage<Review, CreateReviewPayload>
      title="Reseñas"
      description="El backend marca automáticamente la compra verificada consultando la biblioteca del usuario."
      queryKey={['reviews']}
      fetchList={() => reviewsApi.list()}
      createItem={(payload) => reviewsApi.create(payload)}
      updateItem={(id, payload) => reviewsApi.update(id, payload)}
      deleteItem={(id) => reviewsApi.remove(id)}
      fields={fields}
      columns={[
        { header: 'Título', render: (review) => review.title },
        {
          header: 'Juego',
          className: 'text-fog',
          render: (review) => review.game?.title ?? '—',
        },
        {
          header: 'Usuario',
          className: 'text-fog',
          render: (review) => review.user?.username ?? '—',
        },
        {
          header: 'Calificación',
          render: (review) => <RatingStars value={review.rating} size={14} />,
        },
        {
          header: 'Verificada',
          className: 'text-fog',
          render: (review) => (review.isVerifiedPurchase ? 'Sí' : 'No'),
        },
        {
          header: 'Fecha',
          className: 'text-fog',
          render: (review) => formatDate(review.createdAt),
        },
      ]}
      toFormValues={(review) => ({
        userId: review.user?.id ?? '',
        gameId: review.game?.id ?? '',
        rating: review.rating,
        title: review.title,
        body: review.body,
        helpfulCount: review.helpfulCount,
      })}
      getId={(review) => review.id}
    />
  );
}
