import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'brand' | 'ghost' | 'outline' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-white text-obsidian hover:bg-bone disabled:bg-mid-gray disabled:text-fog',
  brand:
    'bg-[#4f8eff] text-[#00275e] hover:bg-blue-400 disabled:bg-slate-700 disabled:text-slate-400',
  ghost: 'bg-transparent text-fog hover:text-white disabled:text-mid-gray',
  outline:
    'bg-transparent text-white surface-hairline hover:bg-graphite disabled:text-mid-gray',
  danger: 'bg-transparent text-[#ff7b7b] surface-hairline hover:bg-graphite',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-caption',
  md: 'px-4 py-2 text-body-sm',
  lg: 'px-6 py-2.5 text-body-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[4px] font-bold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <span
          aria-hidden="true"
          className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
