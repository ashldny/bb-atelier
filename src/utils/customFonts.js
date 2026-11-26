import { isValidFont } from './sanitization.js';

// Uploaded fonts, kept in local.customFonts as [{ name, font }] (font = data: URL), newest
// first, so they stay in the Typeface menu after you switch to another font.
export const MAX_CUSTOM_FONTS = 5;

const isUploaded = (font) =>
  typeof font === 'string' && font.startsWith('data:') && isValidFont(font);

function cleanName(name) {
  const text =
    typeof name === 'string'
      ? name
          .replace(/\.(ttf|otf|woff2?)$/i, '')
          .trim()
          .slice(0, 100)
      : '';
  return text || 'Uploaded font';
}

/** Valid entries only, duplicates (same file) removed, capped at MAX_CUSTOM_FONTS. */
export function normalizeCustomFonts(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const entry of raw) {
    if (!isUploaded(entry?.font) || seen.has(entry.font)) continue;
    seen.add(entry.font);
    out.push({ name: cleanName(entry.name), font: entry.font });
    if (out.length === MAX_CUSTOM_FONTS) break;
  }
  return out;
}

/** Puts a font at the top of the list (moving it if it is already there). */
export function addCustomFont(list, name, font) {
  if (!isUploaded(font)) return normalizeCustomFonts(list);
  return normalizeCustomFonts([{ name, font }, ...(Array.isArray(list) ? list : [])]);
}

export function customFontName(list, font) {
  return normalizeCustomFonts(list).find((entry) => entry.font === font)?.name || null;
}
