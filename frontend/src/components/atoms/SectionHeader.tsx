import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div>
        <h2 className="text-subheading font-semibold text-[#0F172A]">{title}</h2>
        {description && <p className="mt-1 text-body-sm text-[#475569]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
