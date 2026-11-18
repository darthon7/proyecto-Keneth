import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/atoms/Spinner';
import { Footer } from '@/components/molecules/Footer';
import { NavBar } from '@/components/molecules/NavBar';
import { WelcomeCouponPopup } from '@/components/molecules/WelcomeCouponPopup';
import { AdminControlPanelLayout } from '@/components/organisms/AdminControlPanelLayout';
import { AdminRouteGuard } from '@/components/organisms/AdminRouteGuard';

function lazyPage<
  TModule extends Record<K, ComponentType<TProps>>,
  K extends keyof TModule,
  TProps = TModule[K] extends ComponentType<infer P> ? P : never,
>(loader: () => Promise<TModule>, key: K) {
  return lazy(() => loader().then((module) => ({ default: module[key] })));
}

const HomePage = lazyPage(() => import('@/pages/HomePage'), 'HomePage');
const GamesPage = lazyPage(() => import('@/pages/GamesPage'), 'GamesPage');
const GameDetailPage = lazyPage(() => import('@/pages/GameDetailPage'), 'GameDetailPage');
const PromotionsPublicPage = lazyPage(() => import('@/pages/PromotionsPublicPage'), 'PromotionsPublicPage');
const OrdersPage = lazyPage(() => import('@/pages/OrdersPage'), 'OrdersPage');
const CheckoutPage = lazyPage(() => import('@/pages/CheckoutPage'), 'CheckoutPage');
const OrderDetailPage = lazyPage(() => import('@/pages/OrderDetailPage'), 'OrderDetailPage');
const UserProfilePage = lazyPage(() => import('@/pages/UserProfilePage'), 'UserProfilePage');
const LibraryPage = lazyPage(() => import('@/pages/LibraryPage'), 'LibraryPage');
const WishlistPage = lazyPage(() => import('@/pages/WishlistPage'), 'WishlistPage');
const MyCouponsPage = lazyPage(() => import('@/pages/MyCouponsPage'), 'MyCouponsPage');
const NotFoundPage = lazyPage(() => import('@/pages/NotFoundPage'), 'NotFoundPage');

const AdminOverviewPage = lazyPage(() => import('@/pages/admin/AdminOverviewPage'), 'AdminOverviewPage');
const AdminOrdersPage = lazyPage(() => import('@/pages/admin/AdminOrdersPage'), 'AdminOrdersPage');
const DiscountCampaignsPage = lazyPage(() => import('@/pages/admin/DiscountCampaignsPage'), 'DiscountCampaignsPage');
const FeaturedTrailersPage = lazyPage(() => import('@/pages/admin/FeaturedTrailersPage'), 'FeaturedTrailersPage');

const GamesAdminPage = lazyPage(() => import('@/pages/catalog/GamesAdminPage'), 'GamesAdminPage');
const PublishersPage = lazyPage(() => import('@/pages/catalog/PublishersPage'), 'PublishersPage');
const DevelopersPage = lazyPage(() => import('@/pages/catalog/DevelopersPage'), 'DevelopersPage');
const GenresPage = lazyPage(() => import('@/pages/catalog/GenresPage'), 'GenresPage');
const PlatformsPage = lazyPage(() => import('@/pages/catalog/PlatformsPage'), 'PlatformsPage');
const DigitalKeysPage = lazyPage(() => import('@/pages/catalog/DigitalKeysPage'), 'DigitalKeysPage');
const SystemRequirementsPage = lazyPage(() => import('@/pages/catalog/SystemRequirementsPage'), 'SystemRequirementsPage');
const PromotionsPage = lazyPage(() => import('@/pages/catalog/PromotionsPage'), 'PromotionsPage');

const LEGACY_CATALOG_SLUGS = [
  'games',
  'publishers',
  'developers',
  'genres',
  'platforms',
  'editions',
  'digital-keys',
  'system-requirements',
  'promotions',
] as const;

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export function App() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F4F6] text-[#0F172A]">
      <ScrollToTop />
      <NavBar />

      <main className="flex-1">
        <Suspense fallback={<Spinner label="Cargando página…" />}>
          <Routes>
            {/* Rutas públicas y de experiencia cliente */}
            <Route path="/" element={<HomePage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/games/:id" element={<GameDetailPage />} />
            <Route path="/promotions" element={<PromotionsPublicPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/users/:id" element={<UserProfilePage />} />
            <Route path="/my-coupons" element={<MyCouponsPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/reviews" element={<Navigate to="/games" replace />} />

            {/* Panel de Control Operativo (exclusivo ADMIN) */}
            <Route
              path="/admin"
              element={
                <AdminRouteGuard>
                  <AdminControlPanelLayout />
                </AdminRouteGuard>
              }
            >
              <Route index element={<AdminOverviewPage />} />
              <Route path="games" element={<GamesAdminPage embedded />} />
              <Route path="developers" element={<DevelopersPage embedded />} />
              <Route path="publishers" element={<PublishersPage embedded />} />
              <Route path="genres" element={<GenresPage embedded />} />
              <Route path="platforms" element={<PlatformsPage embedded />} />
              {/* Ediciones y DLCs se gestionan dentro de la vista de Videojuegos */}
              <Route path="editions" element={<Navigate to="/admin/games" replace />} />
              <Route path="digital-keys" element={<DigitalKeysPage embedded />} />
              <Route path="system-requirements" element={<SystemRequirementsPage embedded />} />
              <Route path="promotions" element={<PromotionsPage embedded />} />
              <Route path="discount-campaigns" element={<DiscountCampaignsPage />} />
              <Route path="featured-trailers" element={<FeaturedTrailersPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
            </Route>

            {/* Rutas legacy protegidas con redirección al Panel de Control */}
            {LEGACY_CATALOG_SLUGS.map((slug) => (
              <Route
                key={slug}
                path={`/catalog/${slug}`}
                element={
                  <AdminRouteGuard>
                    <Navigate to={`/admin/${slug}`} replace />
                  </AdminRouteGuard>
                }
              />
            ))}

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <WelcomeCouponPopup />

      <Footer />
    </div>
  );
}
