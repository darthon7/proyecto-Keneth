import { Link } from 'react-router-dom';

const COLUMNS = [
  {
    title: 'Catálogo',
    links: [
      { to: '/games', label: 'Videojuegos' },
      { to: '/catalog/editions', label: 'Ediciones' },
      { to: '/catalog/promotions', label: 'Promociones' },
    ],
  },
  {
    title: 'Gestión',
    links: [
      { to: '/catalog/publishers', label: 'Publishers' },
      { to: '/catalog/developers', label: 'Desarrolladoras' },
      { to: '/catalog/genres', label: 'Géneros' },
      { to: '/catalog/platforms', label: 'Plataformas' },
    ],
  },
  {
    title: 'Cuenta',
    links: [
      { to: '/library', label: 'Biblioteca' },
      { to: '/wishlist', label: 'Wishlist' },
      { to: '/orders', label: 'Órdenes' },
      { to: '/reviews', label: 'Reseñas' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-forest-deep">
      <div className="page-container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-body font-semibold text-white">El Pibes</p>
          <p className="mt-2 max-w-xs text-body-sm text-mist">
            Tienda de videojuegos con catálogo completo, ediciones digitales y físicas, y
            biblioteca personal.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="text-body-sm font-semibold text-white">{column.title}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {column.links.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-body-sm text-mist transition-colors hover:text-white">
                  {link.label}
                </Link>
              </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="page-container border-t border-white/5 py-6">
        <p className="text-caption text-mist">
          Consume la API REST de NestJS · TypeORM · MySQL. Frontend developed con React, Vite y
          Tailwind CSS.
        </p>
      </div>
    </footer>
  );
}
