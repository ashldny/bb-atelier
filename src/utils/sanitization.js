// ═════════════════════════════════════════════════════════
//  Bb Atelier — Sanitization Utilities
// ═════════════════════════════════════════════════════════

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
}

export const MAX_FONT_SIZE = 512 * 1024;
export const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export function validateFileSize(size, limit) {
  return typeof size === 'number' && size > 0 && size <= limit;
}
