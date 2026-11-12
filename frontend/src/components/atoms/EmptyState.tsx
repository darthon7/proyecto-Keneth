import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[4px] bg-graphite/40 px-6 py-14 text-center">
      <h3 className="text-subheading font-semibold text-white">{title}</h3>
      {description && <p className="max-w-md text-body-sm text-fog">{description}</p>}
      {action}
    </div>
  );
}
