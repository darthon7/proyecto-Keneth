import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { SectionHeader } from '@/components/atoms/SectionHeader';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, gameEditionsApi, ordersApi, promotionsApi } from '@/api';
import { PaymentStatus } from '@/types';
import type { GameEdition } from '@/types';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { formatCurrency, formatDate, humanizeEnum } from '@/utils/format';

export function OrdersPage() {
  const { currentUser } = useSession();
  const { items, removeItem, setQuantity, clear, totalItems } = useCart();
  const queryClient = useQueryClient();
  const [couponCode, setCouponCode] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const editionsQuery = useQuery({
    queryKey: ['game-editions'],
    queryFn: () => gameEditionsApi.list(),
  });

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list(),
  });

  const promotionsQuery = useQuery({
    queryKey: ['promotions'],
    queryFn: () => promotionsApi.list(),
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
          return {
            ...item,
            edition,
            lineTotal: Number(edition.basePrice) * item.quantity,
          };
        })
        .filter((line): line is NonNullable<typeof line> => line !== null),
    [items, editionsById],
  );

  const subtotal = cartLines.reduce((acc, line) => acc + line.lineTotal, 0);

  const activePromotion = useMemo(() => {
    const normalized = couponCode.trim().toLowerCase();
    if (!normalized) return null;
    return (
      (promotionsQuery.data ?? []).find(
        (promotion) =>
          promotion.isActive &&
          promotion.couponCode?.toLowerCase() === normalized,
      ) ?? null
    );
  }, [couponCode, promotionsQuery.data]);

  const discountPercentage = activePromotion ? Number(activePromotion.discountPercentage) : 0;
  const discount = (subtotal * discountPercentage) / 100;
  const total = subtotal - discount;

  const createOrder = useMutation({
    mutationFn: () =>
      ordersApi.create({
        userId: currentUser!.id,
        couponCode: activePromotion?.couponCode ?? undefined,
        paymentStatus: PaymentStatus.COMPLETED,
        items: cartLines.map((line) => ({
          gameEditionId: line.edition.id,
          quantity: line.quantity,
        })),
      }),
    onSuccess: async (data) => {
      clear();
      setSuccessMessage(`Orden ${data.order.orderNumber} creada correctamente.`);
      setCouponCode('');
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['user-libraries'] });
      await queryClient.invalidateQueries({ queryKey: ['digital-keys'] });
      await queryClient.invalidateQueries({ queryKey: ['game-editions'] });
    },
  });

  const userOrders = useMemo(
    () => (ordersQuery.data ?? []).filter((order) => order.user?.id === currentUser?.id),
    [ordersQuery.data, currentUser?.id],
  );

  return (
    <section className="page-container py-16">
      <h1 className="text-heading-sm font-semibold text-white">Carrito y órdenes</h1>
      <p className="mt-2 text-body-sm text-fog">
        El backend valida el stock, descuenta las llaves digitales disponibles y agrega las
        ediciones a tu biblioteca.
      </p>

      {successMessage && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] bg-graphite px-4 py-3 text-body-sm text-white surface-hairline">
            <span>{successMessage}</span>
            <Link to="/library" className="text-signal-blue hover:text-white">
              Ver mi biblioteca
            </Link>
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <SectionHeader title="Tu carrito" description={`${totalItems} artículos`} />

          <div className="mt-6">
            {editionsQuery.isLoading && <Spinner label="Cargando ediciones…" />}

            {cartLines.length === 0 && !editionsQuery.isLoading && (
              <EmptyState
                title="El carrito está vacío"
                description="Agrega ediciones desde la ficha de un videojuego."
                action={
                  <Link to="/games">
                    <Button variant="brand">Explorar juegos</Button>
                  </Link>
                }
              />
            )}

            <div className="flex flex-col gap-3">
              {cartLines.map((line) => (
                <article
                  key={line.edition.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-[4px] bg-graphite p-4"
                >
                  <div className="min-w-[200px]">
                    <h3 className="text-body font-semibold text-white">
                      {line.edition.game?.title ?? 'Videojuego'}
                    </h3>
                    <p className="text-body-sm text-fog">
                      {line.edition.editionName} · {line.edition.platform?.name} ·{' '}
                      {humanizeEnum(line.edition.format)}
                    </p>
                    <p className="mt-1 text-caption text-mid-gray">
                      {formatCurrency(line.edition.basePrice)} c/u
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Quitar una unidad"
                        onClick={() =>
                          setQuantity(
                            line.edition.id,
                            Math.max(1, line.quantity - 1),
                          )
                        }
                        className="h-7 w-7 rounded-[4px] bg-obsidian text-white"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-body-sm text-white">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Agregar una unidad"
                        onClick={() => setQuantity(line.edition.id, line.quantity + 1)}
                        className="h-7 w-7 rounded-[4px] bg-obsidian text-white"
                      >
                        +
                      </button>
                    </div>
                    <span className="w-24 text-right text-body-sm font-semibold text-white">
                      {formatCurrency(line.lineTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(line.edition.id)}
                      className="text-body-sm text-[#ff7b7b] hover:text-white"
                    >
                      Quitar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-12">
            <SectionHeader title="Tus órdenes" />
            <div className="mt-6">
              {ordersQuery.isLoading && <Spinner label="Cargando órdenes…" />}
              {ordersQuery.isError && (
                <ErrorBanner
                  message={errorMessage(ordersQuery.error)}
                  onRetry={() => void ordersQuery.refetch()}
                />
              )}
              {userOrders.length === 0 && !ordersQuery.isLoading && (
                <p className="text-body-sm text-fog">Todavía no tienes órdenes registradas.</p>
              )}

              <div className="flex flex-col gap-3">
                {userOrders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-[4px] bg-graphite p-4 transition-colors hover:bg-[#3a3a3a]"
                  >
                    <div>
                      <p className="text-body font-semibold text-white">{order.orderNumber}</p>
                      <p className="text-body-sm text-fog">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge tone={order.paymentStatus === 'COMPLETED' ? 'success' : 'warning'}>
                        {humanizeEnum(order.paymentStatus)}
                      </Badge>
                      <span className="text-body-sm font-semibold text-white">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[4px] bg-graphite p-5">
            <h2 className="text-subheading font-semibold text-white">Resumen</h2>

            <dl className="mt-5 flex flex-col gap-2 text-body-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-fog">Subtotal</dt>
                <dd className="text-white">{formatCurrency(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-fog">Descuento</dt>
                <dd className="text-white">
                  {discountPercentage > 0 ? `− ${formatCurrency(discount)}` : formatCurrency(0)}
                </dd>
              </div>
              <div className="mt-2 flex justify-between gap-4 border-t border-white/10 pt-3 text-subheading font-semibold">
                <dt className="text-white">Total</dt>
                <dd className="text-white">{formatCurrency(total)}</dd>
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
                <p className="mt-2 text-caption text-[#7ddc7d]">
                  Cupón aplicado: {activePromotion.name} ({discountPercentage}%)
                </p>
              )}
            </div>

            {createOrder.isError && (
              <div className="mt-4">
                <ErrorBanner message={errorMessage(createOrder.error)} />
              </div>
            )}

            <Button
              variant="success"
              size="lg"
              className="mt-5 w-full"
              disabled={cartLines.length === 0 || !currentUser}
              isLoading={createOrder.isPending}
              onClick={() => createOrder.mutate()}
            >
              Confirmar compra
            </Button>

            {!currentUser && (
              <p className="mt-3 text-caption text-fog">
                Inicia sesión en la barra superior para completar la compra.
              </p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
