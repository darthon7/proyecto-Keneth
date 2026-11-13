import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Checkbox } from '@/components/atoms/Checkbox';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { Modal } from '@/components/atoms/Modal';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, usersApi, usersExtraApi } from '@/api';
import { useSession } from '@/context/SessionContext';
import { UserRole } from '@/types';
import type { SafeUser } from '@/types';

interface UserFormValues {
  username: string;
  email: string;
  password?: string;
  countryCode?: string;
  isActive: boolean;
}

const DEFAULT_FORM_VALUES: UserFormValues = {
  username: '',
  email: '',
  password: '',
  countryCode: 'MX',
  isActive: true,
};

const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Nombre de usuario es obligatorio')
    .max(100, 'Máximo 100 caracteres'),
  email: z.string().trim().min(1, 'Correo es obligatorio').email('Introduce un correo válido'),
  password: z
    .string()
    .min(4, 'Contraseña debe tener al menos 4 caracteres')
    .max(50, 'Contraseña es muy larga'),
  countryCode: z
    .string()
    .trim()
    .refine((value) => value === '' || value.length === 2, {
      message: 'País debe tener 2 letras (ISO-2)',
    })
    .optional(),
  isActive: z.boolean(),
});

const editUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Nombre de usuario es obligatorio')
    .max(100, 'Máximo 100 caracteres'),
  email: z.string().trim().min(1, 'Correo es obligatorio').email('Introduce un correo válido'),
  password: z
    .string()
    .refine((value) => value === '' || (value.length >= 4 && value.length <= 50), {
      message: 'Si cambias la contraseña debe tener entre 4 y 50 caracteres',
    })
    .optional(),
  countryCode: z
    .string()
    .trim()
    .refine((value) => value === '' || value.length === 2, {
      message: 'País debe tener 2 letras (ISO-2)',
    })
    .optional(),
  isActive: z.boolean(),
});

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { currentUserId } = useSession();

  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SafeUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<number | null>(null);

  const isEditing = editingUser !== null;
  const schema = useMemo(() => (isEditing ? editUserSchema : createUserSchema), [isEditing]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const username = values.username.trim();
      const email = values.email.trim().toLowerCase();
      const countryCode = (values.countryCode ?? '').trim().toUpperCase();
      const password = values.password ?? '';

      if (editingUser) {
        return usersApi.update(editingUser.id, {
          username,
          email,
          ...(password ? { password } : {}),
          ...(countryCode ? { countryCode } : {}),
          isActive: values.isActive,
        });
      }

      return usersApi.create({
        username,
        email,
        password,
        ...(countryCode ? { countryCode } : {}),
        isActive: values.isActive,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setEditingUser(null);
      setFormError(null);
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: UserRole }) =>
      usersExtraApi.updateRole(id, role),
    onMutate: ({ id }) => {
      setRoleError(null);
      setUpdatingRoleId(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (error) => setRoleError(errorMessage(error)),
    onSettled: () => setUpdatingRoleId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (user: SafeUser) => usersApi.remove(user.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setUserToDelete(null);
    },
  });

  const openCreate = () => {
    setEditingUser(null);
    setFormError(null);
    form.reset(DEFAULT_FORM_VALUES);
    setIsModalOpen(true);
  };

  const openEdit = (user: SafeUser) => {
    setEditingUser(user);
    setFormError(null);
    form.reset({
      username: user.username,
      email: user.email,
      password: '',
      countryCode: user.countryCode ?? 'MX',
      isActive: user.isActive,
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (user: SafeUser) => {
    deleteMutation.reset();
    setUserToDelete(user);
  };

  const closeDeleteModal = () => {
    deleteMutation.reset();
    setUserToDelete(null);
  };

  const submit = form.handleSubmit((values) => {
    setFormError(null);
    saveMutation.mutate(values);
  });

  const users = usersQuery.data ?? [];

  return (
    <div data-testid="admin-users-page" className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF2A5F]">
            Seguridad y Cuentas
          </span>
          <h1 className="mt-1 text-heading-sm font-black text-[#0F172A]">Usuarios y Roles</h1>
          <p className="mt-1.5 max-w-2xl text-body-sm text-[#475569]">
            Gestiona cuentas registradas, estado de activación y asignación de roles ADMIN / CUSTOMER.
          </p>
        </div>

        <Button
          variant="brand"
          data-testid="admin-users-create-btn"
          onClick={openCreate}
        >
          Nuevo usuario
        </Button>
      </header>

      {roleError && <ErrorBanner message={roleError} />}

      {usersQuery.isLoading && <Spinner label="Cargando usuarios…" />}

      {usersQuery.isError && (
        <ErrorBanner
          message={errorMessage(usersQuery.error)}
          onRetry={() => void usersQuery.refetch()}
        />
      )}

      {usersQuery.isSuccess && users.length === 0 && (
        <EmptyState
          title="Sin usuarios"
          description="No hay cuentas registradas todavía."
          action={
            <Button variant="brand" onClick={openCreate}>
              Crear primer usuario
            </Button>
          }
        />
      )}

      {users.length > 0 && (
        <div className="overflow-x-auto rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-xs px-4 py-2">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                  Usuario
                </th>
                <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                  Correo
                </th>
                <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                  País
                </th>
                <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                  Rol
                </th>
                <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                  Estado
                </th>
                <th scope="col" className="px-3 py-3 text-right text-caption font-bold uppercase tracking-wider text-[#475569]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = currentUserId === user.id;
                const isRolePending = updatingRoleId === user.id;

                return (
                  <tr
                    key={user.id}
                    data-testid={`admin-user-row-${user.id}`}
                    className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <td className="px-3 py-3 text-body-sm font-semibold text-[#0F172A]">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/users/${user.id}`}
                          className="text-[#1E1B4B] hover:text-[#FF2A5F] transition-colors"
                        >
                          {user.username}
                        </Link>
                        {isSelf && <Badge tone="blue">Tú</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-body-sm text-[#475569]">{user.email}</td>
                    <td className="px-3 py-3 text-body-sm text-[#475569]">{user.countryCode}</td>
                    <td className="px-3 py-3 text-body-sm">
                      <select
                        aria-label={`Rol de ${user.username}`}
                        data-testid={`admin-user-role-select-${user.id}`}
                        value={user.role}
                        disabled={isRolePending}
                        onChange={(event) =>
                          roleMutation.mutate({
                            id: user.id,
                            role: event.target.value as UserRole,
                          })
                        }
                        className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-bold text-[#0F172A] focus:border-[#1E1B4B] focus:outline-none disabled:opacity-50"
                      >
                        <option value={UserRole.CUSTOMER}>CUSTOMER</option>
                        <option value={UserRole.ADMIN}>ADMIN</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 text-body-sm">
                      <Badge tone={user.isActive ? 'success' : 'neutral'}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          data-testid={`admin-user-edit-btn-${user.id}`}
                          onClick={() => openEdit(user)}
                          className="text-body-sm font-semibold text-[#1E1B4B] hover:text-[#FF2A5F]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          data-testid={`admin-user-delete-btn-${user.id}`}
                          disabled={isSelf}
                          title={isSelf ? 'No puedes eliminar tu propia sesión activa' : 'Eliminar usuario'}
                          onClick={() => openDeleteModal(user)}
                          className="text-body-sm font-semibold text-[#EF4444] hover:text-[#991B1B] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? `Editar usuario · ${editingUser?.username}` : 'Nuevo usuario'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="brand"
              data-testid="admin-users-save-btn"
              onClick={submit}
              isLoading={saveMutation.isPending}
            >
              Guardar
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {formError && <ErrorBanner message={formError} />}

          <Input
            label="Nombre de usuario"
            placeholder="JugadorPro"
            error={form.formState.errors.username?.message}
            {...form.register('username')}
          />

          <Input
            type="email"
            label="Correo"
            placeholder="usuario@tienda.com"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />

          <Input
            type="password"
            label={isEditing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            placeholder={isEditing ? 'Dejar vacío para conservar actual' : '••••••••'}
            hint={
              isEditing
                ? 'Opcional al editar. Solo escribe una nueva si deseas reemplazarla.'
                : 'Entre 4 y 50 caracteres.'
            }
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />

          <Input
            label="País (ISO-2)"
            placeholder="MX"
            maxLength={2}
            error={form.formState.errors.countryCode?.message}
            {...form.register('countryCode')}
          />

          <Checkbox
            label="Cuenta activa"
            error={form.formState.errors.isActive?.message}
            {...form.register('isActive')}
          />
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={userToDelete !== null}
        onClose={closeDeleteModal}
        title="Eliminar usuario"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeDeleteModal}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              data-testid="admin-users-confirm-delete-btn"
              isLoading={deleteMutation.isPending}
              onClick={() => userToDelete && deleteMutation.mutate(userToDelete)}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-[#475569]">
          ¿Seguro que deseas eliminar la cuenta de <strong>{userToDelete?.username}</strong>? Esta
          acción no se puede deshacer.
        </p>
        {deleteMutation.isError && (
          <div className="mt-4">
            <ErrorBanner message={errorMessage(deleteMutation.error)} />
          </div>
        )}
      </Modal>
    </div>
  );
}
