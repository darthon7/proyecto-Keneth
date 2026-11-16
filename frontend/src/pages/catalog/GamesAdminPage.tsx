import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Checkbox } from '@/components/atoms/Checkbox';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { Modal } from '@/components/atoms/Modal';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { Textarea } from '@/components/atoms/Textarea';
import {
  developersApi,
  digitalKeysExtraApi,
  errorMessage,
  gameEditionsApi,
  gamesApi,
  genresApi,
  platformsApi,
  publishersApi,
} from '@/api';
import { KeyStatus, type Game } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';
import { VALIDATION_PATTERNS } from '@/utils/fields';

function slugifyTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'El título es obligatorio')
    .max(200)
    .regex(VALIDATION_PATTERNS.ENTITY_NAME, 'El título contiene caracteres no válidos'),
  slug: z
    .string()
    .trim()
    .min(1, 'El slug es obligatorio')
    .max(220)
    .regex(
      VALIDATION_PATTERNS.SLUG,
      'El slug solo permite minúsculas, números y guiones (ej. the-last-of-us)',
    ),
  synopsis: z.string().trim().optional(),
  esrbRating: z
    .string()
    .trim()
    .max(10)
    .regex(
      VALIDATION_PATTERNS.ESRB_RATING,
      'Clasificación ESRB inválida (usa EC, E, E10+, T, M, AO o RP)',
    )
    .optional()
    .or(z.literal('')),
  releaseDate: z
    .string()
    .trim()
    .min(1, 'La fecha de lanzamiento es obligatoria')
    .regex(VALIDATION_PATTERNS.ISO_DATE, 'Formato de fecha inválido (AAAA-MM-DD)'),
  coverImageUrl: z
    .string()
    .trim()
    .max(255)
    .regex(
      VALIDATION_PATTERNS.URL_OR_PATH,
      'Ingresa una URL http(s):// válida o ruta /...',
    )
    .optional()
    .or(z.literal('')),
  publisherId: z.number({ error: 'Selecciona un publisher' }).min(1, 'Selecciona un publisher'),
  developerId: z
    .number({ error: 'Selecciona una desarrolladora' })
    .min(1, 'Selecciona una desarrolladora'),
});

type GameFormValues = z.infer<typeof schema>;

const EMPTY_FORM: GameFormValues = {
  title: '',
  slug: '',
  synopsis: '',
  esrbRating: 'E',
  releaseDate: '',
  coverImageUrl: '',
  publisherId: 0,
  developerId: 0,
};

