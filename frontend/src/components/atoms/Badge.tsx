import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'blue' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-[#F4F4F6] text-[#475569] border border-[#E2E8F0]',
  blue: 'bg-[#EEF2FF] text-[#1E1B4B] border border-[#C7D2FE]',
  success: 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]',
  warning: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
  danger: 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]',
};

export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-caption font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
