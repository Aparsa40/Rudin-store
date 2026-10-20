import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SupportedLanguage } from './types';
import { DEFAULT_LANGUAGE, resolveLanguage } from './core';

/**
 * Language preference store.
 *
 * The preference is persisted under its own storage key, completely
 * separate from the cart (`rudin-cart-storage`) and auth stores, so
 * switching languages can never disturb cart or session state.
 */
export const LANGUAGE_STORAGE_KEY = 'rudin-language-storage';

interface LanguageState {
  language: SupportedLanguage;
  setLanguage: (value: unknown) => SupportedLanguage;
}

/**
 * Reads the persisted preference synchronously on startup so the
 * first paint already uses the visitor's language. Any tampered or
 * outdated value is validated and falls back to English.
 */
function readInitialLanguage(): SupportedLanguage {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_LANGUAGE;
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!raw) return DEFAULT_LANGUAGE;
    const parsed = JSON.parse(raw) as { state?: { language?: unknown } };
    return resolveLanguage(parsed?.state?.language);
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: readInitialLanguage(),
      setLanguage: (value) => {
        // Only validated, supported languages ever enter the store.
        const language = resolveLanguage(value);
        set({ language });
        return language;
      },
    }),
    {
      name: LANGUAGE_STORAGE_KEY,
      // Persisted values are re-validated on rehydration so an
      // invalid value written by another tab or an older release
      // cannot leave the supported-language domain.
      merge: (persisted, current) => ({
        ...current,
        language: resolveLanguage((persisted as { language?: unknown } | undefined)?.language),
      }),
    },
  ),
);
