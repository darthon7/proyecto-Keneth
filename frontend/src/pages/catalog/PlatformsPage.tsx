import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { platformsApi } from '@/api';
import type { CreatePlatformPayload, Platform } from '@/types';
import type { FieldConfig } from '@/utils/fields';

const fields: FieldConfig[] = [
  { name: 'name', label: 'Nombre', type: 'text', required: true, maxLength: 50 },
  {
    name: 'code',
    label: 'Código',
    type: 'text',
    required: true,
    maxLength: 20,
    help: 'Código corto, por ejemplo PC, PS5, XBOX',
  },
  { name: 'iconUrl', label: 'Icono (URL)', type: 'text', placeholder: 'https://…' },
];

export function PlatformsPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <CrudResourcePage<Platform, CreatePlatformPayload>
      embedded={embedded}
      title="Plataformas"
      description="Plataformas donde se lanzan las ediciones de cada videojuego."
      queryKey={['platforms']}
      fetchList={() => platformsApi.list()}
      createItem={(payload) => platformsApi.create(payload)}
      updateItem={(id, payload) => platformsApi.update(id, payload)}
      deleteItem={(id) => platformsApi.remove(id)}
      fields={fields}
      columns={[
        { header: 'Nombre', render: (platform) => platform.name },
        { header: 'Código', className: 'text-fog', render: (platform) => platform.code },
        {
          header: 'Ediciones',
          className: 'text-fog',
          render: (platform) => String(platform.editions?.length ?? 0),
        },
      ]}
      toFormValues={(platform) => ({
        name: platform.name,
        code: platform.code,
        iconUrl: platform.iconUrl ?? '',
      })}
      getId={(platform) => platform.id}
    />
  );
}
