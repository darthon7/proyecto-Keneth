import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'blue' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-graphite text-fog',
  blue: 'bg-graphite text-signal-blue',
  success: 'bg-graphite text-[#7ddc7d]',
  warning: 'bg-graphite text-[#e8c37a]',
  danger: 'bg-graphite text-[#ff7b7b]',
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
