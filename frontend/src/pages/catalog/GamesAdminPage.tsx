import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { EmptyState } from '@/components/atoms/EmptyState';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { Modal } from '@/components/atoms/Modal';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { Textarea } from '@/components/atoms/Textarea';
import { developersApi, errorMessage, gamesApi, genresApi, publishersApi } from '@/api';
import type { Game } from '@/types';
import { formatDate } from '@/utils/format';

const schema = z.object({
  title: z.string().min(1, 'El título es obligatorio').max(200),
  slug: z.string().min(1, 'El slug es obligatorio').max(220),
  synopsis: z.string().optional(),
  esrbRating: z.string().max(10).optional(),
  releaseDate: z.string().min(1, 'La fecha de lanzamiento es obligatoria'),
  coverImageUrl: z.string().optional(),
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

export function GamesAdminPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

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
        releaseDate: editingGame.releaseDate.slice(0, 10),
        coverImageUrl: editingGame.coverImageUrl ?? '',
        publisherId: editingGame.publisher?.id ?? 0,
        developerId: editingGame.developer?.id ?? 0,
      });
      setSelectedGenres((editingGame.genres ?? []).map((genre) => genre.id));
    } else {
      form.reset(EMPTY_FORM);
      setSelectedGenres([]);
    }
    setFormError(null);
  }, [isModalOpen, editingGame, form]);

  const saveMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      slug: string;
      synopsis?: string;
      esrbRating?: string;
      releaseDate: string;
      coverImageUrl?: string;
      publisherId: number;
      developerId: number;
      genreIds: number[];
    }) =>
      editingGame
        ? gamesApi.update(editingGame.id, payload)
        : gamesApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['games'] });
      setIsModalOpen(false);
      setEditingGame(null);
      setFormError(null);
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (game: Game) => gamesApi.remove(game.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['games'] });
      setGameToDelete(null);
    },
  });

  const games = useMemo(() => gamesQuery.data ?? [], [gamesQuery.data]);

  const submit = form.handleSubmit((values) => {
    setFormError(null);
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
    <section className="page-container py-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-white">Administrar videojuegos</h1>
          <p className="mt-2 max-w-2xl text-body-sm text-fog">
            Alta y edición de juegos con sus relaciones anidadas: publisher → desarrolladora →
            géneros.
          </p>
        </div>
        <Button
          variant="primary"
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th scope="col" className="px-3 py-3 text-caption font-semibold uppercase tracking-wider text-fog">
                    Título
                  </th>
                  <th scope="col" className="px-3 py-3 text-caption font-semibold uppercase tracking-wider text-fog">
                    Publisher
                  </th>
                  <th scope="col" className="px-3 py-3 text-caption font-semibold uppercase tracking-wider text-fog">
                    Desarrolladora
                  </th>
                  <th scope="col" className="px-3 py-3 text-caption font-semibold uppercase tracking-wider text-fog">
                    Géneros
                  </th>
                  <th scope="col" className="px-3 py-3 text-caption font-semibold uppercase tracking-wider text-fog">
                    Lanzamiento
                  </th>
                  <th scope="col" className="px-3 py-3 text-right text-caption font-semibold uppercase tracking-wider text-fog">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id} className="border-b border-white/5">
                    <td className="px-3 py-3 text-body-sm text-white">{game.title}</td>
                    <td className="px-3 py-3 text-body-sm text-fog">{game.publisher?.name ?? '—'}</td>
                    <td className="px-3 py-3 text-body-sm text-fog">{game.developer?.name ?? '—'}</td>
                    <td className="px-3 py-3 text-body-sm text-fog">
                      {(game.genres ?? []).map((genre) => genre.name).join(', ') || '—'}
                    </td>
                    <td className="px-3 py-3 text-body-sm text-fog">{formatDate(game.releaseDate)}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGame(game);
                            setIsModalOpen(true);
                          }}
                          className="text-body-sm text-signal-blue transition-colors hover:text-white"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setGameToDelete(game)}
                          className="text-body-sm text-[#ff7b7b] transition-colors hover:text-white"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
            <Button onClick={submit} isLoading={saveMutation.isPending}>
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
            {...form.register('title')}
          />
          <Input
            label="Slug"
            placeholder="the-last-of-us-part-ii"
            error={form.formState.errors.slug?.message}
            {...form.register('slug')}
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
            <legend className="text-body-sm font-semibold text-white">Géneros</legend>
            <div className="flex flex-wrap gap-2">
              {(genresQuery.data ?? []).map((genre) => {
                const isSelected = selectedGenres.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => toggleGenre(genre.id)}
                    aria-pressed={isSelected}
                    className={`rounded-[4px] px-3 py-1.5 text-body-sm transition-colors ${
                      isSelected
                        ? 'bg-white font-bold text-obsidian'
                        : 'bg-graphite text-fog hover:text-white'
                    }`}
                  >
                    {genre.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </form>
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
