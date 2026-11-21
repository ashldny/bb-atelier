// ═════════════════════════════════════════════════════════
//  Bb Atelier — Sanitization Utilities
// ═════════════════════════════════════════════════════════

export { purgeDarkReaderCss, isDarkReaderFree, sanitizeCss } from './cssSanitizer.js';

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
}

export const MAX_FONT_SIZE = 512 * 1024;
export const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
// Animated GIFs are far larger than stills, so they get their own ceiling.
export const MAX_GIF_SIZE = 8 * 1024 * 1024;

export function imageSizeLimit(mimeType) {
  return /^image\/gif$/i.test(mimeType) ? MAX_GIF_SIZE : MAX_IMAGE_SIZE;
}

const base64Length = (bytes) => Math.ceil(bytes / 3) * 4;

export function validateFileSize(size, limit) {
  return typeof size === 'number' && size > 0 && size <= limit;
}

export function sanitizeUrl(value, { imageOnly = false } = {}) {
  if (typeof value !== 'string') return '';
  const input = value.trim();
  if (/^data:/i.test(input)) {
    if (imageOnly) {
      const match = /^data:(image\/(?:png|jpe?g|gif|webp|avif));base64,[a-zA-Z0-9+/]+=*$/i.exec(input);
      if (!match || input.length > base64Length(imageSizeLimit(match[1])) + 100) return '';
    }
    return input;
  }
  try {
    const url = new URL(input);
    if (['http:', 'https:'].includes(url.protocol)) return url.href;
  } catch {
    /* Invalid URL. */
  }
  return '';
}

export function isValidFont(value) {
  if (typeof value !== 'string') return false;
  if (!value) return true;
  if (/^[a-zA-Z0-9 ]{1,100}$/.test(value)) return true;
  // The CSS generic family contains a hyphen; arbitrary names do not.
  if (value === 'system-ui') return true;
  return (
    /^data:(font\/[\w.+-]+|application\/(octet-stream|x-font-[\w-]+|vnd.ms-opentype));base64,[a-zA-Z0-9+/]+=*$/i.test(
      value
    ) && value.length <= Math.ceil(MAX_FONT_SIZE / 3) * 4 + 100
  );
}

export function cssUrl(value) {
  // CSS string escaping is different from HTML escaping.
  return `url("${String(value).replace(/["\\\n\r\f]/g, (char) => `\\${char.charCodeAt(0).toString(16)} `)}")`;
}
