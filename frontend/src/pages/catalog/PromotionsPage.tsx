import { useMemo } from 'react';
import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { Badge } from '@/components/atoms/Badge';
import { promotionsApi } from '@/api';
import type { CreatePromotionPayload, Promotion } from '@/types';
import { formatDate } from '@/utils/format';
import type { FieldConfig } from '@/utils/fields';

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
      { name: 'name', label: 'Nombre', type: 'text', required: true, maxLength: 150 },
      {
        name: 'discountPercentage',
        label: 'Descuento (%)',
        type: 'number',
        required: true,
        min: 0,
        max: 100,
        step: 0.01,
      },
      {
        name: 'couponCode',
        label: 'Código de cupón',
        type: 'text',
        maxLength: 50,
        help: 'Se usa en el checkout para aplicar el descuento',
      },
      { name: 'startDate', label: 'Inicio', type: 'datetime', required: true },
      { name: 'endDate', label: 'Fin', type: 'datetime', required: true },
      { name: 'isActive', label: 'Activa', type: 'checkbox', defaultValue: true },
    ],
    [],
  );

  return (
    <CrudResourcePage<Promotion, CreatePromotionPayload>
      embedded={embedded}
      title="Promociones"
      description="Cupones de descuento aplicables al crear órdenes. Solo se aceptan si están activos."
      queryKey={['promotions']}
      fetchList={() => promotionsApi.list()}
      createItem={(payload) => promotionsApi.create(payload)}
      updateItem={(id, payload) => promotionsApi.update(id, payload)}
      deleteItem={(id) => promotionsApi.remove(id)}
      fields={fields}
      columns={[
        { header: 'Nombre', render: (promotion) => promotion.name },
        {
          header: 'Descuento',
          render: (promotion) => `${Number(promotion.discountPercentage)}%`,
        },
        {
          header: 'Cupón',
          className: 'text-fog',
          render: (promotion) => promotion.couponCode ?? '—',
        },
        {
          header: 'Vigencia',
          className: 'text-fog',
          render: (promotion) => `${formatDate(promotion.startDate)} → ${formatDate(promotion.endDate)}`,
        },
        {
          header: 'Estado',
          render: (promotion) => (
            <Badge tone={promotion.isActive ? 'success' : 'neutral'}>
              {promotion.isActive ? 'Activa' : 'Inactiva'}
            </Badge>
          ),
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
