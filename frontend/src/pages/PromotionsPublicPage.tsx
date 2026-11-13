import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, promotionsApi } from '@/api';
import { formatDate } from '@/utils/format';

export function PromotionsPublicPage() {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const promotionsQuery = useQuery({
    queryKey: ['promotions'],
    queryFn: () => promotionsApi.list(),
  });

  const activePromotions = useMemo(
    () => (promotionsQuery.data ?? []).filter((promotion) => promotion.isActive),
    [promotionsQuery.data],
  );

  const handleCopyCoupon = async (id: number, couponCode: string) => {
    try {
      await navigator.clipboard?.writeText(couponCode);
      setCopiedId(id);
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
        copyTimeoutRef.current = null;
      }, 2000);
    } catch {
      // Silenciar si clipboard no está disponible en el navegador
    }
  };

  return (
    <section data-testid="promotions-public-page" className="page-container py-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF2A5F]">
            Campañas y Cupones
          </span>
          <h1 className="mt-1 text-heading-sm font-black uppercase tracking-wide text-[#0F172A]">
            Ofertas y Descuentos
          </h1>
          <p className="mt-2 max-w-2xl text-body-sm text-[#475569]">
            Aplica estos cupones vigentes en tu carrito para obtener descuentos directos al finalizar
            tu compra.
          </p>
        </div>

        <Link to="/games">
          <Button variant="brand">Explorar catálogo</Button>
        </Link>
      </header>

      <div className="mt-10">
        {promotionsQuery.isLoading && <Spinner label="Cargando ofertas disponibles…" />}

        {promotionsQuery.isError && (
          <ErrorBanner
            message={errorMessage(promotionsQuery.error)}
            onRetry={() => void promotionsQuery.refetch()}
          />
        )}

        {promotionsQuery.isSuccess && activePromotions.length === 0 && (
          <EmptyState
            title="Sin ofertas activas por el momento"
            description="Los títulos del catálogo están disponibles a precio regular. Vuelve pronto para descubrir nuevas promociones."
            action={
              <Link to="/games">
                <Button variant="brand">Ver videojuegos</Button>
              </Link>
            }
          />
        )}

        {activePromotions.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {activePromotions.map((promotion) => (
              <article
                key={promotion.id}
                data-testid={`promotion-card-${promotion.id}`}
                className="product-card relative flex flex-col justify-between gap-5 overflow-hidden rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-6 shadow-xs"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#FFC700] via-[#FF2A5F] to-[#1E1B4B]"
                />

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-[#FFC700] px-2.5 py-1 text-xs font-black uppercase text-[#0F172A]">
                      -{Number(promotion.discountPercentage)}% OFF
                    </span>
                    <Badge tone="success">Activa</Badge>
                  </div>

                  <h2 className="text-lg font-extrabold text-[#0F172A]">{promotion.name}</h2>

                  <p className="text-xs text-[#475569]">
                    Vigencia: {formatDate(promotion.startDate)} → {formatDate(promotion.endDate)}
                  </p>

                  {promotion.couponCode && (
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-[#F4F4F6] border border-[#E2E8F0] px-3 py-2">
                      <span className="font-mono text-xs font-bold text-[#1E1B4B]">
                        Cupón: {promotion.couponCode}
                      </span>
                      <button
                        type="button"
                        data-testid={`promotion-copy-code-${promotion.id}`}
                        onClick={() =>
                          void handleCopyCoupon(promotion.id, promotion.couponCode!)
                        }
                        className="text-[11px] font-bold text-[#FF2A5F] hover:text-[#E01E4F]"
                      >
                        {copiedId === promotion.id ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  )}
                </div>

                <Link
                  to="/games"
                  className="w-full rounded-xl bg-[#1E1B4B] hover:bg-[#FF2A5F] py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white transition-colors"
                >
                  Usar en la tienda
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
