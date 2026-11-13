import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginModal } from '@/components/molecules/LoginModal';
import type { AuthModalMode } from '@/components/molecules/LoginModal';
import { ApiError } from '@/api';
import { UserRole, type AuthResponse, type SafeUser } from '@/types';

const { loginApi, registerApi, setSession } = vi.hoisted(() => ({
  loginApi: vi.fn(),
  registerApi: vi.fn(),
  setSession: vi.fn(),
}));

vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api')>();
  return {
    ...actual,
    authApi: {
      login: loginApi,
      register: registerApi,
      me: vi.fn(),
    },
  };
});

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    currentUser: null,
    currentUserId: null,
    token: null,
    isAdmin: false,
    isLoading: false,
    error: null,
    setSession,
    logout: vi.fn(),
  }),
}));

const existingUser: SafeUser = {
  id: 7,
  email: 'jugador@correo.com',
  username: 'ElPibes',
  countryCode: 'MX',
  role: UserRole.CUSTOMER,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const createdUser: SafeUser = {
  ...existingUser,
  id: 9,
  email: 'nuevo@correo.com',
  username: 'Nuevo',
  countryCode: 'MX',
};

const loginAuthResponse: AuthResponse = {
  accessToken: 'jwt-login-token',
  user: existingUser,
};

const registerAuthResponse: AuthResponse = {
  accessToken: 'jwt-register-token',
  user: createdUser,
};

function renderModal(initialMode: AuthModalMode = 'login') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <LoginModal isOpen onClose={() => {}} initialMode={initialMode} />
    </QueryClientProvider>,
  );
}

describe('LoginModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('en modo login muestra únicamente Correo y Contraseña e inicia sesión con authApi.login', async () => {
    const user = userEvent.setup();
    loginApi.mockResolvedValue(loginAuthResponse);

    renderModal('login');

    expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-password-input')).toBeInTheDocument();
    expect(screen.queryByTestId('login-username-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-country-input')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Correo'), 'jugador@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'secreto123');
    await user.click(screen.getByTestId('login-submit-btn'));

    await waitFor(() => {
      expect(loginApi).toHaveBeenCalledWith({
        email: 'jugador@correo.com',
        password: 'secreto123',
      });
    });

    expect(setSession).toHaveBeenCalledWith(loginAuthResponse);
    expect(registerApi).not.toHaveBeenCalled();
    expect(await screen.findByText('¡Sesión iniciada!')).toBeInTheDocument();
  });

  it('muestra el error del backend cuando authApi.login falla con 401', async () => {
    const user = userEvent.setup();
    loginApi.mockRejectedValue(new ApiError('Credenciales inválidas.', 401));

    renderModal('login');

    await user.type(screen.getByLabelText('Correo'), 'jugador@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByTestId('login-submit-btn'));

    expect(await screen.findByText('Credenciales inválidas.')).toBeInTheDocument();
    expect(setSession).not.toHaveBeenCalled();
  });

  it('no llama a la API si el correo no es válido', async () => {
    const user = userEvent.setup();

    renderModal('login');

    await user.type(screen.getByLabelText('Correo'), 'correo-invalido');
    await user.type(screen.getByLabelText('Contraseña'), 'secreto123');
    await user.click(screen.getByTestId('login-submit-btn'));

    expect(await screen.findByText('Introduce un correo válido')).toBeInTheDocument();
    expect(loginApi).not.toHaveBeenCalled();
  });

  it('registra una nueva cuenta en modo register usando authApi.register', async () => {
    const user = userEvent.setup();
    registerApi.mockResolvedValue(registerAuthResponse);

    renderModal('register');

    await user.type(screen.getByLabelText('Correo'), 'nuevo@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'secreto123');
    await user.type(screen.getByLabelText('Nombre de usuario'), 'Nuevo');
    await user.click(screen.getByTestId('login-submit-btn'));

    await waitFor(() => {
      expect(registerApi).toHaveBeenCalledWith({
        email: 'nuevo@correo.com',
        password: 'secreto123',
        username: 'Nuevo',
        countryCode: 'MX',
      });
    });

    expect(setSession).toHaveBeenCalledWith(registerAuthResponse);
    expect(loginApi).not.toHaveBeenCalled();
    expect(await screen.findByText('¡Cuenta creada!')).toBeInTheDocument();
  });

  it('exige nombre de usuario en modo register sin llamar a la API', async () => {
    const user = userEvent.setup();

    renderModal('register');

    await user.type(screen.getByLabelText('Correo'), 'nuevo@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'secreto123');
    await user.click(screen.getByTestId('login-submit-btn'));

    expect(
      await screen.findByText('Nombre de usuario debe tener al menos 2 caracteres'),
    ).toBeInTheDocument();
    expect(registerApi).not.toHaveBeenCalled();
  });

  it('permite alternar de modo login a modo register dentro del modal', async () => {
    const user = userEvent.setup();

    renderModal('login');

    expect(screen.queryByTestId('login-username-input')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('login-mode-switch-btn'));
    expect(screen.getByTestId('login-username-input')).toBeInTheDocument();
  });
});
