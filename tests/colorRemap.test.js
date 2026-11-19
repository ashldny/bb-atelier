import test from 'node:test';
import assert from 'node:assert/strict';
import { parseColor, remapValue, createBrandMatcher } from '../src/theme/colorRemap.js';
import { mirrorRule, collectBrandColors } from '../src/content/ruleRemapper.js';
import { derivePalette } from '../src/theme/palette.js';
import { sidebarShade, contrastRatio, isDark, hexToHsl } from '../src/theme/colorUtils.js';

test('parseColor handles hex, rgb, rgba and named colours', () => {
  assert.deepEqual(parseColor('#fff'), [255, 255, 255, 1]);
  assert.deepEqual(parseColor('#f8f8f8'), [248, 248, 248, 1]);
  assert.deepEqual(parseColor('rgb(240, 240, 240)'), [240, 240, 240, 1]);
  assert.deepEqual(parseColor('rgba(0,0,0,0.5)'), [0, 0, 0, 0.5]);
  assert.deepEqual(parseColor('rgb(38 38 38 / 50%)'), [38, 38, 38, 0.5]);
  assert.deepEqual(parseColor('white'), [255, 255, 255, 1]);
  assert.equal(parseColor('transparent'), null);
});

test('near-white panels become the page; greyer fills step away from it', () => {
  assert.equal(remapValue('background-color', 'rgb(255, 255, 255)'), 'var(--page-bg)');
  assert.equal(remapValue('background-color', '#f8f8f8'), 'var(--page-bg)');
  assert.match(remapValue('background-color', '#e0e0e0'), /var\(--page-bg\), var\(--page-text-1\)/);
});

test('dark emphasis fills take the accent surface', () => {
  assert.equal(remapValue('background-color', 'rgb(38, 38, 38)'), 'var(--accent-surface)');
});

test('dark neutral text and icons map to page text; light ink is left alone', () => {
  assert.equal(remapValue('color', '#000'), 'var(--page-text-1)');
  assert.match(remapValue('color', '#666666'), /var\(--page-text-1\), var\(--page-bg\)/);
  assert.match(remapValue('fill', 'rgb(38, 38, 38)'), /var\(--page-text-1\)/);
  assert.equal(remapValue('color', '#ffffff'), null);
});

test('status colours and var() values are untouched; pale tints are blended', () => {
  assert.equal(remapValue('background-color', 'rgb(255, 152, 0)'), null);
  assert.equal(remapValue('color', '#c23e37'), null);
  assert.equal(remapValue('background-color', 'var(--palette-background-paper, #fff)'), null);
  assert.match(remapValue('background-color', 'rgb(255, 249, 204)'), /var\(--page-bg\) 82%/);
});

test('borders follow the hue-matched page border', () => {
  assert.equal(remapValue('border-top-color', '#cccccc'), 'var(--page-border)');
  // MUI input outline (#666) stays close to the page, with a touch of ink.
  assert.equal(
    remapValue('border-left-color', 'rgb(102, 102, 102)'),
    'color-mix(in srgb, var(--page-border), var(--page-text-1) 15%)'
  );
  // MUI hover outline (translucent black) is a step stronger instead of vanishing on dark pages.
  assert.equal(
    remapValue('border-top-color', 'rgba(0, 0, 0, 0.23)'),
    'color-mix(in srgb, var(--page-border), var(--page-text-1) 23%)'
  );
  assert.equal(remapValue('border-top-color', '#c23e37'), null);
});

test('institution brand and Ultra UI blue follow the accent, keeping shade relations', () => {
  const brandOf = createBrandMatcher([
    [141, 20, 54],
    [105, 15, 40],
  ]);
  assert.equal(
    remapValue('background-color', 'rgb(141, 20, 54)', brandOf),
    'var(--accent-surface)'
  );
  assert.match(remapValue('background-color', 'rgb(105, 15, 40)', brandOf), /black 18%/);
  assert.equal(remapValue('color', 'rgb(141, 20, 54)', brandOf), 'var(--accent-on-page)');
  assert.equal(remapValue('color', 'rgb(0, 109, 199)', brandOf), 'var(--accent-on-page)');
});

test('translucent overlays keep their alpha', () => {
  assert.match(remapValue('background-color', 'rgba(255,255,255,0.5)'), /50%, transparent/);
});

const fakeRule = (selectorText, decls) => ({
  selectorText,
  style: {
    cssText: Object.entries(decls)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; '),
    getPropertyValue: (p) => decls[p] || '',
    getPropertyPriority: () => '',
  },
});

