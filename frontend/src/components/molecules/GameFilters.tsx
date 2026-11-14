import { Select } from '@/components/atoms/Select';
import type { Developer, Genre, Platform } from '@/types';

export interface GameFilterValues {
  genreId: string;
  platformId: string;
  maxPrice: string;
  developerId: string;
}

export const EMPTY_FILTERS: GameFilterValues = {
  genreId: '',
  platformId: '',
  maxPrice: '',
  developerId: '',
};

const BUDGET_OPTIONS = [
  { value: '5', label: 'Hasta $5' },
  { value: '10', label: 'Hasta $10' },
  { value: '15', label: 'Hasta $15' },
  { value: '20', label: 'Hasta $20' },
];

interface GameFiltersProps {
  value: GameFilterValues;
  onChange: (value: GameFilterValues) => void;
  genres: Genre[];
  platforms: Platform[];
  developers: Developer[];
  onReset: () => void;
}

export function GameFilters({
  value,
  onChange,
  genres,
  platforms,
  developers,
  onReset,
}: GameFiltersProps) {
  const update = (key: keyof GameFilterValues, next: string) =>
    onChange({ ...value, [key]: next });

  const hasActiveFilters = Boolean(
    value.genreId || value.platformId || value.maxPrice || value.developerId,
  );

  const budgetOptions =
    value.maxPrice && !BUDGET_OPTIONS.some((opt) => opt.value === value.maxPrice)
      ? [...BUDGET_OPTIONS, { value: value.maxPrice, label: `Hasta $${value.maxPrice}` }]
      : BUDGET_OPTIONS;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:flex xl:flex-1 xl:items-center gap-2">
      <div className="min-w-0 xl:flex-1">
        <Select
          aria-label="Género"
          name="genreId"
          value={value.genreId}
          onChange={(event) => update('genreId', event.target.value)}
          placeholder="Género: Todos"
          className="!py-1.5 !px-2.5 !rounded-lg !text-xs bg-[#F8FAFC]"
          options={genres.map((genre) => ({ value: genre.id, label: genre.name }))}
        />
      </div>
      <div className="min-w-0 xl:flex-1">
        <Select
          aria-label="Plataforma"
          name="platformId"
          value={value.platformId}
          onChange={(event) => update('platformId', event.target.value)}
          placeholder="Plataforma: Todas"
          className="!py-1.5 !px-2.5 !rounded-lg !text-xs bg-[#F8FAFC]"
          options={platforms.map((platform) => ({ value: platform.id, label: platform.name }))}
        />
      </div>
      <div className="min-w-0 xl:flex-1">
        <Select
          aria-label="Presupuesto"
          name="maxPrice"
          value={value.maxPrice}
          onChange={(event) => update('maxPrice', event.target.value)}
          placeholder="Presupuesto: Todos"
          className="!py-1.5 !px-2.5 !rounded-lg !text-xs bg-[#F8FAFC]"
          options={budgetOptions}
        />
      </div>
      <div className="min-w-0 xl:flex-1">
        <Select
          aria-label="Desarrolladora"
          name="developerId"
          value={value.developerId}
          onChange={(event) => update('developerId', event.target.value)}
          placeholder="Desarrolladora: Todas"
          className="!py-1.5 !px-2.5 !rounded-lg !text-xs bg-[#F8FAFC]"
          options={developers.map((developer) => ({ value: developer.id, label: developer.name }))}
        />
      </div>

      {hasActiveFilters && (
        <div className="col-span-2 sm:col-span-4 xl:col-span-1 flex justify-end xl:justify-start shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-semibold text-[#64748B] transition-colors hover:text-[#FF2A5F] px-2 py-1.5 rounded-lg hover:bg-[#F4F4F6] whitespace-nowrap"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
