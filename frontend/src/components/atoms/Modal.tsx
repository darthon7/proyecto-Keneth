import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#0F172A]/60 backdrop-blur-sm p-4 sm:p-6">
      <button
        type="button"
        aria-label="Cerrar"
        className="fixed inset-0 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 w-full ${SIZES[size]} my-auto rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] text-[#0F172A] shadow-[0_24px_60px_rgba(15,23,42,0.22)] overflow-hidden`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] px-6 py-5 bg-[#F8FAFC]">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] tracking-wide">{title}</h2>
            {description && <p className="mt-1 text-xs text-[#475569]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-[#E2E8F0]/70 btn-nintendo-animation"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="px-6 py-5">{children}</div>

        {footer && (
          <footer className="flex flex-wrap justify-end gap-3 border-t border-[#E2E8F0] px-6 py-4 bg-[#F4F4F6]">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
