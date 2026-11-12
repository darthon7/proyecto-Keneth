import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { Badge } from '@/components/atoms/Badge';
import { gamesApi, gameEditionsApi, platformsApi } from '@/api';
import type { CreateGameEditionPayload, GameEdition } from '@/types';
import { formatCurrency, humanizeEnum } from '@/utils/format';
import type { FieldConfig } from '@/utils/fields';

export function EditionsPage() {
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
        name: 'format',
        label: 'Formato',
        type: 'select',
        required: true,
        options: [
          { value: 'DIGITAL', label: 'Digital' },
          { value: 'PHYSICAL', label: 'Físico' },
        ],
        defaultValue: 'DIGITAL',
      },
      {
        name: 'basePrice',
        label: 'Precio base',
        type: 'number',
        required: true,
        min: 0,
        step: 0.01,
      },
      { name: 'isDlc', label: 'Es DLC', type: 'checkbox', defaultValue: false },
      {
        name: 'stockPhysical',
        label: 'Stock físico',
        type: 'number',
        min: 0,
        help: 'Solo aplica a ediciones físicas',
      },
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
      title="Ediciones (SKUs)"
      description="Cada edición conecta un videojuego con una plataforma y define precio, formato y stock físico."
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
          header: 'Formato',
          render: (edition) => (
            <Badge tone={edition.format === 'DIGITAL' ? 'blue' : 'neutral'}>
              {humanizeEnum(edition.format)}
            </Badge>
          ),
        },
        {
          header: 'Precio',
          className: 'text-fog',
          render: (edition) => formatCurrency(edition.basePrice),
        },
        {
          header: 'Stock',
          className: 'text-fog',
          render: (edition) =>
            edition.format === 'PHYSICAL' ? String(edition.stockPhysical) : '—',
        },
      ]}
      toFormValues={(edition) => ({
        editionName: edition.editionName,
        format: edition.format,
        basePrice: edition.basePrice,
        isDlc: edition.isDlc,
        stockPhysical: edition.stockPhysical,
        gameId: edition.game?.id ?? '',
        platformId: edition.platform?.id ?? '',
      })}
      getId={(edition) => edition.id}
      emptyMessage="Crea una edición para asociar un juego con una plataforma."
    />
  );
}
