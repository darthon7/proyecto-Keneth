import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { LoginModal } from '@/components/molecules/LoginModal';
import { useSession } from '@/context/SessionContext';
import { UserRole } from '@/types';

interface AdminRouteGuardProps {
  children?: ReactNode;
}

/**
 * Guardia de rutas administrativas en el cliente.
 * Nota: la autorización real siempre se aplica en el servidor con JwtAuthGuard + RolesGuard;
 * este guard protege la experiencia UI evitando renderizar pantallas operativas a clientes o anónimos.
 */
export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { currentUser, isLoading } = useSession();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="page-container py-20">
        <Spinner label="Verificando permisos…" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== UserRole.ADMIN) {
    const isUnauthenticated = !currentUser;

    return (
      <section
        data-testid="admin-access-denied"
        className="page-container py-16 sm:py-24"
      >
        <div className="mx-auto max-w-lg rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-8 text-center shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEE2E2] text-[#EF4444] border border-[#FECACA]">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <span className="mt-4 inline-block rounded-md bg-[#FEF3C7] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#92400E]">
            Acceso Restringido
          </span>

          <h1 className="mt-3 text-heading-sm font-black text-[#0F172A]">
            {isUnauthenticated
              ? 'Se requiere cuenta de administrador'
              : 'No tienes permisos de administrador'}
          </h1>

          <p className="mt-2 text-body-sm text-[#475569]">
            {isUnauthenticated
              ? 'El Panel de Control es exclusivo para administradores de la tienda. Inicia sesión con una cuenta autorizada para continuar.'
              : `Tu cuenta actual (${currentUser.username}) tiene rol de cliente y no puede acceder al Panel de Control operativo.`}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              data-testid="admin-denied-home-btn"
              className="inline-flex items-center justify-center rounded-full bg-[#1E1B4B] hover:bg-[#312E81] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition-colors"
            >
              Volver a la tienda
            </Link>

            {isUnauthenticated && (
              <Button
                variant="brand"
                data-testid="admin-denied-login-btn"
                onClick={() => setIsLoginOpen(true)}
              >
                Iniciar sesión como administrador
              </Button>
            )}
          </div>
        </div>

        {isUnauthenticated && (
          <LoginModal
            isOpen={isLoginOpen}
            initialMode="login"
            onClose={() => setIsLoginOpen(false)}
          />
        )}
      </section>
    );
  }

  return <>{children ?? <Outlet />}</>;
}
