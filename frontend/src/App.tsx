import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Spinner } from '@/components/atoms/Spinner';
import { Footer } from '@/components/molecules/Footer';
import { NavBar } from '@/components/molecules/NavBar';

const HomePage = lazy(() => import('@/pages/HomePage').then((module) => ({ default: module.HomePage })));
const GamesPage = lazy(() => import('@/pages/GamesPage').then((module) => ({ default: module.GamesPage })));
const GameDetailPage = lazy(() =>
  import('@/pages/GameDetailPage').then((module) => ({ default: module.GameDetailPage })),
);
const OrdersPage = lazy(() => import('@/pages/OrdersPage').then((module) => ({ default: module.OrdersPage })));
const OrderDetailPage = lazy(() =>
  import('@/pages/OrderDetailPage').then((module) => ({ default: module.OrderDetailPage })),
);
const UsersPage = lazy(() => import('@/pages/UsersPage').then((module) => ({ default: module.UsersPage })));
const UserProfilePage = lazy(() =>
  import('@/pages/UserProfilePage').then((module) => ({ default: module.UserProfilePage })),
);
const LibraryPage = lazy(() => import('@/pages/LibraryPage').then((module) => ({ default: module.LibraryPage })));
const WishlistPage = lazy(() =>
  import('@/pages/WishlistPage').then((module) => ({ default: module.WishlistPage })),
);
const ReviewsPage = lazy(() => import('@/pages/ReviewsPage').then((module) => ({ default: module.ReviewsPage })));
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
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

export function App() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0b0e15] text-[#e1e2ec]">
      <NavBar />

      <main className="flex-1">
        <Suspense fallback={<Spinner label="Cargando página…" />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/games/:id" element={<GameDetailPage />} />

            <Route path="/catalog/games" element={<GamesAdminPage />} />
            <Route path="/catalog/publishers" element={<PublishersPage />} />
            <Route path="/catalog/developers" element={<DevelopersPage />} />
            <Route path="/catalog/genres" element={<GenresPage />} />
            <Route path="/catalog/platforms" element={<PlatformsPage />} />
            <Route path="/catalog/editions" element={<EditionsPage />} />
            <Route path="/catalog/digital-keys" element={<DigitalKeysPage />} />
            <Route path="/catalog/system-requirements" element={<SystemRequirementsPage />} />
            <Route path="/catalog/promotions" element={<PromotionsPage />} />

            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:id" element={<UserProfilePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
