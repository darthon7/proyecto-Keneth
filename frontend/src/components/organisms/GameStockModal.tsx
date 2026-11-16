import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Checkbox } from '@/components/atoms/Checkbox';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { Modal } from '@/components/atoms/Modal';
import { Select } from '@/components/atoms/Select';
import { digitalKeysExtraApi, errorMessage, gameEditionsApi } from '@/api';
import type { Game, Platform } from '@/types';
import { countAvailableKeys } from '@/utils/domain';
import { formatCurrency } from '@/utils/format';
import { quickEditionSchema, type QuickEditionFormValues } from '@/utils/schemas';

const DEFAULT_QUICK_EDITION: QuickEditionFormValues = {
  editionName: 'Standard Edition',
  platformId: '',
  basePrice: '59.99',
  keysQty: '10',
  isDlc: false,
};

interface GameStockModalProps {
  stockGame: Game | null;
  platforms: Platform[];
  onClose: () => void;
  onInvalidate: () => Promise<void>;
}

export function GameStockModal({
  stockGame,
  platforms,
  onClose,
  onInvalidate,
}: GameStockModalProps) {
  const [batchQuantities, setBatchQuantities] = useState<Record<number, string>>({});
  const [stockFeedback, setStockFeedback] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);

  const editionForm = useForm<QuickEditionFormValues>({
    resolver: zodResolver(quickEditionSchema),
    defaultValues: DEFAULT_QUICK_EDITION,
  });

  const { reset: resetEditionForm } = editionForm;
  const { errors: editionErrors } = editionForm.formState;

  useEffect(() => {
    setStockFeedback(null);
    setStockError(null);
    resetEditionForm(DEFAULT_QUICK_EDITION);
  }, [stockGame?.id, resetEditionForm]);

  const bulkKeysMutation = useMutation({
    mutationFn: ({ gameEditionId, quantity }: { gameEditionId: number; quantity: number }) =>
      digitalKeysExtraApi.createBulk({ gameEditionId, quantity }),
    onSuccess: async (result) => {
      await onInvalidate();
      setStockError(null);
      setStockFeedback(
        `Se generaron ${result.createdCount} claves disponibles (lote ${result.batchId}).`,
      );
    },
    onError: (error) => setStockError(errorMessage(error)),
  });

  const addEditionMutation = useMutation({
    mutationFn: async (values: QuickEditionFormValues) => {
      if (!stockGame) {
        throw new Error('Videojuego no seleccionado');
      }
      const edition = await gameEditionsApi.create({
        editionName: values.editionName,
        basePrice: Number(values.basePrice),
        isDlc: values.isDlc,
        gameId: stockGame.id,
        platformId: Number(values.platformId),
      });
      const qty = Number(values.keysQty);
      let createdKeys = 0;
      if (qty > 0) {
        const res = await digitalKeysExtraApi.createBulk({
          gameEditionId: edition.id,
          quantity: qty,
        });
        createdKeys = res.createdCount;
      }
      return { edition, createdKeys };
    },
    onSuccess: async ({ edition, createdKeys }) => {
      await onInvalidate();
      setStockError(null);
      setStockFeedback(
        createdKeys > 0
          ? `Edición «${edition.editionName}» creada con ${createdKeys} claves digitales disponibles.`
          : `Edición «${edition.editionName}» creada correctamente.`,
      );
      resetEditionForm({
        ...editionForm.getValues(),
        editionName: 'Standard Edition',
        isDlc: false,
      });
    },
    onError: (error) => setStockError(errorMessage(error)),
  });

  const handleAddEdition = editionForm.handleSubmit((values) => {
    setStockError(null);
    addEditionMutation.mutate(values);
  });

  return (
    <Modal
      isOpen={stockGame !== null}
      onClose={onClose}
      title={stockGame ? `Stock y Claves · ${stockGame.title}` : 'Stock y Claves'}
      size="lg"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {stockGame && (
        <div className="space-y-6">
          {stockError && <ErrorBanner message={stockError} />}
          {stockFeedback && (
            <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-body-sm font-medium text-[#065F46]">
              {stockFeedback}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-body-sm font-extrabold uppercase tracking-wider text-[#0F172A]">
              Ediciones digitales registradas
            </h3>

            {(stockGame.editions ?? []).length === 0 ? (
              <p className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-body-sm text-[#475569]">
                Este título aún no tiene ediciones digitales. Crea la primera abajo.
              </p>
            ) : (
              <div className="space-y-3">
                {(stockGame.editions ?? []).map((edition) => {
                  const keys = edition.digitalKeys ?? [];
                  const available = countAvailableKeys(edition);
                  const qtyValue = batchQuantities[edition.id] ?? '10';

                  return (
                    <div
                      key={edition.id}
                      className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-[#0F172A]">
                            {edition.editionName}
                          </span>
                          <Badge tone={edition.isDlc ? 'warning' : 'blue'}>
                            {edition.isDlc ? 'DLC Digital' : edition.platform?.name ?? 'Digital'}
                          </Badge>
                          <Badge tone={available > 0 ? 'success' : 'danger'}>
                            {available} disponibles / {keys.length} total
                          </Badge>
                        </div>
                        <p className="text-xs text-[#475569]">
                          Plataforma: {edition.platform?.name ?? '—'} · Precio:{' '}
                          {formatCurrency(edition.basePrice)}
                        </p>
                      </div>

                      <div className="flex items-end gap-2 shrink-0">
                        <div className="w-24">
                          <Input
                            label="Cantidad"
                            type="number"
                            min={1}
                            max={100}
                            value={qtyValue}
                            onChange={(event) =>
                              setBatchQuantities((prev) => ({
                                ...prev,
                                [edition.id]: event.target.value.replace(/\D/g, ''),
                              }))
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="brand"
                          isLoading={bulkKeysMutation.isPending}
                          onClick={() => {
                            const trimmedQty = qtyValue.trim();
                            if (
                              !/^\d+$/.test(trimmedQty) ||
                              Number(trimmedQty) < 1 ||
                              Number(trimmedQty) > 100
                            ) {
                              setStockError('La cantidad de claves debe ser un entero entre 1 y 100.');
                              return;
                            }
                            setStockError(null);
                            bulkKeysMutation.mutate({
                              gameEditionId: edition.id,
                              quantity: Number(trimmedQty),
                            });
                          }}
                        >
                          Generar lote
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <form
            onSubmit={handleAddEdition}
            className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 space-y-3"
            noValidate
          >
            <h3 className="text-body-sm font-extrabold uppercase tracking-wider text-[#0F172A]">
              + Añadir nueva edición digital
            </h3>
            <div className="grid gap-3 grid-cols-2">
              <Input
                label="Nombre de edición"
                error={editionErrors.editionName?.message}
                {...editionForm.register('editionName')}
              />
              <Select
                label="Plataforma"
                placeholder="Selecciona plataforma"
                options={platforms.map((platform) => ({
                  value: platform.id,
                  label: platform.name,
                }))}
                error={editionErrors.platformId?.message}
                {...editionForm.register('platformId')}
              />
              <Input
                label="Precio"
                type="number"
                step="0.01"
                min="0"
                error={editionErrors.basePrice?.message}
                {...editionForm.register('basePrice', {
                  onChange: (event) => {
                    const clean = event.target.value.replace(/[^0-9.]/g, '');
                    if (event.target.value !== clean) {
                      editionForm.setValue('basePrice', clean, {
                        shouldValidate: editionForm.formState.isSubmitted,
                      });
                    }
                  },
                })}
              />
              <Input
                label="Claves iniciales (0 - 100)"
                type="number"
                min="0"
                max="100"
                error={editionErrors.keysQty?.message}
                {...editionForm.register('keysQty', {
                  onChange: (event) => {
                    const clean = event.target.value.replace(/\D/g, '');
                    if (event.target.value !== clean) {
                      editionForm.setValue('keysQty', clean, {
                        shouldValidate: editionForm.formState.isSubmitted,
                      });
                    }
                  },
                })}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <Checkbox label="Es DLC digital" {...editionForm.register('isDlc')} />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                isLoading={addEditionMutation.isPending}
              >
                Crear edición y claves
              </Button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}
