// ═════════════════════════════════════════════════════════
//  Bb Atelier — Settings UI
//  Load and apply saved settings, restore last-used tab
// ═════════════════════════════════════════════════════════

import { toggleColorSection } from './theme.js';
import { updateContrastBadges } from './savedThemes.js';
import { applyFont, updateFontPreviewLive } from '../messaging/themeMessaging.js';

/**
 * Load settings from storage and restore the popup UI state
 */
export function loadSettings() {
  chrome.storage.sync.get(['customMode', 'pageBg', 'accent', 'navbar', 'activeTab'], (sData) => {
    chrome.storage.local.get(['font'], (lData) => {
      const data = { ...sData, ...lData };
      // Appearance toggle removed — always show Colors as custom
      toggleColorSection(true);
      if (data.pageBg) document.getElementById('pageBgPicker').value = data.pageBg;
      if (data.accent) document.getElementById('activeTabGlowPicker').value = data.accent;
      if (data.navbar) document.getElementById('navbarPicker').value = data.navbar;

      // Restore font + live preview
      if (data.font) {
        const sel = document.getElementById('fontSelect');
        const opt = Array.from(sel.options).find((o) => o.value === data.font);
        if (opt) {
          sel.value = data.font;
        }
        // re-apply font to page + refresh popup preview
        try {
          applyFont(data.font);
        } catch {}
        updateFontPreviewLive(data.font);
      }

      updateContrastBadges();

      // Restore active tab
      if (data.activeTab) {
        const safeTab = String(data.activeTab).replace(/[^a-zA-Z0-9_-]/g, '');
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${safeTab}"]`);
        if (tabBtn) tabBtn.click();
      }
    });
  });
}
