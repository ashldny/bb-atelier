import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recordVisit,
  shouldAskForRating,
  snooze,
  RATE_AFTER_DAYS,
} from '../src/utils/ratePrompt.js';

const days = (n) =>
  Array.from({ length: n }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);

test('asks only after the popup was opened on several separate days', () => {
  let state = {};
  for (const day of days(RATE_AFTER_DAYS - 1)) state = recordVisit(recordVisit(state, day), day);
  assert.equal(shouldAskForRating(state, '2026-11-20'), false);
  state = recordVisit(state, '2026-11-20');
  assert.equal(shouldAskForRating(state, '2026-11-20'), true);
});

test('never asks again after rating, and waits after "Not now"', () => {
  const ready = { days: days(RATE_AFTER_DAYS) };
  assert.equal(shouldAskForRating({ ...ready, rated: true }, '2026-12-01'), false);
  const later = snooze(ready, '2026-12-01');
  assert.equal(later.snoozedUntil, '2026-12-31');
  assert.equal(shouldAskForRating(later, '2026-12-15'), false);
  assert.equal(shouldAskForRating(later, '2026-12-31'), true);
});

test('ignores malformed stored state', () => {
  assert.equal(shouldAskForRating({ days: 'x', rated: 'yes' }, '2026-12-01'), false);
  assert.equal(recordVisit(null, '2026-12-01').days.length, 1);
});
