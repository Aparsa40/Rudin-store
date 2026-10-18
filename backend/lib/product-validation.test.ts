import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProductSlug, validateProductInput } from './product-validation.js';

const validProduct = () => ({
  categoryId: 'home',
  title: 'Desk Lamp',
  description: 'A desk lamp.',
  shortDescription: 'Compact lamp',
  price: 39.99,
  stock: 4,
  images: [
    { id: 'image-1', url: 'https://cdn.example.test/lamp.jpg', isPrimary: true, displayOrder: 0 },
  ],
  tags: ['lighting'],
  features: ['LED'],
  specifications: { material: 'Metal' },
});

test('accepts a valid product payload', () => {
  assert.equal(validateProductInput(validProduct()), null);
});

test('rejects negative, non-finite, or non-numeric prices', () => {
  for (const price of [-1, Number.NaN, Number.POSITIVE_INFINITY, '12']) {
    assert.match(validateProductInput({ ...validProduct(), price }) ?? '', /price/);
  }
});

test('rejects malformed image objects and non-HTTP URLs', () => {
  assert.match(
    validateProductInput({ ...validProduct(), images: ['https://cdn.example.test/image.jpg'] }) ??
      '',
    /images\[0\]/,
  );
  assert.match(
    validateProductInput({
      ...validProduct(),
      images: [{ id: 'x', url: 'javascript:alert(1)' }],
    }) ?? '',
    /HTTP\(S\)/,
  );
});

test('accepts valid product video metadata and rejects unsafe or malformed video values', () => {
  const video = {
    id: 'rudin-store/products/vendor/video-1',
    url: 'https://res.cloudinary.com/example/video/upload/video-1.mp4',
    format: 'mp4',
    bytes: 1024,
    duration: 12.5,
    displayOrder: 0,
  };
  assert.equal(validateProductInput({ ...validProduct(), videos: [video] }), null);
  assert.match(validateProductInput({ ...validProduct(), videos: [{ ...video, url: 'javascript:alert(1)' }] }) ?? '', /HTTPS url/);
  assert.match(validateProductInput({ ...validProduct(), videos: [{ ...video, format: 'exe' }] }) ?? '', /format/);
  assert.match(validateProductInput({ ...validProduct(), videos: [{ ...video, bytes: -1 }] }) ?? '', /bytes/);
  assert.match(validateProductInput({ ...validProduct(), videos: Array.from({ length: 11 }, () => video) }) ?? '', /at most 10/);
});

test('rejects oversized arrays and malformed specifications', () => {
  assert.match(
    validateProductInput({
      ...validProduct(),
      tags: Array.from({ length: 31 }, (_, i) => `tag-${i}`),
    }) ?? '',
    /tags/,
  );
  assert.match(
    validateProductInput({ ...validProduct(), specifications: { weight: 4 } }) ?? '',
    /specifications/,
  );
});

test('normalizes safe ASCII slugs and rejects titles with no ASCII slug characters', () => {
  assert.equal(normalizeProductSlug(undefined, 'Café Table'), 'cafe-table');
  assert.equal(normalizeProductSlug('  Desk / Lamp  ', 'ignored'), 'desk-lamp');
  assert.equal(normalizeProductSlug(undefined, 'چراغ رومیزی'), '');
});
