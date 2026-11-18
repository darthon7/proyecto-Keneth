import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GamesAdminPage } from '@/pages/catalog/GamesAdminPage';
import {
  developersApi,
  gameEditionsApi,
  gamesApi,
  genresApi,
  platformsApi,
  publishersApi,
} from '@/api';
import { EditionFormat } from '@/types';
import type { Game } from '@/types';

vi.mock('@/api', () => ({
  gamesApi: {
    list: vi.fn(),
    remove: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  publishersApi: {
    list: vi.fn(),
  },
  developersApi: {
    list: vi.fn(),
  },
  genresApi: {
    list: vi.fn(),
  },
  platformsApi: {
    list: vi.fn(),
  },
  gameEditionsApi: {
    list: vi.fn(),
  },
  errorMessage: (err: unknown) => (err instanceof Error ? err.message : 'Error desconocido'),
}));

const mockGames: Game[] = [
  {
    id: 1,
    title: 'Elden Ring',
    slug: 'elden-ring',
    synopsis: 'Mundo abierto fantástico.',
    esrbRating: 'M',
    releaseDate: '2022-02-25',
    coverImageUrl: 'https://example.com/elden-ring.jpg',
    createdAt: '2022-02-25T00:00:00.000Z',
    publisher: { id: 1, name: 'FromSoftware', websiteUrl: null, supportEmail: null, country: 'JP' },
    developer: { id: 1, name: 'FromSoftware', country: 'JP', foundedYear: 1986 },
    genres: [{ id: 1, name: 'Action', slug: 'action', description: null }],
    editions: [
      {
        id: 10,
        editionName: 'Standard Edition',
        format: EditionFormat.DIGITAL,
        basePrice: 1499,
        isDlc: false,
        createdAt: '2022-02-25T00:00:00.000Z',
        game: undefined as never,
        platform: { id: 1, name: 'PC', code: 'PC', iconUrl: null },
        digitalKeys: [],
      },
    ],
  },
];

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('GamesAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gamesApi.list).mockResolvedValue(mockGames);
    vi.mocked(publishersApi.list).mockResolvedValue([]);
    vi.mocked(developersApi.list).mockResolvedValue([]);
    vi.mocked(genresApi.list).mockResolvedValue([]);
    vi.mocked(platformsApi.list).mockResolvedValue([]);
    vi.mocked(gameEditionsApi.list).mockResolvedValue([]);
  });

  it('renderiza la vista con perspectiva de tienda (tarjetas) y botón Editar en lugar de Comprar', async () => {
    renderWithClient(<GamesAdminPage embedded />);

    await waitFor(() => {
      expect(screen.getByText('Elden Ring')).toBeInTheDocument();
    });

    // Muestra el precio formateado similar a la tienda
    expect(screen.getByText(/\$1,499/)).toBeInTheDocument();

    // El botón principal de la tarjeta es Editar (no Comprar)
    expect(screen.queryByRole('button', { name: /^Comprar$/i })).not.toBeInTheDocument();
    const editBtn = screen.getByTestId('games-admin-edit-btn-1');
    expect(editBtn).toBeInTheDocument();
    expect(editBtn).toHaveTextContent('Editar');

    // Mantiene las funciones operativas del admin: Stock y Claves, Eliminar, Nuevo videojuego
    expect(screen.getByTestId('games-admin-stock-btn-1')).toBeInTheDocument();
    expect(screen.getByTestId('games-admin-delete-btn-1')).toBeInTheDocument();
    expect(screen.getByTestId('games-admin-create-btn')).toBeInTheDocument();
  });

  it('permite alternar entre la vista de tarjetas y la vista tabular clásica', async () => {
    renderWithClient(<GamesAdminPage embedded />);

    await waitFor(() => {
      expect(screen.getByText('Elden Ring')).toBeInTheDocument();
    });

    // Alternar a tabla
    const tableToggle = screen.getByRole('button', { name: /Tabla/i });
    fireEvent.click(tableToggle);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Título/i })).toBeInTheDocument();
  });

  it('abre el modal de edición al hacer clic en Editar', async () => {
    renderWithClient(<GamesAdminPage embedded />);

    await waitFor(() => {
      expect(screen.getByTestId('games-admin-edit-btn-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('games-admin-edit-btn-1'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Elden Ring')).toBeInTheDocument();
    });
  });
});
