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
    'bg-[#FF2A5F] text-white hover:bg-[#E01E4F] shadow-[0_4px_14px_rgba(255,42,95,0.28)] hover:shadow-[0_8px_20px_rgba(255,42,95,0.42)] disabled:bg-[#E2E8F0] disabled:text-[#94A3B8]',
  brand:
    'bg-[#FF2A5F] text-white hover:bg-[#E01E4F] shadow-[0_4px_14px_rgba(255,42,95,0.28)] hover:shadow-[0_8px_20px_rgba(255,42,95,0.42)] disabled:bg-[#E2E8F0] disabled:text-[#94A3B8]',
  success:
    'bg-emerald-500 text-[#0F172A] hover:bg-emerald-400 shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.4)] disabled:bg-[#E2E8F0] disabled:text-[#94A3B8]',
  ghost: 'bg-transparent text-[#475569] hover:text-[#0F172A] hover:bg-[#E2E8F0]/60 disabled:text-[#94A3B8]',
  outline:
    'bg-[#FFFFFF] text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F4F4F6] hover:border-[#1E1B4B] disabled:text-[#94A3B8]',
  danger:
    'bg-transparent text-[#EF4444] border border-[#FECACA] hover:bg-[#FEE2E2] hover:text-[#991B1B] disabled:text-[#94A3B8]',
  nintendo:
    'bg-[#e60012] text-white hover:bg-[#c80010] shadow-[0_4px_14px_rgba(230,0,18,0.3)] hover:shadow-[0_8px_20px_rgba(230,0,18,0.45)] disabled:bg-[#E2E8F0] disabled:text-[#94A3B8]',
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
