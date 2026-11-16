import type { ClipboardEvent, InputHTMLAttributes, KeyboardEvent, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

const NAVIGATION_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

export function Input({
  label,
  error,
  hint,
  icon,
  className = '',
  id,
  onKeyDown,
  onPaste,
  min,
  ...rest
}: InputProps) {
  const inputId = id ?? rest.name;
  const isNumberInput = rest.type === 'number';
  const effectiveMin = isNumberInput ? (min !== undefined ? min : 0) : min;
  const allowNegative = isNumberInput && Number(effectiveMin) < 0;
  const allowDecimal =
    isNumberInput &&
    rest.step !== undefined &&
    (rest.step === 'any' ||
      (Number.isFinite(Number(rest.step)) && Number(rest.step) % 1 !== 0));

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (isNumberInput && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (!NAVIGATION_KEYS.has(event.key)) {
        if (event.key === 'e' || event.key === 'E' || event.key === '+') {
          event.preventDefault();
          return;
        }
        if (event.key === '-' && !allowNegative) {
          event.preventDefault();
          return;
        }
        if (event.key === '.' && allowDecimal) {
          // Permitir punto decimal solo cuando step admite decimales
        } else if (
          !(event.key === '-' && allowNegative) &&
          event.key.length === 1 &&
          !/^\d$/.test(event.key)
        ) {
          event.preventDefault();
          return;
        }
      }
    }
    onKeyDown?.(event);
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (isNumberInput) {
      const pasted = event.clipboardData.getData('text').trim();
      const pasteRegex = allowNegative
        ? allowDecimal
          ? /^-?\d+(\.\d+)?$/
          : /^-?\d+$/
        : allowDecimal
          ? /^\d+(\.\d+)?$/
          : /^\d+$/;
      if (!pasteRegex.test(pasted)) {
        event.preventDefault();
        return;
      }
    }
    onPaste?.(event);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-body-sm font-semibold text-[#0F172A]">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#475569]">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          min={effectiveMin}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={`w-full rounded-lg border bg-[#FFFFFF] px-4 py-2.5 text-body-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FF2A5F]/20 transition-colors ${
            icon ? 'pl-9' : ''
          } ${error ? 'border-[#EF4444]' : 'border-[#E2E8F0] focus:border-[#1E1B4B]'} ${className}`}
          {...rest}
        />
      </div>
      {error ? (
        <p className="text-caption text-[#EF4444]">{error}</p>
      ) : hint ? (
        <p className="text-caption text-[#475569]">{hint}</p>
      ) : null}
    </div>
  );
}
