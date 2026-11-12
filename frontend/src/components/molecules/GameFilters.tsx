import { Select } from '@/components/atoms/Select';
import type { Developer, Genre, Platform, Publisher } from '@/types';

export interface GameFilterValues {
  genreId: string;
  platformId: string;
  publisherId: string;
  developerId: string;
}

export const EMPTY_FILTERS: GameFilterValues = {
  genreId: '',
  platformId: '',
  publisherId: '',
  developerId: '',
};

interface GameFiltersProps {
  value: GameFilterValues;
  onChange: (value: GameFilterValues) => void;
  genres: Genre[];
  platforms: Platform[];
  publishers: Publisher[];
  developers: Developer[];
  onReset: () => void;
}

export function GameFilters({
  value,
  onChange,
  genres,
  platforms,
  publishers,
  developers,
  onReset,
}: GameFiltersProps) {
  const update = (key: keyof GameFilterValues, next: string) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Select
        label="Género"
        name="genreId"
        value={value.genreId}
        onChange={(event) => update('genreId', event.target.value)}
        placeholder="Todos"
        options={genres.map((genre) => ({ value: genre.id, label: genre.name }))}
      />
      <Select
        label="Plataforma"
        name="platformId"
        value={value.platformId}
        onChange={(event) => update('platformId', event.target.value)}
        placeholder="Todas"
        options={platforms.map((platform) => ({ value: platform.id, label: platform.name }))}
      />
      <Select
        label="Publisher"
        name="publisherId"
        value={value.publisherId}
        onChange={(event) => update('publisherId', event.target.value)}
        placeholder="Todos"
        options={publishers.map((publisher) => ({ value: publisher.id, label: publisher.name }))}
      />
      <Select
        label="Desarrolladora"
        name="developerId"
        value={value.developerId}
        onChange={(event) => update('developerId', event.target.value)}
        placeholder="Todas"
        options={developers.map((developer) => ({ value: developer.id, label: developer.name }))}
      />

      <div className="sm:col-span-2 lg:col-span-4">
        <button
          type="button"
          onClick={onReset}
          className="text-body-sm text-fog transition-colors hover:text-white"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