test('mirror rules copy untouched colours so cascade order survives', () => {
  const brandOf = createBrandMatcher();
  const white = mirrorRule(fakeRule('.a', { 'background-color': '#ffffff' }), brandOf);
  const status = mirrorRule(fakeRule('.b', { 'background-color': 'rgb(255, 152, 0)' }), brandOf);
  assert.deepEqual(white, { text: '.a { background-color: var(--page-bg); }', changed: true });
  assert.deepEqual(status, { text: '.b { background-color: rgb(255, 152, 0); }', changed: false });
  assert.equal(mirrorRule(fakeRule('.c', { width: '10px' }), brandOf), null);
});

test('brand colours are read from Blackboard themed rules, most used first', () => {
  const rules = [
    fakeRule('.color-selection-live-mode .x', { 'background-color': 'rgb(141, 20, 54)' }),
    fakeRule('.themed-background-primary-fill-only', { 'background-color': 'rgb(141, 20, 54)' }),
    fakeRule('.themed-y', { color: 'rgb(105, 15, 40)' }),
    fakeRule('.unrelated', { color: 'rgb(0, 200, 0)' }),
  ];
  assert.deepEqual(collectBrandColors([rules]), [
    [141, 20, 54],
    [105, 15, 40],
  ]);
});

test('automatic sidebar is a darker, same-hue shade with readable text', () => {
  for (const bg of ['#ffffff', '#f0f4f8', '#f0fdf4', '#fefce8', '#1a1a1a', '#0f172a', '#1e1b2e']) {
    const nav = sidebarShade(bg);
    assert.ok(hexToHsl(nav).l <= hexToHsl(bg).l, `${bg} sidebar should be darker`);
    const { overrides } = derivePalette(bg, '#670d2f', null, null);
    assert.equal(overrides['--navbar-bg'], nav);
    assert.ok(contrastRatio(overrides['--navbar-text'], nav) >= 4.5, `${bg} sidebar text`);
    assert.equal(overrides['--logo-filter'] === 'none', isDark(nav));
    assert.ok(contrastRatio(overrides['--accent-surface'], '#ffffff') >= 4.5);
    assert.ok(contrastRatio(overrides['--accent-on-page'], bg) >= 4.5);
  }
});

test('gradient colour stops are remapped; image URLs are left alone', () => {
  const half =
    'linear-gradient(rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0) 49%, rgb(255, 255, 255) 50%, rgb(255, 255, 255) 100%)';
  const out = remapValue('background-image', half);
  assert.match(out, /^linear-gradient\(rgba\(255, 255, 255, 0\) 0%/);
  assert.match(out, /var\(--page-bg\) 50%, var\(--page-bg\) 100%\)$/);
  assert.equal(remapValue('background-image', 'url("a.png")'), null);
});

test('page ink and hover tints stay readable and subtle in light and dark themes', () => {
  for (const [bg, text] of [
    ['#ffffff', null],
    ['#fefce8', null],
    ['#1a1a1a', '#e0e0e0'],
    ['#0f172a', '#cbd5e1'],
  ]) {
    const { overrides: t } = derivePalette(bg, '#670d2f', null, text);
    // Blackboard draws icons and the help button in palette-primary on the page.
    assert.ok(contrastRatio(t['--palette-primary-main'], bg) >= 7, `${bg} ink`);
    // Hover tints are a visible but gentle step from their surface.
    const pageStep = contrastRatio(t['--page-bg-hover'], bg);
    const navStep = contrastRatio(t['--navbar-hover'], t['--navbar-bg']);
    assert.ok(pageStep > 1.05 && pageStep < 1.6, `${bg} page hover ${pageStep}`);
    assert.ok(navStep > 1.05 && navStep < 1.8, `${bg} sidebar hover ${navStep}`);
    assert.ok(contrastRatio(t['--navbar-text'], t['--navbar-hover']) >= 4.5, `${bg} hover text`);
  }
});

