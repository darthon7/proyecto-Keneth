import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { wishlistsExtraApi } from '@/api';
import { LoginModal } from '@/components/molecules/LoginModal';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { initials } from '@/utils/format';

const MAIN_NAV_LINKS = [
  { to: '/games', label: 'TIENDA' },
  { to: '/reviews', label: 'COMUNIDAD' },
  { to: '/catalog/promotions', label: 'NOTICIAS' },
  { to: '/orders', label: 'SOPORTE' },
];

const USER_SECTION_LINKS = [
  { to: '/library', label: 'Mi Biblioteca' },
  { to: '/wishlist', label: 'Lista de Deseados' },
  { to: '/users', label: 'Directorio de Usuarios' },
];

const CATALOG_ADMIN_LINKS = [
  { to: '/catalog/games', label: 'Administrar Videojuegos' },
  { to: '/catalog/editions', label: 'Ediciones y DLCs' },
  { to: '/catalog/digital-keys', label: 'Claves Digitales' },
  { to: '/catalog/genres', label: 'Géneros' },
  { to: '/catalog/platforms', label: 'Plataformas' },
  { to: '/catalog/publishers', label: 'Publishers' },
  { to: '/catalog/developers', label: 'Desarrolladoras' },
  { to: '/catalog/system-requirements', label: 'Requisitos Técnicos' },
];

const MORE_LINKS = [...USER_SECTION_LINKS, ...CATALOG_ADMIN_LINKS];

