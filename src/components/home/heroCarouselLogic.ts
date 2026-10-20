/**
 * Pure hero-carousel state transitions. Keeping the logic separate
 * from the React component makes rotation behavior unit-testable
 * under Node without a DOM.
 */

export interface CarouselBehavior {
  /** Master switch from configuration. */
  autoplayEnabled: boolean;
  /** User or system preference requesting minimal animation. */
  prefersReducedMotion: boolean;
  /** Hover/focus pause state. */
  isPaused: boolean;
  /** Number of slides available. */
  slideCount: number;
}

/** Advances with wrap-around; returns null when there is nothing to rotate. */
export function nextIndex(current: number, slideCount: number): number | null {
  if (slideCount <= 0) return null;
  return (current + 1) % slideCount;
}

/** Moves backwards with wrap-around; returns null when there is nothing to rotate. */
export function prevIndex(current: number, slideCount: number): number | null {
  if (slideCount <= 0) return null;
  return (current - 1 + slideCount) % slideCount;
}

/**
 * Automatic rotation is disabled when the configuration disables it,
 * the visitor prefers reduced motion, or the carousel is paused.
 * Reduced motion always wins: it cannot be overridden by hover state.
 */
export function shouldAutoAdvance(behavior: CarouselBehavior): boolean {
  return (
    behavior.autoplayEnabled &&
    behavior.slideCount > 1 &&
    !behavior.prefersReducedMotion &&
    !behavior.isPaused
  );
}

export function normalizeIndex(current: number, slideCount: number): number {
  if (slideCount <= 0) return 0;
  return ((current % slideCount) + slideCount) % slideCount;
}
