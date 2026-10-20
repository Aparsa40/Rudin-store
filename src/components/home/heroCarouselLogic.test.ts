import assert from 'node:assert/strict';
import test from 'node:test';
import {
  nextIndex,
  normalizeIndex,
  prevIndex,
  shouldAutoAdvance,
} from './heroCarouselLogic';

test('slide indices wrap around in both directions', () => {
  assert.equal(nextIndex(0, 3), 1);
  assert.equal(nextIndex(2, 3), 0, 'advancing past the last slide wraps to the start');
  assert.equal(prevIndex(0, 3), 2, 'going back from the first slide wraps to the end');
  assert.equal(prevIndex(2, 3), 1);
  assert.equal(nextIndex(0, 0), null, 'no slides means nothing to advance');
  assert.equal(prevIndex(0, 0), null);
});

test('automatic rotation respects configuration, reduced motion, and pause state', () => {
  const base = { autoplayEnabled: true, prefersReducedMotion: false, isPaused: false, slideCount: 3 };
  assert.equal(shouldAutoAdvance(base), true);

  assert.equal(
    shouldAutoAdvance({ ...base, autoplayEnabled: false }),
    false,
    'configuration can disable rotation entirely',
  );
  assert.equal(
    shouldAutoAdvance({ ...base, prefersReducedMotion: true }),
    false,
    'reduced-motion visitors never get automatic rotation',
  );
  assert.equal(
    shouldAutoAdvance({ ...base, isPaused: true }),
    false,
    'hover and focus pause rotation',
  );
  assert.equal(
    shouldAutoAdvance({ ...base, slideCount: 1 }),
    false,
    'a single slide never rotates',
  );
});

test('out-of-range indices are normalized safely', () => {
  assert.equal(normalizeIndex(-1, 3), 2);
  assert.equal(normalizeIndex(3, 3), 0);
  assert.equal(normalizeIndex(5, 0), 0);
});
