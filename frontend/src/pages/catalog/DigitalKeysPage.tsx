import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { Badge } from '@/components/atoms/Badge';
import { digitalKeysApi, gameEditionsApi } from '@/api';
import type { CreateDigitalKeyPayload, DigitalKey } from '@/types';
import { formatDateTime, humanizeEnum } from '@/utils/format';
import type { FieldConfig } from '@/utils/fields';

export function DigitalKeysPage({ embedded = false }: { embedded?: boolean }) {
  const editionsQuery = useQuery({
    queryKey: ['game-editions'],
    queryFn: () => gameEditionsApi.list(),
  });

  const fields = useMemo<FieldConfig[]>(
    () => [
      { name: 'code', label: 'Código de la llave', type: 'text', required: true, maxLength: 255 },
      {
        name: 'codeHash',
        label: 'Hash del código',
        type: 'text',
        required: true,
        maxLength: 64,
        help: 'Huella única del código (máx. 64 caracteres)',
      },
      {
        name: 'status',
        label: 'Estado',
        type: 'select',
        options: [
          { value: 'AVAILABLE', label: 'Disponible' },
          { value: 'RESERVED', label: 'Reservada' },
          { value: 'ASSIGNED', label: 'Asignada' },
          { value: 'REVOKED', label: 'Revocada' },
        ],
        defaultValue: 'AVAILABLE',
      },
      { name: 'batchId', label: 'Lote', type: 'text', maxLength: 50 },
      {
        name: 'gameEditionId',
        label: 'Edición',
        type: 'select',
        required: true,
        options: (editionsQuery.data ?? []).map((edition) => ({
          value: edition.id,
          label: `${edition.game?.title ?? 'Juego'} · ${edition.platform?.name ?? ''} · ${edition.editionName}`,
        })),
      },
    ],
    [editionsQuery.data],
  );

  return (
    <CrudResourcePage<DigitalKey, CreateDigitalKeyPayload>
      embedded={embedded}
      title="Llaves digitales"
      description="Códigos de activación que el backend asigna automáticamente al crear una orden."
      queryKey={['digital-keys']}
      fetchList={() => digitalKeysApi.list()}
      createItem={(payload) => digitalKeysApi.create(payload)}
      updateItem={(id, payload) => digitalKeysApi.update(id, payload)}
      deleteItem={(id) => digitalKeysApi.remove(id)}
      fields={fields}
      columns={[
        { header: 'Código', render: (key) => <span className="font-mono text-caption">{key.code}</span> },
        {
          header: 'Edición',
          className: 'text-fog',
          render: (key) => key.gameEdition?.game?.title ?? '—',
        },
        {
          header: 'Estado',
          render: (key) => (
            <Badge
              tone={
                key.status === 'AVAILABLE'
                  ? 'success'
                  : key.status === 'ASSIGNED'
                    ? 'blue'
                    : key.status === 'REVOKED'
                      ? 'danger'
                      : 'warning'
              }
            >
              {humanizeEnum(key.status)}
            </Badge>
          ),
        },
        { header: 'Lote', className: 'text-fog', render: (key) => key.batchId ?? '—' },
        {
          header: 'Actualizada',
          className: 'text-fog',
          render: (key) => formatDateTime(key.updatedAt),
        },
      ]}
      toFormValues={(key) => ({
        code: key.code,
        codeHash: key.codeHash,
        status: key.status,
        batchId: key.batchId ?? '',
        gameEditionId: key.gameEdition?.id ?? '',
      })}
      getId={(key) => key.id}
    />
  );
}
