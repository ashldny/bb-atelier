// ═════════════════════════════════════════════════════════
//  Bb Atelier — Literal colour remapping (Tier 3)
//
//  Blackboard Ultra renders much of its UI with CSS-in-JS (MUI/emotion
//  `.muiltr-xxxx`, JSS `.makeStyles*-0-2-N`, CSS modules `.main_9896f174`).
//  Those rules bake literal colours (#fff, #f8f8f8, #262626…) instead of
//  var(--palette-*), and their class names change on every page load, so
//  hand-written Tier 2 selectors drift out of date.
//
//  This module rewrites a single CSS declaration value so that literal
//  *neutral* colours resolve through the canonical theme tokens. Saturated
//  colours (status, grades, brand) are left untouched; pale tints are blended
//  into the page background so banners keep their hue but stop glowing white.
//
//  Pure: no DOM access. The runtime walker lives in content/ruleRemapper.js.
// ═════════════════════════════════════════════════════════

const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1] };
const COLOR_TOKEN = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/gi;

const BG_PROPS = new Set(['background-color', 'background']);
const TEXT_PROPS = new Set(['color', '-webkit-text-fill-color']);
const BORDER_PROPS = new Set([
  'border',
  'border-color',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'column-rule-color',
]);

export const REMAPPED_PROPS = [...BG_PROPS, ...TEXT_PROPS, ...BORDER_PROPS];

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

const lightness = ([r, g, b]) => (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
const chroma = ([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
const pct = (n, max) => Math.round(Math.min(max, Math.max(0, n)));

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

/**
 * Map one colour literal to a token expression for the given role.
 * @param {number[]} rgba
 * @param {'bg'|'text'|'border'} role
 * @returns {string | null} replacement, or null to keep the original
 */
export function mapColor(rgba, role) {
  const a = rgba[3];
  if (a <= 0.02) return null;
  const L = lightness(rgba);
  const neutral = chroma(rgba) < 0.08;

  if (role === 'bg') {
    if (neutral && L >= 0.35) return withAlpha(surface(pct((1 - L) * 160, 60)), a);
    if (!neutral && L >= 0.85) {
      const hex = `rgb(${rgba.slice(0, 3).map(Math.round).join(' ')})`;
      return withAlpha(`color-mix(in srgb, var(--page-bg) 82%, ${hex})`, a);
    }
    return null;
  }
  if (role === 'text') {
    if (neutral && L <= 0.6) return withAlpha(ink(pct(L * 70, 45)), a);
    return null;
  }
  if (neutral && L >= 0.45) return withAlpha(surface(pct((1 - L) * 140, 70)), a);
  return null;
}

function roleFor(prop) {
  if (BG_PROPS.has(prop)) return 'bg';
  if (TEXT_PROPS.has(prop)) return 'text';
  if (BORDER_PROPS.has(prop)) return 'border';
  return null;
}

/**
 * Rewrite a declaration value, replacing remappable colour literals.
 * Values that already go through var() are Tier 1's job and are skipped.
 * @param {string} prop  lower-case property name
 * @param {string} value
 * @returns {string | null} new value, or null when nothing changed
 */
export function remapValue(prop, value) {
  const role = roleFor(prop);
  if (!role || !value || /var\(|url\(|gradient\(/i.test(value)) return null;
  let changed = false;
  const out = value.replace(COLOR_TOKEN, (token) => {
    const rgba = parseColor(token);
    const next = rgba && mapColor(rgba, role);
    if (!next) return token;
    changed = true;
    return next;
  });
  return changed ? out : null;
}
