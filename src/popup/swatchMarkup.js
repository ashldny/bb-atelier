import { sidebarShade } from '../theme/colorUtils.js';
import { escapeHtml } from '../utils/sanitization.js';

/** Page, sidebar and accent as three narrow chips (saved themes, gallery, share dialog). */
export function paletteSwatches(theme) {
  const colors = [theme.pageBg, theme.navbar || sidebarShade(theme.pageBg), theme.accent];
  return `<span class="saved-swatches" aria-hidden="true">${colors
    .map((color) => `<span class="mini-swatch" style="background:${escapeHtml(color)}"></span>`)
    .join('')}</span>`;
}
