import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartProvider } from '@/context/CartContext';
import { SessionProvider } from '@/context/SessionContext';
import { NavBar } from '@/components/molecules/NavBar';
import { AUTH_TOKEN_STORAGE_KEY, authApi, wishlistsExtraApi } from '@/api';
import { UserRole, type SafeUser } from '@/types';

vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api')>();
  return {
    ...actual,
    authApi: {
      login: vi.fn(),
      register: vi.fn(),
      me: vi.fn(),
    },
    wishlistsExtraApi: {
      byUser: vi.fn(),
    },
  };
});

const customerUser: SafeUser = {
  id: 10,
  email: 'cliente@tienda.com',
  username: 'ClienteGamer',
  countryCode: 'MX',
  role: UserRole.CUSTOMER,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const adminUser: SafeUser = {
  id: 1,
  email: 'admin@tienda.com',
  username: 'SuperAdmin',
  countryCode: 'MX',
  role: UserRole.ADMIN,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

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

  it('muestra el nombre de la tienda "EL PIBES" y enlaza OFERTAS a /promotions', () => {
    vi.mocked(wishlistsExtraApi.byUser).mockResolvedValue([]);

    renderNavBar();

    expect(screen.getByText(/EL/i)).toBeInTheDocument();
    expect(screen.getByText(/PIBES/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'OFERTAS' })).toHaveAttribute('href', '/promotions');
  });

  it('oculta los controles de administración y el directorio de usuarios para visitantes anónimos', async () => {
    vi.mocked(wishlistsExtraApi.byUser).mockResolvedValue([]);
    const user = userEvent.setup();

    renderNavBar();

    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrarse/i })).toBeInTheDocument();
    expect(screen.queryByTestId('navbar-admin-panel-btn')).not.toBeInTheDocument();

    // Verify absence of former hardcoded mocks
    expect(screen.queryByText(/Aura_Kid/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/US\$ 45\.20/i)).not.toBeInTheDocument();

    // Open CATÁLOGO dropdown and verify only customer links are shown
    await user.click(screen.getByTestId('navbar-catalog-trigger'));
    expect(screen.getByRole('menuitem', { name: 'Mi Biblioteca' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Ofertas y Cupones' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Administrar Videojuegos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Claves Digitales' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Directorio de Usuarios' })).not.toBeInTheDocument();
  });

  it('NO muestra el botón ni enlaces de Panel de Control para usuarios CUSTOMER', async () => {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'customer-jwt-token');
    vi.mocked(authApi.me).mockResolvedValue(customerUser);
    vi.mocked(wishlistsExtraApi.byUser).mockResolvedValue([]);
    const user = userEvent.setup();

    renderNavBar();

    await waitFor(() => {
      expect(screen.getByTestId('navbar-profile-trigger')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('navbar-admin-panel-btn')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('navbar-profile-trigger'));
    expect(screen.queryByTestId('navbar-profile-admin-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('navbar-profile-admin-badge')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('navbar-mobile-toggle'));
    expect(screen.queryByTestId('navbar-mobile-admin-panel-btn')).not.toBeInTheDocument();
  });

  it('muestra el botón Panel de Control apuntando a /admin exclusivamente para usuarios ADMIN', async () => {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'admin-jwt-token');
    vi.mocked(authApi.me).mockResolvedValue(adminUser);
    vi.mocked(wishlistsExtraApi.byUser).mockResolvedValue([]);
    const user = userEvent.setup();

    renderNavBar();

    const adminButton = await screen.findByTestId('navbar-admin-panel-btn');
    expect(adminButton).toHaveAttribute('href', '/admin');
    expect(adminButton).toHaveTextContent(/Panel de Control/i);

    await user.click(screen.getByTestId('navbar-profile-trigger'));
    expect(screen.getByTestId('navbar-profile-admin-badge')).toHaveTextContent('ADMIN');
    expect(screen.getByTestId('navbar-profile-admin-link')).toHaveAttribute('href', '/admin');

    await user.click(screen.getByTestId('navbar-mobile-toggle'));
    expect(screen.getByTestId('navbar-mobile-admin-panel-btn')).toHaveAttribute('href', '/admin');
  });

  it('abre el modal de login con solo Correo y Contraseña al hacer clic en "Iniciar sesión"', async () => {
    vi.mocked(wishlistsExtraApi.byUser).mockResolvedValue([]);
    const user = userEvent.setup();

    renderNavBar();

    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-password-input')).toBeInTheDocument();
    expect(screen.queryByTestId('login-username-input')).not.toBeInTheDocument();
  });

  it('abre el modal en modo creación de cuenta al hacer clic en "Registrarse"', async () => {
    vi.mocked(wishlistsExtraApi.byUser).mockResolvedValue([]);
    const user = userEvent.setup();

    renderNavBar();

    await user.click(screen.getByRole('button', { name: /Registrarse/i }));

    expect(screen.getByRole('dialog', { name: /Crear cuenta/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre de usuario/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Crear cuenta/i })).toBeInTheDocument();
  });
});
