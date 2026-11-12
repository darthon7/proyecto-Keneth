import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GameCard } from '@/components/molecules/GameCard';
import { EditionFormat } from '@/types';
import type { Game } from '@/types';

const game: Game = {
  id: 1,
  title: 'Elden Ring',
  slug: 'elden-ring',
  synopsis: 'Mundo abierto de fantasía oscura.',
  esrbRating: 'M',
  releaseDate: '2022-02-25',
  coverImageUrl: null,
  createdAt: '2022-02-25T00:00:00.000Z',
  publisher: {
    id: 1,
    name: 'FromSoftware',
    websiteUrl: null,
    supportEmail: null,
    country: 'JP',
  },
  developer: {
    id: 1,
    name: 'FromSoftware',
    country: 'JP',
    foundedYear: 1986,
  },
  genres: [{ id: 1, name: 'Action', slug: 'action', description: null }],
  editions: [
    {
      id: 10,
      editionName: 'Standard Edition',
      format: EditionFormat.DIGITAL,
      basePrice: 1299,
      isDlc: false,
      stockPhysical: 0,
      createdAt: '2022-02-25T00:00:00.000Z',
      game: undefined as never,
      platform: undefined as never,
    },
  ],
};

describe('GameCard', () => {
  it('muestra título, publisher y precio de la edición más barata', () => {
    render(
      <MemoryRouter>
        <GameCard game={game} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Elden Ring' })).toBeInTheDocument();
    expect(screen.getByText('FromSoftware')).toBeInTheDocument();
    expect(screen.getByText(/\$1,299/)).toBeInTheDocument();
  });

  it('enlaza a la ficha del videojuego', () => {
    render(
      <MemoryRouter>
        <GameCard game={game} />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole('link');
    expect(links.some((link) => link.getAttribute('href') === '/games/1')).toBe(true);
  });
});
