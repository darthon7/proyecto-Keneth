import { useId } from 'react';

interface BrandLogoProps {
  /** Compact variant hides or adapts spacing for tight headers */
  showSubtitle?: boolean;
  subtitle?: string;
  subtitleClassName?: string;
  titleClassName?: string;
}

export function BrandLogo({
  showSubtitle = true,
  subtitle = 'DIGITAL STORE',
  subtitleClassName = 'hidden sm:block text-[9px] font-mono uppercase tracking-[0.24em] text-slate-400 mt-1',
  titleClassName = 'text-base sm:text-xl',
}: BrandLogoProps) {
  const uid = useId().replace(/:/g, '');
  const bodyGradId = `link-cap-body-${uid}`;
  const brimGradId = `link-cap-brim-${uid}`;
  const triforceGradId = `link-cap-triforce-${uid}`;

  return (
    <div className="relative inline-flex flex-col pt-5 sm:pt-[22px] leading-none">
      {/* Gorrito de Link (Zelda) posado encima del texto EL PIBES */}
      <svg
        viewBox="0 0 84 44"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none select-none absolute -top-0.5 -left-1.5 w-[48px] sm:w-[54px] h-auto -rotate-[8deg] drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]"
      >
        <defs>
          <linearGradient id={bodyGradId} x1="16" y1="6" x2="74" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="42%" stopColor="#16A34A" />
            <stop offset="100%" stopColor="#14532D" />
          </linearGradient>
          <linearGradient id={brimGradId} x1="8" y1="30" x2="50" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="55%" stopColor="#15803D" />
            <stop offset="100%" stopColor="#052E16" />
          </linearGradient>
          <linearGradient id={triforceGradId} x1="18" y1="31" x2="25" y2="39" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="55%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#A16207" />
          </linearGradient>
        </defs>

        {/* Corona y cola puntiaguda curva del gorro */}
        <path
          d="M11 32C12 18 22 6 40 7C56 8 70 15 79 25C71 22 60 20 46 31Z"
          fill={`url(#${bodyGradId})`}
          stroke="#4ADE80"
          strokeOpacity="0.55"
          strokeWidth="1.15"
          strokeLinejoin="round"
        />

        {/* Pliegue sutil de tela para volumen */}
        <path
          d="M18 23C25 12 42 10.5 62 18"
          stroke="#A7F3D0"
          strokeOpacity="0.45"
          strokeWidth="1.25"
          strokeLinecap="round"
        />

        {/* Doblez frontal del gorrito */}
        <path
          d="M7 33.5C16 28.5 34 27.5 49 31.5C51 32.5 50 38.5 46 39.5C33 35.5 17 36.5 9 39.5C6 39.5 5 34.8 7 33.5Z"
          fill={`url(#${brimGradId})`}
          stroke="#4ADE80"
          strokeOpacity="0.6"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />

        {/* Insignia Trifuerza dorada en el doblez */}
        <path d="M21 30.8L23.1 34.1H18.9L21 30.8Z" fill={`url(#${triforceGradId})`} />
        <path d="M18.9 34.1L21 37.4H16.8L18.9 34.1Z" fill={`url(#${triforceGradId})`} />
        <path d="M23.1 34.1L25.2 37.4H21L23.1 34.1Z" fill={`url(#${triforceGradId})`} />
      </svg>

      <span
        className={`relative font-black tracking-wider uppercase text-white font-display whitespace-nowrap ${titleClassName}`}
      >
        EL <span className="text-[#FFC700]">PIBES</span>
      </span>

      {showSubtitle && <span className={subtitleClassName}>{subtitle}</span>}
    </div>
  );
}
