import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { Badge } from '@/components/atoms/Badge';
import { gamesApi, gameEditionsApi, platformsApi } from '@/api';
import { KeyStatus, type CreateGameEditionPayload, type GameEdition } from '@/types';
import { formatCurrency } from '@/utils/format';
import type { FieldConfig } from '@/utils/fields';

export function EditionsPage({ embedded = false }: { embedded?: boolean }) {
  const gamesQuery = useQuery({ queryKey: ['games'], queryFn: () => gamesApi.list() });
  const platformsQuery = useQuery({
    queryKey: ['platforms'],
    queryFn: () => platformsApi.list(),
  });

  const fields = useMemo<FieldConfig[]>(
    () => [
      {
        name: 'editionName',
        label: 'Nombre de la edición',
        type: 'text',
        maxLength: 100,
        defaultValue: 'Standard Edition',
      },
      {
        name: 'basePrice',
        label: 'Precio base',
        type: 'number',
        required: true,
        min: 0,
        step: 0.01,
      },
      { name: 'isDlc', label: 'Es DLC digital', type: 'checkbox', defaultValue: false },
      {
        name: 'gameId',
        label: 'Videojuego',
        type: 'select',
        required: true,
        options: (gamesQuery.data ?? []).map((game) => ({ value: game.id, label: game.title })),
      },
      {
        name: 'platformId',
        label: 'Plataforma',
        type: 'select',
        required: true,
        options: (platformsQuery.data ?? []).map((platform) => ({
          value: platform.id,
          label: platform.name,
        })),
      },
    ],
    [gamesQuery.data, platformsQuery.data],
  );

  return (
    <CrudResourcePage<GameEdition, CreateGameEditionPayload>
      embedded={embedded}
      title="Ediciones Digitales y DLCs"
      description="Configura ediciones y DLCs digitales por plataforma y supervisa su stock de claves disponibles."
      queryKey={['game-editions']}
      fetchList={() => gameEditionsApi.list()}
      createItem={(payload) => gameEditionsApi.create(payload)}
      updateItem={(id, payload) => gameEditionsApi.update(id, payload)}
      deleteItem={(id) => gameEditionsApi.remove(id)}
      fields={fields}
      columns={[
        { header: 'Edición', render: (edition) => edition.editionName },
        {
          header: 'Videojuego',
          className: 'text-fog',
          render: (edition) => edition.game?.title ?? '—',
        },
        {
          header: 'Plataforma',
          className: 'text-fog',
          render: (edition) => edition.platform?.name ?? '—',
        },
        {
          header: 'Tipo',
          render: (edition) => (
            <Badge tone={edition.isDlc ? 'warning' : 'blue'}>
              {edition.isDlc ? 'DLC Digital' : 'Juego Digital'}
            </Badge>
          ),
        },
        {
          header: 'Precio',
          className: 'text-fog',
          render: (edition) => formatCurrency(edition.basePrice),
        },
        {
          header: 'Stock Digital',
          render: (edition) => {
            const available = (edition.digitalKeys ?? []).filter(
              (key) => key.status === KeyStatus.AVAILABLE,
            ).length;
            return (
              <Badge tone={available > 0 ? 'success' : 'danger'}>
                {available > 0 ? `${available} disponibles` : 'Agotado (0)'}
              </Badge>
            );
          },
        },
      ]}
      toFormValues={(edition) => ({
        editionName: edition.editionName,
        basePrice: edition.basePrice,
        isDlc: edition.isDlc,
        gameId: edition.game?.id ?? '',
        platformId: edition.platform?.id ?? '',
      })}
      getId={(edition) => edition.id}
      emptyMessage="Crea una edición digital para asociar un juego con una plataforma."
    />
  );
}
