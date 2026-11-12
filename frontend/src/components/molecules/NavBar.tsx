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

const MORE_LINKS = [
  { to: '/library', label: 'Mi Biblioteca' },
  { to: '/wishlist', label: 'Lista de Deseados' },
  { to: '/catalog/games', label: 'Administrar Videojuegos' },
  { to: '/catalog/publishers', label: 'Publishers' },
  { to: '/catalog/developers', label: 'Desarrolladoras' },
  { to: '/catalog/genres', label: 'Géneros' },
  { to: '/catalog/platforms', label: 'Plataformas' },
  { to: '/catalog/editions', label: 'Ediciones y DLCs' },
  { to: '/catalog/digital-keys', label: 'Claves Digitales' },
  { to: '/catalog/system-requirements', label: 'Requisitos Técnicos' },
  { to: '/users', label: 'Directorio de Usuarios' },
];

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

  // Global Ctrl+K / Cmd+K listener to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
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
    if (searchTerm.trim()) {
      navigate(`/games?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0b0e15]/95 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.7)]">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* SINGLE HEADER ROW (NexusPlay 100% matched to screenshot) */}
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              {/* Hexagon NexusPlay Cyber-Logo */}
              <div className="w-8 h-8 flex items-center justify-center">
                <svg className="w-7 h-7" viewBox="0 0 40 40" fill="none">
                  <path
                    d="M20 3L35 11.66V28.34L20 37L5 28.34V11.66L20 3Z"
                    stroke="#00dbe7"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    className="drop-shadow-[0_0_8px_#00dbe7]"
                  />
                  <path
                    d="M20 10L29 15.2V24.8L20 30L11 24.8V15.2L20 10Z"
                    fill="#0077ff"
                    fillOpacity="0.4"
                    stroke="#aec6ff"
                    strokeWidth="1.5"
                  />
                  <circle cx="20" cy="20" r="3.5" fill="#4edea3" />
                </svg>
              </div>

              <span className="text-base sm:text-lg font-black tracking-wider uppercase text-white font-sans">
                NEXUS<span className="text-[#aec6ff] drop-shadow-[0_0_10px_#aec6ff]">PLAY</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 font-bold text-xs tracking-wider">
              {MAIN_NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `px-3 py-2 uppercase transition-all duration-200 ${
                      isActive
                        ? 'text-white font-black shadow-[inset_0_-2px_0_0_#aec6ff]'
                        : 'text-slate-400 hover:text-white'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              {/* Extended Admin / Catálogo Dropdown */}
              <div ref={catalogMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsCatalogOpen((open) => !open)}
                  aria-expanded={isCatalogOpen}
                  className={`flex items-center gap-1 px-3 py-2 uppercase transition-all duration-200 ${
                    isCatalogOpen
                      ? 'text-[#aec6ff] font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CATÁLOGO
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isCatalogOpen ? 'rotate-180 text-[#aec6ff]' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isCatalogOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 rounded-xl bg-[#141824] border border-white/10 p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.8)] backdrop-blur-xl z-50">
                    <div className="px-3 py-1.5 text-[10px] uppercase font-black tracking-wider text-slate-500">
                      Gestión y Secciones
                    </div>
                    {MORE_LINKS.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#202638] transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Search Input with Ctrl+K */}
          <div className="flex-1 max-w-md hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative flex items-center bg-[#171b26] rounded-xl px-3.5 py-1.5 border border-white/10 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/30 transition-all">
                <svg
                  className="w-4 h-4 text-slate-400 mr-2.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar juegos, DLCs, creadores..."
                  className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
                />
                <kbd className="hidden xl:inline-block text-[10px] font-bold text-slate-400 bg-[#252a3a] px-1.5 py-0.5 rounded border border-white/5 shadow-sm">
                  Ctrl+K
                </kbd>
              </div>
            </form>
          </div>

          {/* Right Action Icons & Profile Module */}
          <div className="flex items-center gap-3">
            {/* Wishlist Link with Dynamic Badge */}
            <Link
              to="/wishlist"
              aria-label="Lista de deseados"
              className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              title="Lista de deseados"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ec6a06] text-white px-1 text-[10px] font-black shadow-sm">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Link with Dynamic Badge */}
            <Link
              to="/orders"
              aria-label="Ver carrito y compras"
              className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              title="Carrito de compras"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#00a572] text-white px-1 text-[10px] font-black shadow-sm">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Notifications Bell */}
            <button
              type="button"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              title="Notificaciones"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>

            <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />

            {/* User Session Profile Widget or Login Button */}
            {currentUser ? (
              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((open) => !open)}
                  className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                  title="Ver mi cuenta"
                >
                  <div className="hidden sm:flex flex-col items-end text-right">
                    <span className="text-xs font-bold text-white line-clamp-1 max-w-[120px]">
                      {currentUser.username}
                    </span>
                    <span className="text-[10px] font-extrabold text-[#aec6ff] bg-blue-950/60 px-1.5 py-0.2 rounded-full border border-blue-500/20 uppercase">
                      {currentUser.countryCode || 'CUENTA'}
                    </span>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-[#aec6ff] text-[#00275e] font-black text-xs flex items-center justify-center shadow-md ring-1 ring-[#aec6ff]/30">
                    {initials(currentUser.username)}
                  </div>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-[#141824] border border-white/10 p-2 shadow-[0_16px_36px_rgba(0,0,0,0.8)] backdrop-blur-xl z-50">
                    <div className="px-3 py-2 border-b border-white/5">
                      <p className="text-xs font-bold text-white truncate">{currentUser.username}</p>
                      <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to={`/users/${currentUser.id}`}
                        className="block px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        Mi Perfil
                      </Link>
                      <Link
                        to="/library"
                        className="block px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        Mi Biblioteca
                      </Link>
                      <Link
                        to="/wishlist"
                        className="block px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        Lista de Deseados
                      </Link>
                      <Link
                        to="/orders"
                        className="block px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        Historial de Compras
                      </Link>
                    </div>

                    <div className="border-t border-white/5 pt-1">
                      <button
                        type="button"
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
                onClick={() => setIsLoginOpen(true)}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl bg-[#4f8eff]/10 hover:bg-[#4f8eff] text-[#aec6ff] hover:text-[#00275e] border border-blue-400/30 hover:border-[#4f8eff] transition-all text-xs font-black uppercase tracking-wider shadow-sm group"
              >
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                <span>Iniciar sesión</span>
              </button>
            )}

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              aria-label="Abrir menú"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors lg:hidden"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="lg:hidden bg-[#10141e] border-t border-white/10 px-4 py-4 space-y-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar juegos..."
              className="w-full bg-[#1c2130] text-xs text-white placeholder-slate-400 px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-blue-400"
            />
          </form>

          <div className="flex flex-col space-y-1">
            <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
              Navegación
            </p>
            {MAIN_NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-xl text-xs font-bold uppercase transition-colors ${
                    isActive ? 'bg-[#4f8eff]/15 text-[#aec6ff]' : 'text-slate-300 hover:bg-white/5'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="flex flex-col space-y-1 border-t border-white/5 pt-3">
            <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
              Catálogo y Gestión
            </p>
            {MORE_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {currentUser ? (
            <div className="border-t border-white/5 pt-3 flex items-center justify-between">
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
              className="w-full py-2.5 rounded-xl bg-[#4f8eff] text-[#00275e] font-black text-xs uppercase tracking-wider"
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
