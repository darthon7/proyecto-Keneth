import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#141824] border border-white/10 px-6 py-14 text-center shadow-lg">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 mb-1">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      {description && <p className="max-w-md text-xs sm:text-sm text-slate-400">{description}</p>}
      {action}
    </div>
  );
}
