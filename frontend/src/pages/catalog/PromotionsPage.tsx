import { useMemo } from 'react';
import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { Badge } from '@/components/atoms/Badge';
import { promotionsApi } from '@/api';
import type { CreatePromotionPayload, Promotion } from '@/types';
import { formatDate } from '@/utils/format';
import type { FieldConfig } from '@/utils/fields';

export function PromotionsPage() {
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
        startDate: new Date(promotion.startDate).toISOString().slice(0, 16),
        endDate: new Date(promotion.endDate).toISOString().slice(0, 16),
        isActive: promotion.isActive,
      })}
      getId={(promotion) => promotion.id}
    />
  );
}
