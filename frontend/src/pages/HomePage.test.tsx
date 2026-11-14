import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartProvider } from '@/context/CartContext';
import { HomePage } from '@/pages/HomePage';
import { gamesApi, genresApi, platformsApi, promotionsApi, reviewsApi } from '@/api';
import { EditionFormat } from '@/types';
import type { Game, Genre, Platform, Promotion } from '@/types';

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({ currentUser: null }),
}));

vi.mock('@/api', () => ({
  gamesApi: {
    list: vi.fn(),
  },
  genresApi: {
    list: vi.fn(),
  },
  platformsApi: {
    list: vi.fn(),
  },
  promotionsApi: {
    list: vi.fn(),
  },
  reviewsApi: {
    list: vi.fn(),
  },
}));

const mockGames: Game[] = [
  {
    id: 1,
    title: 'Cyber Chronicles 2077',
    slug: 'cyber-chronicles-2077',
    synopsis: 'Un RPG futurista en una metrópolis cyberpunk.',
    esrbRating: 'M',
    releaseDate: '2023-11-10',
    coverImageUrl: 'https://example.com/cyber.jpg',
    createdAt: '2023-11-10T00:00:00.000Z',
    publisher: { id: 1, name: 'NightCity Games', websiteUrl: null, supportEmail: null, country: 'PL' },
    developer: { id: 1, name: 'RedStudio', country: 'PL', foundedYear: 2002 },
    genres: [{ id: 1, name: 'RPG', slug: 'rpg', description: 'Juegos de rol' }],
    editions: [
      {
        id: 101,
        editionName: 'Standard Edition',
        format: EditionFormat.DIGITAL,
        basePrice: 59.99,
        isDlc: false,
        createdAt: '2023-11-10T00:00:00.000Z',
        game: undefined as never,
        platform: { id: 1, name: 'PC Steam', code: 'STEAM' } as never,
      },
    ],
  },
];

const mockGenres: Genre[] = [
  { id: 1, name: 'RPG', slug: 'rpg', description: 'Juegos de rol' },
  { id: 2, name: 'Acción', slug: 'accion', description: 'Juegos de adrenalina' },
];

const mockPlatforms: Platform[] = [
  { id: 1, name: 'PC Steam', code: 'STEAM', iconUrl: null },
  { id: 2, name: 'PlayStation 5', code: 'PS5', iconUrl: null },
];

