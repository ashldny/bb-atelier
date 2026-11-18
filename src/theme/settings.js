import { DEFAULT_SETTINGS } from '../utils/constants.js';
import { isValidHex } from '../utils/ui.js';

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
