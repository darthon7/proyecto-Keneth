import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { LoginModal } from '@/components/molecules/LoginModal';
import { useSession } from '@/context/SessionContext';

const DISMISS_STORAGE_KEY = 'el_pibes_welcome_popup_dismissed';

export function WelcomeCouponPopup() {
  const { currentUser } = useSession();
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return window.sessionStorage.getItem(DISMISS_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  if (currentUser || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_STORAGE_KEY, '1');
    } catch {
      // sessionStorage unavailable
    }
  };

  return (
    <>
      <aside
        data-testid="welcome-coupon-popup"
        aria-label="Promoción de registro"
        className="fixed bottom-5 right-5 z-40 w-[calc(100vw-2.5rem)] max-w-xs rounded-2xl border border-[#312E81] bg-[#1E1B4B] p-4 text-white shadow-[0_20px_48px_rgba(15,23,42,0.35)]"
      >
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar promoción de bienvenida"
          data-testid="welcome-coupon-popup-close"
          className="absolute top-2.5 right-2.5 rounded-lg p-1 text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <span className="inline-block rounded-md bg-[#FFC700] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0F172A]">
          Regalo de bienvenida · 10% OFF
        </span>

        <h2 className="mt-2 pr-5 text-sm font-extrabold text-white">
          ¡Regístrate y obtén 10% de descuento!
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-indigo-100">
          Crea tu cuenta gratis y recibe al instante tu cupón{' '}
          <strong className="font-mono text-[#FFC700]">BIENVENIDA10</strong> para usarlo en tu
          primera compra.
        </p>

        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="brand"
            size="sm"
            className="w-full"
            data-testid="welcome-coupon-register-btn"
            onClick={() => setIsRegisterOpen(true)}
          >
            Registrarme y recibir cupón
          </Button>
        </div>
      </aside>

      <LoginModal
        isOpen={isRegisterOpen}
        initialMode="register"
        onClose={() => setIsRegisterOpen(false)}
      />
    </>
  );
}
