import { useMemo } from 'react';
import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { Badge } from '@/components/atoms/Badge';
import { promotionsApi } from '@/api';
import type { CreatePromotionPayload, Promotion } from '@/types';
import { formatDate } from '@/utils/format';
import { getCouponStatus } from '@/utils/discount';
import { VALIDATION_PATTERNS, type FieldConfig } from '@/utils/fields';

function toLocalDateTimeInput(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function PromotionsPage({ embedded = false }: { embedded?: boolean }) {
  const fields = useMemo<FieldConfig[]>(
    () => [
      {
        name: 'name',
        label: 'Campaña / Descripción',
        type: 'text',
        required: true,
        maxLength: 150,
        pattern: VALIDATION_PATTERNS.ENTITY_NAME,
        patternMessage: 'El nombre de campaña contiene caracteres no válidos',
      },
      {
        name: 'couponCode',
        label: 'Código de cupón',
        type: 'text',
        required: true,
        minLength: 2,
        maxLength: 50,
        pattern: VALIDATION_PATTERNS.COUPON_CODE,
        patternMessage: 'El cupón solo permite letras, números, guiones y guion bajo (sin espacios)',
        placeholder: 'Ej. VERANO25',
        help: 'Obligatorio. Se valida en el checkout para aplicar el descuento',
      },
      {
        name: 'discountPercentage',
        label: 'Descuento (%)',
        type: 'number',
        required: true,
        min: 1,
        max: 100,
        step: 0.01,
      },
      { name: 'startDate', label: 'Inicio', type: 'datetime', required: true, notBeforeToday: true },
      {
        name: 'endDate',
        label: 'Fin',
        type: 'datetime',
        required: true,
        notBeforeToday: true,
        afterField: 'startDate',
      },
      { name: 'isActive', label: 'Activo', type: 'checkbox', defaultValue: true },
    ],
    [],
  );

  return (
    <CrudResourcePage<Promotion, CreatePromotionPayload>
      embedded={embedded}
      title="Cupones de Descuento"
      description="Códigos de descuento aplicables por los clientes en el checkout dentro de su vigencia."
      queryKey={['promotions']}
      fetchList={() => promotionsApi.list()}
      createItem={(payload) => promotionsApi.create(payload)}
      updateItem={(id, payload) => promotionsApi.update(id, payload)}
      deleteItem={(id) => promotionsApi.remove(id)}
      fields={fields}
      columns={[
        { header: 'Campaña', render: (promotion) => promotion.name },
        {
          header: 'Código de Cupón',
          className: 'font-mono font-bold text-[#1E1B4B]',
          render: (promotion) => promotion.couponCode ?? '—',
        },
        {
          header: 'Descuento',
          render: (promotion) => `${Number(promotion.discountPercentage)}%`,
        },
        {
          header: 'Vigencia',
          className: 'text-fog',
          render: (promotion) => `${formatDate(promotion.startDate)} → ${formatDate(promotion.endDate)}`,
        },
        {
          header: 'Estado',
          render: (promotion) => {
            if (!promotion.isActive) {
              return <Badge tone="neutral">Inactivo</Badge>;
            }
            if (getCouponStatus(promotion).status === 'expired') {
              return <Badge tone="danger">Expirado</Badge>;
            }
            return <Badge tone="success">Activo</Badge>;
          },
        },
      ]}
      toFormValues={(promotion) => ({
        name: promotion.name,
        discountPercentage: Number(promotion.discountPercentage),
        couponCode: promotion.couponCode ?? '',
        startDate: toLocalDateTimeInput(promotion.startDate),
        endDate: toLocalDateTimeInput(promotion.endDate),
        isActive: promotion.isActive,
      })}
      getId={(promotion) => promotion.id}
    />
  );
}
