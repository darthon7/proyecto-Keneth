import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant =
  | 'primary'
  | 'brand'
  | 'success'
  | 'ghost'
  | 'outline'
  | 'danger'
  | 'nintendo';
type ButtonAnimation = 'none' | 'nintendo';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  animation?: ButtonAnimation;
  animated?: boolean;
  children?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-white text-obsidian hover:bg-bone shadow-[0_4px_14px_rgba(255,255,255,0.15)] hover:shadow-[0_8px_20px_rgba(255,255,255,0.25)] disabled:bg-mid-gray disabled:text-fog',
  brand:
    'bg-[#4f8eff] text-[#00275e] hover:bg-blue-400 shadow-[0_4px_14px_rgba(79,142,255,0.3)] hover:shadow-[0_8px_20px_rgba(79,142,255,0.45)] disabled:bg-slate-700 disabled:text-slate-400',
  success:
    'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_4px_14px_rgba(16,185,129,0.35)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.5)] disabled:bg-slate-700 disabled:text-slate-400',
  ghost: 'bg-transparent text-fog hover:text-white disabled:text-mid-gray',
  outline:
    'bg-transparent text-white surface-hairline hover:bg-graphite disabled:text-mid-gray',
  danger:
    'bg-transparent text-[#ff7b7b] surface-hairline hover:bg-[#ff7b7b]/10 disabled:text-mid-gray',
  nintendo:
    'bg-[#e60012] text-white hover:bg-[#ff1a1a] shadow-[0_4px_14px_rgba(230,0,18,0.35)] hover:shadow-[0_8px_20px_rgba(230,0,18,0.5)] disabled:bg-slate-700 disabled:text-slate-400',
};

const SIZES = {
  sm: 'px-3.5 py-1.5 text-caption',
  md: 'px-4 py-2 text-body-sm',
  lg: 'px-6 py-2.5 text-body-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  animation = 'nintendo',
  animated = false,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const isNintendoAnimated = animation !== 'none' || animated || variant === 'nintendo';
  const animationClasses = isNintendoAnimated
    ? 'btn-nintendo-animation btn-nintendo-shine'
    : 'transition-colors';

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-bold disabled:cursor-not-allowed ${animationClasses} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
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
