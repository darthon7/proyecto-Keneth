import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { Modal } from '@/components/atoms/Modal';
import { authApi, errorMessage } from '@/api';
import { useSession } from '@/context/SessionContext';
import { initials } from '@/utils/format';
import type { SafeUser } from '@/types';

export type AuthModalMode = 'login' | 'register';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthModalMode;
}

interface AccessResult {
  user: SafeUser;
  isNewAccount: boolean;
}

interface AuthFormValues {
  email: string;
  password: string;
  username?: string;
  countryCode?: string;
}

const DEFAULT_VALUES: AuthFormValues = {
  email: '',
  password: '',
  username: '',
  countryCode: 'MX',
};

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Correo es obligatorio').email('Introduce un correo válido'),
  password: z.string().min(1, 'Contraseña es obligatoria').max(50, 'Contraseña es muy larga'),
  username: z.string().optional(),
  countryCode: z.string().optional(),
});

const registerSchema = z.object({
  email: z.string().trim().min(1, 'Correo es obligatorio').email('Introduce un correo válido'),
  password: z
    .string()
    .min(4, 'Contraseña debe tener al menos 4 caracteres')
    .max(50, 'Contraseña es muy larga'),
  username: z
    .string()
    .trim()
    .min(2, 'Nombre de usuario debe tener al menos 2 caracteres')
    .max(100, 'Nombre de usuario es muy largo'),
  countryCode: z
    .string()
    .trim()
    .refine((value) => value === '' || value.length === 2, {
      message: 'País debe tener exactamente 2 letras (ISO-2)',
    })
    .optional(),
});

/**
 * Modal de acceso a la tienda conectado a los endpoints reales de autenticación:
 * - `POST /auth/login` (correo y contraseña)
 * - `POST /auth/register` (registro de nuevo cliente)
 */
export function LoginModal({ isOpen, onClose, initialMode = 'login' }: LoginModalProps) {
  const queryClient = useQueryClient();
  const { setSession } = useSession();
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [result, setResult] = useState<AccessResult | null>(null);

  const isRegister = mode === 'register';
  const schema = useMemo(() => (isRegister ? registerSchema : loginSchema), [isRegister]);

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  const accessMutation = useMutation({
    mutationFn: async (values: AuthFormValues): Promise<AccessResult> => {
      const email = values.email.trim().toLowerCase();
      const password = values.password;

      if (isRegister) {
        const username = (values.username ?? '').trim();
        const countryCode = (values.countryCode ?? '').trim().toUpperCase();
        const authResponse = await authApi.register({
          email,
          password,
          username,
          ...(countryCode ? { countryCode } : {}),
        });
        setSession(authResponse);
        return { user: authResponse.user, isNewAccount: true };
      }

      const authResponse = await authApi.login({ email, password });
      setSession(authResponse);
      return { user: authResponse.user, isNewAccount: false };
    },
    onSuccess: async (accessResult) => {
      await queryClient.invalidateQueries({ queryKey: ['wishlists'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['user-libraries'] });
      setResult(accessResult);
      form.reset(DEFAULT_VALUES);
    },
  });

  const { reset: resetForm } = form;
  const { reset: resetMutation } = accessMutation;

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setResult(null);
    resetMutation();
    resetForm(DEFAULT_VALUES);
  }, [isOpen, initialMode, resetForm, resetMutation]);

  const handleModeSwitch = () => {
    const nextMode: AuthModalMode = isRegister ? 'login' : 'register';
    setMode(nextMode);
    accessMutation.reset();
    form.clearErrors();
  };

  const handleClose = () => {
    setResult(null);
    accessMutation.reset();
    form.reset(DEFAULT_VALUES);
    onClose();
  };

  const submit = form.handleSubmit((values) => {
    accessMutation.mutate(values);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
      description={
        isRegister
          ? 'Crea tu cuenta para comprar juegos, tener tu biblioteca y dejar reseñas.'
          : 'Entra con tu cuenta para comprar juegos, tener tu biblioteca y dejar reseñas.'
      }
      size="md"
      footer={
        result ? (
          <Button variant="brand" data-testid="login-continue-btn" onClick={handleClose}>
            Continuar
          </Button>
        ) : (
          <>
            <Button variant="ghost" data-testid="login-cancel-btn" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              variant="brand"
              data-testid="login-submit-btn"
              onClick={submit}
              isLoading={accessMutation.isPending}
            >
              {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div
          data-testid="login-success-state"
          className="flex flex-col items-center gap-3 py-6 text-center"
        >
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
      ) : (
        <form data-testid="login-modal-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {accessMutation.isError && (
            <ErrorBanner message={errorMessage(accessMutation.error)} />
          )}

          <Input
            data-testid="login-email-input"
            type="email"
            label="Correo"
            placeholder="jugador@correo.com"
            autoComplete="email"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />

          <Input
            data-testid="login-password-input"
            type="password"
            label="Contraseña"
            placeholder="••••••••"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            hint={isRegister ? 'Entre 4 y 50 caracteres.' : undefined}
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />

          {isRegister && (
            <>
              <Input
                data-testid="login-username-input"
                type="text"
                label="Nombre de usuario"
                placeholder="ElPibes"
                autoComplete="username"
                hint="Obligatorio para crear tu cuenta."
                error={form.formState.errors.username?.message}
                {...form.register('username')}
              />

              <Input
                data-testid="login-country-input"
                type="text"
                label="País (ISO-2)"
                placeholder="MX"
                maxLength={2}
                error={form.formState.errors.countryCode?.message}
                {...form.register('countryCode')}
              />
            </>
          )}

          <div className="pt-1 text-center">
            <button
              type="button"
              data-testid="login-mode-switch-btn"
              onClick={handleModeSwitch}
              className="text-xs font-semibold text-[#1E1B4B] hover:text-[#FF2A5F] underline-offset-2 hover:underline transition-colors"
            >
              {isRegister
                ? '¿Ya tienes una cuenta? Inicia sesión'
                : '¿No tienes cuenta? Regístrate gratis'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
