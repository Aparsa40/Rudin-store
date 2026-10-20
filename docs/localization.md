# Localization — Bilingual Storefront (Phase 1)

Rudin Store ships a bilingual English/Persian storefront. English is the default language; Persian renders right-to-left.

## Scope

Phase 1 localizes the customer-facing chrome and homepage:

- Header (announcement bar, navigation row, account dropdown, mobile drawer), footer, search bar, and product cards.
- The homepage and its section components.
- The 404 (NotFound) page.

Pages beyond the layout and homepage (cart drawer, quick view, dashboards, checkout, account area, authentication pages) remain English-only until their own phases; this is a documented limitation, not a defect.

## Architecture

Localization lives in `src/i18n/` and introduces no new runtime dependency. It reuses the existing Zustand store pattern so language state behaves exactly like the other application stores.

```
src/i18n/
├── types.ts        # SupportedLanguage, TextDirection, TranslationResource
├── core.ts         # pure logic: validation, fallback, translation lookup
├── format.ts       # Intl price/number/date/countdown formatting
├── store.ts        # Zustand store with persist middleware
├── locales/en.ts   # English resources (default and fallback)
├── locales/fa.ts   # Persian resources (key set mirrors en.ts)
└── index.ts        # useTranslation / useDocumentLanguage hooks
```

- `useTranslation()` returns `{ language, direction, locale, t, setLanguage, formatPrice, formatNumber, formatDate }` and re-renders components when the language changes.
- `useDocumentLanguage()` is mounted once in `Layout` and keeps `<html lang>` and `<html dir>` in sync.
- Translation keys are namespaced by feature (`common`, `header`, `search`, `product`, `home`, `footer`) and looked up as `namespace.key` with `{param}` interpolation.

## Persistence and validation

- The preference is persisted under its own storage key, `rudin-language-storage`, deliberately separate from `rudin-cart-storage` and `rudin-auth-storage`, so switching languages cannot disturb cart or session state.
- The persisted value is validated on initial read and on every rehydration through `resolveLanguage`; anything that is not a supported language falls back to English.
- `setLanguage` also validates its input, so only supported languages ever enter the store.

## Fallback rules

- A key missing from the active language falls back to the English resource; a fully unknown key renders as the key itself so gaps stay visible during review.
- Database content (product titles, category names, vendor descriptions) is displayed as stored and is never auto-translated or overwritten. If content has no Persian translation, the original content is shown — this is the documented content fallback.
- Prices format through `Intl.NumberFormat` (USD, `en-US` / `fa-IR`); numbers and dates use the active locale. Formatting is display-only and never mutates data.

## RTL handling

- English is `ltr`; Persian is `rtl`, applied to the document element.
- Components use Tailwind logical utilities (`start-*`, `end-*`, `ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`) instead of physical `left`/`right` classes.
- Directional icons (arrows, chevrons) flip with `rtl:rotate-180`; directional gradients use `rtl:bg-gradient-to-l`; directional hover motion uses paired logical transitions.
- Persian typography relies on locally available system font fallbacks (`src/index.css`); no external font is fetched.

## Reduced motion

A global `prefers-reduced-motion` rule in `src/index.css` disables non-essential animation, and the hero carousel additionally suspends automatic rotation for visitors who prefer reduced motion.

## Static versus configuration-driven content

The backend has no campaign or announcement API yet. The announcement bar, hero slides, and mid-page banner read the documented configuration module `src/config/homeContent.ts`; when a real campaign service exists, that module can be replaced without component changes. All other homepage sections load real data through the existing services (products, categories, vendors). Nothing invents prices, discounts, inventory, campaign data, notification counts, or newsletter success.
