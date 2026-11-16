import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AccountHeroHeader } from '@/components/molecules/AccountHeroHeader';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { SectionHeader } from '@/components/atoms/SectionHeader';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, gameEditionsApi, ordersApi, promotionsApi, promotionsExtraApi } from '@/api';
import { PaymentStatus, type GameEdition } from '@/types';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { getActiveGameDiscount } from '@/utils/discount';
import { formatCurrency, formatDate } from '@/utils/format';
import { VALIDATION_PATTERNS } from '@/utils/fields';

const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  [PaymentStatus.COMPLETED]: { label: 'Completada', tone: 'success' },
  [PaymentStatus.PENDING]: { label: 'Pendiente', tone: 'warning' },
  [PaymentStatus.FAILED]: { label: 'Fallida', tone: 'danger' },
  [PaymentStatus.REFUNDED]: { label: 'Reembolsada', tone: 'neutral' },
};

export function OrdersPage() {
  const { currentUser } = useSession();
  const { items, removeItem, setQuantity, totalItems } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'history' ? 'history' : 'cart';
  const paidOrderNumber = searchParams.get('paid');
  const [couponCode, setCouponCode] = useState('');

  const selectTab = (tab: 'cart' | 'history') => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'history') {
      next.set('tab', 'history');
    } else {
      next.delete('tab');
    }
    setSearchParams(next, { replace: true });
  };

  const editionsQuery = useQuery({
    queryKey: ['game-editions'],
    queryFn: () => gameEditionsApi.list(),
  });

  const ordersQuery = useQuery({
    queryKey: ['orders', currentUser?.id],
    queryFn: () => ordersApi.list(),
    enabled: Boolean(currentUser?.id),
  });

  const promotionsQuery = useQuery({
    queryKey: ['promotions', currentUser?.id ?? 'guest'],
    queryFn: () => (currentUser ? promotionsExtraApi.myCoupons() : promotionsApi.list()),
  });

  const editionsById = useMemo(() => {
    const map = new Map<number, GameEdition>();
    for (const edition of editionsQuery.data ?? []) {
      map.set(edition.id, edition);
    }
    return map;
  }, [editionsQuery.data]);

  const cartLines = useMemo(
    () =>
      items
        .map((item) => {
          const edition = editionsById.get(item.gameEditionId);
          if (!edition) return null;
          const discount = getActiveGameDiscount(edition.game);
          const unitPrice = discount.computePrice(Number(edition.basePrice));
          return {
            ...item,
            edition,
            unitPrice,
            lineTotal: unitPrice * item.quantity,
          };
        })
        .filter((line): line is NonNullable<typeof line> => line !== null),
    [items, editionsById],
  );

  const subtotal = cartLines.reduce((acc, line) => acc + line.lineTotal, 0);

  const matchedPromotion = useMemo(() => {
    const normalized = couponCode.trim().toLowerCase();
    if (!normalized) return null;
    const now = Date.now();
    return (
      (promotionsQuery.data ?? []).find((promotion) => {
        if (!promotion.isActive || promotion.couponCode?.toLowerCase() !== normalized) {
          return false;
        }
        const start = new Date(promotion.startDate).getTime();
        const end = new Date(promotion.endDate).getTime();
        return (!Number.isFinite(start) || start <= now) && (!Number.isFinite(end) || end >= now);
      }) ?? null
    );
  }, [couponCode, promotionsQuery.data]);

  const isCouponAlreadyClaimed = Boolean(matchedPromotion?.isClaimed);
  const activePromotion = isCouponAlreadyClaimed ? null : matchedPromotion;

  const trimmedCoupon = couponCode.trim();
  const hasCouponInput = trimmedCoupon.length > 0;
  const isCouponFormatInvalid =
    hasCouponInput && !VALIDATION_PATTERNS.COUPON_CODE.test(trimmedCoupon);
  const isCouponInvalid =
    hasCouponInput && !isCouponFormatInvalid && !promotionsQuery.isLoading && !matchedPromotion;

  const discountPercentage = activePromotion ? Number(activePromotion.discountPercentage) : 0;
  const discount = (subtotal * discountPercentage) / 100;
  const total = subtotal - discount;

  const goToCheckout = () => {
    const query = activePromotion?.couponCode
      ? `?coupon=${encodeURIComponent(activePromotion.couponCode)}`
      : '';
    navigate(`/checkout${query}`);
  };

  const userOrders = useMemo(
    () =>
      (ordersQuery.data ?? [])
        .filter((order) => order.user?.id === currentUser?.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [ordersQuery.data, currentUser?.id],
  );

  const completedTotal = useMemo(
    () =>
      userOrders
        .filter((order) => order.paymentStatus === PaymentStatus.COMPLETED)
        .reduce((acc, order) => acc + Number(order.totalAmount || 0), 0),
    [userOrders],
  );

  return (
    <section className="page-container min-h-[calc(100vh-14rem)] py-8 sm:py-12 space-y-6">
      <AccountHeroHeader
        eyebrow="Compras y Facturación"
        title="Carrito y Órdenes"
        description="Revisa tus ediciones digitales antes de pagar, aplica cupones vigentes y consulta el historial completo de tus compras."
        stats={[
          { label: 'En carrito', value: totalItems, tone: 'pink' },
          { label: 'Órdenes', value: userOrders.length, tone: 'default' },
          { label: 'Total invertido', value: formatCurrency(completedTotal), tone: 'gold' },
        ]}
        actions={
          <Link to="/my-coupons">
            <Button variant="outline" size="sm" className="!border-white/25 !bg-white/10 !text-white hover:!bg-white/20">
              Mis cupones
            </Button>
          </Link>
        }
      />

      {paidOrderNumber && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#D1FAE5] border border-[#10B981]/30 px-4 py-3 text-body-sm text-[#065F46] font-medium">
            <span>
              Orden {paidOrderNumber} completada (pago simulado). Tus claves digitales ya están
              disponibles.
            </span>
            <Link to="/library" className="font-bold text-[#1E1B4B] hover:text-[#FF2A5F]">
              Ver mi biblioteca →
            </Link>
          </div>
        </div>
      )}

      {/* Tabs: Mi Carrito vs Historial de Compras */}
      <div
        className="flex flex-wrap gap-2 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-2 shadow-xs"
        role="tablist"
        aria-label="Secciones de órdenes"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'cart'}
          onClick={() => selectTab('cart')}
          className={`rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'cart'
              ? 'bg-[#FF2A5F] text-white shadow-xs'
              : 'text-[#475569] hover:bg-[#F4F4F6] hover:text-[#0F172A]'
          }`}
        >
          Mi Carrito ({totalItems})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          onClick={() => selectTab('history')}
          className={`rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#1E1B4B] text-white shadow-xs'
              : 'text-[#475569] hover:bg-[#F4F4F6] hover:text-[#0F172A]'
          }`}
        >
          Historial de Compras ({userOrders.length})
        </button>
      </div>

      {activeTab === 'cart' ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <SectionHeader title="Tu carrito" description={`${totalItems} artículos`} />

            <div className="mt-5">
              {editionsQuery.isLoading && <Spinner label="Cargando ediciones…" />}

              {cartLines.length === 0 && !editionsQuery.isLoading && (
                <EmptyState
                  title="El carrito está vacío"
                  description="Agrega ediciones digitales desde la ficha de un videojuego."
                  action={
                    <Link to="/games">
                      <Button variant="brand">Explorar juegos</Button>
                    </Link>
                  }
                />
              )}

              <div className="flex flex-col gap-3">
                {cartLines.map((line) => {
                  const game = line.edition.game;
                  return (
                    <article
                      key={line.edition.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F]/60 p-4 shadow-xs transition-all"
                    >
                      <div className="flex items-center gap-3.5 min-w-[220px] flex-1">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#1E1B4B]">
                          {game?.coverImageUrl ? (
                            <img
                              src={game.coverImageUrl}
                              alt={game.title}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={game ? `/games/${game.id}` : '/games'}
                            className="text-body font-extrabold text-[#0F172A] hover:text-[#FF2A5F] line-clamp-1"
                          >
                            {game?.title ?? 'Videojuego'}
                          </Link>
                          <p className="text-xs text-[#475569] line-clamp-1">
                            {line.edition.editionName} · {line.edition.platform?.name} · Edición Digital
                          </p>
                          <p className="mt-1 text-caption font-semibold text-[#64748B]">
                            {formatCurrency(line.unitPrice)} c/u
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1">
                          <button
                            type="button"
                            aria-label="Quitar una unidad"
                            onClick={() =>
                              setQuantity(
                                line.edition.id,
                                Math.max(1, line.quantity - 1),
                              )
                            }
                            className="h-7 w-7 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] font-bold text-[#0F172A] hover:border-[#FF2A5F] cursor-pointer"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-body-sm font-bold text-[#0F172A]">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Agregar una unidad"
                            onClick={() => setQuantity(line.edition.id, line.quantity + 1)}
                            className="h-7 w-7 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] font-bold text-[#0F172A] hover:border-[#FF2A5F] cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <span className="w-24 text-right text-sm font-black text-[#1E1B4B]">
                          {formatCurrency(line.lineTotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(line.edition.id)}
                          className="text-xs font-bold text-[#EF4444] hover:text-[#991B1B] cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="relative overflow-hidden rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-6 shadow-sm">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#FFC700] via-[#FF2A5F] to-[#1E1B4B]"
              />
              <h2 className="text-base font-black uppercase tracking-wide text-[#0F172A]">
                Resumen de compra
              </h2>

              <dl className="mt-5 flex flex-col gap-2 text-body-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#475569]">Subtotal</dt>
                  <dd className="font-medium text-[#0F172A]">{formatCurrency(subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#475569]">Descuento</dt>
                  <dd className="font-medium text-[#0F172A]">
                    {discountPercentage > 0 ? `− ${formatCurrency(discount)}` : formatCurrency(0)}
                  </dd>
                </div>
                <div className="mt-2 flex justify-between gap-4 border-t border-[#E2E8F0] pt-3 text-subheading font-bold">
                  <dt className="text-[#0F172A]">Total</dt>
                  <dd className="text-[#0F172A]">{formatCurrency(total)}</dd>
                </div>
              </dl>

              <div className="mt-5">
                <Input
                  label="Cupón de descuento"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="EJEMPLO20"
                />
                {activePromotion && (
                  <p className="mt-2 text-caption font-semibold text-[#065F46]">
                    Cupón aplicado: {activePromotion.name} ({discountPercentage}%)
                  </p>
                )}
                {isCouponAlreadyClaimed && (
                  <p className="mt-2 text-caption font-semibold text-[#EF4444]">
                    Este cupón ya fue reclamado por tu cuenta (límite: 1 uso por usuario).
                  </p>
                )}
                {isCouponFormatInvalid && (
                  <p className="mt-2 text-caption font-semibold text-[#EF4444]">
                    Formato de cupón inválido: usa solo letras, números, guiones y guion bajo (2 a 50 caracteres).
                  </p>
                )}
                {isCouponInvalid && (
                  <p className="mt-2 text-caption font-semibold text-[#EF4444]">
                    El cupón ingresado no existe, está inactivo o expiró.
                  </p>
                )}
              </div>

              <Button
                variant="brand"
                size="lg"
                className="mt-5 w-full"
                data-testid="orders-open-checkout-btn"
                disabled={cartLines.length === 0 || !currentUser}
                onClick={goToCheckout}
              >
                Proceder al pago
              </Button>

              {!currentUser && (
                <p className="mt-3 text-caption text-[#475569]">
                  Inicia sesión en la barra superior para completar la compra.
                </p>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <div className="mt-8">
          <SectionHeader title="Historial de Compras" />
          <div className="mt-6">
            {!currentUser ? (
              <p className="text-body-sm text-[#475569]">
                Inicia sesión para consultar tu historial de órdenes.
              </p>
            ) : (
              <>
                {ordersQuery.isLoading && <Spinner label="Cargando órdenes…" />}
                {ordersQuery.isError && (
                  <ErrorBanner
                    message={errorMessage(ordersQuery.error)}
                    onRetry={() => void ordersQuery.refetch()}
                  />
                )}
                {userOrders.length === 0 && !ordersQuery.isLoading && !ordersQuery.isError && (
                  <EmptyState
                    title="Sin órdenes registradas"
                    description="Cuando completes una compra aparecerá aquí junto con sus claves digitales."
                  />
                )}

                <div className="flex flex-col gap-3">
                  {userOrders.map((order) => {
                    const statusMeta = PAYMENT_STATUS_META[order.paymentStatus] ?? {
                      label: order.paymentStatus,
                      tone: 'neutral' as const,
                    };
                    return (
                      <Link
                        key={order.id}
                        to={`/orders/${order.id}`}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-4 shadow-xs transition-all hover:border-[#FF2A5F] hover:shadow-sm"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <p className="font-mono text-sm font-black text-[#0F172A]">
                              {order.orderNumber}
                            </p>
                            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                          </div>
                          <p className="text-xs text-[#475569]">
                            {formatDate(order.createdAt)} · {order.items?.length ?? 0}{' '}
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
              </>
            )}
          </div>
        </div>
      )}

    </section>
  );
}
