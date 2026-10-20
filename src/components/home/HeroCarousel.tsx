import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { Button } from '../ui/Button';
import {
  HERO_CAROUSEL_DEFAULTS,
  HERO_SLIDES,
  type HeroSlide,
} from '../../config/homeContent';
import {
  nextIndex,
  normalizeIndex,
  prevIndex,
  shouldAutoAdvance,
} from './heroCarouselLogic';

/** Tracks the user's reduced-motion preference, including live changes. */
function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(query.matches);
    const listener = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  return prefersReducedMotion;
}

/**
 * Promotional hero carousel driven by the documented configuration
 * source (`src/config/homeContent.ts`). No campaign API exists yet.
 *
 * Accessibility: rotation pauses on hover/focus, respects the
 * reduced-motion preference, and can be paused permanently by the
 * visitor. All controls are keyboard operable and labeled.
 */
export const HeroCarousel: React.FC = () => {
  const { language, t } = useTranslation();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const slideCount = HERO_SLIDES.length;
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (index: number) => setCurrent((prev) => normalizeIndex(index, slideCount) ?? prev),
    [slideCount],
  );
  const goNext = useCallback(
    () => setCurrent((prev) => nextIndex(prev, slideCount) ?? prev),
    [slideCount],
  );
  const goPrev = useCallback(
    () => setCurrent((prev) => prevIndex(prev, slideCount) ?? prev),
    [slideCount],
  );

  const autoAdvance = shouldAutoAdvance({
    autoplayEnabled: HERO_CAROUSEL_DEFAULTS.autoplay && !isStopped,
    prefersReducedMotion,
    isPaused,
    slideCount,
  });

  useEffect(() => {
    if (!autoAdvance) return;
    const timer = window.setInterval(goNext, HERO_CAROUSEL_DEFAULTS.intervalMs);
    return () => window.clearInterval(timer);
  }, [autoAdvance, goNext]);

  const slide = HERO_SLIDES[current];
  if (!slide) return null;

  const renderSlideContent = (item: HeroSlide): React.ReactNode => (
    <div className="container mx-auto px-4 relative z-10 h-full flex items-center">
      <div className="max-w-2xl space-y-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-slate-200 backdrop-blur-md">
          {item.eyebrow[language]}
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] text-white">
          {item.title[language]}
        </h2>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
          {item.description[language]}
        </p>
        <div className="pt-2">
          <Link to={item.ctaHref}>
            <Button
              size="lg"
              className="bg-white text-slate-950 hover:bg-slate-100 font-bold px-7 h-12 shadow-xl shadow-white/5"
            >
              {item.ctaLabel[language]}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <section
      className="relative text-white overflow-hidden"
      aria-roledescription={t('home.carouselSlide')}
      aria-label={t('home.carouselRegion')}
    >
      <div
        ref={containerRef}
        className="relative h-[300px] sm:h-[340px] lg:h-[400px]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
      >
        {HERO_SLIDES.map((item, index) => (
          <div
            key={item.id}
            aria-hidden={index !== current}
            className={`absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l ${item.gradient} transition-opacity duration-700 ${
              index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {item.assetSrc && (
              <img
                src={item.assetSrc}
                alt=""
                aria-hidden="true"
                className="absolute end-0 top-0 h-full w-1/2 object-contain opacity-15 pointer-events-none hidden lg:block"
              />
            )}
            {renderSlideContent(item)}
          </div>
        ))}
      </div>

      {/* Previous / next controls */}
      <button
        type="button"
        onClick={goPrev}
        aria-label={t('home.prevSlide')}
        className="absolute top-1/2 -translate-y-1/2 start-4 z-20 p-2.5 rounded-full bg-slate-900/60 text-white hover:bg-slate-800/90 backdrop-blur transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
      </button>
      <button
        type="button"
        onClick={goNext}
        aria-label={t('home.nextSlide')}
        className="absolute top-1/2 -translate-y-1/2 end-4 z-20 p-2.5 rounded-full bg-slate-900/60 text-white hover:bg-slate-800/90 backdrop-blur transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <ChevronRight className="w-5 h-5 rtl:rotate-180" />
      </button>

      {/* Bottom controls: indicators + rotation toggle */}
      <div className="absolute bottom-4 inset-x-0 z-20 flex items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          {HERO_SLIDES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={t('home.goToSlide', { index: index + 1 })}
              aria-current={index === current}
              className={`h-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                index === current ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIsStopped((value) => !value)}
          aria-pressed={isStopped}
          aria-label={isStopped ? t('home.resumeAutoplay') : t('home.pauseAutoplay')}
          className="p-1.5 rounded-full bg-slate-900/60 text-white hover:bg-slate-800/90 backdrop-blur transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {isStopped ? (
            <Play className="w-3.5 h-3.5" />
          ) : (
            <Pause className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </section>
  );
};