export function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const catalogMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { totalItems } = useCart();
  const { currentUser, logout } = useSession();

  // Dynamic wishlist count for logged-in user
  const { data: userWishlist = [] } = useQuery({
    queryKey: ['wishlists', 'user', currentUser?.id],
    queryFn: () => wishlistsExtraApi.byUser(currentUser!.id),
    enabled: Boolean(currentUser),
  });
  const wishlistCount = currentUser ? userWishlist.length : 0;

  // Close menus on page navigation
  useEffect(() => {
    setIsMenuOpen(false);
    setIsCatalogOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  // Global Ctrl+K / Cmd+K shortcut & Escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setIsCatalogOpen(false);
        setIsProfileOpen(false);
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isCatalogOpen && !catalogMenuRef.current?.contains(target)) {
        setIsCatalogOpen(false);
      }
      if (isProfileOpen && !profileMenuRef.current?.contains(target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isCatalogOpen, isProfileOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    if (trimmed) {
      navigate(`/games?q=${encodeURIComponent(trimmed)}`);
      setIsMenuOpen(false);
    }
  };

  return (
    <header
      data-testid="navbar-header"
      className="sticky top-0 z-50 w-full bg-[#0B0C10]/85 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_10px_32px_rgba(0,0,0,0.72)]"
    >
      {/* Subtle controlled HUD micro-hairline accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent"
      />

      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-[68px] flex items-center justify-between gap-2 sm:gap-5">
          {/* Left: Brand Identity + Primary Navigation */}
          <div className="flex items-center gap-4 lg:gap-7 min-w-0">
            <Link
              to="/"
              data-testid="navbar-brand"
              className="flex items-center gap-2 sm:gap-2.5 group shrink-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#12151E] border border-cyan-400/25 group-hover:border-cyan-400/60 flex items-center justify-center transition-colors shadow-[inset_0_0_12px_rgba(34,211,238,0.08)]">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 40 40" fill="none" aria-hidden="true">
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
                <span className="text-sm sm:text-lg font-black tracking-wider uppercase text-white font-display whitespace-nowrap">
                  EL <span className="text-cyan-400">PIBES</span>
                </span>
                <span className="hidden sm:block text-[9px] font-mono uppercase tracking-[0.24em] text-slate-400 mt-0.5">
                  DIGITAL STORE
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav aria-label="Navegación principal" className="hidden lg:flex items-center gap-1">
              {MAIN_NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `relative px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.08em] transition-colors duration-200 ${
                      isActive
                        ? 'text-white bg-white/[0.05] shadow-[inset_0_-2px_0_0_#22d3ee]'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              {/* Extended Catalog & Management Dropdown */}
              <div ref={catalogMenuRef} className="relative">
                <button
                  type="button"
                  data-testid="navbar-catalog-trigger"
                  onClick={() => setIsCatalogOpen((open) => !open)}
                  aria-expanded={isCatalogOpen}
                  aria-haspopup="menu"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.08em] transition-colors duration-200 ${
                    isCatalogOpen
                      ? 'text-cyan-300 bg-cyan-400/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <span>CATÁLOGO</span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isCatalogOpen ? 'rotate-180 text-cyan-400' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isCatalogOpen && (
                  <div
                    role="menu"
                    aria-label="Secciones y gestión del catálogo"
                    className="absolute top-full left-0 mt-2.5 w-[420px] rounded-2xl bg-[#12151E]/95 border border-white/10 p-4 shadow-[0_20px_48px_rgba(0,0,0,0.85)] backdrop-blur-2xl z-50"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <p className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-widest text-cyan-400/90 border-b border-white/[0.06]">
                          Mi Espacio
                        </p>
                        {USER_SECTION_LINKS.map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            role="menuitem"
                            onClick={() => setIsCatalogOpen(false)}
                            className="block px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>

                      <div className="space-y-1.5">
                        <p className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-widest text-purple-300/90 border-b border-white/[0.06]">
                          Gestión
                        </p>
                        {CATALOG_ADMIN_LINKS.map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            role="menuitem"
                            onClick={() => setIsCatalogOpen(false)}
                            className="block px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Center: Steam/G2A Style Search Bar with Ctrl+K */}
          <div className="flex-1 max-w-md hidden md:block">
            <form onSubmit={handleSearchSubmit} role="search" className="relative">
              <div className="relative flex items-center bg-[#12151E] rounded-xl px-3.5 py-2 border border-white/10 hover:border-white/20 focus-within:border-cyan-400/60 focus-within:bg-[#161B26] focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.12)] transition-all">
                <svg
                  className="w-4 h-4 text-slate-400 mr-2.5 shrink-0"
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar juegos, DLCs, estudios..."
                  aria-label="Buscar videojuegos"
                  className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label="Limpiar búsqueda"
                    className="mr-1.5 p-0.5 rounded text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <kbd className="hidden xl:inline-flex items-center text-[10px] font-mono font-semibold text-slate-400 bg-[#1B2030] px-1.5 py-0.5 rounded border border-white/10 shrink-0">
                  Ctrl+K
                </kbd>
              </div>
            </form>
          </div>

          {/* Right: Wishlist, Cart, Account / Auth CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Wishlist Link with Dynamic Badge */}
            <Link
              to="/wishlist"
              data-testid="navbar-wishlist-link"
              aria-label="Lista de deseados"
              title="Lista de deseados"
              className="relative p-2 sm:p-2.5 rounded-xl bg-[#12151E]/80 hover:bg-[#191E2B] text-slate-300 hover:text-white border border-white/[0.07] hover:border-purple-400/40 transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-500 text-white px-1 text-[10px] font-black shadow-sm">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Link with High-Conversion Pill & Dynamic Badge */}
            <Link
              to="/orders"
              data-testid="navbar-cart-link"
              aria-label="Ver carrito y compras"
              title="Carrito de compras"
              className="relative flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-xl bg-[#12151E]/80 hover:bg-[#191E2B] text-slate-200 hover:text-white border border-white/[0.07] hover:border-emerald-400/40 transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="hidden xl:inline text-xs font-bold tracking-wide">Carrito</span>
              {totalItems > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-400 text-[#0B0C10] px-1 text-[10px] font-black shadow-sm">
                  {totalItems}
                </span>
              )}
            </Link>

            <div className="h-6 w-px bg-white/10 hidden sm:block mx-0.5" />

            {/* User Session Profile Widget or Login CTA (preserving button animation) */}
            {currentUser ? (
              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  data-testid="navbar-profile-trigger"
                  onClick={() => setIsProfileOpen((open) => !open)}
                  aria-expanded={isProfileOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2.5 p-1 pr-2 rounded-xl bg-[#12151E]/80 hover:bg-[#191E2B] border border-white/[0.08] hover:border-cyan-400/40 transition-colors"
                  title="Ver mi cuenta"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 text-[#0B0C10] font-black text-xs flex items-center justify-center shadow-sm">
                    {initials(currentUser.username)}
                  </div>

                  <div className="hidden sm:flex flex-col items-start text-left">
                    <span className="text-xs font-bold text-white line-clamp-1 max-w-[110px]">
                      {currentUser.username}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                      {currentUser.countryCode || 'CUENTA'}
                    </span>
                  </div>

                  <svg
                    className={`hidden sm:block w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      isProfileOpen ? 'rotate-180 text-cyan-400' : ''
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
                    className="absolute right-0 top-full mt-2.5 w-56 rounded-2xl bg-[#12151E]/95 border border-white/10 p-2 shadow-[0_20px_48px_rgba(0,0,0,0.85)] backdrop-blur-2xl z-50"
                  >
                    <div className="px-3 py-2.5 border-b border-white/[0.06]">
                      <p className="text-xs font-bold text-white truncate">{currentUser.username}</p>
                      <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                    </div>

                    <div className="py-1.5 space-y-0.5">
                      <Link
                        to={`/users/${currentUser.id}`}
                        role="menuitem"
                        onClick={() => setIsProfileOpen(false)}
                        className="block px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        Mi Perfil
                      </Link>
                      <Link
                        to="/library"
                        role="menuitem"
                        onClick={() => setIsProfileOpen(false)}
                        className="block px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        Mi Biblioteca
                      </Link>
                      <Link
                        to="/wishlist"
                        role="menuitem"
                        onClick={() => setIsProfileOpen(false)}
                        className="block px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        Lista de Deseados
                      </Link>
                      <Link
                        to="/orders"
                        role="menuitem"
                        onClick={() => setIsProfileOpen(false)}
                        className="block px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        Historial de Compras
                      </Link>
                    </div>

                    <div className="border-t border-white/[0.06] pt-1.5">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={logout}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                data-testid="navbar-login-btn"
                onClick={() => setIsLoginOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-cyan-400 hover:bg-cyan-300 text-[#0B0C10] shadow-[0_4px_16px_rgba(34,211,238,0.28)] hover:shadow-[0_8px_24px_rgba(34,211,238,0.45)] btn-nintendo-animation btn-nintendo-shine text-[11px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap group"
              >
                <svg
                  className="hidden sm:block w-4 h-4 transition-transform group-hover:translate-x-0.5"
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
            )}

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              data-testid="navbar-mobile-toggle"
              aria-label="Abrir menú"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
              className="p-2 rounded-xl bg-[#12151E] border border-white/[0.07] text-slate-300 hover:text-white hover:border-cyan-400/40 transition-colors lg:hidden"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE EXPANDED MENU DRAWER */}
      {isMenuOpen && (
        <div className="lg:hidden bg-[#0E1118]/95 backdrop-blur-2xl border-t border-white/10 px-4 py-5 space-y-5">
          <form onSubmit={handleSearchSubmit} role="search" className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar juegos, DLCs, estudios..."
              aria-label="Buscar videojuegos"
              className="w-full bg-[#12151E] text-xs text-white placeholder-slate-400 px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-400/60"
            />
          </form>

          <div className="flex flex-col space-y-1">
            <p className="px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400/80">
              Navegación
            </p>
            {MAIN_NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/20'
                      : 'text-slate-300 hover:bg-white/5'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="space-y-2 border-t border-white/[0.07] pt-3">
            <p className="px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-purple-300/80">
              Catálogo y Gestión
            </p>
            <div className="grid grid-cols-2 gap-1">
              {MORE_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors truncate"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {currentUser ? (
            <div className="border-t border-white/[0.07] pt-3 flex items-center justify-between px-1">
              <span className="text-xs font-bold text-white">{currentUser.username}</span>
              <button
                type="button"
                onClick={logout}
                className="text-xs font-bold text-rose-400 hover:underline"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                setIsLoginOpen(true);
              }}
              className="w-full py-2.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-[#0B0C10] shadow-[0_4px_16px_rgba(34,211,238,0.28)] hover:shadow-[0_8px_24px_rgba(34,211,238,0.45)] btn-nintendo-animation btn-nintendo-shine font-black text-xs uppercase tracking-wider"
            >
              Iniciar sesión
            </button>
          )}
        </div>
      )}

      {/* Login Authentication Modal */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </header>
  );
}
