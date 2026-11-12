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
        <label htmlFor={inputId} className="text-body-sm font-semibold text-white">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fog">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full rounded-[4px] bg-graphite px-4 py-3 text-body-sm text-white placeholder:text-fog focus:bg-[#3a3a3a] focus:outline-none ${
            icon ? 'pl-9' : ''
          } ${error ? 'border border-[#ff7b7b]' : ''} ${className}`}
          {...rest}
        />
      </div>
      {error ? (
        <p className="text-caption text-[#ff7b7b]">{error}</p>
      ) : hint ? (
        <p className="text-caption text-fog">{hint}</p>
      ) : null}
    </div>
  );
}
