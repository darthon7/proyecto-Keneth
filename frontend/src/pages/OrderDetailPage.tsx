import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AccountHeroHeader } from '@/components/molecules/AccountHeroHeader';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, ordersApi } from '@/api';
import { useSession } from '@/context/SessionContext';
import { formatCurrency, formatDate } from '@/utils/format';
import { PaymentStatus } from '@/types';

const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  [PaymentStatus.COMPLETED]: { label: 'Completada', tone: 'success' },
  [PaymentStatus.PENDING]: { label: 'Pendiente', tone: 'warning' },
  [PaymentStatus.FAILED]: { label: 'Fallida', tone: 'danger' },
  [PaymentStatus.REFUNDED]: { label: 'Reembolsada', tone: 'neutral' },
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const isValidOrderId = Number.isInteger(orderId) && orderId >= 1;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser, isAdmin, isLoading: sessionLoading } = useSession();
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.get(orderId),
    enabled: isValidOrderId && Boolean(currentUser),
  });

  const updateMutation = useMutation({
    mutationFn: (paymentStatus: PaymentStatus) =>
      ordersApi.update(orderId, { paymentStatus }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => ordersApi.remove(orderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate('/orders');
    },
  });

  const handleCopyKey = async (keyId: string, code: string) => {
    try {
      await navigator.clipboard?.writeText(code);
      setCopiedKeyId(keyId);
      setTimeout(() => {
        setCopiedKeyId((current) => (current === keyId ? null : current));
      }, 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  if (sessionLoading) return <Spinner label="Verificando sesión…" />;

  if (!currentUser) {
    return (
      <section className="page-container py-16">
        <EmptyState
          title="Inicia sesión"
          description="Entra en tu cuenta desde la barra superior para consultar el detalle de tu orden."
        />
      </section>
    );
  }

  if (!isValidOrderId) {
    return (
      <section className="page-container py-16">
        <ErrorBanner message="El identificador de la orden no es válido." />
      </section>
    );
  }

  if (orderQuery.isLoading) return <Spinner label="Cargando orden…" />;

  if (orderQuery.isError) {
    return (
      <section className="page-container py-16">
        <ErrorBanner
          message={errorMessage(orderQuery.error)}
          onRetry={() => void orderQuery.refetch()}
        />
      </section>
    );
  }

  const order = orderQuery.data;
  if (!order) return null;

  const statusMeta = PAYMENT_STATUS_META[order.paymentStatus] ?? {
    label: order.paymentStatus,
    tone: 'neutral' as const,
  };

  return (
    <section
      data-testid="order-detail-page"
      className="page-container min-h-[calc(100vh-14rem)] py-8 sm:py-12 space-y-6"
    >
      <AccountHeroHeader
        backLink={{ to: '/orders?tab=history', label: 'Volver a órdenes' }}
        eyebrow="Recibo de Compra"
        title={order.orderNumber}
        description={`Realizada el ${formatDate(order.createdAt)} · Cuenta: ${order.user?.username ?? 'Usuario'}`}
        stats={[
          { label: 'Artículos', value: order.items?.length ?? 0, tone: 'default' },
          { label: 'Estado', value: statusMeta.label, tone: order.paymentStatus === PaymentStatus.COMPLETED ? 'emerald' : 'pink' },
          { label: 'Total', value: formatCurrency(order.totalAmount), tone: 'gold' },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3.5">
          {(order.items ?? []).map((item) => {
            const game = item.gameEdition?.game;
            return (
              <article
                key={item.id}
                className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-[220px] flex-1">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#1E1B4B]">
                      {game?.coverImageUrl ? (
                        <img
                          src={game.coverImageUrl}
                          alt={game.title}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      {game ? (
                        <Link
                          to={`/games/${game.id}`}
                          className="text-base font-extrabold text-[#0F172A] hover:text-[#FF2A5F] transition-colors"
                        >
                          {game.title}
                        </Link>
                      ) : (
                        <h2 className="text-base font-extrabold text-[#0F172A]">Videojuego</h2>
                      )}
                      <p className="text-xs font-medium text-[#475569]">
                        {item.gameEdition?.editionName} · {item.gameEdition?.platform?.name}
                      </p>
                      <p className="text-[11px] text-[#64748B]">
                        Precio unitario: {formatCurrency(item.unitPrice)} · Descuento:{' '}
                        {formatCurrency(item.discountApplied)}
                      </p>
                    </div>
                  </div>

                  <span className="text-base font-black text-[#1E1B4B]">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>

                {item.digitalKey && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5 text-[#0F172A]">
                    <div className="min-w-0">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#475569]">
                        Llave digital asignada
                      </span>
                      <span className="font-mono text-xs font-bold tracking-wider text-[#0F172A] break-all select-all">
                        {item.digitalKey.code}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void handleCopyKey(item.digitalKey!.id, item.digitalKey!.code)
                      }
                      className="rounded-lg bg-[#FF2A5F] hover:bg-[#E01E4F] px-3 py-1.5 text-[11px] font-bold text-white transition-colors cursor-pointer"
                    >
                      {copiedKeyId === item.digitalKey.id ? '¡Copiada!' : 'Copiar llave'}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <aside className="lg:self-start">
          <div className="relative overflow-hidden rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-6 shadow-sm space-y-4">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#FFC700] via-[#FF2A5F] to-[#1E1B4B]"
            />
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-black uppercase tracking-wide text-[#0F172A]">
                Resumen
              </h2>
              <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            </div>

            <div className="space-y-1.5 border-t border-[#E2E8F0] pt-3">
              <p className="text-xs text-[#64748B]">Total pagado</p>
              <p className="text-2xl font-black text-[#1E1B4B]">
                {formatCurrency(order.totalAmount)}
              </p>
              {order.paymentGatewayRef && (
                <p className="font-mono text-[11px] text-[#475569]">
                  Ref: {order.paymentGatewayRef}
                </p>
              )}
            </div>

            <Link
              to="/library"
              className="block w-full rounded-xl bg-[#1E1B4B] hover:bg-[#FF2A5F] py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white transition-colors"
            >
              Ir a Mi Biblioteca
            </Link>

            {isAdmin && (
              <div className="border-t border-[#E2E8F0] pt-4 flex flex-col gap-3">
                <Select
                  label="Estado del pago (Admin)"
                  name="paymentStatus"
                  value={order.paymentStatus}
                  onChange={(event) =>
                    updateMutation.mutate(event.target.value as PaymentStatus)
                  }
                  options={[
                    { value: 'PENDING', label: 'Pendiente' },
                    { value: 'COMPLETED', label: 'Completado' },
                    { value: 'FAILED', label: 'Fallido' },
                    { value: 'REFUNDED', label: 'Reembolsado' },
                  ]}
                />

                {updateMutation.isError && (
                  <ErrorBanner message={errorMessage(updateMutation.error)} />
                )}

                <Button
                  variant="danger"
                  onClick={() => deleteMutation.mutate()}
                  isLoading={deleteMutation.isPending}
                >
                  Eliminar orden
                </Button>

                {deleteMutation.isError && (
                  <ErrorBanner message={errorMessage(deleteMutation.error)} />
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
