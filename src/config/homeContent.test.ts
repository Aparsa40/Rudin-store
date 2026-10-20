import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ANNOUNCEMENT,
  HERO_CAROUSEL_DEFAULTS,
  HERO_SLIDES,
  KNOWN_HOMEPAGE_LINKS,
  MID_PAGE_BANNER,
  type BilingualText,
} from './homeContent';

function assertBilingual(value: BilingualText, label: string): void {
  assert.ok(value.en.trim().length > 0, `${label} must have English text`);
  assert.ok(value.fa.trim().length > 0, `${label} must have Persian text`);
}

test('hero slides only link to routes that actually exist', () => {
  assert.ok(HERO_SLIDES.length >= 2, 'the carousel needs at least two slides');
  for (const slide of HERO_SLIDES) {
    assert.ok(
      (KNOWN_HOMEPAGE_LINKS as readonly string[]).includes(slide.ctaHref),
      `slide ${slide.id} links to unknown route ${slide.ctaHref}`,
    );
  }
});

test('hero slides carry complete bilingual copy and unique ids', () => {
  const ids = new Set<string>();
  for (const slide of HERO_SLIDES) {
    assert.ok(!ids.has(slide.id), `duplicate slide id ${slide.id}`);
    ids.add(slide.id);
    assertBilingual(slide.eyebrow, `slide ${slide.id} eyebrow`);
    assertBilingual(slide.title, `slide ${slide.id} title`);
    assertBilingual(slide.description, `slide ${slide.id} description`);
    assertBilingual(slide.ctaLabel, `slide ${slide.id} cta`);
    assert.ok(slide.gradient.trim().length > 0, `slide ${slide.id} needs a gradient`);
  }
});

test('carousel settings keep rotation configurable and accessible', () => {
  assert.ok(HERO_CAROUSEL_DEFAULTS.intervalMs >= 3000, 'rotation must be at least 3 seconds');
  assert.equal(typeof HERO_CAROUSEL_DEFAULTS.autoplay, 'boolean');
});

test('slides never depend on external image URLs', () => {
  for (const slide of HERO_SLIDES) {
    if (slide.assetSrc) {
      assert.ok(
        slide.assetSrc.startsWith('/branding/') || slide.assetSrc.startsWith('/images/'),
        `slide ${slide.id} must use in-repo assets, got ${slide.assetSrc}`,
      );
      assertBilingual(slide.assetAlt ?? { en: '', fa: '' }, `slide ${slide.id} asset alt`);
    }
  }
});

test('announcement bar and mid-page banner configuration is complete and bilingual', () => {
  assert.equal(typeof ANNOUNCEMENT.enabled, 'boolean');
  assertBilingual(ANNOUNCEMENT.badge, 'announcement badge');
  assertBilingual(ANNOUNCEMENT.message, 'announcement message');

  assert.equal(typeof MID_PAGE_BANNER.enabled, 'boolean');
  assertBilingual(MID_PAGE_BANNER.title, 'banner title');
  assertBilingual(MID_PAGE_BANNER.body, 'banner body');
  assertBilingual(MID_PAGE_BANNER.ctaLabel, 'banner cta');
  assert.ok(
    (KNOWN_HOMEPAGE_LINKS as readonly string[]).includes(MID_PAGE_BANNER.ctaHref),
    `banner links to unknown route ${MID_PAGE_BANNER.ctaHref}`,
  );
});
