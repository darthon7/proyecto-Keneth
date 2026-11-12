import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { genresApi } from '@/api';
import type { CreateGenrePayload, Genre } from '@/types';
import type { FieldConfig } from '@/utils/fields';

const fields: FieldConfig[] = [
  { name: 'name', label: 'Nombre', type: 'text', required: true, maxLength: 50 },
  {
    name: 'slug',
    label: 'Slug',
    type: 'text',
    required: true,
    maxLength: 60,
    help: 'Identificador único en URL, por ejemplo action-rpg',
  },
  { name: 'description', label: 'Descripción', type: 'textarea' },
];

export function GenresPage() {
  return (
    <CrudResourcePage<Genre, CreateGenrePayload>
      title="Géneros"
      description="Géneros disponibles para clasificar los videojuegos. Cada juego puede tener varios."
      queryKey={['genres']}
      fetchList={() => genresApi.list()}
      createItem={(payload) => genresApi.create(payload)}
      updateItem={(id, payload) => genresApi.update(id, payload)}
      deleteItem={(id) => genresApi.remove(id)}
      fields={fields}
      columns={[
        { header: 'Nombre', render: (genre) => genre.name },
        { header: 'Slug', className: 'text-fog', render: (genre) => genre.slug },
        {
          header: 'Descripción',
          className: 'text-fog',
          render: (genre) => genre.description ?? '—',
        },
        {
          header: 'Juegos',
          className: 'text-fog',
          render: (genre) => String(genre.games?.length ?? 0),
        },
      ]}
      toFormValues={(genre) => ({
        name: genre.name,
        slug: genre.slug,
        description: genre.description ?? '',
      })}
      getId={(genre) => genre.id}
    />
  );
}
