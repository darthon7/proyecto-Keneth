import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { Badge } from '@/components/atoms/Badge';
import { gamesApi, systemRequirementsApi } from '@/api';
import type { CreateSystemRequirementPayload, SystemRequirement } from '@/types';
import { humanizeEnum } from '@/utils/format';
import type { FieldConfig } from '@/utils/fields';

export function SystemRequirementsPage() {
  const gamesQuery = useQuery({ queryKey: ['games'], queryFn: () => gamesApi.list() });

  const fields = useMemo<FieldConfig[]>(
    () => [
      {
        name: 'tier',
        label: 'Nivel',
        type: 'select',
        required: true,
        options: [
          { value: 'MINIMUM', label: 'Mínimo' },
          { value: 'RECOMMENDED', label: 'Recomendado' },
          { value: 'ULTRA_RAYTRACING', label: 'Ultra ray tracing' },
        ],
        defaultValue: 'MINIMUM',
      },
      { name: 'os', label: 'Sistema operativo', type: 'text', required: true, maxLength: 100 },
      { name: 'processor', label: 'Procesador', type: 'text', required: true, maxLength: 150 },
      { name: 'ramGb', label: 'Memoria RAM (GB)', type: 'number', required: true, min: 1 },
      {
        name: 'graphicsCard',
        label: 'Tarjeta de video',
        type: 'text',
        required: true,
        maxLength: 150,
      },
      { name: 'storageGb', label: 'Almacenamiento (GB)', type: 'number', required: true, min: 1 },
      { name: 'directxVersion', label: 'Versión de DirectX', type: 'text', maxLength: 50 },
      {
        name: 'gameId',
        label: 'Videojuego',
        type: 'select',
        required: true,
        options: (gamesQuery.data ?? []).map((game) => ({ value: game.id, label: game.title })),
      },
    ],
    [gamesQuery.data],
  );

  return (
    <CrudResourcePage<SystemRequirement, CreateSystemRequirementPayload>
      title="Requisitos del sistema"
      description="Niveles mínimos, recomendados y ultra para cada videojuego del catálogo."
      queryKey={['system-requirements']}
      fetchList={() => systemRequirementsApi.list()}
      createItem={(payload) => systemRequirementsApi.create(payload)}
      updateItem={(id, payload) => systemRequirementsApi.update(id, payload)}
      deleteItem={(id) => systemRequirementsApi.remove(id)}
      fields={fields}
      columns={[
        {
          header: 'Videojuego',
          render: (requirement) => requirement.game?.title ?? '—',
        },
        {
          header: 'Nivel',
          render: (requirement) => <Badge tone="blue">{humanizeEnum(requirement.tier)}</Badge>,
        },
        { header: 'SO', className: 'text-fog', render: (requirement) => requirement.os },
        { header: 'CPU', className: 'text-fog', render: (requirement) => requirement.processor },
        { header: 'GPU', className: 'text-fog', render: (requirement) => requirement.graphicsCard },
        {
          header: 'RAM / Almacenamiento',
          className: 'text-fog',
          render: (requirement) => `${requirement.ramGb} GB / ${requirement.storageGb} GB`,
        },
      ]}
      toFormValues={(requirement) => ({
        tier: requirement.tier,
        os: requirement.os,
        processor: requirement.processor,
        ramGb: requirement.ramGb,
        graphicsCard: requirement.graphicsCard,
        storageGb: requirement.storageGb,
        directxVersion: requirement.directxVersion ?? '',
        gameId: requirement.game?.id ?? '',
      })}
      getId={(requirement) => requirement.id}
    />
  );
}
