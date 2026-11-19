// ═════════════════════════════════════════════════════════
//  Bb Atelier — Literal colour remapping (Tier 3)
//
//  Blackboard Ultra renders much of its UI with CSS-in-JS (MUI/emotion
//  `.muiltr-xxxx`, JSS `.makeStyles*-0-2-N`, CSS modules `.main_9896f174`).
//  Those rules bake literal colours (#fff, #f8f8f8, #262626…) instead of
//  var(--palette-*), and their class names change on every page load, so
//  hand-written Tier 2 selectors drift out of date.
//
//  This module decides, for one longhand colour property, what a literal
//  colour should become. It works on roles, not elements:
//    • neutral light surfaces  → the page background ramp
//    • neutral dark surfaces   → the accent surface (selected toggles, chips)
//    • neutral dark ink/icons  → the page text ramp
//    • neutral borders         → the hue-matched --page-border
//    • institution brand / Blackboard UI blue → the user's accent
//    • pale status tints       → blended into the page background
//  Everything else (grades, errors, warnings) keeps its literal value.
//
//  Pure: no DOM access. The runtime walker lives in content/ruleRemapper.js.
// ═════════════════════════════════════════════════════════

const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1] };
const COLOR_TOKEN = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/gi;

const ROLES = {
  'background-color': 'bg',
  'background-image': 'gradient',
  color: 'text',
  '-webkit-text-fill-color': 'text',
  fill: 'icon',
  stroke: 'icon',
  'border-top-color': 'border',
  'border-right-color': 'border',
  'border-bottom-color': 'border',
  'border-left-color': 'border',
  'outline-color': 'border',
  'column-rule-color': 'border',
  'text-decoration-color': 'border',
};

/** Longhand properties the walker mirrors (CSSOM expands shorthands into these). */
export const REMAPPED_PROPS = Object.keys(ROLES);

/**
 * Blackboard Ultra's own UI colour families (links, primary buttons, focus,
 * skip links, due-date badges). They are product chrome, not meaning, so they
 * follow the user's accent. The first entry of each family is its main shade.
 */
export const ULTRA_UI_FAMILIES = [
  [
    [0, 109, 199],
    [0, 90, 158],
    [0, 66, 112],
    [0, 84, 188],
  ],
  [
    [41, 139, 175],
    [126, 200, 228],
  ],
  // Ultra purple: tab indicators, unread markers, focus underlines.
  [
    [162, 52, 181],
    [197, 117, 210],
  ],
];

/**
 * Parse a CSS colour literal into [r, g, b, a].
 * @param {string} value
 * @returns {number[] | null}
 */
export function parseColor(value) {
  const v = String(value).trim().toLowerCase();
  if (NAMED[v]) return NAMED[v];
  if (v[0] === '#') {
    let h = v.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(h)) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  const m = v.match(/^rgba?\(([^)]+)\)$/);
  if (!m) return null;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const nums = parts.map((p) => (p.endsWith('%') ? parseFloat(p) / 100 : parseFloat(p)));
  if (nums.some(Number.isNaN)) return null;
  const alpha = nums[3] === undefined ? 1 : nums[3];
  return [nums[0], nums[1], nums[2], alpha];
}

