import { useEffect, useId, useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog || dialog.open) return;

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype || event.target !== dialog) {
      return;
    }

    const rect = dialog.getBoundingClientRect();
    const isInsideDialog =
      rect.top <= event.clientY &&
      event.clientY <= rect.bottom &&
      rect.left <= event.clientX &&
      event.clientX <= rect.right;

    if (!isInsideDialog) {
      onClose();
    }
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={handleBackdropClick}
      {...({ closedby: 'any' } as Record<string, string>)}
      className={`rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] text-[#0F172A] shadow-[0_24px_60px_rgba(15,23,42,0.22)] p-0 m-auto w-full ${SIZES[size]} overflow-hidden`}
    >
      <header className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] px-6 py-5 bg-[#F8FAFC]">
        <div>
          <h2 id={titleId} className="text-lg font-bold text-[#0F172A] tracking-wide">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-1 text-xs text-[#475569]">
              {description}
            </p>
          )}
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
    </dialog>,
    document.body,
  );
}
