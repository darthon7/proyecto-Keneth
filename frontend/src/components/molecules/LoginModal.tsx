import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { Modal } from '@/components/atoms/Modal';
import { Spinner } from '@/components/atoms/Spinner';
import { ApiError, errorMessage, usersApi } from '@/api';
import { useSession } from '@/context/SessionContext';
import { buildInitialValues, buildSchema } from '@/utils/fields';
import type { FieldConfig, FormValues } from '@/utils/fields';
import { initials } from '@/utils/format';
import type { CreateUserPayload, User } from '@/types';

const fields: FieldConfig[] = [
  {
    name: 'email',
    label: 'Correo',
    type: 'email',
    required: true,
    placeholder: 'jugador@correo.com',
  },
  {
    name: 'password',
    label: 'Contraseña',
    type: 'password',
    required: true,
    minLength: 4,
    maxLength: 50,
    help: 'Mínimo 4 caracteres.',
  },
  {
    name: 'username',
    label: 'Nombre de usuario',
    type: 'text',
    maxLength: 100,
    placeholder: 'ElPibes',
    help: 'Solo si la cuenta es nueva.',
  },
  {
    name: 'countryCode',
    label: 'País (ISO-2)',
    type: 'text',
    minLength: 2,
    maxLength: 2,
    defaultValue: 'MX',
  },
];

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AccessResult {
  user: User;
  isNewAccount: boolean;
}

/**
 * Acceso a la tienda. La API no expone autenticación, así que este modal
 * resuelve las dos operaciones con los endpoints disponibles:
 * - correo ya registrado -> inicia sesión con esa cuenta;
 * - correo nuevo -> registra la cuenta con `POST /users` (queda guardada en la
 *   base de datos) y la abre como sesión activa.
 */
export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const queryClient = useQueryClient();
  const { users, isLoading, error: usersError, selectUser } = useSession();
  const [result, setResult] = useState<AccessResult | null>(null);

  const schema = useMemo(() => buildSchema(fields), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildInitialValues(fields),
  });

  const accessMutation = useMutation({
    mutationFn: async (values: FormValues): Promise<AccessResult> => {
      const email = String(values.email ?? '').trim().toLowerCase();
      const password = String(values.password ?? '');

      const existing = users.find((user) => user.email.toLowerCase() === email);

      if (existing) {
        // El backend todavía guarda las contraseñas en texto plano, así que la
        // comparación se puede hacer en el cliente. Cuando el backend aplique
        // hash, esta verificación tendrá que moverse al servidor.
        if (existing.password !== password) {
          throw new ApiError('La contraseña no coincide con la de esta cuenta.', 401);
        }
        return { user: existing, isNewAccount: false };
      }

      const username = String(values.username ?? '').trim();
      if (!username) {
        throw new ApiError(
          'Escribe un nombre de usuario para crear la cuenta nueva.',
          400,
        );
      }

      const payload: CreateUserPayload = { username, email, password };
      const countryCode = String(values.countryCode ?? '').trim();
      if (countryCode) payload.countryCode = countryCode;

      const created = await usersApi.create(payload);
      return { user: created, isNewAccount: true };
    },
    onSuccess: async ({ user, isNewAccount }) => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      selectUser(user.id);
      setResult({ user, isNewAccount });
      form.reset(buildInitialValues(fields));
    },
  });

  const handleClose = () => {
    setResult(null);
    accessMutation.reset();
    form.reset(buildInitialValues(fields));
    onClose();
  };

  const submit = form.handleSubmit((values) => {
    const email = String(values.email ?? '').trim().toLowerCase();
    const exists = users.some((user) => user.email.toLowerCase() === email);

    // El nombre de usuario solo hace falta cuando la cuenta es nueva.
    if (!exists && !String(values.username ?? '').trim()) {
      form.setError('username', {
        message: 'El nombre de usuario es obligatorio para crear una cuenta',
      });
      return;
    }

    accessMutation.mutate(values);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Iniciar sesión"
      description="Entra con tu cuenta o regístrate para comprar juegos, tener tu biblioteca y dejar reseñas."
      size="md"
      footer={
        result ? (
          <Button variant="brand" onClick={handleClose}>
            Continuar
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button variant="brand" onClick={submit} isLoading={accessMutation.isPending}>
              Iniciar sesión
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D1FAE5] text-heading-sm font-bold text-[#065F46]">
            {initials(result.user.username)}
          </span>
          <p className="text-body font-semibold text-[#0F172A]">
            {result.isNewAccount ? '¡Cuenta creada!' : '¡Sesión iniciada!'}
          </p>
          <p className="max-w-sm text-body-sm text-[#475569]">
            {result.isNewAccount
              ? `Tu cuenta quedó registrada en la base de datos. Bienvenido, ${result.user.username}.`
              : `Bienvenido de nuevo, ${result.user.username}. Esta es tu sesión activa.`}
          </p>
        </div>
      ) : isLoading ? (
        <Spinner label="Cargando cuentas…" />
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {usersError && <ErrorBanner message={usersError} />}
          {accessMutation.isError && (
            <ErrorBanner message={errorMessage(accessMutation.error)} />
          )}

          {fields.map((field) => {
            const fieldError = form.formState.errors[field.name]?.message;
            const errorText = typeof fieldError === 'string' ? fieldError : undefined;

            return (
              <Input
                key={field.name}
                type={field.type}
                label={field.label}
                placeholder={field.placeholder}
                error={errorText}
                hint={field.help}
                {...form.register(field.name)}
              />
            );
          })}
        </form>
      )}
    </Modal>
  );
}
