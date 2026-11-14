import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/atoms/Spinner';
import { Footer } from '@/components/molecules/Footer';
import { NavBar } from '@/components/molecules/NavBar';
import { WelcomeCouponPopup } from '@/components/molecules/WelcomeCouponPopup';
import { AdminControlPanelLayout } from '@/components/organisms/AdminControlPanelLayout';
import { AdminRouteGuard } from '@/components/organisms/AdminRouteGuard';

const HomePage = lazy(() => import('@/pages/HomePage').then((module) => ({ default: module.HomePage })));
const GamesPage = lazy(() => import('@/pages/GamesPage').then((module) => ({ default: module.GamesPage })));
const GameDetailPage = lazy(() =>
  import('@/pages/GameDetailPage').then((module) => ({ default: module.GameDetailPage })),
);
const PromotionsPublicPage = lazy(() =>
  import('@/pages/PromotionsPublicPage').then((module) => ({
    default: module.PromotionsPublicPage,
  })),
);
const OrdersPage = lazy(() => import('@/pages/OrdersPage').then((module) => ({ default: module.OrdersPage })));
const CheckoutPage = lazy(() =>
  import('@/pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage })),
);
const OrderDetailPage = lazy(() =>
  import('@/pages/OrderDetailPage').then((module) => ({ default: module.OrderDetailPage })),
);
const UserProfilePage = lazy(() =>
  import('@/pages/UserProfilePage').then((module) => ({ default: module.UserProfilePage })),
);
const LibraryPage = lazy(() => import('@/pages/LibraryPage').then((module) => ({ default: module.LibraryPage })));
const WishlistPage = lazy(() =>
  import('@/pages/WishlistPage').then((module) => ({ default: module.WishlistPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);

const AdminOverviewPage = lazy(() =>
  import('@/pages/admin/AdminOverviewPage').then((module) => ({
    default: module.AdminOverviewPage,
  })),
);
const AdminOrdersPage = lazy(() =>
  import('@/pages/admin/AdminOrdersPage').then((module) => ({
    default: module.AdminOrdersPage,
  })),
);

const GamesAdminPage = lazy(() =>
  import('@/pages/catalog/GamesAdminPage').then((module) => ({ default: module.GamesAdminPage })),
);
const PublishersPage = lazy(() =>
  import('@/pages/catalog/PublishersPage').then((module) => ({ default: module.PublishersPage })),
);
const DevelopersPage = lazy(() =>
  import('@/pages/catalog/DevelopersPage').then((module) => ({ default: module.DevelopersPage })),
);
const GenresPage = lazy(() =>
  import('@/pages/catalog/GenresPage').then((module) => ({ default: module.GenresPage })),
);
const PlatformsPage = lazy(() =>
  import('@/pages/catalog/PlatformsPage').then((module) => ({ default: module.PlatformsPage })),
);
const EditionsPage = lazy(() =>
  import('@/pages/catalog/EditionsPage').then((module) => ({ default: module.EditionsPage })),
);
const DigitalKeysPage = lazy(() =>
  import('@/pages/catalog/DigitalKeysPage').then((module) => ({ default: module.DigitalKeysPage })),
);
const SystemRequirementsPage = lazy(() =>
  import('@/pages/catalog/SystemRequirementsPage').then((module) => ({
    default: module.SystemRequirementsPage,
  })),
);
const PromotionsPage = lazy(() =>
  import('@/pages/catalog/PromotionsPage').then((module) => ({ default: module.PromotionsPage })),
);
const DiscountCampaignsPage = lazy(() =>
  import('@/pages/admin/DiscountCampaignsPage').then((module) => ({
    default: module.DiscountCampaignsPage,
  })),
);
const FeaturedTrailersPage = lazy(() =>
  import('@/pages/admin/FeaturedTrailersPage').then((module) => ({
    default: module.FeaturedTrailersPage,
  })),
);
const MyCouponsPage = lazy(() =>
  import('@/pages/MyCouponsPage').then((module) => ({ default: module.MyCouponsPage })),
);

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
              <Route path="editions" element={<EditionsPage embedded />} />
              <Route path="digital-keys" element={<DigitalKeysPage embedded />} />
              <Route path="system-requirements" element={<SystemRequirementsPage embedded />} />
              <Route path="promotions" element={<PromotionsPage embedded />} />
              <Route path="discount-campaigns" element={<DiscountCampaignsPage />} />
              <Route path="featured-trailers" element={<FeaturedTrailersPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
            </Route>

            {/* Rutas legacy protegidas con redirección al Panel de Control */}
            <Route
              path="/catalog/games"
              element={
                <AdminRouteGuard>
                  <Navigate to="/admin/games" replace />
                </AdminRouteGuard>
              }
            />
            <Route
              path="/catalog/publishers"
              element={
                <AdminRouteGuard>
                  <Navigate to="/admin/publishers" replace />
                </AdminRouteGuard>
              }
            />
            <Route
              path="/catalog/developers"
              element={
                <AdminRouteGuard>
                  <Navigate to="/admin/developers" replace />
                </AdminRouteGuard>
              }
            />
            <Route
              path="/catalog/genres"
              element={
                <AdminRouteGuard>
                  <Navigate to="/admin/genres" replace />
                </AdminRouteGuard>
              }
            />
            <Route
              path="/catalog/platforms"
              element={
                <AdminRouteGuard>
                  <Navigate to="/admin/platforms" replace />
                </AdminRouteGuard>
              }
            />
            <Route
              path="/catalog/editions"
              element={
                <AdminRouteGuard>
                  <Navigate to="/admin/editions" replace />
                </AdminRouteGuard>
              }
            />
            <Route
              path="/catalog/digital-keys"
              element={
                <AdminRouteGuard>
                  <Navigate to="/admin/digital-keys" replace />
                </AdminRouteGuard>
              }
            />
            <Route
              path="/catalog/system-requirements"
              element={
                <AdminRouteGuard>
                  <Navigate to="/admin/system-requirements" replace />
                </AdminRouteGuard>
              }
            />
            <Route
              path="/catalog/promotions"
              element={
                <AdminRouteGuard>
                  <Navigate to="/admin/promotions" replace />
                </AdminRouteGuard>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <WelcomeCouponPopup />

      <Footer />
    </div>
  );
}
