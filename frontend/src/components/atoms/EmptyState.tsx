import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] px-6 py-14 text-center shadow-[0_4px_6px_-1px_rgba(15,23,42,0.07),0_2px_4px_-2px_rgba(15,23,42,0.05)]">
      <div className="w-12 h-12 rounded-2xl bg-[#F4F4F6] border border-[#E2E8F0] flex items-center justify-center text-[#475569] mb-1">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
      {description && <p className="max-w-md text-xs sm:text-sm text-[#475569]">{description}</p>}
      {action}
    </div>
  );
}
