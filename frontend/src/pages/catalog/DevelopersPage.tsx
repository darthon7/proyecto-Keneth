import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { developersApi } from '@/api';
import type { CreateDeveloperPayload, Developer } from '@/types';
import type { FieldConfig } from '@/utils/fields';

const fields: FieldConfig[] = [
  { name: 'name', label: 'Nombre', type: 'text', required: true, maxLength: 150 },
  { name: 'country', label: 'País (ISO-2)', type: 'text', minLength: 2, maxLength: 2, placeholder: 'JP' },
  {
    name: 'foundedYear',
    label: 'Año de fundación',
    type: 'number',
    min: 1950,
    max: 2100,
    help: 'Entre 1950 y 2100',
  },
];

export function DevelopersPage() {
  return (
    <CrudResourcePage<Developer, CreateDeveloperPayload>
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
      })}
      getId={(developer) => developer.id}
    />
  );
}
