import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { genresApi } from '@/api';
import type { CreateGenrePayload, Genre } from '@/types';
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
    name: 'slug',
    label: 'Slug',
    type: 'text',
    required: true,
    maxLength: 60,
    pattern: VALIDATION_PATTERNS.SLUG,
    patternMessage: 'El slug solo permite minúsculas, números y guiones (ej. action-rpg)',
    help: 'Identificador único en URL, por ejemplo action-rpg',
  },
  { name: 'description', label: 'Descripción', type: 'textarea', maxLength: 500 },
];

export function GenresPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <CrudResourcePage<Genre, CreateGenrePayload>
      embedded={embedded}
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
