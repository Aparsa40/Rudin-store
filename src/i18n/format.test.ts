import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCountdown, formatDate, formatNumber, formatPrice } from './format';

test('prices render as USD with locale-aware grouping in both languages', () => {
  const en = formatPrice(1234.5, 'en');
  const fa = formatPrice(1234.5, 'fa');
  assert.ok(en.includes('1,234.50'), `expected en grouping in "${en}"`);
  assert.ok(en.includes('$'), `expected currency symbol in "${en}"`);
  assert.ok(fa.includes('۱'), `expected Persian digits in "${fa}"`);
});

test('numbers use locale digits for Persian and Latin digits for English', () => {
  assert.equal(formatNumber(12345, 'en'), '12,345');
  assert.equal(formatNumber(12345, 'fa'), '۱۲٬۳۴۵');
});

test('dates render in the active locale', () => {
  const iso = '2026-10-19T08:54:10Z';
  const en = formatDate(iso, 'en');
  const fa = formatDate(iso, 'fa');
  assert.ok(en.includes('2026'), `expected the English year, got "${en}"`);
  // ICU renders fa-IR dates with Persian digits and, by default, the
  // Persian (Jalali) calendar, so the displayed year is not 2026. The
  // test verifies locale-aware rendering without pinning a calendar
  // system, which keeps it stable across ICU versions.
  assert.ok(/[۰-۹]/.test(fa), `expected Persian digits in the fa-IR rendering, got "${fa}"`);
  assert.ok(!fa.includes('2026'), `expected a localized rendering, not the English one, got "${fa}"`);
});

test('countdown formatting stops at the deadline and pads time parts', () => {
  const now = new Date('2026-10-19T10:00:00Z');
  const active = formatCountdown('2026-10-19T12:05:03Z', 'en', now);
  assert.ok(active);
  assert.equal(active!.hours, '02');
  assert.equal(active!.minutes, '05');
  assert.equal(active!.seconds, '03');

  const faActive = formatCountdown('2026-10-19T12:05:03Z', 'fa', now);
  assert.ok(faActive);
  assert.ok(faActive!.hours.includes('۰'), `expected Persian digits, got ${faActive!.hours}`);

  assert.equal(formatCountdown('2026-10-19T09:00:00Z', 'en', now), null, 'expired offers stop');
  assert.equal(formatCountdown('not-a-date', 'en', now), null, 'invalid deadlines are ignored');
});
