import { useEffect, type RefObject } from 'react';

/**
 * Dismisses the attached element when the visitor clicks or taps
 * outside of it, or presses Escape. Shared by header dropdowns
 * (language selector, notifications, account, categories) and the
 * search autocomplete.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  active = true,
): void {
  useEffect(() => {
    if (!active) return;
    if (typeof document === 'undefined') return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const element = ref.current;
      if (element && !element.contains(event.target as Node)) handler();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handler();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, handler, active]);
}
