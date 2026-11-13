import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/atoms/BrandLogo';

const FOOTER_LINKS = [
  { to: '/games', label: 'Catálogo' },
  { to: '/promotions', label: 'Ofertas' },
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
      className="relative w-full mt-16 bg-[#1E1B4B] border-t border-[#312E81] text-white font-sans"
    >
      {/* Pop contrast top accent hairline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#FF2A5F] via-[#FFC700] to-[#FF2A5F]"
      />

      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-9">
        {/* Primary Footbar Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Link
            to="/"
            className="inline-flex items-center group w-fit rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC700]"
          >
            <BrandLogo
              titleClassName="text-sm sm:text-base"
              subtitle="Tienda digital de videojuegos y claves oficiales"
              subtitleClassName="text-[11px] text-indigo-200 mt-1"
            />
          </Link>

          <nav aria-label="Navegación del pie de página">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
              {FOOTER_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="rounded px-1 -mx-1 py-0.5 text-xs font-medium text-indigo-100 hover:text-[#FFC700] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC700] focus-visible:text-[#FFC700]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Minimal Copyright & Trust Baseline */}
        <div className="mt-6 pt-5 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-indigo-200">
          <p>© {currentYear} EL PIBES Digital Store. Todos los derechos reservados.</p>
          <p className="inline-flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FFC700]" aria-hidden="true" />
            <span>Claves digitales · Activación inmediata</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
