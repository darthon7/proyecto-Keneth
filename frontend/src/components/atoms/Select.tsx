import type { ReactNode, SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  options?: { value: string | number; label: string }[];
  children?: ReactNode;
}

export function Select({
  label,
  error,
  hint,
  placeholder,
  options,
  className = '',
  id,
  children,
  ...rest
}: SelectProps) {
  const selectId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full rounded-xl bg-[#FFFFFF] border px-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#FF2A5F]/20 transition-all ${
          error ? 'border-[#EF4444]' : 'border-[#E2E8F0] focus:border-[#1E1B4B]'
        } ${className}`}
        {...rest}
      >
        {placeholder && <option value="" className="bg-[#FFFFFF] text-[#94A3B8]">{placeholder}</option>}
        {options?.map((option) => (
          <option key={String(option.value)} value={option.value} className="bg-[#FFFFFF] text-[#0F172A]">
            {option.label}
          </option>
        ))}
        {children}
      </select>
      {error ? (
        <p className="text-[11px] text-[#EF4444]">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-[#475569]">{hint}</p>
      ) : null}
    </div>
  );
}
