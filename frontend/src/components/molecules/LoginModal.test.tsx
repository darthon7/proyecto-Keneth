import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginModal } from '@/components/molecules/LoginModal';
import type { User } from '@/types';

const { createUser, selectUser, session } = vi.hoisted(() => ({
  createUser: vi.fn(),
  selectUser: vi.fn(),
  session: {
    users: [] as User[],
    isLoading: false,
    error: null as string | null,
  },
}));

vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api')>();
  return {
    ...actual,
    usersApi: { create: createUser },
  };
});

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({ ...session, selectUser }),
}));

const existingUser: User = {
  id: 7,
  email: 'jugador@correo.com',
  password: 'secreto123',
  username: 'ElPibes',
  countryCode: 'MX',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const createdUser: User = {
  ...existingUser,
  id: 9,
  email: 'nuevo@correo.com',
  username: 'Nuevo',
  countryCode: 'MX',
};

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <LoginModal isOpen onClose={() => {}} />
    </QueryClientProvider>,
  );
}

describe('LoginModal', () => {
  it('inicia sesión con una cuenta ya registrada sin tocar la API', async () => {
    const user = userEvent.setup();
    session.users = [existingUser];

    renderModal();

    await user.type(await screen.findByLabelText('Correo'), 'jugador@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'secreto123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(selectUser).toHaveBeenCalledWith(7);
    });
    expect(createUser).not.toHaveBeenCalled();
    expect(await screen.findByText('¡Sesión iniciada!')).toBeInTheDocument();
  });

  it('rechaza la contraseña incorrecta de una cuenta existente', async () => {
    const user = userEvent.setup();
    session.users = [existingUser];

    renderModal();

    await user.type(await screen.findByLabelText('Correo'), 'jugador@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(
      await screen.findByText('La contraseña no coincide con la de esta cuenta.'),
    ).toBeInTheDocument();
    expect(selectUser).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it('registra la cuenta en la base de datos cuando el correo es nuevo', async () => {
    const user = userEvent.setup();
    session.users = [existingUser];
    createUser.mockResolvedValue(createdUser);

    renderModal();

    await user.type(await screen.findByLabelText('Correo'), 'nuevo@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'secreto123');
    await user.type(screen.getByLabelText('Nombre de usuario'), 'Nuevo');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(createUser).toHaveBeenCalledWith({
        username: 'Nuevo',
        email: 'nuevo@correo.com',
        password: 'secreto123',
        countryCode: 'MX',
      });
    });

    await waitFor(() => {
      expect(selectUser).toHaveBeenCalledWith(9);
    });
    expect(await screen.findByText('¡Cuenta creada!')).toBeInTheDocument();
  });

  it('exige nombre de usuario cuando la cuenta es nueva', async () => {
    const user = userEvent.setup();
    session.users = [existingUser];

    renderModal();

    await user.type(await screen.findByLabelText('Correo'), 'nuevo@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'secreto123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(
      await screen.findByText('El nombre de usuario es obligatorio para crear una cuenta'),
    ).toBeInTheDocument();
    expect(createUser).not.toHaveBeenCalled();
  });

  it('no llama a la API si el correo no es válido', async () => {
    const user = userEvent.setup();
    session.users = [existingUser];

    renderModal();

    await user.type(await screen.findByLabelText('Correo'), 'correo-invalido');
    await user.type(screen.getByLabelText('Contraseña'), 'secreto123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Introduce un correo válido')).toBeInTheDocument();
    expect(createUser).not.toHaveBeenCalled();
  });
});
