import { Link } from 'react-router-dom';

const FOOTER_COLUMNS = [
  {
    title: 'Catálogo',
    links: [
      { to: '/games', label: 'Todos los Videojuegos' },
      { to: '/catalog/editions', label: 'Ediciones y DLCs' },
      { to: '/catalog/promotions', label: 'Ofertas Especiales' },
      { to: '/catalog/system-requirements', label: 'Requisitos Técnicos' },
    ],
  },
  {
    title: 'Administración',
    links: [
      { to: '/catalog/publishers', label: 'Publishers' },
      { to: '/catalog/developers', label: 'Desarrolladoras' },
      { to: '/catalog/genres', label: 'Géneros' },
      { to: '/catalog/platforms', label: 'Plataformas' },
      { to: '/catalog/digital-keys', label: 'Claves Digitales' },
      { to: '/catalog/games', label: 'Gestión de Videojuegos' },
    ],
  },
  {
    title: 'Mi Cuenta',
    links: [
      { to: '/library', label: 'Mi Biblioteca' },
      { to: '/wishlist', label: 'Lista de Deseados' },
      { to: '/orders', label: 'Órdenes y Compras' },
      { to: '/reviews', label: 'Reseñas Públicas' },
      { to: '/users', label: 'Directorio de Usuarios' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="w-full bg-[#07090e] border-t border-white/10 mt-20 pt-16 pb-12 text-[#e1e2ec] font-sans">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Header Row with Logo and Client Specs */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-[#aec6ff] p-0.5 shadow-lg">
              <div className="w-full h-full bg-[#0b0e15] rounded-[6px] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#aec6ff]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h2v-2h2v2h2v2h-2v2H9v-2H7v-2zm10 2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-2-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                </svg>
              </div>
            </div>
            <div>
              <span className="text-base font-black tracking-wider uppercase text-white">
                NEXUS<span className="text-[#aec6ff]">PLAY</span> CLIENT
              </span>
              <p className="text-xs text-slate-400">
                Plataforma digital para la distribución y gestión de videojuegos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400 bg-[#121622] px-4 py-2 rounded-xl border border-white/5">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              PEGI 18 / ESRB M
            </span>
            <span className="text-slate-600">|</span>
            <span>Español (Latinoamérica)</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500 font-mono">v2.8.4-build</span>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Mission Column */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#aec6ff]">
              Sobre la Plataforma
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              NexusPlay conecta a jugadores, publishers y desarrolladoras en un ecosistema optimizado
              con descargas instantáneas, catálogo cruzado y arquitectura impulsada por NestJS,
              TypeORM, React y Tailwind CSS.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <span className="inline-block px-2.5 py-1 rounded bg-[#171b28] text-[10px] font-extrabold text-[#aec6ff] border border-white/5">
                API REST
              </span>
              <span className="inline-block px-2.5 py-1 rounded bg-[#171b28] text-[10px] font-extrabold text-emerald-400 border border-white/5">
                REACT 19
              </span>
              <span className="inline-block px-2.5 py-1 rounded bg-[#171b28] text-[10px] font-extrabold text-amber-300 border border-white/5">
                VITE SPA
              </span>
            </div>
          </div>

          {/* Dynamic Link Columns */}
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title} className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#aec6ff]">
                {column.title}
              </h4>
              <ul className="space-y-2.5 text-xs">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-slate-400 hover:text-white transition-colors duration-200 block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social Connect & Legal Bottom Strip */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-4 text-slate-400 font-medium">
            <Link to="/games" className="hover:text-white transition-colors">
              Términos de servicio
            </Link>
            <span>•</span>
            <Link to="/orders" className="hover:text-white transition-colors">
              Política de reembolsos
            </Link>
            <span>•</span>
            <Link to="/catalog/promotions" className="hover:text-white transition-colors">
              Aviso legal
            </Link>
            <span>•</span>
            <Link to="/users" className="hover:text-white transition-colors">
              Privacidad de datos
            </Link>
          </div>

          {/* Community Social Icons */}
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Comunidad Nexus
            </span>
            <div className="flex items-center gap-2">
              <span
                className="w-8 h-8 rounded-lg bg-[#141824] hover:bg-[#20273a] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/5"
                title="Comunidad global"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </span>
              <span
                className="w-8 h-8 rounded-lg bg-[#141824] hover:bg-[#20273a] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/5"
                title="Chat y soporte"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </span>
              <span
                className="w-8 h-8 rounded-lg bg-[#141824] hover:bg-[#20273a] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/5"
                title="Foro oficial"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </span>
            </div>
          </div>
        </div>

        {/* Copyright notice */}
        <div className="text-center md:text-left text-[11px] text-slate-600">
          © 2026 NexusPlay Digital Entertainment Inc. Todos los derechos reservados. Todas las
          marcas comerciales y logos pertenecen a sus respectivos propietarios.
        </div>
      </div>
    </footer>
  );
}
