import { Link } from 'react-router-dom';

const FOOTER_LINKS = [
  { to: '/games', label: 'Catálogo' },
  { to: '/catalog/promotions', label: 'Ofertas' },
  { to: '/library', label: 'Biblioteca' },
  { to: '/wishlist', label: 'Deseados' },
  { to: '/orders', label: 'Órdenes' },
  { to: '/reviews', label: 'Reseñas' },
] as const;

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      data-testid="site-footer"
      className="relative w-full mt-16 bg-[#0B0C10] border-t border-white/[0.08] text-slate-300 font-sans"
    >
      {/* Subtle HUD micro-hairline accent mirroring NavBar */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent"
      />

      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-9">
        {/* Primary Footbar Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 group w-fit rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          >
            <div className="w-8 h-8 rounded-xl bg-[#12151E] border border-cyan-400/25 group-hover:border-cyan-400/60 flex items-center justify-center transition-colors shadow-[inset_0_0_12px_rgba(34,211,238,0.08)]">
              <svg className="w-4 h-4" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <path
                  d="M20 3L35 11.66V28.34L20 37L5 28.34V11.66L20 3Z"
                  stroke="#22d3ee"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 10.5L28.5 15.4V24.6L20 29.5L11.5 24.6V15.4L20 10.5Z"
                  fill="#a855f7"
                  fillOpacity="0.22"
                  stroke="#c084fc"
                  strokeWidth="1.5"
                />
                <circle cx="20" cy="20" r="3.2" fill="#22d3ee" />
              </svg>
            </div>

            <div className="flex flex-col leading-none">
              <span className="text-sm font-black tracking-wider uppercase text-white font-display">
                EL <span className="text-cyan-400">PIBES</span>
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                Tienda digital de videojuegos y claves oficiales
              </span>
            </div>
          </Link>

          <nav aria-label="Navegación del pie de página">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
              {FOOTER_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="rounded px-1 -mx-1 py-0.5 text-xs font-medium text-slate-400 hover:text-cyan-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:text-cyan-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Minimal Copyright & Trust Baseline */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
          <p>© {currentYear} EL PIBES Digital Store. Todos los derechos reservados.</p>
          <p className="inline-flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400/80" aria-hidden="true" />
            <span>Claves digitales · Activación inmediata</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
