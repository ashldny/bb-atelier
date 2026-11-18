import test from 'node:test';
import assert from 'node:assert/strict';
import { parseColor, remapValue } from '../src/theme/colorRemap.js';

test('parseColor handles hex, rgb, rgba and named colours', () => {
  assert.deepEqual(parseColor('#fff'), [255, 255, 255, 1]);
  assert.deepEqual(parseColor('#f8f8f8'), [248, 248, 248, 1]);
  assert.deepEqual(parseColor('rgb(240, 240, 240)'), [240, 240, 240, 1]);
  assert.deepEqual(parseColor('rgba(0,0,0,0.5)'), [0, 0, 0, 0.5]);
  assert.deepEqual(parseColor('rgb(38 38 38 / 50%)'), [38, 38, 38, 0.5]);
  assert.deepEqual(parseColor('white'), [255, 255, 255, 1]);
  assert.equal(parseColor('transparent'), null);
});

test('white surfaces map to the page background token', () => {
  assert.equal(remapValue('background-color', 'rgb(255, 255, 255)'), 'var(--page-bg)');
  assert.match(remapValue('background-color', '#f8f8f8'), /var\(--page-bg\), var\(--page-text-1\)/);
});

test('dark neutral text maps to page text; light text is left alone', () => {
  assert.equal(remapValue('color', '#000'), 'var(--page-text-1)');
  assert.match(remapValue('color', '#666666'), /var\(--page-text-1\), var\(--page-bg\)/);
  assert.equal(remapValue('color', '#ffffff'), null);
});

test('saturated colours and var() values are untouched; pale tints are blended', () => {
  assert.equal(remapValue('background-color', 'rgb(255, 152, 0)'), null);
  assert.equal(remapValue('color', '#c23e37'), null);
  assert.equal(remapValue('background-color', 'var(--palette-background-paper, #fff)'), null);
  assert.match(remapValue('background-color', 'rgb(255, 249, 204)'), /var\(--page-bg\) 82%/);
});

test('border shorthands keep width and style', () => {
  assert.match(remapValue('border', '1px solid #cdcdcd'), /^1px solid color-mix\(/);
  assert.equal(remapValue('border', '1px solid #c23e37'), null);
});

test('translucent overlays keep their alpha', () => {
  assert.match(remapValue('background-color', 'rgba(255,255,255,0.5)'), /50%, transparent/);
});
