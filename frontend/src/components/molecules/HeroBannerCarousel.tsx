import { useEffect, useState } from 'react';

const ZELDA_BANNER_REMOTE_URL = 'https://media.vandal.net/i/1280x720/11-2026/20261128195549_1.jpg.webp';
const ZELDA_BANNER_FALLBACK_URL = '/Banner__Zelda_Ocarina_Vandal.webp';
const GTA6_BANNER_URL = '/banner-gta-6.jpg';
const CASTLEVANIA_BANNER_URL = '/banner-castlevania.jpg';
const HERO_SLIDE_INTERVAL_MS = 5000;
const EXTRA_HERO_SLIDES = [
  { index: 1, src: GTA6_BANNER_URL, alt: 'Grand Theft Auto VI' },
  { index: 2, src: CASTLEVANIA_BANNER_URL, alt: "Castlevania: Belmont's Curse" },
] as const;
const HERO_SLIDE_COUNT = 1 + EXTRA_HERO_SLIDES.length;

export function HeroBannerCarousel() {
  const [zeldaBannerSrc, setZeldaBannerSrc] = useState(ZELDA_BANNER_REMOTE_URL);
  const [heroSlide, setHeroSlide] = useState(0);

  const prevHeroSlide = () => {
    setHeroSlide((prev) => (prev - 1 + HERO_SLIDE_COUNT) % HERO_SLIDE_COUNT);
  };

  const nextHeroSlide = () => {
    setHeroSlide((prev) => (prev + 1) % HERO_SLIDE_COUNT);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % HERO_SLIDE_COUNT);
    }, HERO_SLIDE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [heroSlide]);

  return (
    <section
      aria-labelledby="hero-zelda-heading"
      data-testid="hero-zelda-banner"
      className="relative rounded-2xl overflow-hidden bg-[#1E1B4B] border border-[#1E1B4B] shadow-[0_14px_34px_rgba(30,27,75,0.16)]"
    >
      <h1 id="hero-zelda-heading" className="sr-only">
        El Pibes — Tienda de Videojuegos y Catálogo Destacado
      </h1>
      <div
        aria-hidden="true"
        className="h-[3px] w-full bg-gradient-to-r from-[#FF2A5F] via-[#FFC700] to-[#FF2A5F]"
      />

      <div className="relative w-full overflow-hidden bg-[#0F122E] h-[440px]">
        {/* Slide 0: Zelda Ocarina of Time */}
        <div
          aria-hidden={heroSlide !== 0}
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
            heroSlide === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <img
            src={zeldaBannerSrc}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="block absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-80 brightness-75 select-none pointer-events-none hero-backdrop-motion"
          />
          <div
            aria-hidden="true"
            className="block absolute inset-0 bg-gradient-to-r from-[#1E1B4B]/70 via-transparent to-[#1E1B4B]/70 pointer-events-none"
          />

          <div className="relative h-full w-auto max-w-full shrink-0 overflow-hidden">
            <img
              src={zeldaBannerSrc}
              alt="The Legend of Zelda: Ocarina of Time — Ya Disponible"
              referrerPolicy="no-referrer"
              onError={() => {
                if (zeldaBannerSrc !== ZELDA_BANNER_FALLBACK_URL) {
                  setZeldaBannerSrc(ZELDA_BANNER_FALLBACK_URL);
                }
              }}
              className="w-full h-full object-cover select-none pointer-events-none hero-motion-0 [mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)]"
            />

            <div
              aria-hidden="true"
              className="absolute left-[9.5%] w-[38%] top-[61%] flex justify-center pointer-events-none select-none"
              style={{ filter: 'drop-shadow(0 3px 10px rgba(0, 0, 0, 0.96))' }}
            >
              <span
                className="font-serif font-semibold uppercase tracking-[0.12em] whitespace-nowrap bg-gradient-to-b from-[#FCE892] via-[#D8A634] to-[#946416] bg-clip-text text-transparent text-[1.45rem]"
                style={{ fontFamily: "Georgia, 'Palatino Linotype', 'Book Antiqua', serif" }}
              >
                <span className="text-[1.22em]">Y</span>A{' '}
                <span className="text-[1.22em]">D</span>ISPONIBLE
              </span>
            </div>
          </div>
        </div>

        {/* Slides 1..N: Grand Theft Auto VI & Castlevania: Belmont's Curse */}
        {EXTRA_HERO_SLIDES.map((slide) => (
          <div
            key={slide.index}
            aria-hidden={heroSlide !== slide.index}
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
              heroSlide === slide.index ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.src}
              alt=""
              aria-hidden="true"
              className="block absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-80 brightness-75 select-none pointer-events-none hero-backdrop-motion"
            />
            <div
              aria-hidden="true"
              className="block absolute inset-0 bg-gradient-to-r from-[#1E1B4B]/70 via-transparent to-[#1E1B4B]/70 pointer-events-none"
            />

            <div className="relative h-full w-auto max-w-full shrink-0 overflow-hidden">
              <img
                src={slide.src}
                alt={slide.alt}
                className={`w-full h-full object-cover select-none pointer-events-none hero-motion-${slide.index} [mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)]`}
              />
            </div>
          </div>
        ))}

        <div
          aria-hidden="true"
          className="absolute inset-0 z-20 bg-gradient-to-t from-[#1E1B4B]/85 via-transparent to-[#1E1B4B]/20 pointer-events-none"
        />

        <button
          type="button"
          aria-label="Banner anterior"
          onClick={prevHeroSlide}
          className="absolute left-5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-[#0F122E]/55 hover:bg-[#FF2A5F] text-white border border-white/15 backdrop-blur-sm flex items-center justify-center transition-all shadow-lg cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Banner siguiente"
          onClick={nextHeroSlide}
          className="absolute right-5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-[#0F122E]/55 hover:bg-[#FF2A5F] text-white border border-white/15 backdrop-blur-sm flex items-center justify-center transition-all shadow-lg cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
          {[
            { index: 0, label: 'Ver banner de The Legend of Zelda' },
            ...EXTRA_HERO_SLIDES.map((slide) => ({
              index: slide.index,
              label: `Ver banner de ${slide.alt}`,
            })),
          ].map((slide) => (
            <button
              key={slide.index}
              type="button"
              aria-label={slide.label}
              aria-pressed={heroSlide === slide.index}
              onClick={() => setHeroSlide(slide.index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                heroSlide === slide.index
                  ? 'w-7 bg-[#FF2A5F]'
                  : 'w-2 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
