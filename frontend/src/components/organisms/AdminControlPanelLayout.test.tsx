import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminControlPanelLayout } from '@/components/organisms/AdminControlPanelLayout';
import { UserRole } from '@/types';

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    currentUser: {
      id: 1,
      email: 'admin@tienda.com',
      username: 'AdminOperador',
      countryCode: 'MX',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    currentUserId: 1,
    token: 'admin-token',
    isAdmin: true,
    isLoading: false,
    error: null,
    setSession: vi.fn(),
    logout: vi.fn(),
  }),
}));

function renderLayout(initialEntry = '/admin') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/admin" element={<AdminControlPanelLayout />}>
          <Route index element={<div data-testid="outlet-overview">Vista Resumen</div>} />
          <Route path="games" element={<div data-testid="outlet-games">Vista Juegos</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminControlPanelLayout', () => {
  it('renderiza la consola operativa con todos los enlaces del sidebar y Outlet', () => {
    renderLayout('/admin');

    expect(screen.getByTestId('admin-control-panel')).toBeInTheDocument();
    expect(screen.getByTestId('outlet-overview')).toBeInTheDocument();

    const expectedNavItems = [
      { testId: 'admin-nav-overview', href: '/admin' },
      { testId: 'admin-nav-games', href: '/admin/games' },
      { testId: 'admin-nav-developers', href: '/admin/developers' },
      { testId: 'admin-nav-publishers', href: '/admin/publishers' },
      { testId: 'admin-nav-genres', href: '/admin/genres' },
      { testId: 'admin-nav-platforms', href: '/admin/platforms' },
      { testId: 'admin-nav-editions', href: '/admin/editions' },
      { testId: 'admin-nav-digital-keys', href: '/admin/digital-keys' },
      { testId: 'admin-nav-system-requirements', href: '/admin/system-requirements' },
      { testId: 'admin-nav-promotions', href: '/admin/promotions' },
      { testId: 'admin-nav-orders', href: '/admin/orders' },
    ];

    for (const item of expectedNavItems) {
      expect(screen.getByTestId(item.testId)).toHaveAttribute('href', item.href);
    }
  });
});
