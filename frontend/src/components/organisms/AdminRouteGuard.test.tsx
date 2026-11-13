import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminRouteGuard } from '@/components/organisms/AdminRouteGuard';
import { UserRole, type SafeUser } from '@/types';

const sessionState = vi.hoisted(() => ({
  currentUser: null as SafeUser | null,
  isLoading: false,
}));

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    currentUser: sessionState.currentUser,
    currentUserId: sessionState.currentUser?.id ?? null,
    token: sessionState.currentUser ? 'mock-token' : null,
    isAdmin: sessionState.currentUser?.role === UserRole.ADMIN,
    isLoading: sessionState.isLoading,
    error: null,
    setSession: vi.fn(),
    logout: vi.fn(),
  }),
}));

function renderGuard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminRouteGuard>
          <div data-testid="protected-admin-content">Contenido Secreto Admin</div>
        </AdminRouteGuard>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminRouteGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionState.currentUser = null;
    sessionState.isLoading = false;
  });

  it('muestra spinner de verificación mientras isLoading es true y no renderiza hijos', () => {
    sessionState.isLoading = true;

    renderGuard();

    expect(screen.getByText('Verificando permisos…')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-admin-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-access-denied')).not.toBeInTheDocument();
  });

  it('bloquea a visitantes sin sesión mostrando admin-access-denied y botón de inicio de sesión', async () => {
    sessionState.currentUser = null;
    const user = userEvent.setup();

    renderGuard();

    expect(screen.getByTestId('admin-access-denied')).toBeInTheDocument();
    expect(screen.getByTestId('admin-denied-home-btn')).toHaveAttribute('href', '/');
    expect(screen.getByTestId('admin-denied-login-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-admin-content')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('admin-denied-login-btn'));
    expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
  });

  it('bloquea a usuarios con rol CUSTOMER y no renderiza contenido protegido', () => {
    sessionState.currentUser = {
      id: 5,
      email: 'cliente@tienda.com',
      username: 'JugadorNormal',
      countryCode: 'MX',
      role: UserRole.CUSTOMER,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    renderGuard();

    expect(screen.getByTestId('admin-access-denied')).toBeInTheDocument();
    expect(screen.getByText(/JugadorNormal/)).toBeInTheDocument();
    expect(screen.getByTestId('admin-denied-home-btn')).toHaveAttribute('href', '/');
    expect(screen.queryByTestId('admin-denied-login-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('protected-admin-content')).not.toBeInTheDocument();
  });

  it('permite el acceso y renderiza los hijos cuando el usuario es ADMIN', () => {
    sessionState.currentUser = {
      id: 1,
      email: 'admin@tienda.com',
      username: 'AdminMaster',
      countryCode: 'MX',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    renderGuard();

    expect(screen.getByTestId('protected-admin-content')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-access-denied')).not.toBeInTheDocument();
  });
});
