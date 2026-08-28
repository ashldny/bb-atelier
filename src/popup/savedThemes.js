// ═════════════════════════════════════════════════════════
//  Bb Atelier — Saved Themes UI
//  Save, load, delete, export, import, and preview custom themes
// ═════════════════════════════════════════════════════════

import { derivePalette } from '../theme/palette.js';
import { applyThemeToBb, previewThemeOnBb, restoreThemeOnBb } from '../messaging/themeMessaging.js';
import { escapeHtml } from '../utils/sanitization.js';
import { DEFAULT_BG, DEFAULT_ACCENT, DEFAULT_NAVBAR } from '../utils/constants.js';
import { showToast, debounce, isValidHex } from '../utils/ui.js';

const debouncedPreview = debounce((theme) => {
  const { overrides, darkOverrides, staticVars } = derivePalette(
    theme.pageBg || DEFAULT_BG,
    theme.accent || DEFAULT_ACCENT,
    theme.navbar || DEFAULT_NAVBAR,
  );
  previewThemeOnBb(overrides, darkOverrides, staticVars);
}, 150);

/**
 * Initialize the Saved Themes tab
 */
export function initSaved() {
  document.getElementById('saveCurrentBtn').addEventListener('click', () => {
    const isCustom = document.querySelector('input[name="appearance"]:checked').value === 'custom';
    if (!isCustom) {
      showToast('Switch to Custom mode first', 'error');
      return;
    }

    const name = prompt('Theme name:', 'My Theme');
    if (!name) return;

    const trimmed = name.trim().slice(0, 40);
    if (!trimmed) return;

    const pageBg = document.getElementById('pageBgPicker').value || DEFAULT_BG;
    const accent = document.getElementById('activeTabGlowPicker').value || DEFAULT_ACCENT;
    const navbar = document.getElementById('navbarPicker').value || DEFAULT_NAVBAR;

    chrome.storage.sync.get(['savedThemes'], (data) => {
      const themes = data.savedThemes || {};
      themes[trimmed] = { pageBg, accent, navbar };
      chrome.storage.sync.set({ savedThemes: themes }, () => {
        renderSaved();
        showToast(`Saved "${trimmed}"`);
      });
    });
  });

  document.getElementById('exportThemesBtn').addEventListener('click', exportThemes);
  document.getElementById('importThemesBtn').addEventListener('click', () => {
    document.getElementById('importThemesFile').click();
  });
  document.getElementById('importThemesFile').addEventListener('change', importThemes);

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
      const safeName = escapeHtml(name);
      return `
        <div class="saved-row" data-name="${safeName}">
          <span class="saved-swatches">
            <span class="mini-swatch" style="background:${bg}"></span>
            <span class="mini-swatch" style="background:${accent}"></span>
          </span>
          <span class="saved-name">${safeName}</span>
          <button class="btn tiny load-saved" title="Load theme">▶</button>
          <button class="btn tiny danger delete-saved" title="Delete">✕</button>
        </div>
      `;
    }).join('');

    // Hover preview
    list.querySelectorAll('.saved-row').forEach((row) => {
      const name = row.dataset.name;
      const t = themes[name];
      if (!t) return;

      row.addEventListener('mouseenter', () => debouncedPreview(t));
      row.addEventListener('mouseleave', () => restoreThemeOnBb());
    });

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
            showToast(`Loaded "${name}"`);
          });
        });
      });
    });

    list.querySelectorAll('.delete-saved').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.saved-row');
        const name = row.dataset.name;
        if (!confirm(`Delete "${name}"?`)) return;
        chrome.storage.sync.get(['savedThemes'], (data) => {
          const themes = data.savedThemes || {};
          delete themes[name];
          chrome.storage.sync.set({ savedThemes: themes }, () => {
            renderSaved();
            showToast(`Deleted "${name}"`, 'info');
          });
        });
      });
    });
  });
}

// ─── Export / Import ──────────────────────────────────────

function exportThemes() {
  chrome.storage.sync.get(['savedThemes'], (data) => {
    const themes = data.savedThemes || {};
    const exportData = {
      version: 1,
      themes: Object.entries(themes).map(([name, t]) => ({
        name,
        pageBg: t.pageBg || DEFAULT_BG,
        accent: t.accent || DEFAULT_ACCENT,
        navbar: t.navbar || DEFAULT_NAVBAR,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bb-atelier-themes.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Themes exported');
  });
}

function importThemes(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.themes || !Array.isArray(data.themes)) {
        showToast('Invalid theme file format', 'error');
        return;
      }

      chrome.storage.sync.get(['savedThemes'], (existing) => {
        const themes = existing.savedThemes || {};
        let imported = 0;

        data.themes.forEach((t) => {
          if (t.name && t.pageBg && t.accent && t.navbar
              && isValidHex(t.pageBg) && isValidHex(t.accent) && isValidHex(t.navbar)) {
            themes[t.name] = {
              pageBg: t.pageBg,
              accent: t.accent,
              navbar: t.navbar,
            };
            imported++;
          }
        });

        chrome.storage.sync.set({ savedThemes: themes }, () => {
          renderSaved();
          showToast(`Imported ${imported} theme(s)`);
        });
      });
    } catch {
      showToast('Failed to parse theme file', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
