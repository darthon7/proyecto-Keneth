import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, ordersApi } from '@/api';
import { formatCurrency, formatDate, humanizeEnum } from '@/utils/format';
import type { PaymentStatus } from '@/types';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.get(orderId),
    enabled: Number.isFinite(orderId),
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

  return (
    <section className="page-container py-16">
      <Link to="/orders" className="text-body-sm font-medium text-[#475569] transition-colors hover:text-[#FF2A5F]">
        ← Volver a órdenes
      </Link>

      <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-extrabold text-[#0F172A]">{order.orderNumber}</h1>
          <p className="mt-2 text-body-sm text-[#475569]">
            {formatDate(order.createdAt)} · {order.user?.username ?? 'Usuario'}
          </p>
        </div>
        <Badge tone={order.paymentStatus === 'COMPLETED' ? 'success' : 'warning'}>
          {humanizeEnum(order.paymentStatus)}
        </Badge>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          {(order.items ?? []).map((item) => (
            <article key={item.id} className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-4 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-body font-bold text-[#0F172A]">
                    {item.gameEdition?.game?.title ?? 'Videojuego'}
                  </h2>
                  <p className="text-body-sm text-[#475569]">
                    {item.gameEdition?.editionName} · {item.gameEdition?.platform?.name}
                  </p>
                  <p className="mt-1 text-caption text-[#94A3B8]">
                    Precio unitario {formatCurrency(item.unitPrice)} · Descuento{' '}
                    {formatCurrency(item.discountApplied)}
                  </p>
                  {item.digitalKey && (
                    <p className="mt-2 inline-block rounded bg-[#EEF2FF] px-2 py-0.5 font-mono text-caption font-semibold text-[#1E1B4B]">
                      Llave: {item.digitalKey.code}
                    </p>
                  )}
                </div>
                <span className="text-body-sm font-bold text-[#0F172A]">
                  {formatCurrency(item.subtotal)}
                </span>
              </div>
            </article>
          ))}
        </div>

        <aside className="lg:self-start">
          <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-5 shadow-sm">
            <h2 className="text-subheading font-extrabold text-[#0F172A]">Total</h2>
            <p className="mt-3 text-heading-sm font-black text-[#0F172A]">
              {formatCurrency(order.totalAmount)}
            </p>
            {order.paymentGatewayRef && (
              <p className="mt-1 text-caption text-[#475569]">Referencia: {order.paymentGatewayRef}</p>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <Select
                label="Estado del pago"
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
          </div>
        </aside>
      </div>
    </section>
  );
}
