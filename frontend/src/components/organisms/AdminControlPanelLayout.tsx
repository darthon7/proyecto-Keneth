import { Link, NavLink, Outlet } from 'react-router-dom';
import { BrandLogo } from '@/components/atoms/BrandLogo';

interface AdminNavGroup {
  label: string;
  items: {
    to: string;
    label: string;
    testId: string;
    end?: boolean;
  }[];
}

const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Consola',
    items: [
      { to: '/admin', label: 'Resumen Operativo', testId: 'admin-nav-overview', end: true },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { to: '/admin/games', label: 'Videojuegos', testId: 'admin-nav-games' },
      { to: '/admin/developers', label: 'Desarrolladoras', testId: 'admin-nav-developers' },
      { to: '/admin/publishers', label: 'Publishers', testId: 'admin-nav-publishers' },
      { to: '/admin/genres', label: 'Géneros', testId: 'admin-nav-genres' },
      { to: '/admin/platforms', label: 'Plataformas', testId: 'admin-nav-platforms' },
      { to: '/admin/digital-keys', label: 'Claves Digitales', testId: 'admin-nav-digital-keys' },
      {
        to: '/admin/system-requirements',
        label: 'Requisitos Técnicos (PC)',
        testId: 'admin-nav-system-requirements',
      },
    ],
  },
  {
    label: 'Comercio',
    items: [
      { to: '/admin/promotions', label: 'Cupones de Descuento', testId: 'admin-nav-promotions' },
      { to: '/admin/discount-campaigns', label: 'Campañas de Descuento', testId: 'admin-nav-discount-campaigns' },
      { to: '/admin/featured-trailers', label: 'Tráilers Destacados', testId: 'admin-nav-featured-trailers' },
      { to: '/admin/orders', label: 'Órdenes', testId: 'admin-nav-orders' },
    ],
  },
];

export function AdminControlPanelLayout() {
  return (
    <div
      data-testid="admin-control-panel"
      className="min-h-screen bg-[#F4F4F6] text-[#0F172A]"
    >
      <div className="w-full">
        <div className="grid grid-cols-[312px_1fr] items-start">
          <aside
            aria-label="Navegación del panel de control"
            className="admin-scroll sticky top-0 h-screen overflow-y-auto bg-[#1E1B4B] text-white border-r border-[#312E81] p-6 shadow-[0_12px_28px_rgba(30,27,75,0.16)]"
          >
            <div className="mb-5 pb-4 border-b border-white/15 space-y-3">
              <Link
                to="/"
                data-testid="admin-back-to-store-btn"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider text-white transition-colors hover:border-[#FFC700] hover:bg-[#FFC700] hover:text-[#0F172A]"
              >
                <span>← Volver a la página</span>
              </Link>
              <div className="flex flex-col items-center text-center">
                <BrandLogo
                  titleClassName="text-base"
                  subtitle="DIGITAL STORE"
                  subtitleClassName="text-[9px] font-mono uppercase tracking-[0.22em] text-indigo-200 mt-0.5"
                />
                <p className="mt-2.5 text-sm font-bold tracking-tight text-indigo-100">
                  Consola de Operaciones
                </p>
              </div>
            </div>

            <nav className="space-y-6">
              {ADMIN_NAV_GROUPS.map((group) => (
                <div key={group.label} className="space-y-1.5">
                  <p className="px-3 text-[11px] font-mono font-bold uppercase tracking-widest text-indigo-200">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-1">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        data-testid={item.testId}
                        className={({ isActive }) =>
                          `px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                            isActive
                              ? 'bg-[#FFC700] text-[#0F172A] shadow-sm'
                              : 'text-indigo-100 hover:bg-white/10 hover:text-white'
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 py-6 pl-6 pr-8">
            <section className="min-w-0 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-8 shadow-xs">
              <Outlet />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
