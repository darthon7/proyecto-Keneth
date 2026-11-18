import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { developersApi } from '@/api';
import type { CreateDeveloperPayload, Developer } from '@/types';
import { VALIDATION_PATTERNS, type FieldConfig } from '@/utils/fields';

const fields: FieldConfig[] = [
  {
    name: 'name',
    label: 'Nombre',
    type: 'text',
    required: true,
    maxLength: 150,
    pattern: VALIDATION_PATTERNS.ENTITY_NAME,
    patternMessage: 'Nombre contiene caracteres no válidos',
  },
  {
    name: 'country',
    label: 'País (ISO-2)',
    type: 'text',
    minLength: 2,
    maxLength: 2,
    placeholder: 'JP',
    pattern: VALIDATION_PATTERNS.ISO_COUNTRY,
    patternMessage: 'El país debe ser un código ISO-2 de 2 letras (ej. JP, MX)',
  },
  {
    name: 'foundedYear',
    label: 'Año de fundación',
    type: 'number',
    min: 1950,
    max: 2100,
    help: 'Entre 1950 y 2100',
  },
  {
    name: 'coverImagenUrl',
    label: 'URL de imagen de portada',
    type: 'text',
    maxLength: 500,
    placeholder: 'https://.../portada.jpg',
    pattern: VALIDATION_PATTERNS.HTTP_URL,
    patternMessage: 'Ingresa una URL http(s):// válida',
  },
];

export function DevelopersPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <CrudResourcePage<Developer, CreateDeveloperPayload>
      embedded={embedded}
      title="Desarrolladoras"
      description="Estudios que desarrollan los videojuegos del catálogo. Se relacionan 1:N con los juegos."
      queryKey={['developers']}
      fetchList={() => developersApi.list()}
      createItem={(payload) => developersApi.create(payload)}
      updateItem={(id, payload) => developersApi.update(id, payload)}
      deleteItem={(id) => developersApi.remove(id)}
      fields={fields}
      columns={[
        { header: 'Nombre', render: (developer) => developer.name },
        { header: 'País', render: (developer) => developer.country ?? '—', className: 'text-fog' },
        {
          header: 'Fundación',
          className: 'text-fog',
          render: (developer) => (developer.foundedYear ? String(developer.foundedYear) : '—'),
        },
        {
          header: 'Juegos',
          className: 'text-fog',
          render: (developer) => String(developer.games?.length ?? 0),
        },
      ]}
      toFormValues={(developer) => ({
        name: developer.name,
        country: developer.country ?? '',
        foundedYear: developer.foundedYear ?? '',
        coverImagenUrl: developer.coverImagenUrl ?? '',
      })}
      getId={(developer) => developer.id}
      defaultViewMode="cards"
      cardGridClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      renderCard={(developer, { openEdit, openDelete }) => (
        <article
          key={developer.id}
          className="flex flex-col justify-between gap-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs p-5 transition-shadow hover:shadow-md"
        >
          <div>
            {developer.coverImagenUrl && (
              <img
                src={developer.coverImagenUrl}
                alt={`Portada de ${developer.name}`}
                className="mb-3 h-36 w-full rounded-xl object-cover border border-[#E2E8F0]"
                loading="lazy"
              />
            )}
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-body-lg font-bold text-[#0F172A] leading-tight">
                {developer.name}
              </h3>
            </div>
            <dl className="mt-3 space-y-1.5 text-body-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#64748B]">País</dt>
                <dd className="font-semibold text-[#0F172A]">{developer.country ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#64748B]">Fundación</dt>
                <dd className="font-semibold text-[#0F172A]">
                  {developer.foundedYear ? String(developer.foundedYear) : '—'}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-[#E2E8F0] pt-3">
            <button
              type="button"
              data-testid={`crud-edit-btn-${developer.id}`}
              onClick={() => openEdit(developer)}
              className="text-body-sm font-semibold text-[#1E1B4B] transition-colors hover:text-[#FF2A5F] cursor-pointer"
            >
              Editar
            </button>
            <button
              type="button"
              data-testid={`crud-delete-btn-${developer.id}`}
              onClick={() => openDelete(developer)}
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
