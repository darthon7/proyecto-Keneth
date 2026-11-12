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
        <label htmlFor={selectId} className="text-xs font-bold uppercase tracking-wider text-slate-300">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full rounded-xl bg-[#1c2232] border border-white/10 px-3.5 py-2.5 text-xs text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/30 transition-all ${
          error ? 'border-rose-500' : ''
        } ${className}`}
        {...rest}
      >
        {placeholder && <option value="" className="bg-[#141824] text-slate-400">{placeholder}</option>}
        {options?.map((option) => (
          <option key={String(option.value)} value={option.value} className="bg-[#141824] text-white">
            {option.label}
          </option>
        ))}
        {children}
      </select>
      {error ? (
        <p className="text-[11px] text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}
