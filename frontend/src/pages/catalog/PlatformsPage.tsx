import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { platformsApi } from '@/api';
import type { CreatePlatformPayload, Platform } from '@/types';
import { VALIDATION_PATTERNS, type FieldConfig } from '@/utils/fields';

const fields: FieldConfig[] = [
  {
    name: 'name',
    label: 'Nombre',
    type: 'text',
    required: true,
    maxLength: 50,
    pattern: VALIDATION_PATTERNS.ENTITY_NAME,
    patternMessage: 'Nombre contiene caracteres no válidos',
  },
  {
    name: 'code',
    label: 'Código',
    type: 'text',
    required: true,
    maxLength: 20,
    pattern: VALIDATION_PATTERNS.PLATFORM_CODE,
    patternMessage: 'El código solo permite letras, números, guiones y guion bajo (2 a 20 caracteres)',
    help: 'Código corto, por ejemplo PC, PS5, XBOX',
  },
  {
    name: 'iconUrl',
    label: 'Icono (URL)',
    type: 'text',
    maxLength: 255,
    placeholder: 'https://…',
    pattern: VALIDATION_PATTERNS.URL_OR_PATH,
    patternMessage: 'Ingresa una URL http(s):// válida o ruta relativa /...',
  },
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
