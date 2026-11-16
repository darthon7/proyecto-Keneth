import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { ErrorBanner } from '@/components/atoms/ErrorBanner';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { Textarea } from '@/components/atoms/Textarea';
import { errorMessage, featuredTrailersApi } from '@/api';
import { featuredTrailerSchema, type FeaturedTrailerFormValues } from '@/utils/schemas';
import { extractYouTubeId } from '@/utils/youtube';

const SLOTS = [
  { slot: 1, label: 'Primero', hint: 'Se muestra primero al abrir la página' },
  { slot: 2, label: 'Segundo', hint: 'Se reproduce al terminar el primero' },
  { slot: 3, label: 'Tercero', hint: 'Se reproduce al terminar el segundo' },
] as const;

export function FeaturedTrailersPage() {
  const queryClient = useQueryClient();
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  const form = useForm<FeaturedTrailerFormValues>({
    resolver: zodResolver(featuredTrailerSchema),
    defaultValues: {
      title: '',
      imageUrl: '',
      youtubeUrl: '',
      description: '',
    },
  });

  const { reset } = form;
  const { errors } = form.formState;

  const trailersQuery = useQuery({
    queryKey: ['featured-trailers'],
    queryFn: () => featuredTrailersApi.list(),
  });

  const trailerBySlot = useMemo(() => {
    const map = new Map<
      number,
      { title: string; imageUrl: string; youtubeUrl: string; description?: string | null }
    >();
    for (const item of trailersQuery.data ?? []) {
      map.set(item.slot, item);
    }
    return map;
  }, [trailersQuery.data]);

  useEffect(() => {
    const current = trailerBySlot.get(selectedSlot);
    reset({
      title: current?.title ?? '',
      imageUrl: current?.imageUrl ?? '',
      youtubeUrl: current?.youtubeUrl ?? '',
      description: current?.description ?? '',
    });
  }, [selectedSlot, trailerBySlot, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: FeaturedTrailerFormValues) =>
      featuredTrailersApi.upsertSlot(selectedSlot, {
        title: values.title,
        imageUrl: values.imageUrl,
        youtubeUrl: values.youtubeUrl,
        description: values.description || undefined,
      }),
    onSuccess: async () => {
      setFeedback(`Tráiler guardado en la posición ${selectedSlot}.`);
      await queryClient.invalidateQueries({ queryKey: ['featured-trailers'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => featuredTrailersApi.removeSlot(selectedSlot),
    onSuccess: async () => {
      setFeedback(`Espacio ${selectedSlot} vaciado.`);
      reset({ title: '', imageUrl: '', youtubeUrl: '', description: '' });
      await queryClient.invalidateQueries({ queryKey: ['featured-trailers'] });
    },
  });

  const handleSave = form.handleSubmit((values) => {
    setFeedback(null);
    saveMutation.mutate(values);
  });

  const [watchedTitle, watchedImageUrl, watchedYoutubeUrl] = form.watch([
    'title',
    'imageUrl',
    'youtubeUrl',
  ]);
  const currentSlotConfigured = trailerBySlot.has(selectedSlot);
  const previewVideoId = extractYouTubeId(watchedYoutubeUrl ?? '');
  const trimmedImageUrl = (watchedImageUrl ?? '').trim();

  return (
    <div data-testid="admin-featured-trailers-page" className="space-y-6">
      <header className="border-b border-[#E2E8F0] pb-4">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF2A5F]">
          Página Principal
        </span>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0F172A]">
          Tráilers Destacados (Máximo 3)
        </h1>
        <p className="mt-1 text-body-sm text-[#475569]">
          Selecciona la posición (Primero, Segundo o Tercero) y configura el título, foto y URL de
          YouTube. Al finalizar cada tráiler avanzará automáticamente al siguiente.
        </p>
      </header>

      {feedback && (
        <div className="rounded-xl border border-[#10B981]/30 bg-[#D1FAE5] px-4 py-3 text-body-sm font-semibold text-[#065F46]">
          {feedback}
        </div>
      )}

      {trailersQuery.isLoading && <Spinner label="Cargando espacios de tráilers…" />}
      {trailersQuery.isError && (
        <ErrorBanner
          message={errorMessage(trailersQuery.error)}
          onRetry={() => void trailersQuery.refetch()}
        />
      )}

      {/* Selector de 3 espacios */}
      <div className="space-y-2">
        <p className="text-sm font-extrabold text-[#0F172A]">Seleccione sección de tráiler</p>
        <div className="grid grid-cols-3 gap-4">
          {SLOTS.map(({ slot, label, hint }) => {
            const configured = trailerBySlot.get(slot);
            const isSelected = selectedSlot === slot;
            return (
              <button
                key={slot}
                type="button"
                data-testid={`admin-trailer-slot-${slot}`}
                onClick={() => {
                  setFeedback(null);
                  setSelectedSlot(slot);
                }}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-[#FF2A5F] bg-[#FFF1F2] ring-2 ring-[#FF2A5F]/20'
                    : 'border-[#E2E8F0] bg-[#FFFFFF] hover:border-[#1E1B4B]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-[#1E1B4B] px-2 py-0.5 text-[11px] font-black uppercase text-white">
                    {slot}. {label}
                  </span>
                  <span
                    className={`text-[11px] font-bold ${
                      configured ? 'text-[#059669]' : 'text-[#94A3B8]'
                    }`}
                  >
                    {configured ? 'Configurado' : 'Vacío'}
                  </span>
                </div>

                {configured ? (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={configured.imageUrl}
                      alt={configured.title}
                      className="h-12 w-20 shrink-0 rounded-lg object-cover bg-[#F4F4F6]"
                    />
                    <p className="text-xs font-extrabold text-[#0F172A] line-clamp-2">
                      {configured.title}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[#64748B]">{hint}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Formulario de Título, Foto, URL de YouTube y Descripción */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xs space-y-4"
        noValidate
      >
        <h2 className="text-base font-black text-[#0F172A]">
          Configurar espacio #{selectedSlot} ({SLOTS.find((s) => s.slot === selectedSlot)?.label})
        </h2>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Título"
            placeholder="Ej. Elden Ring"
            error={errors.title?.message}
            {...form.register('title')}
          />
          <Input
            label="Foto (URL)"
            placeholder="https://..."
            error={errors.imageUrl?.message}
            {...form.register('imageUrl')}
          />
          <Input
            label="URL de YouTube"
            placeholder="https://www.youtube.com/watch?v=..."
            error={errors.youtubeUrl?.message}
            {...form.register('youtubeUrl')}
          />
        </div>

        <Textarea
          id="featured-trailer-description"
          label="Descripción"
          rows={3}
          maxLength={600}
          placeholder="Breve descripción que aparecerá debajo del título..."
          error={errors.description?.message}
          {...form.register('description')}
        />

        {(trimmedImageUrl || previewVideoId) && (
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            {trimmedImageUrl && (
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                  Vista previa de foto
                </p>
                <img
                  src={trimmedImageUrl}
                  alt={watchedTitle || 'Vista previa'}
                  className="aspect-[16/10] w-full max-w-xs rounded-lg object-cover bg-[#E2E8F0]"
                />
              </div>
            )}
            {previewVideoId && (
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                  Video YouTube detectado ({previewVideoId})
                </p>
                <img
                  src={`https://i.ytimg.com/vi/${previewVideoId}/hqdefault.jpg`}
                  alt="Miniatura YouTube"
                  className="aspect-video w-full max-w-xs rounded-lg object-cover bg-[#0F172A]"
                />
              </div>
            )}
          </div>
        )}

        {saveMutation.isError && <ErrorBanner message={errorMessage(saveMutation.error)} />}
        {removeMutation.isError && <ErrorBanner message={errorMessage(removeMutation.error)} />}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
          {currentSlotConfigured && (
            <Button
              type="button"
              variant="outline"
              disabled={saveMutation.isPending || removeMutation.isPending}
              isLoading={removeMutation.isPending}
              onClick={() => removeMutation.mutate()}
            >
              Vaciar espacio {selectedSlot}
            </Button>
          )}
          <Button
            type="submit"
            variant="brand"
            data-testid="admin-save-trailer-btn"
            isLoading={saveMutation.isPending}
          >
            Guardar espacio {selectedSlot}
          </Button>
        </div>
      </form>
    </div>
  );
}
