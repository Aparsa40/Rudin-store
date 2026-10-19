import { SupportedLanguage, TextDirection, TranslationResource, LanguageMeta } from './types';
import { en } from './locales/en';
import { fa } from './locales/fa';

/**
 * Pure localization logic. This module intentionally avoids browser
 * APIs so it can be unit tested under Node without a DOM.
 */

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['en', 'fa'];

export const TRANSLATIONS: Record<SupportedLanguage, TranslationResource> = { en, fa };

export const LANGUAGE_META: Record<SupportedLanguage, LanguageMeta> = {
  en: { intlLocale: 'en-US', direction: 'ltr', label: 'English' },
  fa: { intlLocale: 'fa-IR', direction: 'rtl', label: 'فارسی' },
};

/**
 * Validates an arbitrary (possibly persisted or user-supplied) value
 * and falls back to English for anything that is not a supported
 * language. Language values must be lowercase BCP 47 primary tags.
 */
export function resolveLanguage(value: unknown): SupportedLanguage {
  if (typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)) {
    return value as SupportedLanguage;
  }
  return DEFAULT_LANGUAGE;
}

export function getDirection(language: SupportedLanguage): TextDirection {
  return LANGUAGE_META[language].direction;
}

export function getIntlLocale(language: SupportedLanguage): string {
  return LANGUAGE_META[language].intlLocale;
}

export type TranslationParams = Record<string, string | number>;

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

function lookupKey(resource: TranslationResource, key: string): string | undefined {
  const [namespace, ...rest] = key.split('.');
  if (rest.length === 0) return undefined;
  const group = resource[namespace];
  if (!group || typeof group !== 'object') return undefined;
  const value = (group as Record<string, string>)[rest.join('.')];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Translates a `namespace.key` identifier. Missing keys in the active
 * language fall back to English (documented fallback), and a fully
 * unknown key resolves to the key itself so bugs are visible during
 * review instead of silently rendering empty text.
 */
export function translate(
  language: SupportedLanguage,
  key: string,
  params?: TranslationParams,
): string {
  const raw = lookupKey(TRANSLATIONS[language], key) ?? lookupKey(TRANSLATIONS[DEFAULT_LANGUAGE], key);
  if (raw === undefined) return key;
  return interpolate(raw, params);
}

/** Recursively collects every `namespace.key` path in a resource. */
export function collectResourceKeys(resource: TranslationResource): string[] {
  const keys: string[] = [];
  for (const namespace of Object.keys(resource)) {
    const group = resource[namespace] as Record<string, unknown>;
    for (const key of Object.keys(group)) {
      keys.push(`${namespace}.${key}`);
    }
  }
  return keys.sort();
}
