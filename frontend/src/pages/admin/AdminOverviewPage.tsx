import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Badge } from '@/components/atoms/Badge';
import { adminApi, errorMessage, gameEditionsApi } from '@/api';
import { countAvailableKeys } from '@/utils/domain';
import { formatCurrency } from '@/utils/format';

export function AdminOverviewPage() {
  const summaryQuery = useQuery({
    queryKey: ['admin', 'summary'],
    queryFn: () => adminApi.summary(),
  });

  const editionsQuery = useQuery({
    queryKey: ['game-editions'],
    queryFn: () => gameEditionsApi.list(),
  });

  const summary = summaryQuery.data;
  const availableKeysCount = summary?.availableKeys ?? 0;
  const completedOrdersCount = summary?.completedOrders ?? 0;
  const activePromosCount = summary?.activePromotions ?? 0;

  const editionStockAlerts = (editionsQuery.data ?? [])
    .map((edition) => ({ edition, available: countAvailableKeys(edition) }))
    .sort((a, b) => a.available - b.available)
    .slice(0, 8);

  const kpiCards = [
    {
      testId: 'admin-kpi-games',
      label: 'Videojuegos',
      value: summary?.games ?? 0,
      detail: 'Títulos en catálogo',
      loading: summaryQuery.isLoading,
      error: summaryQuery.isError,
      to: '/admin/games',
      stripe: 'bg-[#FF2A5F]',
    },
    {
      testId: 'admin-kpi-developers',
      label: 'Desarrolladoras',
      value: summary?.developers ?? 0,
      detail: 'Estudios registrados',
      loading: summaryQuery.isLoading,
      error: summaryQuery.isError,
      to: '/admin/developers',
      stripe: 'bg-[#1E1B4B]',
    },
    {
      testId: 'admin-kpi-keys',
      label: 'Claves Digitales',
      value: summary?.digitalKeys ?? 0,
      detail: `${availableKeysCount} disponibles`,
      loading: summaryQuery.isLoading,
      error: summaryQuery.isError,
      to: '/admin/digital-keys',
      stripe: 'bg-[#FFC700]',
    },
    {
      testId: 'admin-kpi-orders',
      label: 'Órdenes',
      value: summary?.orders ?? 0,
      detail: `${completedOrdersCount} completadas`,
      loading: summaryQuery.isLoading,
      error: summaryQuery.isError,
      to: '/admin/orders',
      stripe: 'bg-[#10B981]',
    },
    {
      testId: 'admin-kpi-promotions',
      label: 'Cupones de Descuento',
      value: summary?.promotions ?? 0,
      detail: `${activePromosCount} activos`,
      loading: summaryQuery.isLoading,
      error: summaryQuery.isError,
      to: '/admin/promotions',
      stripe: 'bg-[#FF2A5F]',
    },
    {
      testId: 'admin-kpi-users',
      label: 'Usuarios',
      value: summary?.users ?? 0,
      detail: 'Cuentas registradas',
      loading: summaryQuery.isLoading,
      error: summaryQuery.isError,
      to: '/admin',
      stripe: 'bg-[#1E1B4B]',
    },
  ];

  return (
    <div data-testid="admin-overview-page" className="space-y-8">
      <header className="border-b border-[#E2E8F0] pb-5">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF2A5F]">
          Resumen Operativo
        </span>
        <h1 className="mt-1 text-heading-sm font-black text-[#0F172A]">
          Estado en vivo de la tienda
        </h1>
        <p className="mt-1.5 text-body-sm text-[#475569]">
          Métricas reales sincronizadas con el backend e ingresos directos a los flujos de gestión.
        </p>
      </header>

      {summaryQuery.isError && (
        <ErrorBanner
          message={errorMessage(summaryQuery.error)}
          onRetry={() => void summaryQuery.refetch()}
        />
      )}

      {/* Live KPIs Grid */}
      <div className="grid grid-cols-3 gap-4">
        {kpiCards.map((card) => (
          <Link
            key={card.testId}
            to={card.to}
            data-testid={card.testId}
            className="group relative overflow-hidden rounded-2xl bg-[#F8FAFC] hover:bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] p-5 transition-all shadow-xs"
          >
            <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${card.stripe}`} />
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#475569]">
                {card.label}
              </p>
              <span className="text-xs font-bold text-[#1E1B4B] group-hover:text-[#FF2A5F] transition-colors">
                Abrir →
              </span>
            </div>

            {card.loading ? (
              <div className="mt-3 h-9 w-20 animate-pulse rounded-lg bg-[#E2E8F0]" />
            ) : card.error ? (
              <p className="mt-3 text-sm font-bold text-[#EF4444]">Error al cargar</p>
            ) : (
              <p className="mt-2 text-3xl font-black tabular-nums text-[#0F172A]">
                {card.value}
              </p>
            )}

            <p className="mt-1 text-caption text-[#475569]">
              {card.loading ? 'Consultando API…' : card.detail}
            </p>
          </Link>
        ))}
      </div>

      {/* Live Digital Stock Alerts per Edition */}
      <section aria-labelledby="admin-stock-overview-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="admin-stock-overview-title"
              className="text-subheading font-extrabold text-[#0F172A]"
            >
              Control Rápido de Stock Digital (Ediciones)
            </h2>
            <p className="text-xs text-[#475569]">
              Ediciones ordenadas por menor cantidad de claves digitales disponibles para reposición inmediata.
            </p>
          </div>
          <Link
            to="/admin/games"
            className="text-xs font-bold text-[#1E1B4B] hover:text-[#FF2A5F] transition-colors"
          >
            Ir a Videojuegos y Stock →
          </Link>
        </div>

        {editionsQuery.isError ? (
          <ErrorBanner
            message={errorMessage(editionsQuery.error)}
            onRetry={() => void editionsQuery.refetch()}
          />
        ) : editionStockAlerts.length === 0 ? (
          <p className="rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] p-4 text-xs text-[#475569]">
            Aún no hay ediciones digitales registradas. Crea una desde Videojuegos o Ediciones Digitales.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {editionStockAlerts.map(({ edition, available }) => {
              const isOut = available === 0;
              const isLow = available > 0 && available < 3;
              return (
                <Link
                  key={edition.id}
                  to={`/admin/digital-keys?editionId=${edition.id}`}
                  data-testid={`admin-stock-alert-${edition.id}`}
                  className="rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#FF2A5F] p-4 transition-all hover:-translate-y-0.5 shadow-xs flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={isOut ? 'danger' : isLow ? 'warning' : 'success'}>
                      {isOut ? 'Sin claves (0)' : `${available} disponibles`}
                    </Badge>
                    <span className="text-[11px] font-mono text-[#64748B]">
                      {formatCurrency(edition.basePrice)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-[#0F172A] line-clamp-1">
                      {edition.game?.title ?? 'Juego'}
                    </p>
                    <p className="mt-0.5 text-xs text-[#475569] line-clamp-1">
                      {edition.editionName} · {edition.platform?.name ?? 'Digital'}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-[#1E1B4B]">
                    Reponer claves →
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