export function GamesAdminPage({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  // Unified onboarding: optional initial digital edition + key batch on game creation
  const [setupInitialEdition, setSetupInitialEdition] = useState(false);
  const [initialEditionName, setInitialEditionName] = useState('Standard Edition');
  const [initialPlatformId, setInitialPlatformId] = useState('');
  const [initialPrice, setInitialPrice] = useState('59.99');
  const [initialIsDlc, setInitialIsDlc] = useState(false);
  const [initialKeysQty, setInitialKeysQty] = useState('10');

  // Inline Stock & Keys modal state per game
  const [stockGameId, setStockGameId] = useState<number | null>(null);
  const [batchQuantities, setBatchQuantities] = useState<Record<number, string>>({});
  const [stockFeedback, setStockFeedback] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [newEditionName, setNewEditionName] = useState('Standard Edition');
  const [newEditionPlatformId, setNewEditionPlatformId] = useState('');
  const [newEditionPrice, setNewEditionPrice] = useState('59.99');
  const [newEditionIsDlc, setNewEditionIsDlc] = useState(false);
  const [newEditionKeysQty, setNewEditionKeysQty] = useState('10');

  const gamesQuery = useQuery({ queryKey: ['games'], queryFn: () => gamesApi.list() });
  const publishersQuery = useQuery({
    queryKey: ['publishers'],
    queryFn: () => publishersApi.list(),
  });
  const developersQuery = useQuery({
    queryKey: ['developers'],
    queryFn: () => developersApi.list(),
  });
  const genresQuery = useQuery({ queryKey: ['genres'], queryFn: () => genresApi.list() });
  const platformsQuery = useQuery({
    queryKey: ['platforms'],
    queryFn: () => platformsApi.list(),
  });

  const invalidateCatalogQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['games'] }),
      queryClient.invalidateQueries({ queryKey: ['game-editions'] }),
      queryClient.invalidateQueries({ queryKey: ['digital-keys'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'summary'] }),
    ]);
  };

  const form = useForm<GameFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!isModalOpen) return;
    if (editingGame) {
      form.reset({
        title: editingGame.title,
        slug: editingGame.slug,
        synopsis: editingGame.synopsis ?? '',
        esrbRating: editingGame.esrbRating,
        releaseDate: (editingGame.releaseDate ?? '').slice(0, 10),
        coverImageUrl: editingGame.coverImageUrl ?? '',
        publisherId: editingGame.publisher?.id ?? 0,
        developerId: editingGame.developer?.id ?? 0,
      });
      setSelectedGenres((editingGame.genres ?? []).map((genre) => genre.id));
      setSlugTouched(true);
    } else {
      form.reset(EMPTY_FORM);
      setSelectedGenres([]);
      setSlugTouched(false);
      setSetupInitialEdition(false);
      setInitialEditionName('Standard Edition');
      setInitialPlatformId('');
      setInitialPrice('59.99');
      setInitialIsDlc(false);
      setInitialKeysQty('10');
    }
    setFormError(null);
  }, [isModalOpen, editingGame, form]);

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      slug: string;
      synopsis?: string;
      esrbRating?: string;
      releaseDate: string;
      coverImageUrl?: string;
      publisherId: number;
      developerId: number;
      genreIds: number[];
    }) => {
      if (editingGame) {
        return await gamesApi.update(editingGame.id, payload);
      }
      const createdGame = await gamesApi.create(payload);
      if (setupInitialEdition) {
        const edition = await gameEditionsApi.create({
          editionName: initialEditionName.trim() || 'Standard Edition',
          basePrice: Number(initialPrice),
          isDlc: initialIsDlc,
          gameId: createdGame.id,
          platformId: Number(initialPlatformId),
        });
        const qty = Number(initialKeysQty);
        if (qty > 0) {
          await digitalKeysExtraApi.createBulk({
            gameEditionId: edition.id,
            quantity: Math.min(100, Math.max(1, Math.floor(qty))),
          });
        }
      }
      return createdGame;
    },
    onSuccess: async () => {
      await invalidateCatalogQueries();
      setIsModalOpen(false);
      setEditingGame(null);
      setFormError(null);
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (game: Game) => gamesApi.remove(game.id),
    onSuccess: async () => {
      await invalidateCatalogQueries();
      setGameToDelete(null);
    },
  });

  const bulkKeysMutation = useMutation({
    mutationFn: ({ gameEditionId, quantity }: { gameEditionId: number; quantity: number }) =>
      digitalKeysExtraApi.createBulk({ gameEditionId, quantity }),
    onSuccess: async (result) => {
      await invalidateCatalogQueries();
      setStockError(null);
      setStockFeedback(
        `Se generaron ${result.createdCount} claves disponibles (lote ${result.batchId}).`,
      );
    },
    onError: (error) => setStockError(errorMessage(error)),
  });

  const addEditionMutation = useMutation({
    mutationFn: async () => {
      if (!stockGameId) {
        throw new Error('Videojuego no seleccionado');
      }
      const trimmedEditionName = newEditionName.trim();
      if (
        !trimmedEditionName ||
        !VALIDATION_PATTERNS.ENTITY_NAME.test(trimmedEditionName) ||
        trimmedEditionName.length > 100
      ) {
        throw new Error('Ingresa un nombre de edición válido (2 a 100 caracteres)');
      }
      const platformId = Number(newEditionPlatformId);
      const trimmedPrice = newEditionPrice.trim();
      const basePrice = Number(trimmedPrice);
      if (
        !platformId ||
        !VALIDATION_PATTERNS.DECIMAL_PRICE.test(trimmedPrice) ||
        Number.isNaN(basePrice) ||
        basePrice < 0 ||
        basePrice > 99999.99
      ) {
        throw new Error('Selecciona una plataforma y un precio válido');
      }
      const trimmedKeysQty = newEditionKeysQty.trim();
      if (!/^\d+$/.test(trimmedKeysQty) || Number(trimmedKeysQty) < 0 || Number(trimmedKeysQty) > 100) {
        throw new Error('La cantidad de claves iniciales debe ser un entero entre 0 y 100');
      }
      const edition = await gameEditionsApi.create({
        editionName: trimmedEditionName,
        basePrice,
        isDlc: newEditionIsDlc,
        gameId: stockGameId,
        platformId,
      });
      const qty = Number(trimmedKeysQty);
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
      await invalidateCatalogQueries();
      setStockError(null);
      setStockFeedback(
        createdKeys > 0
          ? `Edición «${edition.editionName}» creada con ${createdKeys} claves digitales disponibles.`
          : `Edición «${edition.editionName}» creada correctamente.`,
      );
      setNewEditionName('Standard Edition');
      setNewEditionIsDlc(false);
    },
    onError: (error) => setStockError(errorMessage(error)),
  });

  const games = useMemo(() => gamesQuery.data ?? [], [gamesQuery.data]);
  const stockGame = useMemo(
    () => games.find((game) => game.id === stockGameId) ?? null,
    [games, stockGameId],
  );

  const submit = form.handleSubmit((values) => {
    setFormError(null);
    if (!editingGame && setupInitialEdition) {
      const trimmedEditionName = initialEditionName.trim();
      if (
        !trimmedEditionName ||
        !VALIDATION_PATTERNS.ENTITY_NAME.test(trimmedEditionName) ||
        trimmedEditionName.length > 100
      ) {
        setFormError('Ingresa un nombre de edición válido (2 a 100 caracteres).');
        return;
      }
      const parsedPlatform = Number(initialPlatformId);
      const trimmedPrice = initialPrice.trim();
      const parsedPrice = Number(trimmedPrice);
      if (
        !parsedPlatform ||
        !VALIDATION_PATTERNS.DECIMAL_PRICE.test(trimmedPrice) ||
        Number.isNaN(parsedPrice) ||
        parsedPrice < 0 ||
        parsedPrice > 99999.99
      ) {
        setFormError(
          'Selecciona una plataforma y un precio válido para configurar la edición digital inicial.',
        );
        return;
      }
      const trimmedQty = initialKeysQty.trim();
      if (!/^\d+$/.test(trimmedQty) || Number(trimmedQty) < 0 || Number(trimmedQty) > 100) {
        setFormError('La cantidad de claves iniciales debe ser un entero entre 0 y 100.');
        return;
      }
    }
    saveMutation.mutate({
      title: values.title,
      slug: values.slug,
      synopsis: values.synopsis || undefined,
      esrbRating: values.esrbRating || undefined,
      releaseDate: values.releaseDate,
      coverImageUrl: values.coverImageUrl || undefined,
      publisherId: Number(values.publisherId),
      developerId: Number(values.developerId),
      genreIds: selectedGenres,
    });
  });

  const toggleGenre = (genreId: number) => {
    setSelectedGenres((current) =>
      current.includes(genreId)
        ? current.filter((id) => id !== genreId)
        : [...current, genreId],
    );
  };

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
                    (sum, edition) =>
                      sum +
                      (edition.digitalKeys ?? []).filter(
                        (key) => key.status === KeyStatus.AVAILABLE,
                      ).length,
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
                            onClick={() => {
                              setStockFeedback(null);
                              setStockError(null);
                              setStockGameId(game.id);
                            }}
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGame ? `Editar ${editingGame.title}` : 'Nuevo videojuego'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="brand"
              data-testid="games-admin-save-btn"
              onClick={submit}
              isLoading={saveMutation.isPending}
            >
              Guardar
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          {formError && <ErrorBanner message={formError} />}

          <Input
            label="Título"
            error={form.formState.errors.title?.message}
            {...form.register('title', {
              onChange: (event) => {
                if (!editingGame && !slugTouched) {
                  form.setValue('slug', slugifyTitle(event.target.value), {
                    shouldValidate: form.formState.isSubmitted,
                  });
                }
              },
            })}
          />
          <Input
            label="Slug"
            placeholder="the-last-of-us-part-ii"
            hint="Se genera automáticamente desde el título (puedes editarlo)"
            error={form.formState.errors.slug?.message}
            {...form.register('slug', {
              onChange: () => {
                setSlugTouched(true);
              },
            })}
          />
          <Textarea
            label="Sinopsis"
            rows={3}
            error={form.formState.errors.synopsis?.message}
            {...form.register('synopsis')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Clasificación ESRB"
              placeholder="E, T, M"
              error={form.formState.errors.esrbRating?.message}
              {...form.register('esrbRating')}
            />
            <Input
              label="Fecha de lanzamiento"
              type="date"
              error={form.formState.errors.releaseDate?.message}
              {...form.register('releaseDate')}
            />
          </div>
          <Input
            label="Portada (URL)"
            placeholder="https://…"
            error={form.formState.errors.coverImageUrl?.message}
            {...form.register('coverImageUrl')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Publisher"
              error={form.formState.errors.publisherId?.message}
              placeholder="Selecciona un publisher"
              options={(publishersQuery.data ?? []).map((publisher) => ({
                value: publisher.id,
                label: publisher.name,
              }))}
              {...form.register('publisherId', { valueAsNumber: true })}
            />
            <Select
              label="Desarrolladora"
              error={form.formState.errors.developerId?.message}
              placeholder="Selecciona una desarrolladora"
              options={(developersQuery.data ?? []).map((developer) => ({
                value: developer.id,
                label: developer.name,
              }))}
              {...form.register('developerId', { valueAsNumber: true })}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-body-sm font-semibold text-[#0F172A]">Géneros</legend>
            <div className="flex flex-wrap gap-2">
              {(genresQuery.data ?? []).map((genre) => {
                const isSelected = selectedGenres.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => toggleGenre(genre.id)}
                    aria-pressed={isSelected}
                    className={`rounded-lg px-3 py-1.5 text-body-sm btn-nintendo-animation border ${
                      isSelected
                        ? 'bg-[#FF2A5F] border-[#FF2A5F] font-bold text-white'
                        : 'bg-[#F4F4F6] border-[#E2E8F0] text-[#475569] hover:text-[#0F172A]'
                    }`}
                  >
                    {genre.name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {!editingGame && (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
              <Checkbox
                label="Configurar primera edición digital y lote inicial de claves ahora"
                checked={setupInitialEdition}
                onChange={(event) => setSetupInitialEdition(event.target.checked)}
              />

              {setupInitialEdition && (
                <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-[#E2E8F0]">
                  <Input
                    label="Nombre de edición"
                    value={initialEditionName}
                    onChange={(event) => setInitialEditionName(event.target.value)}
                  />
                  <Select
                    label="Plataforma"
                    value={initialPlatformId}
                    onChange={(event) => setInitialPlatformId(event.target.value)}
                    placeholder="Selecciona plataforma"
                    options={(platformsQuery.data ?? []).map((platform) => ({
                      value: platform.id,
                      label: platform.name,
                    }))}
                  />
                  <Input
                    label="Precio (USD/MXN)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={initialPrice}
                    onChange={(event) =>
                      setInitialPrice(event.target.value.replace(/[^0-9.]/g, ''))
                    }
                  />
                  <Input
                    label="Claves digitales iniciales"
                    type="number"
                    min="0"
                    max="100"
                    value={initialKeysQty}
                    onChange={(event) =>
                      setInitialKeysQty(event.target.value.replace(/\D/g, ''))
                    }
                  />
                  <div className="sm:col-span-2">
                    <Checkbox
                      label="Marcar esta edición como DLC digital"
                      checked={initialIsDlc}
                      onChange={(event) => setInitialIsDlc(event.target.checked)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </Modal>

      <Modal
        isOpen={stockGame !== null}
        onClose={() => setStockGameId(null)}
        title={stockGame ? `Stock y Claves · ${stockGame.title}` : 'Stock y Claves'}
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setStockGameId(null)}>
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
                    const available = keys.filter(
                      (key) => key.status === KeyStatus.AVAILABLE,
                    ).length;
                    const qtyValue = batchQuantities[edition.id] ?? '10';

                    return (
                      <div
                        key={edition.id}
                        className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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

            <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 space-y-3">
              <h3 className="text-body-sm font-extrabold uppercase tracking-wider text-[#0F172A]">
                + Añadir nueva edición digital
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Nombre de edición"
                  value={newEditionName}
                  onChange={(event) => setNewEditionName(event.target.value)}
                />
                <Select
                  label="Plataforma"
                  value={newEditionPlatformId}
                  onChange={(event) => setNewEditionPlatformId(event.target.value)}
                  placeholder="Selecciona plataforma"
                  options={(platformsQuery.data ?? []).map((platform) => ({
                    value: platform.id,
                    label: platform.name,
                  }))}
                />
                <Input
                  label="Precio"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newEditionPrice}
                  onChange={(event) =>
                    setNewEditionPrice(event.target.value.replace(/[^0-9.]/g, ''))
                  }
                />
                <Input
                  label="Claves iniciales (0 - 100)"
                  type="number"
                  min="0"
                  max="100"
                  value={newEditionKeysQty}
                  onChange={(event) =>
                    setNewEditionKeysQty(event.target.value.replace(/\D/g, ''))
                  }
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <Checkbox
                  label="Es DLC digital"
                  checked={newEditionIsDlc}
                  onChange={(event) => setNewEditionIsDlc(event.target.checked)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  isLoading={addEditionMutation.isPending}
                  onClick={() => addEditionMutation.mutate()}
                >
                  Crear edición y claves
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

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
