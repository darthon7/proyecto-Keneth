import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, ordersApi, ordersExtraApi } from '@/api';
import { PaymentStatus } from '@/types';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useCartSummary } from '@/hooks/useCartSummary';
import { countPurchasableKeys } from '@/utils/domain';
import { formatCurrency } from '@/utils/format';
import { VALIDATION_PATTERNS } from '@/utils/fields';
import { checkoutSchema, type CheckoutFormValues } from '@/utils/schemas';

export function CheckoutPage() {
  const { currentUser } = useSession();
  const { clear, totalItems } = useCart();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [couponCode] = useState(searchParams.get('coupon') ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      cardHolder: currentUser?.username ?? 'Cliente Demo',
      cardNumber: '4242 4242 4242 4242',
      cardExpiry: '12/28',
      cardCvv: '123',
    },
  });

  const { errors } = form.formState;

  const {
    editionsQuery,
    cartLines,
    subtotal,
    activePromotion,
    discountPercentage,
    discount,
    total,
  } = useCartSummary(couponCode);

  const outOfStockLines = useMemo(() => {
    return cartLines.filter((line) => {
      const keys = line.edition.digitalKeys;
      if (Array.isArray(keys)) {
        return countPurchasableKeys(line.edition) < line.quantity;
      }
      return false;
    });
  }, [cartLines]);
  const hasOutOfStockItems = outOfStockLines.length > 0;

  const createOrder = useMutation({
    mutationFn: async () => {
      const created = await ordersApi.create({
        userId: currentUser!.id,
        couponCode: activePromotion?.couponCode ?? undefined,
        items: cartLines.map((line) => ({
          gameEditionId: line.edition.id,
          quantity: line.quantity,
        })),
      });
      if (created.order.paymentStatus === PaymentStatus.PENDING) {
        await ordersExtraApi.confirmPayment(created.order.id);
      }
      return created;
    },
    onSuccess: async (data) => {
      clear({ releaseReservations: false });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['user-libraries'] }),
        queryClient.invalidateQueries({ queryKey: ['game-editions'] }),
        queryClient.invalidateQueries({ queryKey: ['games'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'summary'] }),
      ]);
      navigate(`/orders?paid=${encodeURIComponent(data.order.orderNumber)}`, { replace: true });
    },
  });

  const handleSimulatedPay = form.handleSubmit(() => {
    setValidationError(null);

    if (!currentUser) {
      setValidationError('Debes iniciar sesión para completar el pago.');
      return;
    }

    if (hasOutOfStockItems) {
      setValidationError(
        'Uno o más productos en tu carrito no tienen suficientes claves digitales disponibles en tiempo real. Por favor ajusta tu pedido.',
      );
      return;
    }

    const trimmedCoupon = couponCode.trim();
    if (trimmedCoupon && !VALIDATION_PATTERNS.COUPON_CODE.test(trimmedCoupon)) {
      setValidationError('El formato del cupón de descuento no es válido.');
      return;
    }

    createOrder.mutate();
  });

  if (editionsQuery.isLoading) {
    return (
      <section className="page-container py-16">
        <Spinner label="Cargando información del checkout…" />
      </section>
    );
  }

  if (!currentUser) {
    return (
      <section className="page-container py-16">
        <EmptyState
          title="Inicia sesión para pagar"
          description="Necesitas una sesión activa para generar tu orden y recibir tus claves digitales."
          action={
            <Link to="/orders">
              <Button variant="brand">Volver al carrito</Button>
            </Link>
          }
        />
      </section>
    );
  }

  if (cartLines.length === 0) {
    return (
      <section className="page-container py-16">
        <EmptyState
          title="Tu carrito está vacío"
          description="Agrega al menos un videojuego antes de continuar al checkout."
          action={
            <Link to="/games">
              <Button variant="brand">Explorar tienda</Button>
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="page-container min-h-[calc(100vh-14rem)] py-12 space-y-8">
      <header className="flex items-end justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-5 rounded-full bg-[#FF2A5F]" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF2A5F]">
              Finalizar Compra
            </span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-[#0F172A]">
            Checkout
          </h1>
          <p className="text-body-sm text-[#475569]">
            Pago con tarjeta para entrega inmediata de tus claves digitales.
          </p>
        </div>

        <Link to="/orders">
          <Button variant="outline" size="sm">
            ← Volver al carrito
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-[1fr_420px] gap-8 items-start">
        {/* Columna izquierda: Datos de pago */}
        <form
          onSubmit={handleSimulatedPay}
          className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-7 shadow-xs space-y-6"
          noValidate
        >
          <div className="border-b border-[#E2E8F0] pb-4">
            <h2 className="text-base font-black uppercase tracking-wide text-[#0F172A]">
              Método de pago
            </h2>
            <p className="mt-0.5 text-xs text-[#64748B]">Tarjeta de crédito o débito</p>
          </div>

          <div className="space-y-4">
            <Input
              label="Titular de la tarjeta"
              maxLength={100}
              placeholder="Nombre completo"
              error={errors.cardHolder?.message}
              {...form.register('cardHolder', {
                onChange: (event) => {
                  const clean = event.target.value
                    .replace(/[^a-zA-ZÀ-ÿ\s.'-]/g, '')
                    .slice(0, 100);
                  if (event.target.value !== clean) {
                    form.setValue('cardHolder', clean, {
                      shouldValidate: form.formState.isSubmitted,
                    });
                  }
                },
              })}
            />

            <Input
              label="Número de tarjeta"
              inputMode="numeric"
              maxLength={23}
              placeholder="4242 4242 4242 4242"
              error={errors.cardNumber?.message}
              {...form.register('cardNumber', {
                onChange: (event) => {
                  const clean = event.target.value.replace(/[^\d\s]/g, '').slice(0, 23);
                  if (event.target.value !== clean) {
                    form.setValue('cardNumber', clean, {
                      shouldValidate: form.formState.isSubmitted,
                    });
                  }
                },
              })}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Expiración (MM/AA)"
                inputMode="numeric"
                maxLength={5}
                placeholder="12/28"
                error={errors.cardExpiry?.message}
                {...form.register('cardExpiry', {
                  onChange: (event) => {
                    const clean = event.target.value.replace(/[^\d/]/g, '').slice(0, 5);
                    if (event.target.value !== clean) {
                      form.setValue('cardExpiry', clean, {
                        shouldValidate: form.formState.isSubmitted,
                      });
                    }
                  },
                })}
              />
              <Input
                label="CVV"
                inputMode="numeric"
                maxLength={4}
                placeholder="123"
                error={errors.cardCvv?.message}
                {...form.register('cardCvv', {
                  onChange: (event) => {
                    const clean = event.target.value.replace(/\D/g, '').slice(0, 4);
                    if (event.target.value !== clean) {
                      form.setValue('cardCvv', clean, {
                        shouldValidate: form.formState.isSubmitted,
                      });
                    }
                  },
                })}
              />
            </div>
          </div>

          {validationError && <ErrorBanner message={validationError} />}
          {createOrder.isError && <ErrorBanner message={errorMessage(createOrder.error)} />}

          <div className="flex items-center justify-between gap-3 border-t border-[#E2E8F0] pt-5">
            <Link to="/orders">
              <Button type="button" variant="ghost" disabled={createOrder.isPending}>
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              variant="brand"
              size="lg"
              data-testid="checkout-confirm-pay-btn"
              isLoading={createOrder.isPending}
              disabled={createOrder.isPending || hasOutOfStockItems}
            >
              {hasOutOfStockItems ? 'Stock no disponible' : `Pagar ${formatCurrency(total)}`}
            </Button>
          </div>
        </form>

        {/* Columna derecha: Resumen de productos y totales */}
        <aside className="sticky top-24 self-start">
          <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-sm space-y-5">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#FFC700] via-[#FF2A5F] to-[#1E1B4B]"
            />

            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-black uppercase tracking-wide text-[#0F172A]">
                Resumen del pedido
              </h2>
              <Badge tone="neutral">
                {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}
              </Badge>
            </div>

            <div className="divide-y divide-[#E2E8F0] max-h-[380px] overflow-y-auto pr-1">
              {cartLines.map((line) => {
                const game = line.edition.game;
                const basePrice = Number(line.edition.basePrice);
                const hasItemDiscount = line.unitPrice < basePrice;

                return (
                  <article key={line.edition.id} className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0">
                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#1E1B4B]">
                      {game?.coverImageUrl ? (
                        <img
                          src={game.coverImageUrl}
                          alt={game.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-black text-white">
                          {(game?.title ?? 'J').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-extrabold text-[#0F172A] line-clamp-1">
                        {game?.title ?? 'Videojuego'}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#475569]">
                          {line.edition.editionName}
                        </span>
                        {line.edition.platform?.name && (
                          <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#1E1B4B]">
                            {line.edition.platform.name}
                          </span>
                        )}
                        {line.edition.isDlc && <Badge tone="warning">DLC</Badge>}
                      </div>
                      <p className="text-xs text-[#64748B]">
                        Cantidad: <span className="font-bold text-[#0F172A]">{line.quantity}</span>{' '}
                        × {formatCurrency(line.unitPrice)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right tabular-nums">
                      {hasItemDiscount && (
                        <p className="text-[11px] text-[#94A3B8] line-through">
                          {formatCurrency(basePrice * line.quantity)}
                        </p>
                      )}
                      <p className="text-sm font-black text-[#1E1B4B]">
                        {formatCurrency(line.lineTotal)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            <dl className="space-y-2 border-t border-[#E2E8F0] pt-4 text-body-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#475569]">Subtotal</dt>
                <dd className="font-semibold text-[#0F172A] tabular-nums">
                  {formatCurrency(subtotal)}
                </dd>
              </div>
              {discountPercentage > 0 && (
                <div className="flex justify-between gap-4 font-semibold text-[#065F46]">
                  <dt>
                    Cupón ({activePromotion?.couponCode} · -{discountPercentage}%)
                  </dt>
                  <dd className="tabular-nums">− {formatCurrency(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-[#E2E8F0] pt-3 text-base font-black text-[#0F172A]">
                <dt>Total a pagar</dt>
                <dd className="text-lg text-[#1E1B4B] tabular-nums">{formatCurrency(total)}</dd>
              </div>
            </dl>

            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2.5 text-[11px] text-[#475569]">
              Entrega digital instantánea en <strong className="text-[#0F172A]">Mis Juegos</strong>{' '}
              al confirmar la compra.
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
