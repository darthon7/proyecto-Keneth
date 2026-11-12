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
        <label htmlFor={selectId} className="text-body-sm font-semibold text-white">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full appearance-none rounded-[4px] bg-graphite px-4 py-3 text-body-sm text-white focus:bg-[#3a3a3a] focus:outline-none ${
          error ? 'border border-[#ff7b7b]' : ''
        } ${className}`}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options?.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      {error ? (
        <p className="text-caption text-[#ff7b7b]">{error}</p>
      ) : hint ? (
        <p className="text-caption text-fog">{hint}</p>
      ) : null}
    </div>
  );
}
