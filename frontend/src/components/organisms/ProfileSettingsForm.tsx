import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { errorMessage, usersApi } from '@/api';
import type { CreateUserPayload, SafeUser, UpdatePayload } from '@/types';
import { profileSettingsSchema, type ProfileSettingsFormValues } from '@/utils/schemas';

const QUICK_COUNTRY_CODES = ['MX', 'US', 'ES', 'CO', 'AR', 'CL'] as const;

interface ProfileSettingsFormProps {
  user: SafeUser;
  onSuccess: () => void;
}

export function ProfileSettingsForm({ user, onSuccess }: ProfileSettingsFormProps) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const form = useForm<ProfileSettingsFormValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      username: user.username,
      email: user.email,
      countryCode: user.countryCode || 'MX',
      password: '',
      confirmPassword: '',
    },
  });

  const { reset } = form;
  const { errors } = form.formState;
  const currentCountry = (form.watch('countryCode') ?? '').toUpperCase();

  useEffect(() => {
    reset({
      username: user.username,
      email: user.email,
      countryCode: user.countryCode || 'MX',
      password: '',
      confirmPassword: '',
    });
  }, [user.username, user.email, user.countryCode, reset]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePayload<CreateUserPayload>) => usersApi.update(user.id, payload),
    onSuccess: async () => {
      form.setValue('password', '');
      form.setValue('confirmPassword', '');
      setFormError(null);
      setFormSuccess('Tu perfil se actualizó correctamente.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
      ]);
      onSuccess();
    },
    onError: (err) => {
      setFormSuccess(null);
      setFormError(errorMessage(err));
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    setFormError(null);
    setFormSuccess(null);

    const payload: UpdatePayload<CreateUserPayload> = {
      username: values.username,
      email: values.email,
      countryCode: values.countryCode,
    };
    if (values.password) {
      payload.password = values.password;
    }

    updateMutation.mutate(payload);
  });

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-8 shadow-xs">
      <div className="border-b border-[#E2E8F0] pb-4">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF2A5F]">
          Configuración de Cuenta
        </span>
        <h2 className="mt-1 text-lg font-black uppercase tracking-wide text-[#0F172A]">
          Editar datos del perfil
        </h2>
        <p className="mt-1 text-xs text-[#475569]">
          Actualiza tu nombre visible, correo de acceso, región de tienda o cambia tu contraseña.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {formError && <ErrorBanner message={formError} />}
        {formSuccess && (
          <div
            role="status"
            className="rounded-xl border border-[#A7F3D0] bg-[#D1FAE5] px-4 py-3 text-xs font-bold text-[#065F46]"
          >
            {formSuccess}
          </div>
        )}

        <div className="grid gap-5 grid-cols-2">
          <Input
            label="Nombre de usuario"
            placeholder="tu_gamertag"
            error={errors.username?.message}
            {...form.register('username')}
          />
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="correo@ejemplo.com"
            error={errors.email?.message}
            {...form.register('email')}
          />
        </div>

        <div className="space-y-2">
          <div className="max-w-xs">
            <Input
              label="Código de país (ISO 2 letras)"
              maxLength={2}
              placeholder="MX"
              error={errors.countryCode?.message}
              {...form.register('countryCode', {
                onChange: (event) => {
                  const upper = event.target.value.toUpperCase();
                  if (event.target.value !== upper) {
                    form.setValue('countryCode', upper, {
                      shouldValidate: form.formState.isSubmitted,
                    });
                  }
                },
              })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#64748B]">Selección rápida:</span>
            {QUICK_COUNTRY_CODES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => form.setValue('countryCode', code, { shouldValidate: true })}
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition-colors ${
                  currentCountry === code
                    ? 'bg-[#1E1B4B] text-white'
                    : 'bg-[#F4F4F6] text-[#475569] hover:bg-[#E2E8F0]'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#E2E8F0] pt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1E1B4B] mb-3">
            Seguridad (opcional)
          </p>
          <div className="grid gap-5 grid-cols-2">
            <Input
              label="Nueva contraseña"
              type="password"
              placeholder="Déjalo vacío para mantener la actual"
              hint="Mínimo 4 caracteres si deseas cambiarla."
              error={errors.password?.message}
              {...form.register('password')}
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              placeholder="Repite la nueva contraseña"
              error={errors.confirmPassword?.message}
              {...form.register('confirmPassword')}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <Button type="submit" variant="brand" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Guardando cambios…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
