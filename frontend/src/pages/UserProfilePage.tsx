import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { RatingStars } from '@/components/atoms/RatingStars';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, promotionsExtraApi, usersApi } from '@/api';
import { useSession } from '@/context/SessionContext';
import { PaymentStatus, type Order, type SafeUser, type UpdatePayload, type CreateUserPayload } from '@/types';
import { getActiveGameDiscount, getCouponStatus } from '@/utils/discount';
import { formatCurrency, formatDate } from '@/utils/format';
import { VALIDATION_PATTERNS } from '@/utils/fields';

type ProfileTab = 'overview' | 'library' | 'orders' | 'wishlist' | 'reviews' | 'settings';

const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  [PaymentStatus.COMPLETED]: { label: 'Completada', tone: 'success' },
  [PaymentStatus.PENDING]: { label: 'Pendiente', tone: 'warning' },
  [PaymentStatus.FAILED]: { label: 'Fallida', tone: 'danger' },
  [PaymentStatus.REFUNDED]: { label: 'Reembolsada', tone: 'neutral' },
};

const QUICK_COUNTRY_CODES = ['MX', 'US', 'ES', 'CO', 'AR', 'CL'] as const;

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

interface ProfileSettingsFormProps {
  user: SafeUser;
  onSuccess: () => void;
}

