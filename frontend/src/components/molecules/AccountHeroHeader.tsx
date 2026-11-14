import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface AccountHeroStat {
  label: string;
  value: string | number;
  tone?: 'default' | 'gold' | 'pink' | 'emerald';
}

interface AccountHeroHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  stats?: AccountHeroStat[];
  actions?: ReactNode;
  backLink?: { to: string; label: string };
}

const VALUE_TONES: Record<NonNullable<AccountHeroStat['tone']>, string> = {
  default: 'text-white',
  gold: 'text-[#FFC700]',
  pink: 'text-[#FF85A3]',
  emerald: 'text-emerald-300',
};

export function AccountHeroHeader({
  eyebrow,
  title,
  description,
  stats,
  actions,
  backLink,
}: AccountHeroHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-[#312E81] bg-[#1E1B4B] p-6 sm:p-8 text-white shadow-[0_14px_32px_rgba(30,27,75,0.2)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2 max-w-2xl">
          {backLink && (
            <Link
              to={backLink.to}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-200 hover:text-[#FFC700] transition-colors mb-1"
            >
              <span aria-hidden="true">←</span>
              <span>{backLink.label}</span>
            </Link>
          )}
          <span className="block text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-[#FFC700]">
            {eyebrow}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-indigo-100/85 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {stats &&
            stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur-xs min-w-[100px]"
              >
                <p className="text-[10px] font-mono uppercase tracking-wider text-indigo-200">
                  {stat.label}
                </p>
                <p className={`text-lg font-black ${VALUE_TONES[stat.tone ?? 'default']}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          {actions}
        </div>
      </div>
    </header>
  );
}
