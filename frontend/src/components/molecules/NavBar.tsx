import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/atoms/BrandLogo';
import { LoginModal } from '@/components/molecules/LoginModal';
import type { AuthModalMode } from '@/components/molecules/LoginModal';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { UserRole } from '@/types';
import { initials } from '@/utils/format';

const MAIN_NAV_LINKS = [
  { to: '/games', label: 'TIENDA' },
  { to: '/promotions', label: 'OFERTAS' },
  { to: '/library', label: 'MIS JUEGOS' },
];

const PROFILE_MENU_LINKS: readonly {
  to: (userId: number) => string;
  label: string;
  testId?: string;
  iconPath: string;
}[] = [
  {
    to: (userId) => `/users/${userId}`,
    label: 'Mi Perfil',
    iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    to: () => '/my-coupons',
    label: 'Mis Cupones',
    testId: 'navbar-profile-coupons-link',
    iconPath: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
  },
  {
    to: () => '/library',
    label: 'Mi Biblioteca',
    iconPath: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  },
  {
    to: () => '/wishlist',
    label: 'Lista de Deseados',
    iconPath: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  },
  {
    to: () => '/orders?tab=history',
    label: 'Historial de Compras',
    iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
];

export function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { totalItems } = useCart();
  const { currentUser, logout } = useSession();
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  useEffect(() => {
    setIsProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isProfileOpen && !profileMenuRef.current?.contains(target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isProfileOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    if (trimmed) {
      navigate(`/games?q=${encodeURIComponent(trimmed)}`);
    }
  };

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <header
      data-testid="navbar-header"
      className="sticky top-0 z-50 w-full bg-[#1E1B4B] border-b border-[#312E81] shadow-[0_8px_28px_rgba(30,27,75,0.22)]"
    >
      <div className="w-full max-w-[1440px] mx-auto px-8">
        <div className="h-[68px] flex items-center justify-between gap-5">
          {/* Left: Brand Identity + Primary Navigation */}
          <div className="flex items-center gap-7 min-w-0">
            <Link
              to="/"
              data-testid="navbar-brand"
              className="flex items-center group shrink-0 py-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC700]"
            >
              <BrandLogo
                titleClassName="text-lg"
                subtitle="DIGITAL STORE"
                subtitleClassName="block text-[9px] font-mono uppercase tracking-[0.24em] text-indigo-200 mt-0.5"
              />
            </Link>

            <nav aria-label="Navegación principal" className="flex items-center gap-1">
              {MAIN_NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `relative px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.08em] transition-colors duration-200 ${
                      isActive
                        ? 'text-[#0F172A] bg-[#FFC700]'
                        : 'text-indigo-100 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Center: Retro Pop Search Bar */}
          <div className="flex-1 max-w-md">
            <form onSubmit={handleSearchSubmit} role="search" className="relative">
              <div className="relative flex items-center bg-[#FFFFFF] rounded-xl px-3.5 py-2 border border-white/20 focus-within:ring-2 focus-within:ring-[#FFC700] shadow-sm transition-all">
                <svg
                  className="w-4 h-4 text-[#475569] mr-2.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  ref={searchInputRef}
                  data-testid="navbar-search-input"
                  type="text"
                  maxLength={100}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar juegos, DLCs, estudios..."
                  aria-label="Buscar videojuegos"
                  className="w-full bg-transparent text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label="Limpiar búsqueda"
                    className="ml-1.5 p-0.5 rounded text-[#475569] hover:text-[#FF2A5F] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right: Cart, Admin Panel CTA (ADMIN only), Account / Auth CTA */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/orders"
              data-testid="navbar-cart-link"
              aria-label="Ver carrito y compras"
              title="Carrito de compras"
              className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors"
            >
              <svg className="w-5 h-5 text-[#FFC700]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="text-xs font-bold tracking-wide">Carrito</span>
              {totalItems > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF2A5F] text-white px-1 text-[10px] font-black shadow-sm">
                  {totalItems}
                </span>
              )}
            </Link>

            <div className="h-6 w-px bg-white/20 mx-0.5" />

            {isAdmin && (
              <Link
                to="/admin"
                data-testid="navbar-admin-panel-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#FFC700] hover:bg-[#FFD633] text-[#0F172A] border border-[#FF2A5F]/40 shadow-[0_4px_14px_rgba(255,199,0,0.3)] hover:shadow-[0_8px_20px_rgba(255,199,0,0.45)] btn-nintendo-animation btn-nintendo-shine text-xs font-black uppercase tracking-wider whitespace-nowrap"
              >
                <svg className="w-4 h-4 shrink-0 text-[#FF2A5F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                <span>Panel de Control</span>
              </Link>
            )}

            {currentUser ? (
              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  data-testid="navbar-profile-trigger"
                  onClick={() => setIsProfileOpen((open) => !open)}
                  aria-expanded={isProfileOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2.5 p-1 pr-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition-colors"
                  title="Ver mi cuenta"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#FFC700] text-[#0F172A] font-black text-xs flex items-center justify-center shadow-sm">
                    {initials(currentUser.username)}
                  </div>

                  <div className="flex flex-col items-start text-left">
                    <span className="text-xs font-bold text-white line-clamp-1 max-w-[110px]">
                      {currentUser.username}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-[#FFC700] uppercase tracking-wider">
                      {isAdmin ? 'ADMIN' : currentUser.countryCode || 'CUENTA'}
                    </span>
                  </div>

                  <svg
                    className={`w-3.5 h-3.5 text-indigo-200 transition-transform duration-200 ${
                      isProfileOpen ? 'rotate-180 text-[#FFC700]' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isProfileOpen && (
                  <div
                    role="menu"
                    aria-label="Menú de usuario"
                    className="absolute right-0 top-full mt-2.5 w-64 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-2 shadow-[0_20px_48px_rgba(15,23,42,0.22)] z-50"
                  >
                    <div className="rounded-xl bg-[#1E1B4B] border border-[#312E81] px-3 py-3 text-white mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-[#0F122E] text-xs font-black text-white">
                          {currentUser.username.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <p className="text-xs font-extrabold text-white truncate">
                              {currentUser.username}
                            </p>
                            {isAdmin && (
                              <span
                                data-testid="navbar-profile-admin-badge"
                                className="shrink-0 rounded px-1.5 py-0.5 bg-[#FFC700] text-[#0F172A] text-[9px] font-black uppercase tracking-wider"
                              >
                                ADMIN
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-indigo-200 truncate">
                            {currentUser.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="py-1 space-y-0.5">
                      {PROFILE_MENU_LINKS.map((item) => (
                        <Link
                          key={item.label}
                          to={item.to(currentUser.id)}
                          role="menuitem"
                          data-testid={item.testId}
                          onClick={() => setIsProfileOpen(false)}
                          className="group flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#475569] hover:text-[#1E1B4B] hover:bg-[#F4F4F6] transition-colors"
                        >
                          <svg className="w-4 h-4 shrink-0 text-[#94A3B8] group-hover:text-[#FF2A5F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={item.iconPath} />
                          </svg>
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>

                    <div className="border-t border-[#E2E8F0] pt-1.5 mt-1">
                      <button
                        type="button"
                        role="menuitem"
                        data-testid="navbar-logout-btn"
                        onClick={logout}
                        className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#EF4444] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="navbar-login-btn"
                  onClick={() => setAuthModalMode('login')}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF2A5F] hover:bg-[#E01E4F] text-white shadow-[0_4px_14px_rgba(255,42,95,0.35)] hover:shadow-[0_8px_22px_rgba(255,42,95,0.5)] btn-nintendo-animation btn-nintendo-shine text-xs font-black uppercase tracking-wider whitespace-nowrap group"
                >
                  <svg
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Iniciar sesión</span>
                </button>

                <button
                  type="button"
                  data-testid="navbar-register-btn"
                  onClick={() => setAuthModalMode('register')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/25 btn-nintendo-animation text-xs font-black uppercase tracking-wider whitespace-nowrap transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  <span>Registrarse</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <LoginModal
        isOpen={authModalMode !== null}
        initialMode={authModalMode ?? 'login'}
        onClose={() => setAuthModalMode(null)}
      />
    </header>
  );
}
