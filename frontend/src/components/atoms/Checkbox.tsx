import type { InputHTMLAttributes } from 'react';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Checkbox({ label, error, id, className = '', ...rest }: CheckboxProps) {
  const checkboxId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={checkboxId}
        className="flex cursor-pointer items-center gap-2 text-body-sm text-white select-none"
      >
        <input
          id={checkboxId}
          type="checkbox"
          className={`h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-[4px] bg-graphite checked:bg-white checked:border-white focus:outline-none ${className}`}
          {...rest}
        />
        {label}
      </label>
      {error && <p className="text-caption text-[#ff7b7b]">{error}</p>}
    </div>
  );
}
