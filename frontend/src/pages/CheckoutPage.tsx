import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, gameEditionsApi, ordersApi, ordersExtraApi, promotionsApi, promotionsExtraApi } from '@/api';
import { PaymentStatus, type GameEdition } from '@/types';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { getActiveGameDiscount } from '@/utils/discount';
import { formatCurrency } from '@/utils/format';
import { VALIDATION_PATTERNS } from '@/utils/fields';

export function CheckoutPage() {
  const { currentUser } = useSession();
  const { items, clear, totalItems } = useCart();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialCoupon = searchParams.get('coupon') ?? '';
  const [couponCode] = useState(initialCoupon);
  const [cardHolder, setCardHolder] = useState(currentUser?.username ?? 'Cliente Demo');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [validationError, setValidationError] = useState<string | null>(null);

  const editionsQuery = useQuery({
    queryKey: ['game-editions'],
    queryFn: () => gameEditionsApi.list(),
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
            lineTotal: unitPrice * item.quantity,
          };
        })
        .filter((line): line is NonNullable<typeof line> => line !== null),
    [items, editionsById],
  );

  const subtotal = cartLines.reduce((acc, line) => acc + line.lineTotal, 0);

  const activePromotion = useMemo(() => {
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

  const discountPercentage = activePromotion ? Number(activePromotion.discountPercentage) : 0;
  const discount = (subtotal * discountPercentage) / 100;
  const total = subtotal - discount;

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
      clear();
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

  const handleSimulatedPay = (event: React.FormEvent) => {
    event.preventDefault();
    setValidationError(null);

    if (!currentUser) {
      setValidationError('Debes iniciar sesión para completar el pago.');
      return;
    }

    const digits = cardNumber.replace(/\s+/g, '');
    const trimmedHolder = cardHolder.trim();
    const trimmedExpiry = cardExpiry.trim();
    const trimmedCvv = cardCvv.trim();
    const trimmedCoupon = couponCode.trim();

    if (!trimmedHolder || !VALIDATION_PATTERNS.CARD_HOLDER.test(trimmedHolder)) {
      setValidationError(
        'Ingresa un nombre de titular válido (solo letras y espacios, mínimo 3 caracteres).',
      );
      return;
    }
    if (!VALIDATION_PATTERNS.CARD_NUMBER.test(digits)) {
      setValidationError('Ingresa un número de tarjeta de prueba válido (12 a 19 dígitos).');
      return;
    }
    if (!VALIDATION_PATTERNS.CARD_EXPIRY.test(trimmedExpiry)) {
      setValidationError('La fecha de expiración debe tener formato MM/AA (ej. 12/28).');
      return;
    }
    const [expMonthStr, expYearStr] = trimmedExpiry.split('/');
    const expMonth = Number(expMonthStr);
    const expYear = 2000 + Number(expYearStr);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      setValidationError(
        'La tarjeta de prueba está vencida. Ingresa una fecha de expiración vigente.',
      );
      return;
    }
    if (!VALIDATION_PATTERNS.CARD_CVV.test(trimmedCvv)) {
      setValidationError('El CVV debe tener 3 o 4 dígitos.');
      return;
    }
    if (trimmedCoupon && !VALIDATION_PATTERNS.COUPON_CODE.test(trimmedCoupon)) {
      setValidationError('El formato del cupón de descuento no es válido.');
      return;
    }

    createOrder.mutate();
  };

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
    <section className="page-container py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-heading-sm font-extrabold text-[#0F172A]">Checkout Simulado</h1>
            <p className="mt-1 text-body-sm text-[#475569]">
              Pago con tarjeta de prueba para entrega inmediata de claves digitales.
            </p>
          </div>
          <Link to="/orders">
            <Button variant="outline" size="sm">
              ← Volver al carrito
            </Button>
          </Link>
        </div>

        <form
          onSubmit={handleSimulatedPay}
          className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-5"
        >
          <div className="rounded-xl border border-[#FDE68A] bg-[#FEF3C7] px-3.5 py-2.5 text-xs font-medium text-[#92400E]">
            Modo simulación: no se procesarán cobros reales. Al confirmar se asignarán tus claves digitales inmediatamente.
          </div>

          <div className="space-y-4">
            <h2 className="text-body font-bold text-[#0F172A]">Pago con tarjeta</h2>
            <Input
              label="Titular de la tarjeta"
              maxLength={100}
              value={cardHolder}
              onChange={(event) =>
                setCardHolder(event.target.value.replace(/[^a-zA-ZÀ-ÿ\s.'-]/g, '').slice(0, 100))
              }
              placeholder="Nombre completo"
            />
            <Input
              label="Número de tarjeta (prueba)"
              inputMode="numeric"
              maxLength={23}
              value={cardNumber}
              onChange={(event) =>
                setCardNumber(event.target.value.replace(/[^\d\s]/g, '').slice(0, 23))
              }
              placeholder="4242 4242 4242 4242"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Expiración (MM/AA)"
                inputMode="numeric"
                maxLength={5}
                value={cardExpiry}
                onChange={(event) =>
                  setCardExpiry(event.target.value.replace(/[^\d/]/g, '').slice(0, 5))
                }
                placeholder="12/28"
              />
              <Input
                label="CVV"
                inputMode="numeric"
                maxLength={4}
                value={cardCvv}
                onChange={(event) =>
                  setCardCvv(event.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="123"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2 text-body-sm">
            <div className="flex justify-between text-[#475569]">
              <span>Artículos ({totalItems})</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountPercentage > 0 && (
              <div className="flex justify-between font-medium text-[#065F46]">
                <span>Cupón ({activePromotion?.couponCode})</span>
                <span>− {formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[#E2E8F0] pt-2 text-body font-extrabold text-[#0F172A]">
              <span>Total a pagar</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {validationError && <ErrorBanner message={validationError} />}
          {createOrder.isError && <ErrorBanner message={errorMessage(createOrder.error)} />}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
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
            >
              Pagar {formatCurrency(total)} (Simulado)
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
