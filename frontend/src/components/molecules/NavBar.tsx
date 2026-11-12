import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LoginModal } from '@/components/molecules/LoginModal';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { initials } from '@/utils/format';

const LINKS = [
  { to: '/games', label: 'Videojuegos' },
  { to: '/catalog/publishers', label: 'Catálogo' },
  { to: '/library', label: 'Biblioteca' },
];

const MORE_LINKS = [
  { to: '/orders', label: 'Órdenes' },
  { to: '/wishlist', label: 'Wishlist' },
  { to: '/reviews', label: 'Reseñas' },
  { to: '/users', label: 'Usuarios' },
];

export function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const { totalItems } = useCart();
  const { currentUser, logout } = useSession();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMoreOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setIsMoreOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMoreOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMoreOpen]);

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="page-container pt-3">
        <nav
          className={`flex items-center justify-between gap-3 rounded-[26px] border border-white/10 bg-obsidian/85 backdrop-blur-xl transition-all duration-300 ease-out ${
            isScrolled
              ? 'px-3 py-1.5 shadow-[0_24px_50px_-30px_rgba(0,0,0,0.95)]'
              : 'px-4 py-2.5 shadow-[0_12px_30px_-26px_rgba(0,0,0,0.9)]'
          }`}
        >
          <Link to="/" className="flex shrink-0 items-center gap-2 rounded-full py-1 pl-1">
            <svg width="26" height="20" viewBox="0 0 26 20" aria-hidden="true">
              <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 12h2M6 7v10M10 3v14M15 6v10M20 9v6M25 11h0" />
              </g>
            </svg>
            <span className="text-body font-semibold text-white">El Pibes</span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-1.5 text-body-sm transition-colors ${
                    isActive ? 'bg-jade/15 text-white' : 'text-fog hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-body-sm transition-colors ${
                  isActive ? 'bg-jade/15 text-white' : 'text-fog hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M2.5 3h1.8l1.7 8.4a1.6 1.6 0 001.6 1.3h6.7a1.6 1.6 0 001.6-1.2l1.2-5.2H5.4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="8.5" cy="16" r="1.3" fill="currentColor" />
                <circle cx="14.5" cy="16" r="1.3" fill="currentColor" />
              </svg>
              <span>Carrito</span>
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-jade px-1 text-[10px] font-bold text-obsidian">
                  {totalItems}
                </span>
              )}
            </NavLink>

            <div ref={moreRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isMoreOpen}
                onClick={() => setIsMoreOpen((open) => !open)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-body-sm transition-colors ${
                  isMoreOpen ? 'bg-white/10 text-white' : 'text-fog hover:bg-white/10 hover:text-white'
                }`}
              >
                Otros
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className={`transition-transform duration-200 ${isMoreOpen ? 'rotate-180' : ''}`}
                >
                  <path
                    d="M5 8l5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {isMoreOpen && (
                <div
                  role="menu"
                  className="absolute top-full left-0 mt-2 w-44 overflow-hidden rounded-[18px] border border-white/10 bg-obsidian/95 p-1.5 shadow-[0_24px_50px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl"
                >
                  {MORE_LINKS.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      role="menuitem"
                      className={({ isActive }) =>
                        `block rounded-[12px] px-3 py-2 text-body-sm transition-colors ${
                          isActive ? 'bg-jade/15 text-white' : 'text-fog hover:bg-white/10 hover:text-white'
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-jade/20 text-caption font-bold text-jade">
                  {initials(currentUser.username)}
                </span>
                <span className="max-w-[9rem] truncate text-body-sm text-white">
                  {currentUser.username}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-full px-3 py-1.5 text-body-sm text-fog transition-colors hover:bg-white/10 hover:text-white"
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginOpen(true)}
                className="hidden rounded-full bg-jade px-4 py-2 text-body-sm font-bold text-obsidian transition-colors hover:bg-white sm:inline-block"
              >
                Iniciar sesión
              </button>
            )}

            <button
              type="button"
              aria-label="Abrir menú"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-fog transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            >
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          </div>
        </nav>

        {isMenuOpen && (
          <div className="mt-2 rounded-[22px] border border-white/10 bg-obsidian/95 p-3 shadow-[0_24px_50px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl lg:hidden">
            <div className="flex flex-col">
              {LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `rounded-full px-3 py-2 text-body-sm transition-colors ${
                      isActive ? 'bg-jade/15 text-white' : 'text-fog hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              <NavLink
                to="/orders"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-full px-3 py-2 text-body-sm transition-colors ${
                    isActive ? 'bg-jade/15 text-white' : 'text-fog hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M2.5 3h1.8l1.7 8.4a1.6 1.6 0 001.6 1.3h6.7a1.6 1.6 0 001.6-1.2l1.2-5.2H5.4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="8.5" cy="16" r="1.3" fill="currentColor" />
                  <circle cx="14.5" cy="16" r="1.3" fill="currentColor" />
                </svg>
                <span>Carrito</span>
                {totalItems > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-jade px-1 text-[10px] font-bold text-obsidian">
                    {totalItems}
                  </span>
                )}
              </NavLink>

              <p className="mt-2 px-3 text-caption uppercase tracking-wider text-mist">Otros</p>
              {MORE_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `rounded-full px-3 py-2 text-body-sm transition-colors ${
                      isActive ? 'bg-jade/15 text-white' : 'text-fog hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              {currentUser ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-full bg-white/10 px-3 py-2">
                  <span className="truncate text-body-sm text-white">
                    {currentUser.username}
                  </span>
                  <button
                    type="button"
                    onClick={logout}
                    className="shrink-0 text-body-sm text-fog transition-colors hover:text-white"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsLoginOpen(true);
                  }}
                  className="mt-3 w-full rounded-full bg-jade px-4 py-2 text-body-sm font-bold text-obsidian transition-colors hover:bg-white"
                >
                  Iniciar sesión
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </header>
  );
}
