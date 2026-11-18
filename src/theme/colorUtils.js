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
  const cleaned = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h.substring(0, 6);
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
  return (
    '#' +
    [r, g, b]
      .map((c) =>
        Math.min(255, Math.max(0, Math.round(c)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
      .substring(0, 7)
  );
}

/**
 * Calculate relative luminance of a hex color (WCAG)
 * @param {string} hex
 * @returns {number} 0 (dark) — 1 (light)
 */
export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rs = r / 255,
    gs = g / 255,
    bs = b / 255;
  const toLin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
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
    c1.b + (c2.b - c1.b) * ratio
  );
}

/**
 * Pick black or white text for best contrast on a background
 * @param {string} bgHex
 * @returns {string}
 */
export function contrastText(bgHex) {
  const value = luminance(bgHex);
  return 1.05 / (value + 0.05) >= (value + 0.05) / 0.05 ? '#ffffff' : '#000000';
}

export function contrastRatio(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

/**
 * Mix two colors using CSS color-mix semantics (sRGB space)
 * @param {string} color1 - Base color (e.g., var(--page-text-1))
 * @param {string} color2 - Mix color (e.g., '#ffffff')
 * @param {number} ratio - Ratio of color2 (0 = all color1, 1 = all color2)
 *                         Matches CSS: color-mix(in srgb, color1 (1-ratio)*100%, color2 ratio*100%)
 * @returns {string} Mixed hex color
 */
export function colorMix(color1, color2, ratio) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const inv = 1 - ratio;
  return rgbToHex(c1.r * inv + c2.r * ratio, c1.g * inv + c2.g * ratio, c1.b * inv + c2.b * ratio);
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

/**
 * Nudge a colour toward white (on dark backgrounds) or black (on light ones)
 * until it reaches the target contrast ratio. Keeps the hue recognisable.
 * @param {string} hex - foreground colour
 * @param {string} bgHex - background it sits on
 * @param {number} [min=4.5] - WCAG AA for normal text
 * @returns {string}
 */
export function readableOn(hex, bgHex, min = 4.5) {
  const target = isDark(bgHex) ? '#ffffff' : '#000000';
  for (let step = 0; step <= 20; step++) {
    const candidate = mix(hex, target, step / 20);
    if (contrastRatio(candidate, bgHex) >= min) return candidate;
  }
  return target;
}

/**
 * Convert a hex colour to HSL (h 0-360, s 0-1, l 0-1).
 * @param {string} hex
 * @returns {{h: number, s: number, l: number}}
 */
export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

/**
 * Convert HSL back to hex.
 * @param {{h: number, s: number, l: number}} hsl
 * @returns {string}
 */
export function hslToHex({ h, s, l }) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

/**
 * Shift a colour's lightness while keeping its hue and saturation, so
 * derived surfaces stay in the same monochrome family.
 * @param {string} hex
 * @param {number} delta - lightness change, -1..1
 * @returns {string}
 */
export function shade(hex, delta) {
  const { h, s, l } = hexToHsl(hex);
  const next = Math.min(1, Math.max(0, l + delta));
  // Keep chroma (perceived colourfulness) rather than saturation, otherwise
  // a barely-tinted page like #f0fdf4 turns into a vivid mint when darkened.
  const chroma = s * (1 - Math.abs(2 * l - 1));
  const room = 1 - Math.abs(2 * next - 1);
  const sat = room > 0 ? Math.min(s, chroma / room) : 0;
  return hslToHex({ h, s: sat, l: next });
}

/**
 * The automatic sidebar colour: a darker member of the page background's
 * own hue family. Light pages get a clearly darker tint; dark pages sink
 * toward black without losing their hue.
 * @param {string} pageBg
 * @returns {string}
 */
export function sidebarShade(pageBg) {
  const { l } = hexToHsl(pageBg);
  return isDark(pageBg) ? shade(pageBg, -Math.min(l * 0.45, 0.08)) : shade(pageBg, -0.13);
}

/**
 * Hairline colour for borders and dividers: the page background nudged
 * toward its contrasting side, hue preserved.
 * @param {string} pageBg
 * @returns {string}
 */
export function borderShade(pageBg) {
  return shade(pageBg, isDark(pageBg) ? 0.14 : -0.16);
}