function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </CartProvider>
    </QueryClientProvider>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra datos dinámicos reales de la API y no texto hardcodeado ficticio', async () => {
    vi.mocked(gamesApi.list).mockResolvedValue(mockGames);
    vi.mocked(genresApi.list).mockResolvedValue(mockGenres);
    vi.mocked(platformsApi.list).mockResolvedValue(mockPlatforms);
    vi.mocked(promotionsApi.list).mockResolvedValue([]);
    vi.mocked(reviewsApi.list).mockResolvedValue([]);

    renderHomePage();

    // Loading transition to success
    await waitFor(() => {
      const titles = screen.getAllByText('Cyber Chronicles 2077');
      expect(titles.length).toBeGreaterThanOrEqual(1);
    });

    // Verify dynamic elements
    expect(screen.getAllByText('$59.99').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Desarrollo: RedStudio')).not.toBeInTheDocument();

    // Verify absence of former hardcoded mock elements
    expect(screen.queryByText(/Vortex Protocol/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/NexusDeck/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/-67%/)).not.toBeInTheDocument();

    // Verify empty promotions state handling
    expect(screen.getByText('No hay promociones activas en este momento')).toBeInTheDocument();

    // Verify removed sections are absent
    expect(screen.queryByText(/Explorar por Género/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Plataformas Soportadas/i)).not.toBeInTheDocument();
  });

  it('renderiza promociones activas cuando existen en la base de datos', async () => {
    const mockPromos: Promotion[] = [
      {
        id: 1,
        name: 'Oferta de Primavera',
        discountPercentage: 25,
        couponCode: 'SPRING25',
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: '2026-03-31T00:00:00.000Z',
        isActive: true,
      },
    ];

    vi.mocked(gamesApi.list).mockResolvedValue(mockGames);
    vi.mocked(genresApi.list).mockResolvedValue(mockGenres);
    vi.mocked(platformsApi.list).mockResolvedValue(mockPlatforms);
    vi.mocked(promotionsApi.list).mockResolvedValue(mockPromos);
    vi.mocked(reviewsApi.list).mockResolvedValue([]);

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Oferta de Primavera')).toBeInTheDocument();
    });

    expect(screen.getByText('-25% OFF')).toBeInTheDocument();
    expect(screen.getByText('Cupón: SPRING25')).toBeInTheDocument();
  });

  it('muestra "Ya reclamado" en cupones que el usuario ya utilizó', async () => {
    const mockPromos: Promotion[] = [
      {
        id: 2,
        name: 'Cupón Retro Pop',
        discountPercentage: 15,
        couponCode: 'RETRO15',
        startDate: '2026-11-12T00:00:00.000Z',
        endDate: '2026-12-14T00:00:00.000Z',
        isActive: true,
        usageLimitPerUser: 1,
        isClaimed: true,
      },
    ];

    vi.mocked(gamesApi.list).mockResolvedValue(mockGames);
    vi.mocked(genresApi.list).mockResolvedValue(mockGenres);
    vi.mocked(platformsApi.list).mockResolvedValue(mockPlatforms);
    vi.mocked(promotionsApi.list).mockResolvedValue(mockPromos);
    vi.mocked(reviewsApi.list).mockResolvedValue([]);

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Cupón Retro Pop')).toBeInTheDocument();
    });

    expect(screen.getByTestId('home-promotion-claimed-2')).toHaveTextContent('Ya reclamado');
    expect(screen.queryByRole('button', { name: 'Copiar' })).not.toBeInTheDocument();
  });

  it('renderiza el hero banner accesible con h1, sin el bloque Destacado Oficial ni etiqueta main propia', async () => {
    vi.mocked(gamesApi.list).mockResolvedValue(mockGames);
    vi.mocked(genresApi.list).mockResolvedValue(mockGenres);
    vi.mocked(platformsApi.list).mockResolvedValue(mockPlatforms);
    vi.mocked(promotionsApi.list).mockResolvedValue([]);
    vi.mocked(reviewsApi.list).mockResolvedValue([]);

    const { container } = renderHomePage();

    const heroBanner = screen.getByTestId('hero-zelda-banner');
    expect(heroBanner).toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/El Pibes/i);

    expect(screen.queryByText(/Destacado Oficial/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Colección Destacada/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('hero-zelda-cta')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver Ofertas/i })).not.toBeInTheDocument();
    expect(container.querySelector('main')).toBeNull();

    await waitFor(() => {
      expect(screen.getAllByText('Cyber Chronicles 2077').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByTestId('hero-zelda-banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/Destacado Oficial/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Colección Destacada/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('hero-zelda-cta')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver Ofertas/i })).not.toBeInTheDocument();
    expect(container.querySelector('main')).toBeNull();
  });

  it('alterna el banner principal entre Zelda, GTA VI y Castlevania cada 5 segundos y con flechas', () => {
    vi.useFakeTimers();
    vi.mocked(gamesApi.list).mockResolvedValue(mockGames);
    vi.mocked(genresApi.list).mockResolvedValue(mockGenres);
    vi.mocked(platformsApi.list).mockResolvedValue(mockPlatforms);
    vi.mocked(promotionsApi.list).mockResolvedValue([]);
    vi.mocked(reviewsApi.list).mockResolvedValue([]);

    renderHomePage();

    const zeldaBtn = screen.getByRole('button', { name: /Zelda/i });
    const gtaBtn = screen.getByRole('button', { name: /Grand Theft Auto VI/i });
    const castlevaniaBtn = screen.getByRole('button', { name: /Castlevania/i });

    expect(zeldaBtn).toHaveAttribute('aria-pressed', 'true');
    expect(gtaBtn).toHaveAttribute('aria-pressed', 'false');
    expect(castlevaniaBtn).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(zeldaBtn).toHaveAttribute('aria-pressed', 'false');
    expect(gtaBtn).toHaveAttribute('aria-pressed', 'true');
    expect(castlevaniaBtn).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(zeldaBtn).toHaveAttribute('aria-pressed', 'false');
    expect(gtaBtn).toHaveAttribute('aria-pressed', 'false');
    expect(castlevaniaBtn).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(zeldaBtn).toHaveAttribute('aria-pressed', 'true');
    expect(gtaBtn).toHaveAttribute('aria-pressed', 'false');
    expect(castlevaniaBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: /Banner anterior/i }));
    expect(castlevaniaBtn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Banner siguiente/i }));
    expect(zeldaBtn).toHaveAttribute('aria-pressed', 'true');
  });
});
