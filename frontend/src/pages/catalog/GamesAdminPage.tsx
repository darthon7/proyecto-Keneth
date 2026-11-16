import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Modal } from '@/components/atoms/Modal';
import { Spinner } from '@/components/atoms/Spinner';
import { GameFormModal } from '@/components/organisms/GameFormModal';
import { GameStockModal } from '@/components/organisms/GameStockModal';
import {
  developersApi,
  errorMessage,
  gamesApi,
  genresApi,
  platformsApi,
  publishersApi,
} from '@/api';
import type { Game } from '@/types';
import { countAvailableKeys } from '@/utils/domain';
import { formatDate } from '@/utils/format';

export function GamesAdminPage({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [stockGameId, setStockGameId] = useState<number | null>(null);

  const gamesQuery = useQuery({ queryKey: ['games'], queryFn: () => gamesApi.list() });
  const publishersQuery = useQuery({ queryKey: ['publishers'], queryFn: () => publishersApi.list() });
  const developersQuery = useQuery({ queryKey: ['developers'], queryFn: () => developersApi.list() });
  const genresQuery = useQuery({ queryKey: ['genres'], queryFn: () => genresApi.list() });
  const platformsQuery = useQuery({ queryKey: ['platforms'], queryFn: () => platformsApi.list() });

  const invalidateCatalogQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['games'] }),
      queryClient.invalidateQueries({ queryKey: ['game-editions'] }),
      queryClient.invalidateQueries({ queryKey: ['digital-keys'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'summary'] }),
    ]);
  };

  const deleteMutation = useMutation({
    mutationFn: (game: Game) => gamesApi.remove(game.id),
    onSuccess: async () => {
      await invalidateCatalogQueries();
      setGameToDelete(null);
    },
  });

  const games = useMemo(() => gamesQuery.data ?? [], [gamesQuery.data]);
  const stockGame = useMemo(
    () => games.find((game) => game.id === stockGameId) ?? null,
    [games, stockGameId],
  );

  return (
    <section className={embedded ? 'space-y-6' : 'page-container py-16'}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-extrabold text-[#0F172A]">Administrar videojuegos</h1>
          <p className="mt-2 max-w-2xl text-body-sm text-[#475569]">
            Gestiona juegos, ediciones digitales y lotes de claves sin cambiar de pantalla.
          </p>
        </div>
        <Button
          variant="brand"
          data-testid="games-admin-create-btn"
          onClick={() => {
            setEditingGame(null);
            setIsModalOpen(true);
          }}
        >
          Nuevo videojuego
        </Button>
      </header>

      <div className="mt-8">
        {gamesQuery.isLoading && <Spinner label="Cargando videojuegos…" />}
        {gamesQuery.isError && (
          <ErrorBanner
            message={errorMessage(gamesQuery.error)}
            onRetry={() => void gamesQuery.refetch()}
          />
        )}
        {gamesQuery.isSuccess && games.length === 0 && (
          <EmptyState title="Sin videojuegos" description="Crea el primer juego del catálogo." />
        )}

        {games.length > 0 && (
          <div className="overflow-x-auto rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-xs px-4 py-2">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                    Título
                  </th>
                  <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                    Publisher / Estudio
                  </th>
                  <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                    Ediciones / Stock Digital
                  </th>
                  <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                    Géneros
                  </th>
                  <th scope="col" className="px-3 py-3 text-caption font-bold uppercase tracking-wider text-[#475569]">
                    Lanzamiento
                  </th>
                  <th scope="col" className="px-3 py-3 text-right text-caption font-bold uppercase tracking-wider text-[#475569]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => {
                  const editionsCount = game.editions?.length ?? 0;
                  const availableKeys = (game.editions ?? []).reduce(
                    (sum, edition) => sum + countAvailableKeys(edition),
                    0,
                  );

                  return (
                    <tr key={game.id} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-3 py-3 text-body-sm font-semibold text-[#0F172A]">{game.title}</td>
                      <td className="px-3 py-3 text-body-sm text-[#475569]">
                        <div className="font-medium text-[#0F172A]">{game.publisher?.name ?? '—'}</div>
                        <div className="text-xs text-[#64748B]">{game.developer?.name ?? '—'}</div>
                      </td>
                      <td className="px-3 py-3 text-body-sm">
                        <Badge
                          tone={
                            editionsCount === 0 || availableKeys === 0
                              ? 'danger'
                              : availableKeys < 3
                                ? 'warning'
                                : 'success'
                          }
                        >
                          {editionsCount} ed. · {availableKeys} claves disp.
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-body-sm text-[#475569]">
                        {(game.genres ?? []).map((genre) => genre.name).join(', ') || '—'}
                      </td>
                      <td className="px-3 py-3 text-body-sm text-[#475569]">{formatDate(game.releaseDate)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            data-testid={`games-admin-stock-btn-${game.id}`}
                            onClick={() => setStockGameId(game.id)}
                            className="text-body-sm font-bold text-[#065F46] hover:text-[#10B981] btn-nintendo-animation"
                          >
                            Stock y Claves
                          </button>
                          <button
                            type="button"
                            data-testid={`games-admin-edit-btn-${game.id}`}
                            onClick={() => {
                              setEditingGame(game);
                              setIsModalOpen(true);
                            }}
                            className="text-body-sm font-semibold text-[#1E1B4B] hover:text-[#FF2A5F] btn-nintendo-animation"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            data-testid={`games-admin-delete-btn-${game.id}`}
                            onClick={() => setGameToDelete(game)}
                            className="text-body-sm font-semibold text-[#EF4444] hover:text-[#991B1B] btn-nintendo-animation"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <GameFormModal
        isOpen={isModalOpen}
        editingGame={editingGame}
        publishers={publishersQuery.data ?? []}
        developers={developersQuery.data ?? []}
        genres={genresQuery.data ?? []}
        platforms={platformsQuery.data ?? []}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGame(null);
        }}
        onSaved={invalidateCatalogQueries}
      />

      <GameStockModal
        stockGame={stockGame}
        platforms={platformsQuery.data ?? []}
        onClose={() => setStockGameId(null)}
        onInvalidate={invalidateCatalogQueries}
      />

      <Modal
        isOpen={gameToDelete !== null}
        onClose={() => setGameToDelete(null)}
        title="Eliminar videojuego"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setGameToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              data-testid="games-admin-confirm-delete-btn"
              isLoading={deleteMutation.isPending}
              onClick={() => gameToDelete && deleteMutation.mutate(gameToDelete)}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-fog">
          Se eliminará «{gameToDelete?.title}» y sus datos relacionados no podrá deshacerse.
        </p>
        {deleteMutation.isError && (
          <div className="mt-4">
            <ErrorBanner message={errorMessage(deleteMutation.error)} />
          </div>
        )}
      </Modal>
    </section>
  );
}
