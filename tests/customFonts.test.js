import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCustomFont,
  customFontName,
  normalizeCustomFonts,
  MAX_CUSTOM_FONTS,
} from '../src/utils/customFonts.js';
import { validateSettingsImport } from '../src/utils/importValidation.js';

const font = (n) => `data:font/woff2;base64,${'A'.repeat(8)}${n}A==`;

test('uploaded fonts stay listed, newest first, without duplicates', () => {
  let list = addCustomFont([], 'One.ttf', font(1));
  list = addCustomFont(list, 'Two.ttf', font(2));
  list = addCustomFont(list, 'One again.ttf', font(1));
  assert.deepEqual(
    list.map((entry) => entry.name),
    ['One again', 'Two']
  );
  assert.equal(customFontName(list, font(2)), 'Two');
  assert.equal(customFontName(list, 'Inter'), null);
});

test('the list is capped and ignores anything that is not an uploaded font', () => {
  let list = [];
  for (let i = 0; i < MAX_CUSTOM_FONTS + 2; i++) list = addCustomFont(list, `F${i}`, font(i));
  assert.equal(list.length, MAX_CUSTOM_FONTS);
  assert.equal(list[0].name, `F${MAX_CUSTOM_FONTS + 1}`);
  assert.deepEqual(
    normalizeCustomFonts([{ name: 'x', font: 'Inter' }, { font: 'javascript:1' }, null]),
    []
  );
});

test('backups keep the uploaded font list', () => {
  const sync = { pageBg: '#101010', accent: '#aa3355' };
  const { local } = validateSettingsImport({
    sync,
    local: {
      customFonts: [
        { name: 'Mine.otf', font: font(3) },
        { name: 'bad', font: 'Inter' },
      ],
    },
  });
  assert.deepEqual(local.customFonts, [{ name: 'Mine', font: font(3) }]);
});
