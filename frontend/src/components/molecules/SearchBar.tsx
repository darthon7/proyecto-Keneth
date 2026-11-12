import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/atoms/Button';

interface SearchBarProps {
  onSearch: (term: string) => void;
  initialValue?: string;
  placeholder?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SearchBar({
  onSearch,
  initialValue = '',
  placeholder = 'Busca videojuegos, plataformas, publishers…',
  actionLabel = 'Publica el tuyo',
  onAction,
}: SearchBarProps) {
  const [term, setTerm] = useState(initialValue);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(term.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="relative min-w-0 flex-1">
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={placeholder}
          aria-label="Buscar"
          className="w-full rounded-full border border-white/10 bg-white/10 py-3 pr-11 pl-4 text-body-sm text-white placeholder:text-mist focus:border-white/25 focus:bg-white/15 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="absolute top-1/2 right-3 -translate-y-1/2 text-mist transition-colors hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M13.2 13.2L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <span className="hidden shrink-0 text-body-sm text-mist sm:inline">o</span>

      <Button
        type="button"
        variant="primary"
        onClick={onAction}
        className="w-full shrink-0 whitespace-nowrap sm:w-auto"
      >
        {actionLabel}
      </Button>
    </form>
  );
}
