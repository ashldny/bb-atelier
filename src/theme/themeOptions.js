// ═════════════════════════════════════════════════════════
//  Bb Atelier — General options stored under `bbTheme`
//  (chrome.storage.sync). Palette colours live in their own keys.
// ═════════════════════════════════════════════════════════

export const DEFAULT_THEME = {
  autoApply: true,
  showToast: true,
  // Optional custom domain (e.g. blackboard.myuniversity.edu)
  customDomain: '',
};

/**
 * Validate / normalize a raw bbTheme object from storage or an imported backup.
 * Unknown keys (including the retired Dark Reader fields) are dropped.
 * @param {object} raw
 * @returns {{autoApply: boolean, showToast: boolean, customDomain: string}}
 */
export function normalizeTheme(raw = {}) {
  raw = raw && typeof raw === 'object' ? raw : {};
  return {
    autoApply: raw.autoApply !== false,
    showToast: raw.showToast !== false,
    customDomain:
      typeof raw.customDomain === 'string'
        ? raw.customDomain.trim().slice(0, 200)
        : DEFAULT_THEME.customDomain,
  };
}