export const lightness = ([r, g, b]) => (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
export const chroma = ([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
const pct = (n, max) => Math.round(Math.min(max, Math.max(0, n)));
const near = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= 12;

/**
 * Build a brand matcher from the colours Blackboard paints with its
 * institution theme. Returns, for a colour, how it relates to the main
 * brand shade (-1 darker, 0 same, 1 lighter) or null when it is not brand.
 * @param {number[][]} brandColors - saturated colours from themed rules
 * @returns {(rgba: number[]) => (-1|0|1|null)}
 */
export function createBrandMatcher(brandColors = []) {
  const families = brandColors.length ? [brandColors, ...ULTRA_UI_FAMILIES] : ULTRA_UI_FAMILIES;
  return (rgba) => {
    for (const family of families) {
      if (!family.some((c) => near(c, rgba))) continue;
      const base = lightness(family[0]);
      const L = lightness(rgba);
      return L < base - 0.03 ? -1 : L > base + 0.03 ? 1 : 0;
    }
    return null;
  };
}

/** Mix N% of the page text into the page background (0 → page bg). */
function surface(p) {
  return p === 0
    ? 'var(--page-bg)'
    : `color-mix(in srgb, var(--page-bg), var(--page-text-1) ${p}%)`;
}
/** Mix N% of the page background into the page text (0 → page text). */
function ink(p) {
  return p === 0
    ? 'var(--page-text-1)'
    : `color-mix(in srgb, var(--page-text-1), var(--page-bg) ${p}%)`;
}
function withAlpha(color, a) {
  return a >= 1 ? color : `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;
}
function brandShade(token, relation) {
  if (relation < 0) return `color-mix(in srgb, var(${token}), black 18%)`;
  if (relation > 0) return `color-mix(in srgb, var(${token}), white 14%)`;
  return `var(${token})`;
}

/**
 * Map one colour literal to a token expression for the given role.
 * @param {number[]} rgba
 * @param {'bg'|'text'|'icon'|'border'} role
 * @param {(rgba: number[]) => (-1|0|1|null)} [brandOf]
 * @returns {string | null} replacement, or null to keep the original
 */
export function mapColor(rgba, role, brandOf = createBrandMatcher()) {
  const a = rgba[3];
  if (a <= 0.02) return null;
  const L = lightness(rgba);
  const neutral = chroma(rgba) < 0.08;

  const brand = neutral ? null : brandOf(rgba);
  if (brand !== null) {
    const token = role === 'text' || role === 'icon' ? '--accent-on-page' : '--accent-surface';
    return withAlpha(brandShade(token, brand), a);
  }

  if (role === 'bg') {
    // Near-white panels become the page itself; greyer fills step away from it.
    if (neutral && L >= 0.35) return withAlpha(surface(pct((0.97 - L) * 170, 60)), a);
    // Blackboard's dark emphasis fills (selected toggles, chips, active
    // switches) carry white text, so they take the accent fill.
    if (neutral && L < 0.25 && a > 0.85) return 'var(--accent-surface)';
    if (!neutral && L >= 0.85) {
      const rgb = `rgb(${rgba.slice(0, 3).map(Math.round).join(' ')})`;
      return withAlpha(`color-mix(in srgb, var(--page-bg) 82%, ${rgb})`, a);
    }
    return null;
  }
  if (role === 'text' || role === 'icon') {
    if (neutral && L <= 0.6) return withAlpha(ink(pct(L * 70, 45)), a);
    return null;
  }
  // Borders follow the page background, never a fixed grey: light hairlines →
  // hue-matched page border; grey input outlines (MUI #666) → the page border
  // with a touch of ink so fields stay findable; translucent black (MUI hover
  // outlines, dividers) → the same blend, stronger as its opacity rises.
  if (neutral && L >= 0.6) {
    const p = pct(((1 - L) / 0.2) * 100, 100);
    return withAlpha(
      p >= 100
        ? 'var(--page-border)'
        : `color-mix(in srgb, var(--page-bg), var(--page-border) ${p}%)`,
      a
    );
  }
  if (neutral && L >= 0.2) {
    return withAlpha('color-mix(in srgb, var(--page-border), var(--page-text-1) 15%)', a);
  }
  if (neutral && a < 1) {
    return `color-mix(in srgb, var(--page-border), var(--page-text-1) ${pct(a * 100, 60)}%)`;
  }
  return null;
}

/**
 * Rewrite one longhand declaration value.
 * Values that already go through var() are Tier 1's job and are skipped.
 * @param {string} prop  lower-case longhand property name
 * @param {string} value
 * @param {(rgba: number[]) => (-1|0|1|null)} [brandOf]
 * @returns {string | null} new value, or null when nothing changed
 */
export function remapValue(prop, value, brandOf) {
  const role = ROLES[prop];
  if (!role || !value || /var\(/i.test(value)) return null;
  if (role === 'gradient') {
    // Only colour stops inside gradients; image URLs are never touched.
    if (!/gradient\(/i.test(value) || /url\(/i.test(value)) return null;
    let changed = false;
    const out = value.replace(COLOR_TOKEN, (token) => {
      const rgba = parseColor(token);
      const next = rgba && mapColor(rgba, 'bg', brandOf);
      if (!next) return token;
      changed = true;
      return next;
    });
    return changed ? out : null;
  }
  const rgba = parseColor(value);
  return rgba ? mapColor(rgba, role, brandOf) : null;
}
