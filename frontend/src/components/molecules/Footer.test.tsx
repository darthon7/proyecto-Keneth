import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Footer } from '@/components/molecules/Footer';

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe('Footer', () => {
  it('muestra la identidad EL PIBES y enlaza al inicio', () => {
    renderFooter();

    const homeLink = screen.getByRole('link', { name: /EL PIBES/i });
    expect(homeLink).toHaveAttribute('href', '/');
    expect(
      screen.getByText(/Tienda digital de videojuegos y claves oficiales/i),
    ).toBeInTheDocument();
  });

  it('renderiza enlaces concisos a las secciones reales de la tienda sin bloques ni metadatos heredados', () => {
    renderFooter();

    const expectedLinks = [
      { label: 'Catálogo', href: '/games' },
      { label: 'Ofertas', href: '/promotions' },
      { label: 'Biblioteca', href: '/library' },
      { label: 'Deseados', href: '/wishlist' },
      { label: 'Órdenes', href: '/orders' },
      { label: 'Reseñas', href: '/reviews' },
    ];

    for (const item of expectedLinks) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.href);
    }

    expect(screen.queryByText(/NEXUSPLAY/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/PEGI 18/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/v2\.8\.4-build/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/REACT 19/i)).not.toBeInTheDocument();
  });
});

