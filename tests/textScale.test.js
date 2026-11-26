import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTextScale, TEXT_SCALE } from '../src/utils/constants.js';
import { validateSettingsImport } from '../src/utils/importValidation.js';

test('text scale snaps to 5% steps inside the allowed range', () => {
  assert.equal(normalizeTextScale(1.15), 1.15);
  assert.equal(normalizeTextScale(1.123), 1.1);
  assert.equal(normalizeTextScale(5), TEXT_SCALE.max);
  assert.equal(normalizeTextScale(0.1), TEXT_SCALE.min);
  for (const bad of [undefined, null, 'big', NaN, Infinity])
    assert.equal(normalizeTextScale(bad), 1);
});

test('backups restore a valid text size and drop the default', () => {
  const sync = { pageBg: '#101010', accent: '#aa3355' };
  assert.equal(validateSettingsImport({ sync, local: { textScale: 1.2 } }).local.textScale, 1.2);
  assert.equal(
    validateSettingsImport({ sync, local: { textScale: 1 } }).local.textScale,
    undefined
  );
  assert.equal(validateSettingsImport({ sync, local: { textScale: 9 } }).local.textScale, 1.3);
});
