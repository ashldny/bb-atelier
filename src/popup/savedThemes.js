// ═════════════════════════════════════════════════════════
//  Bb Atelier — Saved Themes UI
//  Save, load, and delete custom themes
// ═════════════════════════════════════════════════════════

import { derivePalette } from '../theme/palette.js';
import { applyThemeToBb } from '../messaging/themeMessaging.js';

const DEFAULT_BG = '#ffffff';
const DEFAULT_ACCENT = '#a234b5';
const DEFAULT_NAVBAR = '#262626';

/**
 * Initialize the Saved Themes tab
 */
export function initSaved() {
  document.getElementById('saveCurrentBtn').addEventListener('click', () => {
    const isCustom = document.querySelector('input[name="appearance"]:checked').value === 'custom';
    if (!isCustom) return;

    const name = prompt('Theme name:', 'My Theme');
    if (!name) return;

    const pageBg = document.getElementById('pageBgPicker').value || DEFAULT_BG;
    const accent = document.getElementById('activeTabGlowPicker').value || DEFAULT_ACCENT;
    const navbar = document.getElementById('navbarPicker').value || DEFAULT_NAVBAR;

    chrome.storage.sync.get(['savedThemes'], (data) => {
      const themes = data.savedThemes || {};
      themes[name] = { pageBg, accent, navbar };
      chrome.storage.sync.set({ savedThemes: themes }, renderSaved);
    });
  });
  renderSaved();
}

/**
 * Render the saved themes list
 */
export function renderSaved() {
  chrome.storage.sync.get(['savedThemes'], (data) => {
    const themes = data.savedThemes || {};
    const list = document.getElementById('savedList');
    const keys = Object.keys(themes);

    if (keys.length === 0) {
      list.innerHTML = '<div class="saved-empty">No saved themes yet~</div>';
      return;
    }

    list.innerHTML = keys.map((name) => {
      const t = themes[name];
      const bg = t.pageBg || DEFAULT_BG;
      const accent = t.accent || DEFAULT_ACCENT;
      return `
        <div class="saved-row" data-name="${name}">
          <span class="saved-swatches">
            <span class="mini-swatch" style="background:${bg}"></span>
            <span class="mini-swatch" style="background:${accent}"></span>
          </span>
          <span class="saved-name">${name}</span>
          <button class="btn tiny load-saved" title="Load theme">▶</button>
          <button class="btn tiny danger delete-saved" title="Delete">✕</button>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.load-saved').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.saved-row');
        const name = row.dataset.name;
        chrome.storage.sync.get(['savedThemes'], (data) => {
          const t = data.savedThemes[name];
          if (!t) return;

          document.getElementById('pageBgPicker').value = t.pageBg || DEFAULT_BG;
          document.getElementById('activeTabGlowPicker').value = t.accent || DEFAULT_ACCENT;
          document.getElementById('navbarPicker').value = t.navbar || DEFAULT_NAVBAR;

          document.querySelector('input[name="appearance"][value="custom"]').click();

          const { overrides, darkOverrides, staticVars } = derivePalette(
            t.pageBg || DEFAULT_BG,
            t.accent || DEFAULT_ACCENT,
            t.navbar || DEFAULT_NAVBAR,
          );

          chrome.storage.sync.set({
            customMode: true,
          }, () => {
            applyThemeToBb(overrides, darkOverrides, staticVars);
          });
        });
      });
    });

    list.querySelectorAll('.delete-saved').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.saved-row');
        const name = row.dataset.name;
        chrome.storage.sync.get(['savedThemes'], (data) => {
          const themes = data.savedThemes || {};
          delete themes[name];
          chrome.storage.sync.set({ savedThemes: themes }, renderSaved);
        });
      });
    });
  });
}