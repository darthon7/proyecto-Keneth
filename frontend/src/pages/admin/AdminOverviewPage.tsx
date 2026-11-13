import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { adminApi, errorMessage } from '@/api';

const QUICK_ACTIONS = [
  {
    to: '/admin/developers',
    label: 'Crear Desarrolladora',
    description: 'Registrar estudios desarrolladores',
    testId: 'admin-quick-developers',
    accent: 'bg-[#EEF2FF] text-[#1E1B4B] border-[#C7D2FE]',
  },
  {
    to: '/admin/games',
    label: 'Crear Videojuego',
    description: 'Dar de alta títulos y géneros',
    testId: 'admin-quick-games',
    accent: 'bg-[#FFF1F2] text-[#FF2A5F] border-[#FECDD3]',
  },
  {
    to: '/admin/publishers',
    label: 'Crear Publisher',
    description: 'Gestionar casas publicadoras',
    testId: 'admin-quick-publishers',
    accent: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  },
  {
    to: '/admin/editions',
    label: 'Crear Edición',
    description: 'Configurar SKUs, precios y stock',
    testId: 'admin-quick-editions',
    accent: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]',
  },
  {
    to: '/admin/digital-keys',
    label: 'Cargar Claves',
    description: 'Inventario de llaves digitales',
    testId: 'admin-quick-digital-keys',
    accent: 'bg-[#EEF2FF] text-[#1E1B4B] border-[#C7D2FE]',
  },
  {
    to: '/admin/promotions',
    label: 'Nueva Promoción',
    description: 'Cupones y campañas de descuento',
    testId: 'admin-quick-promotions',
    accent: 'bg-[#FFF1F2] text-[#FF2A5F] border-[#FECDD3]',
  },
  {
    to: '/admin/orders',
    label: 'Gestionar Órdenes',
    description: 'Revisar pagos y estados',
    testId: 'admin-quick-orders',
    accent: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  },
  {
    to: '/admin/users',
    label: 'Usuarios y Roles',
    description: 'Administrar cuentas y permisos',
    testId: 'admin-quick-users',
    accent: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]',
  },
];

export function AdminOverviewPage() {
  const summaryQuery = useQuery({
    queryKey: ['admin', 'summary'],
    queryFn: () => adminApi.summary(),
  });

  const summary = summaryQuery.data;
  const availableKeysCount = summary?.availableKeys ?? 0;
  const completedOrdersCount = summary?.completedOrders ?? 0;
  const activePromosCount = summary?.activePromotions ?? 0;

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
      label: 'Promociones',
      value: summary?.promotions ?? 0,
      detail: `${activePromosCount} activas`,
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
      to: '/admin/users',
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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

      {/* Operational Quick Shortcuts */}
      <section aria-labelledby="admin-quick-actions-title" className="space-y-4">
        <div>
          <h2
            id="admin-quick-actions-title"
            className="text-subheading font-extrabold text-[#0F172A]"
          >
            Accesos rápidos operativos
          </h2>
          <p className="text-xs text-[#475569]">
            Atajos directos para crear entidades del catálogo, cargar llaves o gestionar órdenes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.testId}
              to={action.to}
              data-testid={action.testId}
              className="rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#1E1B4B] p-4 transition-all hover:-translate-y-0.5 shadow-xs flex flex-col justify-between gap-2"
            >
              <span
                className={`inline-block w-fit rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${action.accent}`}
              >
                Acceso directo
              </span>
              <div>
                <p className="text-sm font-extrabold text-[#0F172A]">{action.label}</p>
                <p className="mt-0.5 text-xs text-[#475569]">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
