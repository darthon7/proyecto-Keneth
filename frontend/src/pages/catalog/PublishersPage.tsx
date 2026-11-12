import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { publishersApi } from '@/api';
import type { CreatePublisherPayload, Publisher } from '@/types';
import type { FieldConfig } from '@/utils/fields';

const fields: FieldConfig[] = [
  { name: 'name', label: 'Nombre', type: 'text', required: true, maxLength: 150 },
  { name: 'websiteUrl', label: 'Sitio web', type: 'text', placeholder: 'https://…' },
  { name: 'supportEmail', label: 'Correo de soporte', type: 'email' },
  { name: 'country', label: 'País (ISO-2)', type: 'text', minLength: 2, maxLength: 2, placeholder: 'MX' },
];

export function PublishersPage() {
  return (
    <CrudResourcePage<Publisher, CreatePublisherPayload>
      title="Publishers"
      description="Las empresas que publican los videojuegos del catálogo. Se relacionan 1:N con los juegos."
      queryKey={['publishers']}
      fetchList={() => publishersApi.list()}
      createItem={(payload) => publishersApi.create(payload)}
      updateItem={(id, payload) => publishersApi.update(id, payload)}
      deleteItem={(id) => publishersApi.remove(id)}
      fields={fields}
      columns={[
        { header: 'Nombre', render: (publisher) => publisher.name },
        { header: 'País', render: (publisher) => publisher.country ?? '—', className: 'text-fog' },
        {
          header: 'Sitio web',
          className: 'text-fog',
          render: (publisher) =>
            publisher.websiteUrl ? (
              <a
                href={publisher.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#1E1B4B] font-medium hover:text-[#FF2A5F] underline-offset-2 hover:underline"
              >
                {publisher.websiteUrl}
              </a>
            ) : (
              '—'
            ),
        },
        {
          header: 'Juegos',
          className: 'text-fog',
          render: (publisher) => String(publisher.games?.length ?? 0),
        },
      ]}
      toFormValues={(publisher) => ({
        name: publisher.name,
        websiteUrl: publisher.websiteUrl ?? '',
        supportEmail: publisher.supportEmail ?? '',
        country: publisher.country ?? '',
      })}
      getId={(publisher) => publisher.id}
    />
  );
}
