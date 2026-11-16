import { Link } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { RatingStars } from '@/components/atoms/RatingStars';
import type { Order, Promotion, Review, UserLibrary, Wishlist } from '@/types';
import { getActiveGameDiscount } from '@/utils/discount';
import { PAYMENT_STATUS_META } from '@/utils/domain';
import { formatCurrency, formatDate } from '@/utils/format';

export type ProfileTab = 'overview' | 'library' | 'orders' | 'wishlist' | 'reviews' | 'settings';

export interface UserProfileStats {
  libraries: UserLibrary[];
  wishlists: Wishlist[];
  reviews: Review[];
  orders: Order[];
  totalSpent: number;
  availableCoupons: Promotion[];
  totalCouponsCount: number;
}

interface UserProfileTabContentProps {
  activeTab: Exclude<ProfileTab, 'settings'>;
  stats: UserProfileStats;
  sortedOrders: Order[];
  isOwnProfile: boolean;
  couponsLoading: boolean;
  onSelectTab: (tab: ProfileTab) => void;
}

export function UserProfileTabContent({
  activeTab,
  stats,
  sortedOrders,
  isOwnProfile,
  couponsLoading,
  onSelectTab,
}: UserProfileTabContentProps) {
  if (activeTab === 'overview') {
    return (
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7 space-y-6">
          <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black uppercase tracking-wide text-[#0F172A]">
                  Tu Biblioteca
                </h2>
                <p className="text-xs text-[#64748B]">
                  Últimos videojuegos digitales adquiridos
                </p>
              </div>
              <div className="flex items-center gap-3">
                {stats.libraries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectTab('library')}
                    className="text-xs font-bold text-[#1E1B4B] hover:text-[#FF2A5F] transition-colors cursor-pointer"
                  >
                    Ver todo
                  </button>
                )}
                <Link to="/library" className="text-xs font-bold text-[#FF2A5F] hover:underline">
                  Mis llaves →
                </Link>
              </div>
            </div>

            {stats.libraries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center space-y-2">
                <p className="text-sm font-bold text-[#0F172A]">Tu biblioteca está vacía</p>
                <p className="text-xs text-[#64748B]">
                  Explora el catálogo y consigue tu primer juego digital con activación inmediata.
                </p>
                <Link to="/games" className="inline-block pt-1">
                  <Button variant="brand" size="sm">Explorar catálogo</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {stats.libraries.slice(0, 4).map((entry) => {
                  const game = entry.gameEdition?.game;
                  return (
                    <Link
                      key={entry.id}
                      to={game ? `/games/${game.id}` : '/library'}
                      className="group flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 transition-all hover:border-[#FF2A5F] hover:bg-[#FFFFFF]"
                    >
                      <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-[#E2E8F0]">
                        {game?.coverImageUrl ? (
                          <img
                            src={game.coverImageUrl}
                            alt={game.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-xs font-extrabold text-[#0F172A] group-hover:text-[#FF2A5F]">
                          {game?.title ?? 'Videojuego'}
                        </p>
                        <p className="truncate text-[11px] text-[#475569]">
                          {entry.gameEdition?.platform?.name ?? 'Digital'} · {entry.gameEdition?.editionName}
                        </p>
                        {entry.isRevoked ? (
                          <Badge tone="danger">Revocado</Badge>
                        ) : (
                          <Badge tone="success">Disponible</Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black uppercase tracking-wide text-[#0F172A]">
                  Órdenes Recientes
                </h2>
                <p className="text-xs text-[#64748B]">
                  Resumen de tus últimas transacciones
                </p>
              </div>
              {sortedOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectTab('orders')}
                  className="text-xs font-bold text-[#1E1B4B] hover:text-[#FF2A5F] transition-colors cursor-pointer"
                >
                  Ver todas →
                </button>
              )}
            </div>

            {sortedOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center space-y-1">
                <p className="text-sm font-bold text-[#0F172A]">Sin órdenes registradas</p>
                <p className="text-xs text-[#64748B]">
                  Tus compras aparecerán aquí con su recibo y llaves digitales.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedOrders.slice(0, 4).map((order) => {
                  const statusMeta = PAYMENT_STATUS_META[order.paymentStatus] ?? {
                    label: order.paymentStatus,
                    tone: 'neutral' as const,
                  };
                  return (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 transition-all hover:border-[#FF2A5F] hover:bg-[#FFFFFF]"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-[#0F172A]">
                            {order.orderNumber}
                          </span>
                          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                        </div>
                        <p className="text-[11px] text-[#64748B]">
                          {formatDate(order.createdAt)} · {order.items?.length ?? 0}{' '}
                          {(order.items?.length ?? 0) === 1 ? 'artículo' : 'artículos'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-[#1E1B4B]">
                          {formatCurrency(order.totalAmount)}
                        </span>
                        <span className="text-xs font-bold text-[#FF2A5F]">→</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="col-span-5 space-y-6">
          {isOwnProfile && (
            <section className="relative overflow-hidden rounded-2xl border border-[#1E1B4B] bg-[#1E1B4B] p-6 text-white shadow-sm space-y-4">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#FFC700] to-[#FF2A5F]"
              />
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FFC700]">
                    Beneficios de Cuenta
                  </span>
                  <h2 className="mt-0.5 text-base font-black uppercase tracking-wide">
                    Tus Cupones
                  </h2>
                </div>
                <Link
                  to="/my-coupons"
                  className="rounded-lg bg-white/15 hover:bg-[#FF2A5F] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors"
                >
                  Ver todos
                </Link>
              </div>

              {couponsLoading ? (
                <p className="text-xs text-indigo-200">Consultando cupones…</p>
              ) : stats.availableCoupons.length === 0 ? (
                <p className="text-xs text-indigo-200">
                  No tienes cupones pendientes por usar en este momento ({stats.totalCouponsCount} en historial).
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.availableCoupons.slice(0, 2).map((coupon) => (
                    <div
                      key={coupon.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">{coupon.name}</p>
                        <p className="text-[11px] text-indigo-200">
                          -{Number(coupon.discountPercentage)}% OFF · 1 uso por usuario
                        </p>
                      </div>
                      {coupon.couponCode && (
                        <span className="shrink-0 rounded-md bg-[#FFC700] px-2 py-1 font-mono text-[11px] font-black text-[#0F172A]">
                          {coupon.couponCode}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-black uppercase tracking-wide text-[#0F172A]">
                Wishlist
              </h2>
              <Link to="/wishlist" className="text-xs font-bold text-[#FF2A5F] hover:underline">
                Gestionar →
              </Link>
            </div>

            {stats.wishlists.length === 0 ? (
              <p className="text-xs text-[#64748B]">
                Aún no guardas videojuegos en tu lista de deseos.
              </p>
            ) : (
              <div className="space-y-2.5">
                {stats.wishlists.slice(0, 3).map((wish) => (
                  <Link
                    key={wish.id}
                    to={`/games/${wish.game?.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 transition-colors hover:border-[#FF2A5F]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#E2E8F0]">
                        {wish.game?.coverImageUrl ? (
                          <img
                            src={wish.game.coverImageUrl}
                            alt={wish.game.title}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <span className="truncate text-xs font-bold text-[#0F172A]">
                        {wish.game?.title ?? 'Videojuego'}
                      </span>
                    </div>
                    <Badge tone={wish.notifyOnSale ? 'blue' : 'neutral'}>
                      {wish.notifyOnSale ? 'Aviso oferta' : 'Guardado'}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-black uppercase tracking-wide text-[#0F172A]">
                Últimas Reseñas
              </h2>
              {stats.reviews.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectTab('reviews')}
                  className="text-xs font-bold text-[#1E1B4B] hover:text-[#FF2A5F] transition-colors cursor-pointer"
                >
                  Ver todas →
                </button>
              )}
            </div>

            {stats.reviews.length === 0 ? (
              <p className="text-xs text-[#64748B]">
                Todavía no has publicado reseñas en ningún título.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.reviews.slice(0, 2).map((review) => (
                  <article
                    key={review.id}
                    className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-[#0F172A] truncate">
                        {review.title}
                      </span>
                      <RatingStars value={review.rating} size={13} />
                    </div>
                    <p className="text-xs text-[#475569] line-clamp-2">{review.body}</p>
                    <p className="text-[11px] font-semibold text-[#64748B]">
                      {review.game?.title ?? 'Videojuego'} · {review.rating} de 5
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  if (activeTab === 'library') {
    return (
      <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wide text-[#0F172A]">
              Biblioteca ({stats.libraries.length})
            </h2>
            <p className="text-xs text-[#475569]">
              Todos los juegos digitales asociados a esta cuenta.
            </p>
          </div>
          <Link to="/library">
            <Button variant="brand" size="sm">Ir a Mi Biblioteca y Llaves</Button>
          </Link>
        </div>

        {stats.libraries.length === 0 ? (
          <EmptyState
            title="Sin juegos en la biblioteca"
            description="Cuando completes una compra, tus videojuegos y claves aparecerán aquí."
            action={
              <Link to="/games">
                <Button variant="brand" size="sm">Explorar tienda</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {stats.libraries.map((entry) => {
              const game = entry.gameEdition?.game;
              return (
                <article
                  key={entry.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] transition-all hover:border-[#FF2A5F] hover:bg-[#FFFFFF] hover:shadow-sm"
                >
                  <div className="aspect-[16/9] w-full overflow-hidden bg-[#1E1B4B]">
                    {game?.coverImageUrl ? (
                      <img
                        src={game.coverImageUrl}
                        alt={game.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded bg-[#1E1B4B] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          {entry.gameEdition?.platform?.name ?? 'Digital'}
                        </span>
                        {entry.isRevoked ? (
                          <Badge tone="danger">Revocado</Badge>
                        ) : (
                          <Badge tone="success">Activo</Badge>
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold text-[#0F172A]">
                        {game?.title ?? 'Videojuego'}
                      </h3>
                      <p className="text-xs text-[#475569]">
                        {entry.gameEdition?.editionName} · Adquirido el {formatDate(entry.acquiredAt)}
                      </p>
                    </div>

                    {game && (
                      <Link
                        to={`/games/${game.id}`}
                        className="w-full rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] py-2 text-center text-xs font-bold text-[#1E1B4B] transition-colors hover:bg-[#1E1B4B] hover:text-white"
                      >
                        Ver ficha del juego
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  if (activeTab === 'orders') {
    return (
      <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wide text-[#0F172A]">
              Órdenes ({sortedOrders.length})
            </h2>
            <p className="text-xs text-[#475569]">
              Consulta el detalle de cada orden, estado de pago y llaves entregadas.
            </p>
          </div>
          <Link to="/orders">
            <Button variant="outline" size="sm">Ir al carrito</Button>
          </Link>
        </div>

        {sortedOrders.length === 0 ? (
          <EmptyState
            title="Sin órdenes registradas"
            description="Todavía no realizas compras en la tienda."
            action={
              <Link to="/games">
                <Button variant="brand" size="sm">Ver videojuegos</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {sortedOrders.map((order) => {
              const statusMeta = PAYMENT_STATUS_META[order.paymentStatus] ?? {
                label: order.paymentStatus,
                tone: 'neutral' as const,
              };
              return (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 transition-all hover:border-[#FF2A5F] hover:bg-[#FFFFFF]"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-black text-[#0F172A]">
                        {order.orderNumber}
                      </span>
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    </div>
                    <p className="text-xs text-[#475569]">
                      Realizada el {formatDate(order.createdAt)} · {order.items?.length ?? 0}{' '}
                      {(order.items?.length ?? 0) === 1 ? 'producto' : 'productos'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-base font-black text-[#1E1B4B]">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    <span className="rounded-lg bg-[#1E1B4B] px-3 py-1.5 text-xs font-bold text-white">
                      Ver detalle →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  if (activeTab === 'wishlist') {
    return (
      <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wide text-[#0F172A]">
              Lista de Deseados ({stats.wishlists.length})
            </h2>
            <p className="text-xs text-[#475569]">
              Títulos guardados para seguir sus ofertas y disponibilidad.
            </p>
          </div>
          <Link to="/wishlist">
            <Button variant="outline" size="sm">Administrar Wishlist</Button>
          </Link>
        </div>

        {stats.wishlists.length === 0 ? (
          <EmptyState
            title="Tu Wishlist está vacía"
            description="Guarda tus juegos favoritos para enterarte cuando entren en descuento."
            action={
              <Link to="/games">
                <Button variant="brand" size="sm">Explorar catálogo</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {stats.wishlists.map((wish) => {
              const game = wish.game;
              const discount = game ? getActiveGameDiscount(game) : { hasDiscount: false, discountPercentage: 0 };
              return (
                <Link
                  key={wish.id}
                  to={`/games/${game?.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] transition-all hover:border-[#FF2A5F] hover:bg-[#FFFFFF]"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#1E1B4B]">
                    {game?.coverImageUrl ? (
                      <img
                        src={game.coverImageUrl}
                        alt={game.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : null}
                    {discount.hasDiscount && (
                      <span className="absolute top-2.5 right-2.5 rounded-md bg-[#FF2A5F] px-2 py-0.5 text-[11px] font-black text-white shadow-sm">
                        OFERTA -{discount.discountPercentage}%
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-extrabold text-[#0F172A] group-hover:text-[#FF2A5F]">
                        {game?.title ?? 'Videojuego'}
                      </h3>
                      <p className="text-xs text-[#64748B]">
                        Agregado el {formatDate(wish.addedAt)}
                      </p>
                    </div>
                    <Badge tone={wish.notifyOnSale ? 'blue' : 'neutral'}>
                      {wish.notifyOnSale ? 'Aviso de oferta' : 'Sin aviso'}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-5">
      <div className="border-b border-[#E2E8F0] pb-4">
        <h2 className="text-lg font-black uppercase tracking-wide text-[#0F172A]">
          Reseñas Publicadas ({stats.reviews.length})
        </h2>
        <p className="text-xs text-[#475569]">
          Opiniones y calificaciones compartidas en los títulos de la tienda.
        </p>
      </div>

      {stats.reviews.length === 0 ? (
        <EmptyState
          title="Aún no has escrito reseñas"
          description="Comparte tu opinión en la ficha de cualquier videojuego que hayas probado."
          action={
            <Link to="/games">
              <Button variant="brand" size="sm">Ver videojuegos</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {stats.reviews.map((review) => (
            <article
              key={review.id}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5"
            >
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {review.game ? (
                    <Link
                      to={`/games/${review.game.id}`}
                      className="text-xs font-black uppercase tracking-wider text-[#1E1B4B] hover:text-[#FF2A5F]"
                    >
                      {review.game.title}
                    </Link>
                  ) : (
                    <span className="text-xs font-bold text-[#64748B]">Videojuego</span>
                  )}
                  <RatingStars value={review.rating} size={15} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-extrabold text-[#0F172A]">{review.title}</h3>
                  {review.isVerifiedPurchase && (
                    <Badge tone="success">Compra verificada</Badge>
                  )}
                </div>

                <p className="text-sm text-[#475569] leading-relaxed">{review.body}</p>
              </div>

              <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-3 text-xs text-[#64748B]">
                <span>{review.rating} de 5 estrellas</span>
                <span>{formatDate(review.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
