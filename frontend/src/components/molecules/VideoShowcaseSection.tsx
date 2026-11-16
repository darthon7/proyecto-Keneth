import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { featuredTrailersApi } from '@/api';
import type { Game } from '@/types';
import { extractYouTubeId } from '@/utils/youtube';

const DEFAULT_YOUTUBE_ID = 'tTNosQAZszY';

interface TrailerSlide {
  key: string;
  title: string;
  description?: string | null;
  imageUrl: string | null;
  videoId: string;
  gameId?: number;
}

interface VideoShowcaseSectionProps {
  games: Game[];
}

export function VideoShowcaseSection({ games }: VideoShowcaseSectionProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hasActivated, setHasActivated] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const trailersQuery = useQuery({
    queryKey: ['featured-trailers'],
    queryFn: () =>
      featuredTrailersApi?.list ? featuredTrailersApi.list() : Promise.resolve([]),
  });

  const fallbackGame = useMemo(() => {
    if (games.length === 0) return null;
    return games.find((g) => Boolean(g.coverImageUrl)) ?? games[0] ?? null;
  }, [games]);

  const slides: TrailerSlide[] = useMemo(() => {
    const configured: TrailerSlide[] = [];
    for (const item of trailersQuery.data ?? []) {
      const videoId = extractYouTubeId(item.youtubeUrl);
      if (!videoId) continue;
      configured.push({
        key: `slot-${item.slot}-${item.id}`,
        title: item.title,
        description: item.description ?? null,
        imageUrl: item.imageUrl,
        videoId,
      });
    }

    if (configured.length > 0) {
      return configured;
    }

    return [
      {
        key: 'default-trailer',
        title: fallbackGame?.title ?? 'Tráiler Destacado',
        description: fallbackGame?.synopsis ?? null,
        imageUrl: fallbackGame?.coverImageUrl ?? null,
        videoId: DEFAULT_YOUTUBE_ID,
        gameId: fallbackGame?.id,
      },
    ];
  }, [trailersQuery.data, fallbackGame]);

  const safeIndex = activeIndex % slides.length;
  const currentSlide = slides[safeIndex] ?? slides[0]!;

  // Escucha el evento onStateChange de YouTube (estado 0 = finalizado) para pasar al siguiente tráiler
  useEffect(() => {
    if (!hasActivated || slides.length <= 1) return;

    const handleMessage = (event: MessageEvent) => {
      if (typeof event.origin === 'string' && !event.origin.includes('youtube')) {
        return;
      }
      let payload: unknown = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      if (!payload || typeof payload !== 'object') return;
      const data = payload as { event?: string; info?: number | { playerState?: number } };
      const isEnded =
        (data.event === 'onStateChange' && data.info === 0) ||
        (data.event === 'infoDelivery' &&
          typeof data.info === 'object' &&
          data.info !== null &&
          data.info.playerState === 0);

      if (isEnded) {
        setHasActivated(false);
        setActiveIndex((prev) => (prev + 1) % slides.length);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [hasActivated, slides.length]);

  const handleIframeLoad = () => {
    const targetWindow = iframeRef.current?.contentWindow;
    if (!targetWindow) return;
    targetWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
    targetWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }),
      '*',
    );
  };

  const goPrev = () => {
    setHasActivated(false);
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goNext = () => {
    setHasActivated(false);
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };

  const embedSrc = `https://www.youtube.com/embed/${currentSlide.videoId}?autoplay=1&playsinline=1&rel=0&enablejsapi=1`;
  const posterSrc = `https://i.ytimg.com/vi/${currentSlide.videoId}/hqdefault.jpg`;

  const sideCardContent = (
    <>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0F172A]">
        {currentSlide.imageUrl ? (
          <img
            src={currentSlide.imageUrl}
            alt={currentSlide.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-black uppercase tracking-widest text-indigo-300">
            {currentSlide.title.slice(0, 3)}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-start gap-1.5 px-4 pt-2.5 pb-4">
        <h3 className="text-lg font-black text-white transition-colors group-hover:text-[#FFC700] line-clamp-2">
          {currentSlide.title}
        </h3>
        {currentSlide.description && (
          <p className="text-sm leading-relaxed text-indigo-200/85 line-clamp-4">
            {currentSlide.description}
          </p>
        )}
      </div>
    </>
  );

  return (
    <section
      data-testid="home-video-showcase"
      aria-labelledby="video-showcase-title"
      className="relative overflow-hidden rounded-3xl border border-[#312E81] bg-[#1E1B4B] p-6 shadow-[0_18px_42px_rgba(30,27,75,0.24)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#FFC700] via-[#FF2A5F] to-[#FFC700]"
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-5 w-1.5 rounded-full bg-[#FFC700]" />
          <h2
            id="video-showcase-title"
            className="text-lg font-black uppercase tracking-wide text-white"
          >
            Tráiler Destacado
          </h2>
        </div>

        {slides.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Tráiler anterior"
              data-testid="video-showcase-prev"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white hover:border-[#FFC700] hover:text-[#FFC700] transition-colors"
            >
              ‹
            </button>
            <div className="flex items-center gap-1.5">
              {slides.map((slide, index) => (
                <button
                  key={slide.key}
                  type="button"
                  onClick={() => {
                    setHasActivated(false);
                    setActiveIndex(index);
                  }}
                  aria-label={`Ver tráiler ${index + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    index === safeIndex ? 'w-6 bg-[#FFC700]' : 'w-2 bg-white/35 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              aria-label="Siguiente tráiler"
              data-testid="video-showcase-next"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white hover:border-[#FFC700] hover:text-[#FFC700] transition-colors"
            >
              ›
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-4 items-stretch">
        {/* Video principal estilo Steam */}
        <div className="col-span-8">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/15 bg-[#0F172A]">
            {hasActivated ? (
              <iframe
                key={currentSlide.key}
                ref={iframeRef}
                src={embedSrc}
                title={currentSlide.title}
                onLoad={handleIframeLoad}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            ) : (
              <button
                type="button"
                onClick={() => setHasActivated(true)}
                aria-label="Reproducir tráiler destacado"
                className="group relative block h-full w-full"
              >
                <img
                  src={posterSrc}
                  alt={currentSlide.title}
                  loading="lazy"
                  className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/35">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF2A5F] text-white shadow-lg transition-transform group-hover:scale-110">
                    <svg className="ml-1 h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Panel lateral estilo Steam: únicamente foto del juego y título */}
        <div className="col-span-4 flex">
          {currentSlide.gameId ? (
            <Link
              to={`/games/${currentSlide.gameId}`}
              className="group flex w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#151238] transition-all hover:border-[#FFC700]"
            >
              {sideCardContent}
            </Link>
          ) : (
            <div className="group flex w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#151238]">
              {sideCardContent}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
