/**
 * Bilingual localization types for the Rudin Store storefront.
 *
 * Display language is a UI concern only: product IDs, API field names,
 * URLs, and database values are never derived from the active language.
 */

/** Languages the storefront currently ships resources for. */
export type SupportedLanguage = 'en' | 'fa';

/** Document text direction associated with a language. */
export type TextDirection = 'ltr' | 'rtl';

/**
 * A translation resource. Keys are organized by feature namespace
 * (for example `header.cart`) and values are plain strings that may
 * contain `{param}` placeholders for interpolation.
 */
export interface TranslationResource {
  [namespace: string]: Record<string, string>;
}

/** Public metadata used to render the language selector. */
export interface LanguageMeta {
  /** BCP 47 locale used for Intl formatting. */
  intlLocale: string;
  /** Text direction applied to the document. */
  direction: TextDirection;
  /** Label shown inside the language selector. */
  label: string;
}
