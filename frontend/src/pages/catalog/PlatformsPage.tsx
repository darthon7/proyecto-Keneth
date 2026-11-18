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
      defaultViewMode="cards"
      cardGridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
      renderCard={(platform, { openEdit, openDelete }) => (
        <article
          key={platform.id}
          className="flex flex-col justify-between gap-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs p-4 transition-shadow hover:shadow-md"
        >
          <div>
            <div className="flex items-center justify-center rounded-xl bg-[#F4F4F6] border border-[#E2E8F0] mb-3 h-32 w-full">
              {platform.iconUrl ? (
                <img
                  src={platform.iconUrl}
                  alt={`Icono de ${platform.name}`}
                  className="h-24 w-auto max-w-[80%] object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-3xl font-black text-[#94A3B8]">
                  {platform.code.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-body-lg font-bold text-[#0F172A] leading-tight">
                {platform.name}
              </h3>
              <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-2.5 py-1 text-caption font-semibold text-[#475569] whitespace-nowrap">
                {platform.editions?.length ?? 0} ediciones
              </span>
            </div>
            <dl className="mt-2.5 text-body-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#64748B]">Código</dt>
                <dd className="font-semibold text-[#0F172A]">{platform.code}</dd>
              </div>
            </dl>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-[#E2E8F0] pt-3">
            <button
              type="button"
              data-testid={`crud-edit-btn-${platform.id}`}
              onClick={() => openEdit(platform)}
              className="text-body-sm font-semibold text-[#1E1B4B] transition-colors hover:text-[#FF2A5F] cursor-pointer"
            >
              Editar
            </button>
            <button
              type="button"
              data-testid={`crud-delete-btn-${platform.id}`}
              onClick={() => openDelete(platform)}
              className="text-body-sm font-semibold text-[#EF4444] transition-colors hover:text-[#991B1B] cursor-pointer"
            >
              Eliminar
            </button>
          </div>
        </article>
      )}
    />
  );
}
