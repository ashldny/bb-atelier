import test from 'node:test';
import assert from 'node:assert/strict';
import { domainToPattern, isSupportedUrl } from '../src/utils/domains.js';
import { parsePosition } from '../src/utils/covers.js';
import { contrastRatio, contrastText } from '../src/theme/colorUtils.js';
import { validateSettingsImport, validateSavedTheme } from '../src/utils/importValidation.js';
import { isValidFont, sanitizeUrl, cssUrl } from '../src/utils/sanitization.js';
import { normalizeTheme } from '../src/theme/darkReaderTheme.js';
import { purgeDarkReaderCss } from '../src/utils/cssSanitizer.js';
import { derivePalette } from '../src/theme/palette.js';

test('domain allowlist handles subdomains and rejects malformed or privileged URLs', () => {
  assert.equal(
    domainToPattern('https://blackboard.example.edu/ultra/'),
    '*://blackboard.example.edu/*'
  );
  assert.equal(domainToPattern('*.example.edu'), '*://*.example.edu/*');
  for (const url of [
    'javascript:alert(1)',
    'file:///etc/passwd',
    'https://user:pass@example.edu',
    'foo..edu',
    'example.edu:1234',
    '*://*/*',
  ])
    assert.equal(domainToPattern(url), null);
  assert.equal(isSupportedUrl('https://school.blackboard.com/ultra'), true);
  assert.equal(isSupportedUrl('https://blackboard.com.evil.test'), false);
  assert.equal(isSupportedUrl('https://sub.example.edu', '*.example.edu'), true);
  assert.equal(isSupportedUrl('chrome://extensions'), false);
});

test('cover percentages preserve zero and clamp invalid positions', () => {
  assert.deepEqual(parsePosition('0% 100%'), { x: 0, y: 100 });
  assert.deepEqual(parsePosition('-20% 250%'), { x: 0, y: 100 });
  assert.deepEqual(parsePosition('invalid'), { x: 50, y: 50 });
});

test('automatic text meets WCAG normal text contrast across gray and saturated backgrounds', () => {
  for (const color of [
    '#000000',
    '#ffffff',
    '#777777',
    '#670d2f',
    '#2563eb',
    '#16a34a',
    '#a855f7',
  ]) {
    assert.ok(contrastRatio(color, contrastText(color)) >= 4.5, color);
  }
});

test('settings imports allowlist fields and preserve optional text, fonts and engine preferences', () => {
  const data = validateSettingsImport({
    sync: {
      pageBg: '#ffffff',
      accent: '#670d2f',
      navbar: '#121212',
      pageText: null,
      evil: 'discard',
      bbTheme: { engine: 'darkreader', autoApply: false, showToast: false },
    },
    local: { cachedCSS: 'malicious', font: 'Noto Serif' },
  });
  assert.equal(data.sync.evil, undefined);
  assert.equal(data.local.cachedCSS, undefined);
  assert.equal(data.sync.pageText, null);
  assert.equal(data.sync.bbTheme.engine, 'darkreader');
  assert.equal(data.sync.bbTheme.autoApply, false);
  assert.equal(data.sync.bbTheme.showToast, false);
  assert.equal(data.local.font, 'Noto Serif');
  assert.throws(() => validateSettingsImport({ sync: { pageBg: 'red;}' } }));
  assert.throws(() => validateSettingsImport({ sync: {}, local: { font: "bad';}" } }));
  assert.equal(validateSavedTheme({ pageBg: 'red', accent: '#fff', navbar: '#000' }), null);
});

test('font/URL validation rejects script URLs and malformed data; CSS strings are escaped separately', () => {
  assert.equal(isValidFont('Noto Serif'), true);
  assert.equal(isValidFont('system-ui'), true);
  assert.equal(isValidFont('data:font/woff2;base64,AAAA'), true);
  assert.equal(isValidFont('data:text/html;base64,AAAA'), false);
  assert.equal(sanitizeUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeUrl('data:text/html;base64,AAAA', { imageOnly: true }), '');
  assert.ok(cssUrl('https://test/image"\n.png').includes('\\22 '));
  assert.equal(normalizeTheme({ scrollbarColor: 'red;}body{}' }).scrollbarColor, 'auto');
});

test('cached CSS cleanup handles uppercase, nested fallbacks and more than 30 declarations', () => {
  const dirty = `.example{${Array.from({ length: 50 }, (_, index) => `--color${index}:VAR( --darkreader-test, var(--darkreader-nested, #fff));`).join('')}}`;
  const cleaned = purgeDarkReaderCss(dirty);
  assert.equal(/--darkreader/i.test(cleaned), false);
  assert.equal((cleaned.match(/#fff/g) || []).length, 50);
  assert.equal(purgeDarkReaderCss({}), '');
});

test('palette tokens honor explicit text and black sidebars in both modes', () => {
  const { overrides, darkOverrides } = derivePalette('#1a1a1a', '#670d2f', '#000000', '#eeeedd');
  for (const tokens of [overrides, darkOverrides]) {
    assert.equal(tokens['--page-text-1'], '#eeeedd');
    assert.equal(tokens['--palette-text-primary'], '#eeeedd');
    assert.equal(tokens['--color-text-primary'], '#eeeedd');
    assert.equal(tokens['--navbar-bg'], '#000000');
    // palette-primary is Blackboard's ink on the page, so it must stay readable there.
    assert.ok(contrastRatio(tokens['--palette-primary-main'], '#1a1a1a') >= 7);
    assert.ok(contrastRatio(tokens['--palette-text-secondary'], '#1a1a1a') >= 4.5);
  }
});
