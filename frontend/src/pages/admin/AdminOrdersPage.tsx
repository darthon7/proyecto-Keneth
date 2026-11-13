import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, ordersApi } from '@/api';
import { PaymentStatus } from '@/types';
import { formatCurrency, formatDate, humanizeEnum } from '@/utils/format';

function statusBadgeTone(status: PaymentStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case PaymentStatus.COMPLETED:
      return 'success';
    case PaymentStatus.FAILED:
      return 'danger';
    case PaymentStatus.REFUNDED:
      return 'neutral';
    case PaymentStatus.PENDING:
    default:
      return 'warning';
  }
}

export function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, paymentStatus }: { id: number; paymentStatus: PaymentStatus }) =>
      ordersApi.update(id, { paymentStatus }),
    onMutate: ({ id }) => {
      setUpdateError(null);
      setUpdatingOrderId(id);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['order', variables.id] });
    },
    onError: (error) => setUpdateError(errorMessage(error)),
    onSettled: () => setUpdatingOrderId(null),
  });

  const orders = useMemo(() => {
    const list = ordersQuery.data ?? [];
    if (!statusFilter) return list;
    return list.filter((order) => order.paymentStatus === statusFilter);
  }, [ordersQuery.data, statusFilter]);

  return (
    <div data-testid="admin-orders-page" className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF2A5F]">
            Operaciones Comerciales
          </span>
          <h1 className="mt-1 text-heading-sm font-black text-[#0F172A]">Órdenes de la tienda</h1>
          <p className="mt-1.5 max-w-2xl text-body-sm text-[#475569]">
            Supervisa todas las compras realizadas, actualiza estados de pago y consulta el detalle
            de claves digitales asignadas.
          </p>
        </div>

        <div className="w-56">
          <Select
            label="Filtrar por estado"
            name="statusFilter"
            data-testid="admin-orders-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            placeholder="Todos los estados"
            options={[
              { value: PaymentStatus.PENDING, label: 'Pendiente' },
              { value: PaymentStatus.COMPLETED, label: 'Completado' },
              { value: PaymentStatus.FAILED, label: 'Fallido' },
              { value: PaymentStatus.REFUNDED, label: 'Reembolsado' },
            ]}
          />
        </div>
      </header>

      {updateError && <ErrorBanner message={updateError} />}

      {ordersQuery.isLoading && <Spinner label="Cargando órdenes…" />}

      {ordersQuery.isError && (
        <ErrorBanner
          message={errorMessage(ordersQuery.error)}
          onRetry={() => void ordersQuery.refetch()}
        />
      )}

      {ordersQuery.isSuccess && orders.length === 0 && (
        <EmptyState
          title="Sin órdenes"
          description="No hay órdenes registradas que coincidan con el filtro seleccionado."
        />
      )}

      {orders.length > 0 && (
        <div className="overflow-x-auto rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-xs px-4 py-2">
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                  Orden
                </th>
                <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                  Cliente
                </th>
                <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                  Fecha
                </th>
                <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                  Total
                </th>
                <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                  Estado de pago
                </th>
                <th scope="col" className="px-3 py-3 text-right text-caption font-bold uppercase tracking-wider text-[#475569]">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isUpdating = updatingOrderId === order.id;

                return (
                  <tr
                    key={order.id}
                    data-testid={`admin-order-row-${order.id}`}
                    className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <td className="px-3 py-3 text-body-sm font-bold text-[#0F172A]">
                      {order.orderNumber}
                    </td>
                    <td className="px-3 py-3 text-body-sm text-[#475569]">
                      <div>
                        <p className="font-semibold text-[#0F172A]">
                          {order.user?.username ?? 'Cliente'}
                        </p>
                        {order.user?.email && (
                          <p className="text-caption text-[#94A3B8]">{order.user.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-body-sm text-[#475569]">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-body-sm font-bold tabular-nums text-[#0F172A]">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-3 py-3 text-body-sm">
                      <div className="flex items-center gap-2">
                        <Badge tone={statusBadgeTone(order.paymentStatus)}>
                          {humanizeEnum(order.paymentStatus)}
                        </Badge>
                        <select
                          aria-label={`Estado de pago de ${order.orderNumber}`}
                          data-testid={`admin-order-status-select-${order.id}`}
                          value={order.paymentStatus}
                          disabled={isUpdating}
                          onChange={(event) =>
                            updateStatusMutation.mutate({
                              id: order.id,
                              paymentStatus: event.target.value as PaymentStatus,
                            })
                          }
                          className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-2 py-1 text-xs font-semibold text-[#0F172A] focus:border-[#1E1B4B] focus:outline-none disabled:opacity-50"
                        >
                          <option value={PaymentStatus.PENDING}>Pendiente</option>
                          <option value={PaymentStatus.COMPLETED}>Completado</option>
                          <option value={PaymentStatus.FAILED}>Fallido</option>
                          <option value={PaymentStatus.REFUNDED}>Reembolsado</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        to={`/orders/${order.id}`}
                        data-testid={`admin-order-detail-link-${order.id}`}
                        className="text-body-sm font-semibold text-[#1E1B4B] hover:text-[#FF2A5F]"
                      >
                        Ver detalle →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
