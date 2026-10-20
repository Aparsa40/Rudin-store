import { useEffect } from 'react';
import { useLanguageStore } from './store';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getDirection,
  getIntlLocale,
  translate,
  TranslationParams,
} from './core';
import { formatDate, formatNumber, formatPrice } from './format';
import { SupportedLanguage, TextDirection } from './types';

export {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  LANGUAGE_META,
  getDirection,
  getIntlLocale,
  resolveLanguage,
  translate,
} from './core';
export { formatPrice, formatNumber, formatDate, formatCountdown, STORE_CURRENCY } from './format';
export { useLanguageStore, LANGUAGE_STORAGE_KEY } from './store';
export type { SupportedLanguage, TextDirection, TranslationResource, LanguageMeta } from './types';

/** Translation function bound to the active language. */
export type TranslateFn = (key: string, params?: TranslationParams) => string;

export interface Translation {
  language: SupportedLanguage;
  direction: TextDirection;
  locale: string;
  t: TranslateFn;
  setLanguage: (value: unknown) => SupportedLanguage;
  formatPrice: (amount: number) => string;
  formatNumber: (value: number) => string;
  formatDate: (
    date: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
}

/**
 * Primary React integration point for localization. Components use
 * `const { t } = useTranslation()` and re-render automatically when
 * the active language changes.
 */
export function useTranslation(): Translation {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  return {
    language,
    direction: getDirection(language),
    locale: getIntlLocale(language),
    t: (key, params) => translate(language, key, params),
    setLanguage,
    formatPrice: (amount) => formatPrice(amount, language),
    formatNumber: (value) => formatNumber(value, language),
    formatDate: (date, options) => formatDate(date, language, options),
  };
}

/**
 * Keeps `<html lang>` and `<html dir>` in sync with the active
 * language. Mounted once from the application layout.
 */
export function useDocumentLanguage(): void {
  const language = useLanguageStore((state) => state.language);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
    document.documentElement.dir = getDirection(language);
  }, [language]);
}
