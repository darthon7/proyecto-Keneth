import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { errorMessage, gamesApi, gamesExtraApi } from '@/api';
import { getActiveGameDiscount } from '@/utils/discount';
import { formatCurrency, formatDate } from '@/utils/format';

export function DiscountCampaignsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [campaignName, setCampaignName] = useState('Campaña de Ofertas');
  const [discountPercent, setDiscountPercent] = useState('25');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const gamesQuery = useQuery({
    queryKey: ['games'],
    queryFn: () => gamesApi.list(),
  });

  const filteredGames = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = gamesQuery.data ?? [];
    if (!q) return list;
    return list.filter(
      (game) =>
        game.title.toLowerCase().includes(q) ||
        (game.publisher?.name ?? '').toLowerCase().includes(q) ||
        (game.discountCampaignName ?? '').toLowerCase().includes(q),
    );
  }, [gamesQuery.data, searchTerm]);

  const applyCampaignMutation = useMutation({
    mutationFn: (payload: {
      gameIds: number[];
      discountCampaignName?: string;
      discountPercentage: number;
      discountStartDate?: string;
      discountEndDate?: string;
    }) => gamesExtraApi.applyDiscountCampaign(payload),
    onSuccess: async (result) => {
      setValidationError(null);
      setFeedback(
        result.discountPercentage > 0
          ? `Campaña "${result.discountCampaignName}" (-${result.discountPercentage}%) aplicada a ${result.updatedCount} juego(s).`
          : `Se retiró la campaña de descuento de ${result.updatedCount} juego(s).`,
      );
      setSelectedIds([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['games'] }),
        queryClient.invalidateQueries({ queryKey: ['game-editions'] }),
      ]);
    },
  });

  const toggleGame = (gameId: number) => {
    setSelectedIds((prev) =>
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId],
    );
  };

  const selectAllVisible = () => {
    const visibleIds = filteredGames.map((g) => g.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleApply = (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    setValidationError(null);

    if (selectedIds.length === 0) {
      setValidationError('Selecciona al menos un videojuego para aplicar la campaña.');
      return;
    }

    const pct = Number(discountPercent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 95) {
      setValidationError('Ingresa un porcentaje de descuento válido entre 1% y 95%.');
      return;
    }

    applyCampaignMutation.mutate({
      gameIds: selectedIds,
      discountCampaignName: campaignName.trim() || 'Campaña de Ofertas',
      discountPercentage: pct,
      discountStartDate: startDate ? new Date(startDate).toISOString() : undefined,
      discountEndDate: endDate ? new Date(endDate).toISOString() : undefined,
    });
  };

  const handleClearCampaign = () => {
    setFeedback(null);
    setValidationError(null);
    if (selectedIds.length === 0) {
      setValidationError('Selecciona al menos un videojuego para retirar su descuento.');
      return;
    }
    applyCampaignMutation.mutate({
      gameIds: selectedIds,
      discountPercentage: 0,
    });
  };

  const previewPct = Number(discountPercent);

  return (
    <div data-testid="admin-discount-campaigns-page" className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF2A5F]">
            Merchandising y Ofertas
          </span>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0F172A]">
            Campañas de Descuento en Videojuegos
          </h1>
          <p className="mt-1 text-body-sm text-[#475569]">
            Selecciona varios juegos y aplícales un descuento directo de campaña. Aparecerán con
            etiqueta <strong className="text-[#FF2A5F]">OFERTA</strong> y precio rebajado en la
            tienda.
          </p>
        </div>
      </header>

      {feedback && (
        <div className="rounded-xl border border-[#10B981]/30 bg-[#D1FAE5] px-4 py-3 text-body-sm font-semibold text-[#065F46]">
          {feedback}
        </div>
      )}

      {validationError && <ErrorBanner message={validationError} />}
      {applyCampaignMutation.isError && (
        <ErrorBanner message={errorMessage(applyCampaignMutation.error)} />
      )}

      <form
        onSubmit={handleApply}
        className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-xs space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Nombre de la campaña"
            value={campaignName}
            onChange={(event) => setCampaignName(event.target.value)}
            placeholder="Ej. Ofertas de Fin de Semana"
          />
          <Input
            label="Descuento (%)"
            type="number"
            min={1}
            max={95}
            value={discountPercent}
            onChange={(event) => setDiscountPercent(event.target.value)}
            placeholder="25"
          />
          <Input
            label="Inicio (opcional)"
            type="datetime-local"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Input
            label="Fin (opcional)"
            type="datetime-local"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E2E8F0]">
          <p className="text-body-sm font-semibold text-[#1E1B4B]">
            Juegos seleccionados:{' '}
            <span className="inline-flex items-center rounded-full bg-[#FFC700] px-2.5 py-0.5 text-xs font-black text-[#0F172A]">
              {selectedIds.length}
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={selectedIds.length === 0 || applyCampaignMutation.isPending}
              onClick={handleClearCampaign}
            >
              Quitar descuento
            </Button>
            <Button
              type="submit"
              variant="brand"
              data-testid="admin-apply-campaign-btn"
              isLoading={applyCampaignMutation.isPending}
              disabled={selectedIds.length === 0}
            >
              Aplicar campaña a {selectedIds.length} juego(s)
            </Button>
          </div>
        </div>
      </form>

      <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="w-full sm:max-w-xs">
            <Input
              label="Filtrar videojuegos"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por título, publisher o campaña…"
            />
          </div>
          <div className="flex items-center gap-2 pt-4 sm:pt-0">
            <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
              Seleccionar visibles ({filteredGames.length})
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={selectedIds.length === 0}
              onClick={() => setSelectedIds([])}
            >
              Limpiar selección
            </Button>
          </div>
        </div>

        {gamesQuery.isLoading && <Spinner label="Cargando catálogo de videojuegos…" />}
        {gamesQuery.isError && (
          <ErrorBanner
            message={errorMessage(gamesQuery.error)}
            onRetry={() => void gamesQuery.refetch()}
          />
        )}

        {gamesQuery.isSuccess && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[11px] font-mono uppercase tracking-wider text-[#64748B]">
                  <th className="py-2.5 pr-3">Sel.</th>
                  <th className="py-2.5 pr-3">Videojuego</th>
                  <th className="py-2.5 pr-3">Precio base</th>
                  <th className="py-2.5 pr-3">Campaña actual</th>
                  <th className="py-2.5">Vista previa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredGames.map((game) => {
                  const isSelected = selectedIds.includes(game.id);
                  const activeDiscount = getActiveGameDiscount(game);
                  const prices = (game.editions ?? [])
                    .map((e) => Number(e.basePrice))
                    .filter((p) => Number.isFinite(p));
                  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
                  const previewPrice =
                    minPrice !== null && Number.isFinite(previewPct) && previewPct > 0
                      ? Number((minPrice * (1 - previewPct / 100)).toFixed(2))
                      : null;

                  return (
                    <tr
                      key={game.id}
                      onClick={() => toggleGame(game.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#FFF1F2]/70' : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <td className="py-3 pr-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar ${game.title}`}
                          checked={isSelected}
                          onChange={() => toggleGame(game.id)}
                          className="h-4 w-4 rounded border-[#CBD5E1] text-[#FF2A5F] focus:ring-[#FF2A5F]"
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-bold text-[#0F172A]">{game.title}</p>
                        <p className="text-xs text-[#64748B]">
                          {game.publisher?.name ?? 'Sin publisher'}
                        </p>
                      </td>
                      <td className="py-3 pr-3 tabular-nums font-semibold text-[#0F172A]">
                        {minPrice !== null ? formatCurrency(minPrice) : 'Sin edición'}
                      </td>
                      <td className="py-3 pr-3">
                        {activeDiscount.hasDiscount ? (
                          <div className="space-y-0.5">
                            <Badge tone="danger">
                              OFERTA -{activeDiscount.discountPercentage}%
                            </Badge>
                            <p className="text-[11px] text-[#475569]">
                              {activeDiscount.campaignName}
                              {game.discountEndDate ? ` · hasta ${formatDate(game.discountEndDate)}` : ''}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">Sin campaña</span>
                        )}
                      </td>
                      <td className="py-3 tabular-nums">
                        {isSelected && previewPrice !== null && minPrice !== null ? (
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs text-[#94A3B8] line-through">
                              {formatCurrency(minPrice)}
                            </span>
                            <span className="font-black text-[#059669]">
                              {formatCurrency(previewPrice)}
                            </span>
                          </div>
                        ) : activeDiscount.hasDiscount && minPrice !== null ? (
                          <span className="font-bold text-[#059669]">
                            {formatCurrency(activeDiscount.computePrice(minPrice))}
                          </span>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
