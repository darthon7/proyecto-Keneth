import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { Checkbox } from '@/components/atoms/Checkbox';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { Modal } from '@/components/atoms/Modal';
import { Select } from '@/components/atoms/Select';
import { Textarea } from '@/components/atoms/Textarea';
import { digitalKeysExtraApi, errorMessage, gameEditionsApi, gamesApi } from '@/api';
import type { Developer, Game, Genre, Platform, Publisher } from '@/types';
import { gameFormSchema, type GameFormValues } from '@/utils/schemas';

function slugifyTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const EMPTY_FORM: GameFormValues = {
  title: '',
  slug: '',
  synopsis: '',
  esrbRating: 'E',
  releaseDate: '',
  coverImageUrl: '',
  publisherId: 0,
  developerId: 0,
  setupInitialEdition: false,
  initialEditionName: 'Standard Edition',
  initialPlatformId: '',
  initialPrice: '59.99',
  initialKeysQty: '10',
  initialIsDlc: false,
};

interface GameFormModalProps {
  isOpen: boolean;
  editingGame: Game | null;
  publishers: Publisher[];
  developers: Developer[];
  genres: Genre[];
  platforms: Platform[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function GameFormModal({
  isOpen,
  editingGame,
  publishers,
  developers,
  genres,
  platforms,
  onClose,
  onSaved,
}: GameFormModalProps) {
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: EMPTY_FORM,
  });

  const { reset } = form;
  const { errors } = form.formState;
  const setupInitialEdition = form.watch('setupInitialEdition');

  useEffect(() => {
    if (!isOpen) return;
    if (editingGame) {
      reset({
        ...EMPTY_FORM,
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
      reset(EMPTY_FORM);
      setSelectedGenres([]);
      setSlugTouched(false);
    }
    setFormError(null);
  }, [isOpen, editingGame, reset]);

  const saveMutation = useMutation({
    mutationFn: async ({ values, genreIds }: { values: GameFormValues; genreIds: number[] }) => {
      const payload = {
        title: values.title,
        slug: values.slug,
        synopsis: values.synopsis || undefined,
        esrbRating: values.esrbRating || undefined,
        releaseDate: values.releaseDate,
        coverImageUrl: values.coverImageUrl || undefined,
        publisherId: Number(values.publisherId),
        developerId: Number(values.developerId),
        genreIds,
      };
      if (editingGame) {
        return await gamesApi.update(editingGame.id, payload);
      }
      const createdGame = await gamesApi.create(payload);
      if (values.setupInitialEdition) {
        const edition = await gameEditionsApi.create({
          editionName: values.initialEditionName || 'Standard Edition',
          basePrice: Number(values.initialPrice),
          isDlc: values.initialIsDlc,
          gameId: createdGame.id,
          platformId: Number(values.initialPlatformId),
        });
        const qty = Number(values.initialKeysQty);
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
      await onSaved();
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const submit = form.handleSubmit((values) => {
    setFormError(null);
    saveMutation.mutate({ values, genreIds: selectedGenres });
  });

  const toggleGenre = (genreId: number) => {
    setSelectedGenres((current) =>
      current.includes(genreId)
        ? current.filter((id) => id !== genreId)
        : [...current, genreId],
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingGame ? `Editar ${editingGame.title}` : 'Nuevo videojuego'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
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
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {formError && <ErrorBanner message={formError} />}

        <Input
          label="Título"
          error={errors.title?.message}
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
          error={errors.slug?.message}
          {...form.register('slug', {
            onChange: () => setSlugTouched(true),
          })}
        />
        <Textarea
          label="Sinopsis"
          rows={3}
          error={errors.synopsis?.message}
          {...form.register('synopsis')}
        />
        <div className="grid gap-4 grid-cols-2">
          <Input
            label="Clasificación ESRB"
            placeholder="E, T, M"
            error={errors.esrbRating?.message}
            {...form.register('esrbRating')}
          />
          <Input
            label="Fecha de lanzamiento"
            type="date"
            error={errors.releaseDate?.message}
            {...form.register('releaseDate')}
          />
        </div>
        <Input
          label="Portada (URL)"
          placeholder="https://…"
          error={errors.coverImageUrl?.message}
          {...form.register('coverImageUrl')}
        />
        <div className="grid gap-4 grid-cols-2">
          <Select
            label="Publisher"
            error={errors.publisherId?.message}
            placeholder="Selecciona un publisher"
            options={publishers.map((publisher) => ({
              value: publisher.id,
              label: publisher.name,
            }))}
            {...form.register('publisherId', { valueAsNumber: true })}
          />
          <Select
            label="Desarrolladora"
            error={errors.developerId?.message}
            placeholder="Selecciona una desarrolladora"
            options={developers.map((developer) => ({
              value: developer.id,
              label: developer.name,
            }))}
            {...form.register('developerId', { valueAsNumber: true })}
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-body-sm font-semibold text-[#0F172A]">Géneros</legend>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => {
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
              {...form.register('setupInitialEdition')}
            />

            {setupInitialEdition && (
              <div className="grid gap-3 grid-cols-2 pt-2 border-t border-[#E2E8F0]">
                <Input
                  label="Nombre de edición"
                  error={errors.initialEditionName?.message}
                  {...form.register('initialEditionName')}
                />
                <Select
                  label="Plataforma"
                  placeholder="Selecciona plataforma"
                  options={platforms.map((platform) => ({
                    value: platform.id,
                    label: platform.name,
                  }))}
                  error={errors.initialPlatformId?.message}
                  {...form.register('initialPlatformId')}
                />
                <Input
                  label="Precio (USD/MXN)"
                  type="number"
                  step="0.01"
                  min="0"
                  error={errors.initialPrice?.message}
                  {...form.register('initialPrice', {
                    onChange: (event) => {
                      const clean = event.target.value.replace(/[^0-9.]/g, '');
                      if (event.target.value !== clean) {
                        form.setValue('initialPrice', clean, {
                          shouldValidate: form.formState.isSubmitted,
                        });
                      }
                    },
                  })}
                />
                <Input
                  label="Claves digitales iniciales"
                  type="number"
                  min="0"
                  max="100"
                  error={errors.initialKeysQty?.message}
                  {...form.register('initialKeysQty', {
                    onChange: (event) => {
                      const clean = event.target.value.replace(/\D/g, '');
                      if (event.target.value !== clean) {
                        form.setValue('initialKeysQty', clean, {
                          shouldValidate: form.formState.isSubmitted,
                        });
                      }
                    },
                  })}
                />
                <div className="col-span-2">
                  <Checkbox
                    label="Marcar esta edición como DLC digital"
                    {...form.register('initialIsDlc')}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
