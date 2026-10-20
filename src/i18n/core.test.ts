import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  collectResourceKeys,
  getDirection,
  getIntlLocale,
  resolveLanguage,
  translate,
} from './core';
import { LANGUAGE_STORAGE_KEY } from './store';

test('English is the default language and the first supported option', () => {
  assert.equal(DEFAULT_LANGUAGE, 'en');
  assert.deepEqual([...SUPPORTED_LANGUAGES], ['en', 'fa']);
});

test('persisted language values are validated and invalid values fall back to English', () => {
  assert.equal(resolveLanguage('en'), 'en');
  assert.equal(resolveLanguage('fa'), 'fa');
  assert.equal(resolveLanguage('fr'), 'en', 'unsupported languages are rejected');
  assert.equal(resolveLanguage('FA'), 'en', 'uppercase values are rejected');
  assert.equal(resolveLanguage('persian'), 'en');
  assert.equal(resolveLanguage(''), 'en');
  assert.equal(resolveLanguage(null), 'en');
  assert.equal(resolveLanguage(undefined), 'en');
  assert.equal(resolveLanguage(42), 'en');
  assert.equal(resolveLanguage({ language: 'fa' }), 'en');
});

test('each language maps to the correct document direction and Intl locale', () => {
  assert.equal(getDirection('en'), 'ltr');
  assert.equal(getDirection('fa'), 'rtl');
  assert.equal(getIntlLocale('en'), 'en-US');
  assert.equal(getIntlLocale('fa'), 'fa-IR');
});

test('translation keys resolve to the active language with parameter interpolation', () => {
  assert.equal(translate('en', 'header.cart'), 'Cart');
  assert.equal(translate('fa', 'header.cart'), 'سبد خرید');
  assert.equal(translate('en', 'product.onlyLeft', { count: 3 }), 'Only 3 left!');
  assert.equal(translate('fa', 'product.onlyLeft', { count: 3 }), 'تنها 3 عدد باقی مانده!');
});

test('missing keys in a language fall back to documented English text', () => {
  const group = TRANSLATIONS.fa.header as Record<string, string>;
  const backup = group.cart;
  delete group.cart;
  try {
    assert.equal(translate('fa', 'header.cart'), 'Cart');
  } finally {
    group.cart = backup;
  }
  assert.equal(translate('fa', 'header.cart'), 'سبد خرید');
});

test('fully unknown keys render as the key itself so gaps stay visible', () => {
  assert.equal(translate('en', 'header.doesNotExist'), 'header.doesNotExist');
});

test('English and Persian resources expose exactly the same key set', () => {
  const enKeys = collectResourceKeys(TRANSLATIONS.en);
  const faKeys = collectResourceKeys(TRANSLATIONS.fa);
  assert.deepEqual(faKeys, enKeys, 'every English key must have a Persian translation');
});

test('no translation value is left empty in either language', () => {
  for (const language of SUPPORTED_LANGUAGES) {
    for (const key of collectResourceKeys(TRANSLATIONS[language])) {
      const value = translate(language, key);
      assert.ok(value.trim().length > 0, `${language} key ${key} must have text`);
    }
  }
});

test('the language preference is persisted under its own storage key', () => {
  // Cart state lives under 'rudin-cart-storage'; the language store must
  // never share or overwrite that key, so switching languages cannot
  // disturb persisted cart contents.
  assert.equal(LANGUAGE_STORAGE_KEY, 'rudin-language-storage');
  assert.notEqual(LANGUAGE_STORAGE_KEY, 'rudin-cart-storage');
  assert.notEqual(LANGUAGE_STORAGE_KEY, 'rudin-auth-storage');
});
