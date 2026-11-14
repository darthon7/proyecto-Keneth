import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AccountHeroHeader } from '@/components/molecules/AccountHeroHeader';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, promotionsExtraApi } from '@/api';
import { useSession } from '@/context/SessionContext';
import { getCouponStatus } from '@/utils/discount';
import { formatDate } from '@/utils/format';

type CouponFilter = 'all' | 'available' | 'claimed' | 'expired';

export function MyCouponsPage() {
  const { currentUser } = useSession();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<CouponFilter>('all');
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const couponsQuery = useQuery({
    queryKey: ['promotions', 'my', currentUser?.id],
    queryFn: () => promotionsExtraApi.myCoupons(),
    enabled: Boolean(currentUser),
  });

  const handleCopy = async (id: number, code: string) => {
    try {
      await navigator.clipboard?.writeText(code);
      setCopiedId(id);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
        copyTimerRef.current = null;
      }, 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const coupons = useMemo(() => couponsQuery.data ?? [], [couponsQuery.data]);

  const counts = useMemo(() => {
    let available = 0;
    let claimed = 0;
    let expired = 0;
    for (const coupon of coupons) {
      if (coupon.isClaimed) {
        claimed += 1;
      } else if (getCouponStatus(coupon).status === 'expired') {
        expired += 1;
      } else {
        available += 1;
      }
    }
    return { available, claimed, expired };
  }, [coupons]);

  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      const isClaimed = Boolean(coupon.isClaimed);
      const isExpired = getCouponStatus(coupon).status === 'expired';
      if (filter === 'claimed') return isClaimed;
      if (filter === 'expired') return !isClaimed && isExpired;
      if (filter === 'available') return !isClaimed && !isExpired;
      return true;
    });
  }, [coupons, filter]);

  if (!currentUser) {
    return (
      <section className="page-container py-16">
        <EmptyState
          title="Inicia sesión para ver tus cupones"
          description="Regístrate o inicia sesión para consultar tus cupones de bienvenida y promociones vigentes."
          action={
            <Link to="/promotions">
              <Button variant="brand">Ver ofertas públicas</Button>
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section
      data-testid="my-coupons-page"
      className="page-container min-h-[calc(100vh-14rem)] py-8 sm:py-12 space-y-6"
    >
      <AccountHeroHeader
        eyebrow="Beneficios de tu Cuenta"
        title="Mis Cupones"
        description="Consulta tus códigos disponibles, las promociones que están por vencer y los cupones ya reclamados (límite: 1 uso por usuario)."
        stats={[
          { label: 'Disponibles', value: counts.available, tone: 'emerald' },
          { label: 'Ya reclamados', value: counts.claimed, tone: 'gold' },
          { label: 'Expirados', value: counts.expired, tone: 'pink' },
        ]}
        actions={
          <Link to="/orders">
            <Button variant="brand" size="sm">Ir al carrito</Button>
          </Link>
        }
      />

      {coupons.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-2 shadow-xs">
          {(
            [
              { id: 'all', label: `Todos (${coupons.length})` },
              { id: 'available', label: `Disponibles (${counts.available})` },
              { id: 'claimed', label: `Ya reclamados (${counts.claimed})` },
              { id: 'expired', label: `Expirados (${counts.expired})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                filter === tab.id
                  ? 'bg-[#1E1B4B] text-white'
                  : 'text-[#475569] hover:bg-[#F4F4F6] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div>
        {couponsQuery.isLoading && <Spinner label="Cargando tus cupones…" />}
        {couponsQuery.isError && (
          <ErrorBanner
            message={errorMessage(couponsQuery.error)}
            onRetry={() => void couponsQuery.refetch()}
          />
        )}

        {couponsQuery.isSuccess && coupons.length === 0 && (
          <EmptyState
            title="Aún no tienes cupones registrados"
            description="Explora la sección de ofertas o aprovecha nuestras campañas activas."
            action={
              <Link to="/promotions">
                <Button variant="brand">Ver ofertas</Button>
              </Link>
            }
          />
        )}

        {couponsQuery.isSuccess && coupons.length > 0 && filteredCoupons.length === 0 && (
          <EmptyState
            title="No hay cupones en esta categoría"
            description="Selecciona otra pestaña para ver tus demás cupones."
            action={
              <Button variant="outline" onClick={() => setFilter('all')}>
                Ver todos
              </Button>
            }
          />
        )}

        {filteredCoupons.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredCoupons.map((coupon) => {
              const statusInfo = getCouponStatus(coupon);
              const isClaimed = Boolean(coupon.isClaimed);
              const isExpired = statusInfo.status === 'expired';
              const isExpiringSoon = !isClaimed && statusInfo.status === 'expiring_soon';
              const isUnavailable = isClaimed || isExpired;

              return (
                <article
                  key={coupon.id}
                  data-testid={`my-coupon-card-${coupon.id}`}
                  className={`relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border p-6 shadow-xs transition-all ${
                    isUnavailable
                      ? 'border-[#E2E8F0] bg-[#F8FAFC] opacity-85'
                      : isExpiringSoon
                        ? 'border-[#F59E0B] bg-[#FFFBEB] hover:shadow-md'
                        : 'border-[#E2E8F0] bg-[#FFFFFF] hover:border-[#FF2A5F] hover:shadow-md'
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className={`absolute inset-x-0 top-0 h-[3px] ${
                      isUnavailable
                        ? 'bg-[#CBD5E1]'
                        : 'bg-gradient-to-r from-[#FFC700] via-[#FF2A5F] to-[#1E1B4B]'
                    }`}
                  />

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`rounded-md px-2.5 py-1 text-xs font-black uppercase ${
                          isUnavailable
                            ? 'bg-[#E2E8F0] text-[#64748B]'
                            : 'bg-[#FFC700] text-[#0F172A]'
                        }`}
                      >
                        -{Number(coupon.discountPercentage)}% OFF
                      </span>

                      {isClaimed ? (
                        <Badge tone="neutral">Ya reclamado</Badge>
                      ) : isExpired ? (
                        <Badge tone="danger">Cupón expirado</Badge>
                      ) : isExpiringSoon ? (
                        <Badge tone="warning">¡Por expirar!</Badge>
                      ) : (
                        <Badge tone="success">Disponible</Badge>
                      )}
                    </div>

                    <h2 className="text-lg font-extrabold text-[#0F172A]">{coupon.name}</h2>

                    {isExpiringSoon && (
                      <p className="rounded-lg border border-[#FCD34D] bg-[#FEF3C7] px-3 py-1.5 text-xs font-bold text-[#92400E]">
                        ¡Úsalo pronto antes de que expire!{' '}
                        {statusInfo.daysRemaining <= 1
                          ? `Quedan ${statusInfo.hoursRemaining} h.`
                          : `Quedan ${statusInfo.daysRemaining} días.`}
                      </p>
                    )}

                    {isClaimed ? (
                      <p className="text-xs font-semibold text-[#64748B]">
                        Ya utilizaste este cupón en una compra anterior (límite: 1 uso por usuario).
                      </p>
                    ) : (
                      isExpired && (
                        <p className="text-xs font-semibold text-[#DC2626]">
                          Este cupón expiró el {formatDate(coupon.endDate)} y ya no puede aplicarse.
                        </p>
                      )
                    )}

                    <div className="space-y-0.5 text-xs text-[#475569]">
                      <p>
                        Vigencia: {formatDate(coupon.startDate)} → {formatDate(coupon.endDate)}
                      </p>
                      <p className="text-[11px] font-semibold text-[#64748B]">
                        Límite: 1 uso por usuario
                      </p>
                    </div>

                    {coupon.couponCode && (
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2.5">
                        <span
                          className={`font-mono text-xs font-black tracking-wider ${
                            isUnavailable ? 'text-[#94A3B8] line-through' : 'text-[#1E1B4B]'
                          }`}
                        >
                          {coupon.couponCode}
                        </span>
                        {!isUnavailable && (
                          <button
                            type="button"
                            onClick={() => void handleCopy(coupon.id, coupon.couponCode!)}
                            className="rounded-md bg-[#1E1B4B] hover:bg-[#FF2A5F] px-2.5 py-1 text-[11px] font-bold text-white transition-colors cursor-pointer"
                          >
                            {copiedId === coupon.id ? '¡Copiado!' : 'Copiar'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isClaimed ? (
                    <span className="w-full rounded-xl bg-[#E2E8F0] py-2.5 text-center text-xs font-bold uppercase tracking-wider text-[#64748B] cursor-not-allowed">
                      Ya reclamado
                    </span>
                  ) : !isExpired ? (
                    <Link
                      to="/orders"
                      className="w-full rounded-xl bg-[#1E1B4B] hover:bg-[#FF2A5F] py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white transition-colors"
                    >
                      Usar en mi carrito
                    </Link>
                  ) : (
                    <span className="w-full rounded-xl bg-[#E2E8F0] py-2.5 text-center text-xs font-bold uppercase tracking-wider text-[#64748B]">
                      Cupón expirado
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
