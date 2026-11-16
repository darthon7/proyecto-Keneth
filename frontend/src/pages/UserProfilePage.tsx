import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Spinner } from '@/components/atoms/Spinner';
import { ProfileSettingsForm } from '@/components/organisms/ProfileSettingsForm';
import {
  UserProfileTabContent,
  type ProfileTab,
} from '@/components/organisms/UserProfileTabs';
import { errorMessage, promotionsExtraApi, usersApi } from '@/api';
import { useSession } from '@/context/SessionContext';
import { PaymentStatus, type Order } from '@/types';
import { getCouponStatus } from '@/utils/discount';
import { formatCurrency } from '@/utils/format';

function getInitials(username: string): string {
  const cleaned = username.trim();
  if (!cleaned) return 'US';
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

function getOrderTotalSpent(orders: Order[]): number {
  return orders
    .filter((order) => order.paymentStatus === PaymentStatus.COMPLETED)
    .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
}

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);
  const isValidUserId = Number.isInteger(userId) && userId >= 1;
  const { currentUser, isAdmin, isLoading: sessionLoading } = useSession();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  const canViewProfile = Boolean(
    currentUser && isValidUserId && (isAdmin || currentUser.id === userId),
  );
  const isOwnProfile = Boolean(currentUser && currentUser.id === userId);

  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.get(userId),
    enabled: canViewProfile,
  });

  const couponsQuery = useQuery({
    queryKey: ['promotions', 'my', currentUser?.id],
    queryFn: () => promotionsExtraApi.myCoupons(),
    enabled: isOwnProfile,
  });

  const user = userQuery.data;

  const stats = useMemo(() => {
    const libraries = user?.userLibraries ?? [];
    const wishlists = user?.wishlists ?? [];
    const reviews = user?.reviews ?? [];
    const orders = user?.orders ?? [];
    const coupons = couponsQuery.data ?? [];

    return {
      libraries,
      wishlists,
      reviews,
      orders,
      totalSpent: getOrderTotalSpent(orders),
      availableCoupons: coupons.filter(
        (c) => !c.isClaimed && getCouponStatus(c).status !== 'expired',
      ),
      totalCouponsCount: coupons.length,
    };
  }, [user, couponsQuery.data]);

  if (sessionLoading) return <Spinner label="Verificando sesión…" />;

  if (!currentUser) {
    return (
      <section className="page-container py-16">
        <EmptyState
          title="Inicia sesión"
          description="Entra en tu cuenta desde la barra superior para consultar tu perfil."
        />
      </section>
    );
  }

  if (!canViewProfile) {
    return (
      <section className="page-container py-16">
        <ErrorBanner message="No tienes permisos para acceder al perfil de otro usuario." />
      </section>
    );
  }

  if (userQuery.isLoading) return <Spinner label="Cargando perfil…" />;

  if (userQuery.isError) {
    return (
      <section className="page-container py-16">
        <ErrorBanner
          message={errorMessage(userQuery.error)}
          onRetry={() => void userQuery.refetch()}
        />
      </section>
    );
  }

  if (!user) return null;

  const sortedOrders = stats.orders.toSorted(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const tabs: { id: ProfileTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Resumen' },
    { id: 'library', label: 'Biblioteca', count: stats.libraries.length },
    { id: 'orders', label: 'Órdenes', count: stats.orders.length },
    { id: 'wishlist', label: 'Wishlist', count: stats.wishlists.length },
    { id: 'reviews', label: 'Reseñas', count: stats.reviews.length },
  ];

  return (
    <section
      data-testid="user-profile-page"
      className="page-container py-12 space-y-6"
    >
      <header className="relative overflow-hidden rounded-3xl border border-[#312E81] bg-[#1E1B4B] p-8 text-white shadow-[0_14px_32px_rgba(30,27,75,0.2)]">
        <div className="flex flex-row items-center justify-between gap-6">
          <div className="flex flex-row items-center gap-5">
            <div className="relative shrink-0">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-white/20 bg-[#0F122E] text-3xl font-black tracking-tight text-white">
                {getInitials(user.username)}
              </div>
              <span
                title={user.isActive ? 'Cuenta activa' : 'Cuenta inactiva'}
                className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-[3px] border-[#1E1B4B] ${
                  user.isActive ? 'bg-[#10B981]' : 'bg-[#94A3B8]'
                }`}
              />
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight text-white">
                {user.username}
              </h1>
              <p className="text-xs text-indigo-100/85">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur-xs">
              <p className="text-[10px] font-mono uppercase tracking-wider text-indigo-200">
                Total Invertido
              </p>
              <p className="text-lg font-black text-[#FFC700]">
                {formatCurrency(stats.totalSpent)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="rounded-xl bg-[#FF2A5F] hover:bg-[#E01E4F] px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all cursor-pointer"
            >
              Editar perfil
            </button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Secciones del perfil"
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-2 shadow-xs"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#1E1B4B] text-white shadow-xs'
                  : 'text-[#475569] hover:bg-[#F4F4F6] hover:text-[#0F172A]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                    isActive ? 'bg-[#FF2A5F] text-white' : 'bg-[#E2E8F0] text-[#475569]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {activeTab === 'settings' ? (
        <ProfileSettingsForm user={user} onSuccess={() => void userQuery.refetch()} />
      ) : (
        <UserProfileTabContent
          activeTab={activeTab}
          stats={stats}
          sortedOrders={sortedOrders}
          isOwnProfile={isOwnProfile}
          couponsLoading={couponsQuery.isLoading}
          onSelectTab={setActiveTab}
        />
      )}
    </section>
  );
}
