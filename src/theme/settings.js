import { DEFAULT_SETTINGS } from '../utils/constants.js';
import { isValidHex } from '../utils/ui.js';
import { isDark } from './colorUtils.js';

export function normalizePalette(raw = {}) {
  const color = (key) => (isValidHex(raw[key]) ? raw[key].toLowerCase() : DEFAULT_SETTINGS[key]);
  return {
    customMode: raw.customMode !== false,
    pageBg: color('pageBg'),
    accent: color('accent'),
    // null explicitly requests the automatic sidebar shade.
    navbar: raw.navbar == null ? null : color('navbar'),
    // null explicitly requests automatic text color; missing values keep the default.
    pageText: raw.pageText == null ? null : color('pageText'),
  };
}

/** The four colour choices of a theme, without mode flags. Null when invalid. */
export function paletteOf(raw) {
  if (!raw || !isValidHex(raw.pageBg) || !isValidHex(raw.accent)) return null;
  if (raw.navbar != null && !isValidHex(raw.navbar)) return null;
  if (raw.pageText != null && !isValidHex(raw.pageText)) return null;
  const { pageBg, accent, navbar, pageText } = normalizePalette(raw);
  return { pageBg, accent, navbar, pageText };
}

/** Which "match my device" slot a theme belongs to, by its page brightness. */
export const schemeSlot = (palette) => (isDark(palette.pageBg) ? 'darkPalette' : 'lightPalette');

/**
 * The theme to paint right now. With "match my device" on, the slot for the device's
 * light/dark mode wins over the last-edited colours; a missing slot falls back to them.
 * @param {object} settings stored sync settings
 * @param {boolean} prefersDark whether the device is in dark mode
 */
export function resolvePalette(settings, prefersDark) {
  if (!settings?.followSystem) return settings;
  const slot = paletteOf(settings[prefersDark ? 'darkPalette' : 'lightPalette']);
  return slot ? { ...settings, ...slot } : settings;
}
