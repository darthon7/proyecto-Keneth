import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useSession } from '@/context/SessionContext';

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
      { to: '/admin/editions', label: 'Ediciones y DLCs', testId: 'admin-nav-editions' },
      { to: '/admin/digital-keys', label: 'Claves Digitales', testId: 'admin-nav-digital-keys' },
      {
        to: '/admin/system-requirements',
        label: 'Requisitos Técnicos',
        testId: 'admin-nav-system-requirements',
      },
    ],
  },
  {
    label: 'Comercio y Usuarios',
    items: [
      { to: '/admin/promotions', label: 'Promociones', testId: 'admin-nav-promotions' },
      { to: '/admin/orders', label: 'Órdenes', testId: 'admin-nav-orders' },
      { to: '/admin/users', label: 'Usuarios y Roles', testId: 'admin-nav-users' },
    ],
  },
];

export function AdminControlPanelLayout() {
  const { currentUser } = useSession();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div
      data-testid="admin-control-panel"
      className="min-h-[calc(100vh-4.25rem)] bg-[#F4F4F6] text-[#0F172A]"
    >
      {/* Operational Header Strip */}
      <div className="bg-[#FFFFFF] border-b border-[#E2E8F0] shadow-xs">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="admin-sidebar-toggle"
              aria-label="Alternar menú operativo"
              aria-expanded={isMobileSidebarOpen}
              onClick={() => setIsMobileSidebarOpen((open) => !open)}
              className="lg:hidden p-2 rounded-xl bg-[#F4F4F6] border border-[#E2E8F0] text-[#1E1B4B] hover:border-[#FF2A5F] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                {isMobileSidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <Link
              to="/"
              data-testid="admin-back-to-store-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4F4F6] hover:bg-[#1E1B4B] text-xs font-bold text-[#1E1B4B] hover:text-white border border-[#E2E8F0] transition-colors"
            >
              <span>← Volver a la tienda</span>
            </Link>

            <span className="hidden sm:inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#475569]">
              <span className="h-2 w-2 rounded-full bg-[#FF2A5F]" aria-hidden="true" />
              Panel de Control Operativo
            </span>
          </div>

          <div
            data-testid="admin-active-user"
            className="flex items-center gap-2 rounded-full bg-[#1E1B4B] px-3 py-1 text-xs text-white"
          >
            <span className="rounded bg-[#FFC700] px-1.5 py-0.5 font-mono text-[10px] font-black uppercase text-[#0F172A]">
              ADMIN
            </span>
            <span className="font-bold truncate max-w-[140px]">
              {currentUser?.username ?? 'Administrador'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Console Container */}
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
          {/* Sidebar Navigation */}
          <aside
            aria-label="Navegación del panel de control"
            className={`${
              isMobileSidebarOpen ? 'block' : 'hidden'
            } lg:block lg:sticky lg:top-24 rounded-2xl bg-[#1E1B4B] text-white border border-[#312E81] p-4 shadow-[0_12px_28px_rgba(30,27,75,0.16)]`}
          >
            <div className="mb-4 pb-3 border-b border-white/15">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFC700]">
                EL PIBES · ADMIN
              </p>
              <p className="mt-0.5 text-sm font-black tracking-tight text-white">
                Consola de Operaciones
              </p>
            </div>

            <nav className="space-y-5">
              {ADMIN_NAV_GROUPS.map((group) => (
                <div key={group.label} className="space-y-1">
                  <p className="px-2.5 text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-200">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        data-testid={item.testId}
                        onClick={() => setIsMobileSidebarOpen(false)}
                        className={({ isActive }) =>
                          `px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
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

          {/* Operational Module Canvas */}
          <section className="min-w-0 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-5 sm:p-8 shadow-xs">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}
