// ═════════════════════════════════════════════════════════
//  Bb Atelier — Theme Tab UI
//  Handles color pickers, appearance radio, font upload
// ═════════════════════════════════════════════════════════

import { derivePalette } from '../theme/palette.js';
import { applyThemeToBb, resetThemeOnBb, applyFont } from '../messaging/themeMessaging.js';
import { MAX_FONT_SIZE, validateFileSize } from '../utils/sanitization.js';
import { DEFAULT_BG, DEFAULT_ACCENT, DEFAULT_NAVBAR } from '../utils/constants.js';

/**
 * Initialize the Theme tab UI (colour pickers, appearance toggle, font, apply button)
 */
export function initTheme() {
  // Appearance radio
  document.querySelectorAll('input[name="appearance"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const isCustom = radio.value === 'custom';
      chrome.storage.sync.set({ customMode: isCustom }, () => {
        toggleColorSection(isCustom);
        if (isCustom) {
          applyCurrentTheme();
        } else {
          resetThemeOnBb();
        }
      });
    });
  });

  // Apply button
  document.getElementById('applyThemeBtn').addEventListener('click', () => {
    const isCustom = document.querySelector('input[name="appearance"]:checked').value === 'custom';
    if (!isCustom) return;
    applyCurrentTheme();
  });

  // Font
  document.getElementById('fontSelect').addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      document.getElementById('fontUpload').click();
    } else {
      applyFont(e.target.value);
      chrome.storage.sync.set({ font: e.target.value });
    }
  });

  document.getElementById('fontUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!validateFileSize(file.size, MAX_FONT_SIZE)) {
      alert('Font file too large. Maximum size is 512KB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      chrome.storage.sync.set({ font: dataUrl, fontName: file.name }, () => {
        applyFont(dataUrl);
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
}

/**
 * Enable / disable the colour picker section
 * @param {boolean} enabled
 */
export function toggleColorSection(enabled) {
  const el = document.getElementById('colorSection');
  el.style.opacity = enabled ? '1' : '0.35';
  el.style.pointerEvents = enabled ? 'auto' : 'none';
}

/**
 * Read the current colour pickers, derive palette, apply theme
 */
export function applyCurrentTheme() {
  const pageBg = document.getElementById('pageBgPicker').value || DEFAULT_BG;
  const accent = document.getElementById('activeTabGlowPicker').value || DEFAULT_ACCENT;
  const navbar = document.getElementById('navbarPicker').value || DEFAULT_NAVBAR;

  const { overrides, darkOverrides, staticVars } = derivePalette(pageBg, accent, navbar);

  chrome.storage.sync.set({
    customMode: true,
    pageBg: pageBg,
    accent: accent,
    navbar: navbar,
  }, () => {
    applyThemeToBb(overrides, darkOverrides, staticVars);
  });
}