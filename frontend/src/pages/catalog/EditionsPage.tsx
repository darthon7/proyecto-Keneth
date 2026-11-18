import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { Badge } from '@/components/atoms/Badge';
import { gamesApi, gameEditionsApi, platformsApi } from '@/api';
import type { CreateGameEditionPayload, GameEdition } from '@/types';
import { countAvailableKeys } from '@/utils/domain';
import { formatCurrency } from '@/utils/format';
import { VALIDATION_PATTERNS, type FieldConfig } from '@/utils/fields';

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
        required: true,
        minLength: 2,
        maxLength: 100,
        pattern: VALIDATION_PATTERNS.ENTITY_NAME,
        patternMessage: 'El nombre de edición contiene caracteres no válidos',
        defaultValue: 'Standard Edition',
      },
      {
        name: 'basePrice',
        label: 'Precio base',
        type: 'number',
        required: true,
        min: 0,
        max: 99999.99,
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
      description="Cada edición conecta un videojuego con una plataforma de la tienda (ej. Elden Ring en Steam). Crea aquí las versiones estándar, Deluxe o DLCs, define su precio y consulta cuántas claves digitales quedan por vender."
      queryKey={['game-editions']}
      fetchList={() => gameEditionsApi.list()}
      createItem={(payload) => gameEditionsApi.create(payload)}
      updateItem={(id, payload) => gameEditionsApi.update(id, payload)}
      deleteItem={(id) => gameEditionsApi.remove(id)}
      fields={fields}
      columns={[
        { header: 'Nombre de la edición', render: (edition) => edition.editionName },
        {
          header: 'Videojuego al que pertenece',
          className: 'text-fog',
          render: (edition) => edition.game?.title ?? '—',
        },
        {
          header: 'Plataforma donde se vende',
          className: 'text-fog',
          render: (edition) => edition.platform?.name ?? '—',
        },
        {
          header: 'Tipo de contenido',
          render: (edition) => (
            <Badge tone={edition.isDlc ? 'warning' : 'blue'}>
              {edition.isDlc ? 'DLC (contenido extra)' : 'Juego completo'}
            </Badge>
          ),
        },
        {
          header: 'Precio base',
          className: 'text-fog',
          render: (edition) => formatCurrency(edition.basePrice),
        },
        {
          header: 'Stock de claves digitales',
          render: (edition) => {
            const available = countAvailableKeys(edition);
            return (
              <Badge tone={available > 0 ? 'success' : 'danger'}>
                {available > 0 ? `${available} claves por vender` : 'Agotado (0 claves)'}
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
