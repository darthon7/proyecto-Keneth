import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartProvider } from '@/context/CartContext';
import { SessionProvider } from '@/context/SessionContext';
import { NavBar } from '@/components/molecules/NavBar';
import { usersApi, wishlistsExtraApi } from '@/api';

vi.mock('@/api', () => ({
  usersApi: {
    list: vi.fn(),
  },
  wishlistsExtraApi: {
    byUser: vi.fn(),
  },
}));

function renderNavBar() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <CartProvider>
          <MemoryRouter>
            <NavBar />
          </MemoryRouter>
        </CartProvider>
      </SessionProvider>
    </QueryClientProvider>,
  );
}

describe('NavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('muestra el nombre de la tienda "EL PIBES" en la barra de navegación', () => {
    vi.mocked(usersApi.list).mockResolvedValue([]);
    vi.mocked(wishlistsExtraApi.byUser).mockResolvedValue([]);

    renderNavBar();

    expect(screen.getByText(/EL/i)).toBeInTheDocument();
    expect(screen.getByText(/PIBES/i)).toBeInTheDocument();
  });

  it('muestra "Iniciar sesión" y no un usuario mock hardcodeado (Aura_Kid / US$ 45.20) cuando no hay sesión activa', async () => {
    vi.mocked(usersApi.list).mockResolvedValue([]);
    vi.mocked(wishlistsExtraApi.byUser).mockResolvedValue([]);

    renderNavBar();

    // Verify "Iniciar sesión" button is present
    const loginButton = screen.getByRole('button', { name: /Iniciar sesión/i });
    expect(loginButton).toBeInTheDocument();

    // Verify absence of mock hardcoded text
    expect(screen.queryByText(/Aura_Kid/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/US\$ 45\.20/i)).not.toBeInTheDocument();

    // Verify absence of fake hardcoded badges (4 for wishlist, 2 for cart)
    expect(screen.queryByText('4')).not.toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  it('abre el modal de autenticación al hacer clic en "Iniciar sesión"', async () => {
    vi.mocked(usersApi.list).mockResolvedValue([]);
    vi.mocked(wishlistsExtraApi.byUser).mockResolvedValue([]);
    const user = userEvent.setup();

    renderNavBar();

    const loginButton = screen.getByRole('button', { name: /Iniciar sesión/i });
    await user.click(loginButton);

    // Modal should become visible with form inputs
    expect(screen.getByLabelText(/Correo/i)).toBeInTheDocument();
    expect(screen.getByText(/Entra con tu cuenta o regístrate/i)).toBeInTheDocument();
  });
});
