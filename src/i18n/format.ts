import { SupportedLanguage } from './types';
import { getIntlLocale } from './core';

/**
 * Locale-aware formatting helpers built on the standard Intl API.
 * Product prices are stored as plain numbers (USD) in the database;
 * formatting happens only at display time and never mutates data.
 */

/** The marketplace currently prices everything in USD. */
export const STORE_CURRENCY = 'USD';

export function formatPrice(amount: number, language: SupportedLanguage): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat(getIntlLocale(language), {
    style: 'currency',
    currency: STORE_CURRENCY,
    currencyDisplay: 'narrowSymbol',
  }).format(value);
}

export function formatNumber(value: number, language: SupportedLanguage): string {
  return new Intl.NumberFormat(getIntlLocale(language)).format(
    Number.isFinite(value) ? value : 0,
  );
}

export function formatDate(
  date: Date | string | number,
  language: SupportedLanguage,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  const parsed = date instanceof Date ? date : new Date(date);
  const safe = Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  return new Intl.DateTimeFormat(getIntlLocale(language), options).format(safe);
}

/**
 * Formats a countdown duration using locale digits, with each time
 * part padded to two digits. Returns `null` when the deadline has
 * passed so callers can stop advertising an expired offer.
 */
export function formatCountdown(
  deadline: Date | string | number,
  language: SupportedLanguage,
  now: Date = new Date(),
): { hours: string; minutes: string; seconds: string } | null {
  const end = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(end.getTime())) return null;
  const remaining = Math.floor((end.getTime() - now.getTime()) / 1000);
  if (remaining <= 0) return null;
  const partFormatter = new Intl.NumberFormat(getIntlLocale(language), {
    minimumIntegerDigits: 2,
  });
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return {
    hours: partFormatter.format(hours),
    minutes: partFormatter.format(minutes),
    seconds: partFormatter.format(seconds),
  };
}
