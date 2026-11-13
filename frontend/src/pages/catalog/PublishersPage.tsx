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

function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

export function PublishersPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <CrudResourcePage<Publisher, CreatePublisherPayload>
      embedded={embedded}
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
          render: (publisher) => {
            const safeUrl = safeHttpUrl(publisher.websiteUrl);
            if (safeUrl) {
              return (
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1E1B4B] font-medium hover:text-[#FF2A5F] underline-offset-2 hover:underline"
                >
                  {publisher.websiteUrl}
                </a>
              );
            }
            return publisher.websiteUrl ? <span>{publisher.websiteUrl}</span> : '—';
          },
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
