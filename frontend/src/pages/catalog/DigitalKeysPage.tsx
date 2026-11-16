import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { Modal } from '@/components/atoms/Modal';
import { Select } from '@/components/atoms/Select';
import { Textarea } from '@/components/atoms/Textarea';
import { digitalKeysApi, digitalKeysExtraApi, errorMessage, gameEditionsApi } from '@/api';
import { KeyStatus, type CreateDigitalKeyPayload, type DigitalKey } from '@/types';
import { formatDateTime, humanizeEnum } from '@/utils/format';
import { VALIDATION_PATTERNS, type FieldConfig } from '@/utils/fields';

export function DigitalKeysPage({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const editionParam = searchParams.get('editionId') ?? '';
  const [editionFilter, setEditionFilter] = useState<string>(editionParam);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'auto' | 'manual'>('auto');
  const [bulkEditionId, setBulkEditionId] = useState<string>(editionParam);
  const [bulkQuantity, setBulkQuantity] = useState<string>('10');
  const [bulkCodesText, setBulkCodesText] = useState<string>('');
  const [bulkBatchId, setBulkBatchId] = useState<string>('');
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const editionsQuery = useQuery({
    queryKey: ['game-editions'],
    queryFn: () => gameEditionsApi.list(),
  });

  const invalidateKeyData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['digital-keys'] }),
      queryClient.invalidateQueries({ queryKey: ['game-editions'] }),
      queryClient.invalidateQueries({ queryKey: ['games'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'summary'] }),
    ]);
  };

  const bulkMutation = useMutation({
    mutationFn: () => {
      const gameEditionId = Number(bulkEditionId);
      if (!gameEditionId) {
        throw new Error('Selecciona una edición digital');
      }
      if (bulkMode === 'manual') {
        const codes = bulkCodesText
          .split(/[\n,;]+/)
          .map((code) => code.trim())
          .filter(Boolean);
        return digitalKeysExtraApi.createBulk({
          gameEditionId,
          codes,
          batchId: bulkBatchId.trim() || undefined,
        });
      }
      const quantity = Number(bulkQuantity);
      return digitalKeysExtraApi.createBulk({
        gameEditionId,
        quantity,
        batchId: bulkBatchId.trim() || undefined,
      });
    },
    onSuccess: async (result) => {
      await invalidateKeyData();
      setBulkFeedback(`Se registraron ${result.createdCount} claves en el lote ${result.batchId}.`);
      setBulkError(null);
      setIsBulkOpen(false);
      setBulkCodesText('');
      setBulkBatchId('');
    },
    onError: (error) => {
      setBulkError(errorMessage(error));
    },
  });

  const handleBulkSubmit = () => {
    setBulkError(null);
    const gameEditionId = Number(bulkEditionId);
    if (!Number.isInteger(gameEditionId) || gameEditionId < 1) {
      setBulkError('Selecciona una edición digital');
      return;
    }

    const trimmedBatch = bulkBatchId.trim();
    if (trimmedBatch && !VALIDATION_PATTERNS.BATCH_ID.test(trimmedBatch)) {
      setBulkError(
        'El identificador de lote solo permite letras, números, guiones y guion bajo (2 a 50 caracteres).',
      );
      return;
    }

    if (bulkMode === 'manual') {
      const codes = bulkCodesText
        .split(/[\n,;]+/)
        .map((code) => code.trim())
        .filter(Boolean);
      if (codes.length === 0) {
        setBulkError('Ingresa al menos una clave digital.');
        return;
      }
      if (codes.some((code) => !VALIDATION_PATTERNS.DIGITAL_KEY_CODE.test(code))) {
        setBulkError(
          'Cada clave debe tener formato alfanumérico separado por guiones (ej. ABCD-EFGH-IJKL-MNOP).',
        );
        return;
      }
      if (new Set(codes.map((code) => code.toUpperCase())).size !== codes.length) {
        setBulkError('La lista contiene códigos duplicados.');
        return;
      }
    } else {
      const trimmedQty = bulkQuantity.trim();
      if (!/^\d+$/.test(trimmedQty)) {
        setBulkError('La cantidad debe ser un número entero entre 1 y 100.');
        return;
      }
      const quantity = Number(trimmedQty);
      if (quantity < 1 || quantity > 100) {
        setBulkError('La cantidad debe estar entre 1 y 100.');
        return;
      }
    }

    bulkMutation.mutate();
  };

  const editions = useMemo(() => editionsQuery.data ?? [], [editionsQuery.data]);

  const editionOptions = useMemo(
    () =>
      editions.map((edition) => ({
        value: edition.id,
        label: `${edition.game?.title ?? 'Juego'} · ${edition.platform?.name ?? ''} · ${edition.editionName}`,
      })),
    [editions],
  );

  const fields = useMemo<FieldConfig[]>(
    () => [
      {
        name: 'gameEditionId',
        label: 'Edición digital',
        type: 'select',
        required: true,
        options: editionOptions,
      },
      {
        name: 'code',
        label: 'Código de la llave (opcional)',
        type: 'text',
        maxLength: 255,
        pattern: VALIDATION_PATTERNS.DIGITAL_KEY_CODE,
        patternMessage: 'Formato de clave inválido (ej. XXXX-XXXX-XXXX-XXXX)',
        placeholder: 'Ej. XXXX-XXXX-XXXX-XXXX (vacío = autogenerado)',
        help: 'Si lo dejas vacío, el servidor genera el código y calcula su hash SHA-256 automáticamente.',
      },
      {
        name: 'status',
        label: 'Estado',
        type: 'select',
        options: [
          { value: KeyStatus.AVAILABLE, label: 'Disponible' },
          { value: KeyStatus.RESERVED, label: 'Reservada' },
          { value: KeyStatus.ASSIGNED, label: 'Asignada' },
          { value: KeyStatus.REVOKED, label: 'Revocada' },
        ],
        defaultValue: KeyStatus.AVAILABLE,
      },
      {
        name: 'batchId',
        label: 'Lote',
        type: 'text',
        maxLength: 50,
        pattern: VALIDATION_PATTERNS.BATCH_ID,
        patternMessage: 'El lote solo permite letras, números, guiones y guion bajo (2 a 50 caracteres)',
      },
    ],
    [editionOptions],
  );

  const handleEditionFilterChange = (nextValue: string) => {
    setEditionFilter(nextValue);
    const nextParams = new URLSearchParams(searchParams);
    if (nextValue) {
      nextParams.set('editionId', nextValue);
    } else {
      nextParams.delete('editionId');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const openBulkModal = () => {
    setBulkError(null);
    setBulkEditionId(editionFilter || (editions[0] ? String(editions[0].id) : ''));
    setIsBulkOpen(true);
  };

  return (
    <>
      <CrudResourcePage<DigitalKey, CreateDigitalKeyPayload>
        embedded={embedded}
        title="Claves Digitales"
        description="Inventario de códigos digitales que el backend asigna al completar órdenes. Genera lotes en segundos sin hashes manuales."
        queryKey={['digital-keys']}
        fetchList={() => digitalKeysApi.list()}
        createItem={async (payload) => {
          const created = await digitalKeysApi.create(payload);
          await invalidateKeyData();
          return created;
        }}
        updateItem={async (id, payload) => {
          const updated = await digitalKeysApi.update(id, payload);
          await invalidateKeyData();
          return updated;
        }}
        deleteItem={async (id) => {
          const removed = await digitalKeysApi.remove(id);
          await invalidateKeyData();
          return removed;
        }}
        headerActions={
          <Button
            variant="outline"
            data-testid="digital-keys-bulk-btn"
            onClick={openBulkModal}
          >
            Generar / Cargar Lote
          </Button>
        }
        filterControls={
          <div className="mb-4 space-y-3">
            {bulkFeedback && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-body-sm font-medium text-[#065F46]">
                <span>{bulkFeedback}</span>
                <button
                  type="button"
                  onClick={() => setBulkFeedback(null)}
                  className="text-xs font-bold underline"
                >
                  Ocultar
                </button>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-4">
              <Select
                label="Filtrar por edición"
                value={editionFilter}
                onChange={(event) => handleEditionFilterChange(event.target.value)}
                placeholder="Todas las ediciones"
                options={editionOptions}
              />
              <Select
                label="Filtrar por estado"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                placeholder="Todos los estados"
                options={[
                  { value: KeyStatus.AVAILABLE, label: 'Disponible' },
                  { value: KeyStatus.RESERVED, label: 'Reservada' },
                  { value: KeyStatus.ASSIGNED, label: 'Asignada' },
                  { value: KeyStatus.REVOKED, label: 'Revocada' },
                ]}
              />
            </div>
          </div>
        }
        transformItems={(items) =>
          items.filter((item) => {
            if (editionFilter && String(item.gameEdition?.id ?? '') !== editionFilter) {
              return false;
            }
            if (statusFilter && item.status !== statusFilter) {
              return false;
            }
            return true;
          })
        }
        fields={fields}
        columns={[
          {
            header: 'Código',
            render: (key) => <span className="font-mono text-caption">{key.code}</span>,
          },
          {
            header: 'Edición',
            className: 'text-fog',
            render: (key) =>
              key.gameEdition
                ? `${key.gameEdition.game?.title ?? 'Juego'} · ${key.gameEdition.platform?.name ?? ''} · ${key.gameEdition.editionName}`
                : '—',
          },
          {
            header: 'Estado',
            render: (key) => (
              <Badge
                tone={
                  key.status === KeyStatus.AVAILABLE
                    ? 'success'
                    : key.status === KeyStatus.ASSIGNED
                      ? 'blue'
                      : key.status === KeyStatus.REVOKED
                        ? 'danger'
                        : 'warning'
                }
              >
                {humanizeEnum(key.status)}
              </Badge>
            ),
          },
          { header: 'Lote', className: 'text-fog', render: (key) => key.batchId ?? '—' },
          {
            header: 'Actualizada',
            className: 'text-fog',
            render: (key) => formatDateTime(key.updatedAt),
          },
        ]}
        toFormValues={(key) => ({
          code: key.code,
          status: key.status,
          batchId: key.batchId ?? '',
          gameEditionId: key.gameEdition?.id ?? '',
        })}
        getId={(key) => key.id}
      />

      <Modal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="Generar o cargar lote de claves digitales"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsBulkOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="brand"
              data-testid="digital-keys-bulk-submit"
              isLoading={bulkMutation.isPending}
              onClick={handleBulkSubmit}
            >
              Generar claves
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {bulkError && <ErrorBanner message={bulkError} />}

          <Select
            label="Edición digital"
            value={bulkEditionId}
            onChange={(event) => setBulkEditionId(event.target.value)}
            placeholder="Selecciona una edición"
            options={editionOptions}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={bulkMode === 'auto' ? 'brand' : 'outline'}
              onClick={() => setBulkMode('auto')}
            >
              Generar automáticamente
            </Button>
            <Button
              type="button"
              size="sm"
              variant={bulkMode === 'manual' ? 'brand' : 'outline'}
              onClick={() => setBulkMode('manual')}
            >
              Pegar lista de claves
            </Button>
          </div>

          {bulkMode === 'auto' ? (
            <Input
              label="Cantidad de claves a generar (1 - 100)"
              type="number"
              min={1}
              max={100}
              value={bulkQuantity}
              onChange={(event) => setBulkQuantity(event.target.value.replace(/\D/g, ''))}
            />
          ) : (
            <Textarea
              label="Códigos de activación (uno por línea o separados por coma)"
              rows={5}
              placeholder={'ABCD-EFGH-IJKL-MNOP\nQRST-UVWX-YZ23-4567'}
              value={bulkCodesText}
              onChange={(event) => setBulkCodesText(event.target.value)}
            />
          )}

          <Input
            label="Identificador de lote (opcional)"
            placeholder="Ej. LAUNCH-2026 (vacío = automático)"
            value={bulkBatchId}
            onChange={(event) => setBulkBatchId(event.target.value)}
          />
        </div>
      </Modal>
    </>
  );
}
