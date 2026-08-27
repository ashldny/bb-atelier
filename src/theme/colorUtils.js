// ═════════════════════════════════════════════════════════
//  Bb Atelier — Color Utility Functions
// ═════════════════════════════════════════════════════════

/**
 * Parse a hex color to {r, g, b}
 * @param {string} hex - e.g. "#ff00aa" or "ff00aa"
 * @returns {{r: number, g: number, b: number}}
 */
export function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const cleaned = h.length === 3
    ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    : h.substring(0, 6);
  const n = parseInt(cleaned, 16);
  if (isNaN(n)) return { r: 0, g: 0, b: 0 };
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

/**
 * Convert r, g, b (0-255) to hex string
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string} e.g. "#ff00aa"
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map(c => Math.min(255, Math.max(0, Math.round(c))).toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 7);
}

/**
 * Calculate relative luminance of a hex color (WCAG)
 * @param {string} hex
 * @returns {number} 0 (dark) — 1 (light)
 */
export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rs = r / 255, gs = g / 255, bs = b / 255;
  const toLin = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLin(rs) + 0.7152 * toLin(gs) + 0.0722 * toLin(bs);
}

/**
 * Check if a hex color is dark
 * @param {string} hex
 * @returns {boolean}
 */
export function isDark(hex) {
  return luminance(hex) < 0.5;
}

/**
 * Lighten a hex color by a percentage
 * @param {string} hex
 * @param {number} pct - 0-100
 * @returns {string}
 */
export function lighten(hex, pct) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 + pct / 100;
  return rgbToHex(Math.min(255, r * f), Math.min(255, g * f), Math.min(255, b * f));
}

/**
 * Darken a hex color by a percentage
 * @param {string} hex
 * @param {number} pct - 0-100
 * @returns {string}
 */
export function darken(hex, pct) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - pct / 100;
  return rgbToHex(r * f, g * f, b * f);
}

/**
 * Mix two hex colors by a ratio
 * @param {string} hex1
 * @param {string} hex2
 * @param {number} ratio - 0 (all hex1) to 1 (all hex2)
 * @returns {string}
 */
export function mix(hex1, hex2, ratio) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * ratio,
    c1.g + (c2.g - c1.g) * ratio,
    c1.b + (c2.b - c1.b) * ratio,
  );
}

/**
 * Pick black or white text for best contrast on a background
 * @param {string} bgHex
 * @returns {string}
 */
export function contrastText(bgHex) {
  return isDark(bgHex) ? '#ffffff' : '#262626';
}

/**
 * Brighten (alias for lighten)
 * @param {string} hex
 * @param {number} pct
 * @returns {string}
 */
export function brighten(hex, pct) {
  return lighten(hex, pct);
}