function ProfileSettingsForm({ user, onSuccess }: ProfileSettingsFormProps) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [countryCode, setCountryCode] = useState(user.countryCode || 'MX');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    setUsername(user.username);
    setEmail(user.email);
    setCountryCode(user.countryCode || 'MX');
  }, [user.username, user.email, user.countryCode]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePayload<CreateUserPayload>) => usersApi.update(user.id, payload),
    onSuccess: async () => {
      setPassword('');
      setConfirmPassword('');
      setFormError(null);
      setFormSuccess('Tu perfil se actualizó correctamente.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
      ]);
      onSuccess();
    },
    onError: (err) => {
      setFormSuccess(null);
      setFormError(errorMessage(err));
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const normalizedCountry = countryCode.trim().toUpperCase();

    if (trimmedUsername.length < 2 || trimmedUsername.length > 100) {
      setFormError('El nombre de usuario debe tener entre 2 y 100 caracteres.');
      return;
    }
    if (!VALIDATION_PATTERNS.USERNAME.test(trimmedUsername)) {
      setFormError(
        'El nombre de usuario solo permite letras, números, espacios, puntos, guiones y guion bajo.',
      );
      return;
    }
    if (!VALIDATION_PATTERNS.EMAIL.test(trimmedEmail) || trimmedEmail.length > 150) {
      setFormError('Ingresa un correo electrónico válido.');
      return;
    }
    if (!VALIDATION_PATTERNS.ISO_COUNTRY.test(normalizedCountry)) {
      setFormError('El código de país debe tener exactamente 2 letras (ej. MX, US, ES).');
      return;
    }
    if (password) {
      if (password.length < 4 || password.length > 50) {
        setFormError('La nueva contraseña debe tener entre 4 y 50 caracteres.');
        return;
      }
      if (!VALIDATION_PATTERNS.NON_WHITESPACE_PASSWORD.test(password)) {
        setFormError('La contraseña no puede empezar ni terminar con espacios.');
        return;
      }
    }
    if (password !== confirmPassword) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }

    const payload: UpdatePayload<CreateUserPayload> = {
      username: trimmedUsername,
      email: trimmedEmail,
      countryCode: normalizedCountry,
    };
    if (password) {
      payload.password = password;
    }

    updateMutation.mutate(payload);
  };

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 sm:p-8 shadow-xs">
      <div className="border-b border-[#E2E8F0] pb-4">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF2A5F]">
          Configuración de Cuenta
        </span>
        <h2 className="mt-1 text-lg font-black uppercase tracking-wide text-[#0F172A]">
          Editar datos del perfil
        </h2>
        <p className="mt-1 text-xs text-[#475569]">
          Actualiza tu nombre visible, correo de acceso, región de tienda o cambia tu contraseña.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {formError && <ErrorBanner message={formError} />}
        {formSuccess && (
          <div
            role="status"
            className="rounded-xl border border-[#A7F3D0] bg-[#D1FAE5] px-4 py-3 text-xs font-bold text-[#065F46]"
          >
            {formSuccess}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Nombre de usuario"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="tu_gamertag"
            required
          />
          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="max-w-xs">
            <Input
              label="Código de país (ISO 2 letras)"
              name="countryCode"
              value={countryCode}
              maxLength={2}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              placeholder="MX"
              required
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#64748B]">Selección rápida:</span>
            {QUICK_COUNTRY_CODES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setCountryCode(code)}
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition-colors ${
                  countryCode.toUpperCase() === code
                    ? 'bg-[#1E1B4B] text-white'
                    : 'bg-[#F4F4F6] text-[#475569] hover:bg-[#E2E8F0]'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#E2E8F0] pt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1E1B4B] mb-3">
            Seguridad (opcional)
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Nueva contraseña"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Déjalo vacío para mantener la actual"
              hint="Mínimo 4 caracteres si deseas cambiarla."
            />
            <Input
              label="Confirmar contraseña"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="brand"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Guardando cambios…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
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

    const totalSpent = getOrderTotalSpent(orders);

    const coupons = couponsQuery.data ?? [];
    const availableCoupons = coupons.filter(
      (c) => !c.isClaimed && getCouponStatus(c).status !== 'expired',
    );

    return {
      libraries,
      wishlists,
      reviews,
      orders,
      totalSpent,
      availableCoupons,
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

  const sortedOrders = [...stats.orders].sort(
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
      className="page-container py-8 sm:py-12 space-y-6"
    >
      {/* Hero Profile Card */}
      <header className="relative overflow-hidden rounded-3xl border border-[#312E81] bg-[#1E1B4B] p-6 sm:p-8 text-white shadow-[0_14px_32px_rgba(30,27,75,0.2)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl border border-white/20 bg-[#0F122E] text-2xl sm:text-3xl font-black tracking-tight text-white">
                {getInitials(user.username)}
              </div>
              <span
                title={user.isActive ? 'Cuenta activa' : 'Cuenta inactiva'}
                className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-[3px] border-[#1E1B4B] ${
                  user.isActive ? 'bg-[#10B981]' : 'bg-[#94A3B8]'
                }`}
              />
            </div>

            {/* Identity */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {user.username}
              </h1>

              <p className="text-xs text-indigo-100/85">{user.email}</p>
            </div>
          </div>

          {/* Right Summary + Edit Trigger */}
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

      {/* Tab Navigation Bar */}
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
                    isActive
                      ? 'bg-[#FF2A5F] text-white'
                      : 'bg-[#E2E8F0] text-[#475569]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column (7 cols): Library + Orders */}
          <div className="lg:col-span-7 space-y-6">
            {/* Biblioteca reciente */}
            <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-black uppercase tracking-wide text-[#0F172A]">
                    Tu Biblioteca
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Últimos videojuegos digitales adquiridos
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {stats.libraries.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('library')}
                      className="text-xs font-bold text-[#1E1B4B] hover:text-[#FF2A5F] transition-colors cursor-pointer"
                    >
                      Ver todo
                    </button>
                  )}
                  <Link
                    to="/library"
                    className="text-xs font-bold text-[#FF2A5F] hover:underline"
                  >
                    Mis llaves →
                  </Link>
                </div>
              </div>

              {stats.libraries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center space-y-2">
                  <p className="text-sm font-bold text-[#0F172A]">Tu biblioteca está vacía</p>
                  <p className="text-xs text-[#64748B]">
                    Explora el catálogo y consigue tu primer juego digital con activación inmediata.
                  </p>
                  <Link to="/games" className="inline-block pt-1">
                    <Button variant="brand" size="sm">Explorar catálogo</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {stats.libraries.slice(0, 4).map((entry) => {
                    const game = entry.gameEdition?.game;
                    return (
                      <Link
                        key={entry.id}
                        to={game ? `/games/${game.id}` : '/library'}
                        className="group flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 transition-all hover:border-[#FF2A5F] hover:bg-[#FFFFFF]"
                      >
                        <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-[#E2E8F0]">
                          {game?.coverImageUrl ? (
                            <img
                              src={game.coverImageUrl}
                              alt={game.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="truncate text-xs font-extrabold text-[#0F172A] group-hover:text-[#FF2A5F]">
                            {game?.title ?? 'Videojuego'}
                          </p>
                          <p className="truncate text-[11px] text-[#475569]">
                            {entry.gameEdition?.platform?.name ?? 'Digital'} · {entry.gameEdition?.editionName}
                          </p>
                          {entry.isRevoked ? (
                            <Badge tone="danger">Revocado</Badge>
                          ) : (
                            <Badge tone="success">Disponible</Badge>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Órdenes recientes */}
            <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-black uppercase tracking-wide text-[#0F172A]">
                    Órdenes Recientes
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Resumen de tus últimas transacciones
                  </p>
                </div>
                {sortedOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-[#1E1B4B] hover:text-[#FF2A5F] transition-colors cursor-pointer"
                  >
                    Ver todas →
                  </button>
                )}
              </div>

              {sortedOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center space-y-1">
                  <p className="text-sm font-bold text-[#0F172A]">Sin órdenes registradas</p>
                  <p className="text-xs text-[#64748B]">
                    Tus compras aparecerán aquí con su recibo y llaves digitales.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sortedOrders.slice(0, 4).map((order) => {
                    const statusMeta = PAYMENT_STATUS_META[order.paymentStatus] ?? {
                      label: order.paymentStatus,
                      tone: 'neutral' as const,
                    };
                    return (
                      <Link
                        key={order.id}
                        to={`/orders/${order.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 transition-all hover:border-[#FF2A5F] hover:bg-[#FFFFFF]"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-[#0F172A]">
                              {order.orderNumber}
                            </span>
                            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                          </div>
                          <p className="text-[11px] text-[#64748B]">
                            {formatDate(order.createdAt)} · {order.items?.length ?? 0}{' '}
                            {(order.items?.length ?? 0) === 1 ? 'artículo' : 'artículos'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-[#1E1B4B]">
                            {formatCurrency(order.totalAmount)}
                          </span>
                          <span className="text-xs font-bold text-[#FF2A5F]">→</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right Column (5 cols): Coupons + Wishlist + Reviews */}
          <div className="lg:col-span-5 space-y-6">
            {/* Cupones del usuario */}
            {isOwnProfile && (
              <section className="relative overflow-hidden rounded-2xl border border-[#1E1B4B] bg-[#1E1B4B] p-6 text-white shadow-sm space-y-4">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#FFC700] to-[#FF2A5F]"
                />
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FFC700]">
                      Beneficios de Cuenta
                    </span>
                    <h2 className="mt-0.5 text-base font-black uppercase tracking-wide">
                      Tus Cupones
                    </h2>
                  </div>
                  <Link
                    to="/my-coupons"
                    className="rounded-lg bg-white/15 hover:bg-[#FF2A5F] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors"
                  >
                    Ver todos
                  </Link>
                </div>

                {couponsQuery.isLoading ? (
                  <p className="text-xs text-indigo-200">Consultando cupones…</p>
                ) : stats.availableCoupons.length === 0 ? (
                  <p className="text-xs text-indigo-200">
                    No tienes cupones pendientes por usar en este momento ({stats.totalCouponsCount} en historial).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {stats.availableCoupons.slice(0, 2).map((coupon) => (
                      <div
                        key={coupon.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-white">{coupon.name}</p>
                          <p className="text-[11px] text-indigo-200">
                            -{Number(coupon.discountPercentage)}% OFF · 1 uso por usuario
                          </p>
                        </div>
                        {coupon.couponCode && (
                          <span className="shrink-0 rounded-md bg-[#FFC700] px-2 py-1 font-mono text-[11px] font-black text-[#0F172A]">
                            {coupon.couponCode}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Wishlist preview */}
            <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-black uppercase tracking-wide text-[#0F172A]">
                  Wishlist
                </h2>
                <Link
                  to="/wishlist"
                  className="text-xs font-bold text-[#FF2A5F] hover:underline"
                >
                  Gestionar →
                </Link>
              </div>

              {stats.wishlists.length === 0 ? (
                <p className="text-xs text-[#64748B]">
                  Aún no guardas videojuegos en tu lista de deseos.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {stats.wishlists.slice(0, 3).map((wish) => (
                    <Link
                      key={wish.id}
                      to={`/games/${wish.game?.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 transition-colors hover:border-[#FF2A5F]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#E2E8F0]">
                          {wish.game?.coverImageUrl ? (
                            <img
                              src={wish.game.coverImageUrl}
                              alt={wish.game.title}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <span className="truncate text-xs font-bold text-[#0F172A]">
                          {wish.game?.title ?? 'Videojuego'}
                        </span>
                      </div>
                      <Badge tone={wish.notifyOnSale ? 'blue' : 'neutral'}>
                        {wish.notifyOnSale ? 'Aviso oferta' : 'Guardado'}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Últimas reseñas */}
            <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-black uppercase tracking-wide text-[#0F172A]">
                  Últimas Reseñas
                </h2>
                {stats.reviews.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('reviews')}
                    className="text-xs font-bold text-[#1E1B4B] hover:text-[#FF2A5F] transition-colors cursor-pointer"
                  >
                    Ver todas →
                  </button>
                )}
              </div>

              {stats.reviews.length === 0 ? (
                <p className="text-xs text-[#64748B]">
                  Todavía no has publicado reseñas en ningún título.
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.reviews.slice(0, 2).map((review) => (
                    <article
                      key={review.id}
                      className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-[#0F172A] truncate">
                          {review.title}
                        </span>
                        <RatingStars value={review.rating} size={13} />
                      </div>
                      <p className="text-xs text-[#475569] line-clamp-2">{review.body}</p>
                      <p className="text-[11px] font-semibold text-[#64748B]">
                        {review.game?.title ?? 'Videojuego'} · {review.rating} de 5
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* TAB: LIBRARY */}
      {activeTab === 'library' && (
        <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wide text-[#0F172A]">
                Biblioteca ({stats.libraries.length})
              </h2>
              <p className="text-xs text-[#475569]">
                Todos los juegos digitales asociados a esta cuenta.
              </p>
            </div>
            <Link to="/library">
              <Button variant="brand" size="sm">Ir a Mi Biblioteca y Llaves</Button>
            </Link>
          </div>

          {stats.libraries.length === 0 ? (
            <EmptyState
              title="Sin juegos en la biblioteca"
              description="Cuando completes una compra, tus videojuegos y claves aparecerán aquí."
              action={
                <Link to="/games">
                  <Button variant="brand" size="sm">Explorar tienda</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.libraries.map((entry) => {
                const game = entry.gameEdition?.game;
                return (
                  <article
                    key={entry.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] transition-all hover:border-[#FF2A5F] hover:bg-[#FFFFFF] hover:shadow-sm"
                  >
                    <div className="aspect-[16/9] w-full overflow-hidden bg-[#1E1B4B]">
                      {game?.coverImageUrl ? (
                        <img
                          src={game.coverImageUrl}
                          alt={game.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded bg-[#1E1B4B] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                            {entry.gameEdition?.platform?.name ?? 'Digital'}
                          </span>
                          {entry.isRevoked ? (
                            <Badge tone="danger">Revocado</Badge>
                          ) : (
                            <Badge tone="success">Activo</Badge>
                          )}
                        </div>
                        <h3 className="text-sm font-extrabold text-[#0F172A]">
                          {game?.title ?? 'Videojuego'}
                        </h3>
                        <p className="text-xs text-[#475569]">
                          {entry.gameEdition?.editionName} · Adquirido el {formatDate(entry.acquiredAt)}
                        </p>
                      </div>

                      {game && (
                        <Link
                          to={`/games/${game.id}`}
                          className="w-full rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] py-2 text-center text-xs font-bold text-[#1E1B4B] transition-colors hover:bg-[#1E1B4B] hover:text-white"
                        >
                          Ver ficha del juego
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB: ORDERS */}
      {activeTab === 'orders' && (
        <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wide text-[#0F172A]">
                Órdenes ({sortedOrders.length})
              </h2>
              <p className="text-xs text-[#475569]">
                Consulta el detalle de cada orden, estado de pago y llaves entregadas.
              </p>
            </div>
            <Link to="/orders">
              <Button variant="outline" size="sm">Ir al carrito</Button>
            </Link>
          </div>

          {sortedOrders.length === 0 ? (
            <EmptyState
              title="Sin órdenes registradas"
              description="Todavía no realizas compras en la tienda."
              action={
                <Link to="/games">
                  <Button variant="brand" size="sm">Ver videojuegos</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {sortedOrders.map((order) => {
                const statusMeta = PAYMENT_STATUS_META[order.paymentStatus] ?? {
                  label: order.paymentStatus,
                  tone: 'neutral' as const,
                };
                return (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 transition-all hover:border-[#FF2A5F] hover:bg-[#FFFFFF]"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-sm font-black text-[#0F172A]">
                          {order.orderNumber}
                        </span>
                        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                      </div>
                      <p className="text-xs text-[#475569]">
                        Realizada el {formatDate(order.createdAt)} · {order.items?.length ?? 0}{' '}
                        {(order.items?.length ?? 0) === 1 ? 'producto' : 'productos'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-base font-black text-[#1E1B4B]">
                        {formatCurrency(order.totalAmount)}
                      </span>
                      <span className="rounded-lg bg-[#1E1B4B] px-3 py-1.5 text-xs font-bold text-white">
                        Ver detalle →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB: WISHLIST */}
      {activeTab === 'wishlist' && (
        <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wide text-[#0F172A]">
                Lista de Deseados ({stats.wishlists.length})
              </h2>
              <p className="text-xs text-[#475569]">
                Títulos guardados para seguir sus ofertas y disponibilidad.
              </p>
            </div>
            <Link to="/wishlist">
              <Button variant="outline" size="sm">Administrar Wishlist</Button>
            </Link>
          </div>

          {stats.wishlists.length === 0 ? (
            <EmptyState
              title="Tu Wishlist está vacía"
              description="Guarda tus juegos favoritos para enterarte cuando entren en descuento."
              action={
                <Link to="/games">
                  <Button variant="brand" size="sm">Explorar catálogo</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.wishlists.map((wish) => {
                const game = wish.game;
                const discount = game ? getActiveGameDiscount(game) : { hasDiscount: false, discountPercentage: 0 };
                return (
                  <Link
                    key={wish.id}
                    to={`/games/${game?.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] transition-all hover:border-[#FF2A5F] hover:bg-[#FFFFFF]"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#1E1B4B]">
                      {game?.coverImageUrl ? (
                        <img
                          src={game.coverImageUrl}
                          alt={game.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : null}
                      {discount.hasDiscount && (
                        <span className="absolute top-2.5 right-2.5 rounded-md bg-[#FF2A5F] px-2 py-0.5 text-[11px] font-black text-white shadow-sm">
                          OFERTA -{discount.discountPercentage}%
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-extrabold text-[#0F172A] group-hover:text-[#FF2A5F]">
                          {game?.title ?? 'Videojuego'}
                        </h3>
                        <p className="text-xs text-[#64748B]">
                          Agregado el {formatDate(wish.addedAt)}
                        </p>
                      </div>
                      <Badge tone={wish.notifyOnSale ? 'blue' : 'neutral'}>
                        {wish.notifyOnSale ? 'Aviso de oferta' : 'Sin aviso'}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB: REVIEWS */}
      {activeTab === 'reviews' && (
        <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-5">
          <div className="border-b border-[#E2E8F0] pb-4">
            <h2 className="text-lg font-black uppercase tracking-wide text-[#0F172A]">
              Reseñas Publicadas ({stats.reviews.length})
            </h2>
            <p className="text-xs text-[#475569]">
              Opiniones y calificaciones compartidas en los títulos de la tienda.
            </p>
          </div>

          {stats.reviews.length === 0 ? (
            <EmptyState
              title="Aún no has escrito reseñas"
              description="Comparte tu opinión en la ficha de cualquier videojuego que hayas probado."
              action={
                <Link to="/games">
                  <Button variant="brand" size="sm">Ver videojuegos</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {stats.reviews.map((review) => (
                <article
                  key={review.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5"
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {review.game ? (
                        <Link
                          to={`/games/${review.game.id}`}
                          className="text-xs font-black uppercase tracking-wider text-[#1E1B4B] hover:text-[#FF2A5F]"
                        >
                          {review.game.title}
                        </Link>
                      ) : (
                        <span className="text-xs font-bold text-[#64748B]">Videojuego</span>
                      )}
                      <RatingStars value={review.rating} size={15} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold text-[#0F172A]">{review.title}</h3>
                      {review.isVerifiedPurchase && (
                        <Badge tone="success">Compra verificada</Badge>
                      )}
                    </div>

                    <p className="text-sm text-[#475569] leading-relaxed">{review.body}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-3 text-xs text-[#64748B]">
                    <span>{review.rating} de 5 estrellas</span>
                    <span>{formatDate(review.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB: SETTINGS */}
      {activeTab === 'settings' && (
        <ProfileSettingsForm
          user={user}
          onSuccess={() => {
            void userQuery.refetch();
          }}
        />
      )}
    </section>
  );
}