test('course colour indicators lean toward the accent but stay distinct', async () => {
  const { BLACKBOARD_COURSE_COLORS, courseColorTokens, buildCourseColorCss } =
    await import('../src/theme/courseColors.js');
  const tokens = courseColorTokens('#2563eb');
  const values = Object.values(tokens);
  assert.equal(values.length, Object.keys(BLACKBOARD_COURSE_COLORS).length);
  assert.equal(new Set(values).size, values.length, 'each course keeps its own colour');
  // Every tinted colour is closer to the accent than the original was.
  const dist = (a, b) => {
    const [x, y] = [a, b].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
    return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
  };
  for (const [key, original] of Object.entries(BLACKBOARD_COURSE_COLORS))
    assert.ok(dist(tokens[`--course-color-${key}`], '#2563eb') < dist(original, '#2563eb'), key);
  const css = buildCourseColorCss();
  assert.match(
    css,
    /\.element-card\.course-color-2::before \{ background-color: var\(--course-color-2\) !important; \}/
  );
  assert.match(css, /\.element-details\.course-color-classic \{ border-left-color/);
  // Messages course bars and the course gradebook summary share the tint.
  assert.match(
    css,
    /\.messages-container-summary\.course-color-4::before \{ background-color: var\(--course-color-4\)/
  );
  assert.match(
    css,
    /\.student-grade-overview\.course-color-9 \{ border-bottom-color: var\(--course-color-9\)/
  );
  // Course/organization chrome takes the navbar colours; no hashed classes.
  const { buildCourseChromeCss } = await import('../src/theme/courseChromeCss.js');
  const chrome = buildCourseChromeCss();
  assert.match(
    chrome,
    /course-page-header header,\s*\.bb-course-navigation \[role="toolbar"\] \{\s*background-color: var\(--navbar-bg\)/
  );
  assert.match(
    chrome,
    /\[data-analytics-id\^="course\.header\."\]:is\(:hover, :focus-visible\) \{\s*background-color: var\(--navbar-bg-darker\)/
  );
  assert.doesNotMatch(chrome, /muiltr-|makeStyles/);
  const { overrides } = derivePalette('#f0f4f8', '#2563eb', null, null);
  assert.equal(overrides['--course-color-2'], tokens['--course-color-2']);
});

test('login page takes the page surface, theme buttons and an accent spinner', async () => {
  const { buildLoginCss } = await import('../src/theme/loginCss.js');
  const css = buildLoginCss();
  assert.match(css, /body\.bb-login \{\s*background-color: var\(--page-bg\) !important/);
  assert.match(css, /#externalloginlink \{\s*background-color: var\(--page-bg-lighter\)/);
  // SSO sign-out page: no purple frames; Cancel matches the theme.
  assert.match(css, /\.warning_message_button \{\s*background: none !important;\s*border: 0/);
  assert.match(css, /\.lb-wrapper \.button-2 \{\s*background-color: var\(--page-bg-lighter\)/);
  assert.match(css, /#loader \{\s*border-color: var\(--accent-on-page\) !important/);
  assert.doesNotMatch(css, /muiltr-|makeStyles/);
  const light = derivePalette('#fefce8', '#2563eb', null, null).overrides;
  const dark = derivePalette('#1a1a1a', '#2563eb', null, null).overrides;
  assert.notEqual(light['--page-logo-filter'], 'none', 'white logo darkened on a light page');
  assert.equal(dark['--page-logo-filter'], 'none');
});

test('grades charts, pills and gradebook markers follow the theme', async () => {
  const { buildGradesCss } = await import('../src/theme/gradesCss.js');
  const css = buildGradesCss();
  assert.match(css, /\.highcharts-background,[\s\S]*?fill: var\(--page-bg-lighter\) !important/);
  assert.match(css, /\[stroke="#c575d2" i\] \{\s*stroke: var\(--accent-on-page\)/);
  assert.match(css, /\.customGradePill \* \{\s*color: #1c1c1c !important/);
  assert.match(css, /svg\[color="#a234b5" i\] \{\s*color: var\(--accent-on-page\)/);
  assert.doesNotMatch(css, /muiltr-|makeStyles/);
  const { buildCourseColorCss } = await import('../src/theme/courseColors.js');
  assert.match(buildCourseColorCss(), /\.panel-wrap\.course-color-2 \{ border-top-color: var\(--course-color-2\)/);
  // Ultra purple (tab indicators) follows the accent like Ultra blue.
  assert.equal(remapValue('background-color', 'rgb(162, 52, 181)'), 'var(--accent-surface)');
});

test('match my device picks the slot for the device mode and falls back safely', async () => {
  const { resolvePalette } = await import('../src/theme/settings.js');
  const base = { pageBg: '#1a1a1a', accent: '#670d2f', navbar: null, pageText: '#e0e0e0' };
  const light = { pageBg: '#fdf2f6', accent: '#c2416f', navbar: null, pageText: null };
  assert.equal(resolvePalette(base, false), base);
  const on = { ...base, followSystem: true, lightPalette: light, darkPalette: null };
  assert.equal(resolvePalette(on, false).pageBg, '#fdf2f6');
  assert.equal(resolvePalette(on, true).pageBg, '#1a1a1a', 'missing dark slot keeps current');
  const bad = { ...on, lightPalette: { pageBg: 'red', accent: '#000000' } };
  assert.equal(resolvePalette(bad, false).pageBg, '#1a1a1a', 'invalid slot is ignored');
});
