import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export function Input({ label, error, hint, icon, className = '', id, ...rest }: InputProps) {
  const inputId = id ?? rest.name;
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
