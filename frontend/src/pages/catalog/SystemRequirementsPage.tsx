import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { Badge } from '@/components/atoms/Badge';
import { gamesApi, systemRequirementsApi } from '@/api';
import type { CreateSystemRequirementPayload, SystemRequirement } from '@/types';
import { humanizeEnum } from '@/utils/format';
import { VALIDATION_PATTERNS, type FieldConfig } from '@/utils/fields';

export function SystemRequirementsPage({ embedded = false }: { embedded?: boolean }) {
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
      {
        name: 'os',
        label: 'Sistema operativo',
        type: 'text',
        required: true,
        maxLength: 100,
        pattern: VALIDATION_PATTERNS.HARDWARE_SPEC,
        patternMessage: 'Sistema operativo contiene caracteres no válidos',
      },
      {
        name: 'processor',
        label: 'Procesador',
        type: 'text',
        required: true,
        maxLength: 150,
        pattern: VALIDATION_PATTERNS.HARDWARE_SPEC,
        patternMessage: 'Procesador contiene caracteres no válidos',
      },
      { name: 'ramGb', label: 'Memoria RAM (GB)', type: 'number', required: true, min: 1, max: 512 },
      {
        name: 'graphicsCard',
        label: 'Tarjeta de video',
        type: 'text',
        required: true,
        maxLength: 150,
        pattern: VALIDATION_PATTERNS.HARDWARE_SPEC,
        patternMessage: 'Tarjeta de video contiene caracteres no válidos',
      },
      { name: 'storageGb', label: 'Almacenamiento (GB)', type: 'number', required: true, min: 1, max: 10000 },
      {
        name: 'directxVersion',
        label: 'Versión de DirectX',
        type: 'text',
        maxLength: 50,
        pattern: VALIDATION_PATTERNS.DIRECTX_VERSION,
        patternMessage: 'Versión de DirectX inválida (ej. DirectX 12)',
      },
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
      embedded={embedded}
      title="Requisitos Técnicos (PC)"
      description="Especificaciones técnicas mínimas, recomendadas y ultra aplicables a versiones de PC."
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
