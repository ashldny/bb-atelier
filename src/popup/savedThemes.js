// ═════════════════════════════════════════════════════════
//  Bb Atelier — Saved Themes UI
//  Save, load, edit, delete, export, import, and preview custom themes
// + Contrast-badge helper for the Colors sub-tab
// ═════════════════════════════════════════════════════════

import { derivePalette } from '../theme/palette.js';
import { applyThemeToBb, previewThemeOnBb, restoreThemeOnBb, applyFont } from '../messaging/themeMessaging.js';
import { escapeHtml, isValidHex } from '../utils/sanitization.js';
import { DEFAULT_BG, DEFAULT_ACCENT, DEFAULT_NAVBAR } from '../utils/constants.js';
import { showToast, debounce, isValidHex as _isValidHex } from '../utils/ui.js';
import { luminance } from '../theme/colorUtils.js';
import { applyCurrentTheme } from './theme.js';

const debouncedPreview = debounce((theme) => {
  const { overrides, darkOverrides, staticVars } = derivePalette(
    theme.pageBg || DEFAULT_BG,
    theme.accent || DEFAULT_ACCENT,
    theme.navbar || DEFAULT_NAVBAR
  );
  previewThemeOnBb(overrides, darkOverrides, staticVars);
}, 150);

/**
 * Initialize the Saved Themes tab
 */
export function initSaved() {
  document.getElementById('saveCurrentBtn').addEventListener('click', () => openSaveThemePrompt());
  document.getElementById('exportThemesBtn').addEventListener('click', exportThemes);
  document.getElementById('importThemesBtn').addEventListener('click', () => {
    document.getElementById('importThemesFile').click();
  });
  document.getElementById('importThemesFile').addEventListener('change', importThemes);

  renderSaved();
}

/**
 * Custom inline name prompt (replaces window.prompt)
 * Calls `onConfirm(name)` with the trimmed value when confirmed.
 */
function openSaveThemePrompt() {
  const existing = document.getElementById('saveThemePrompt');
  if (existing) existing.remove();

  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'saveThemeInput';
  input.placeholder = 'Theme name';
  input.maxLength = 40;
  Object.assign(input.style, {
    position: 'fixed',
    bottom: '56px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 12px',
    width: '280px',
    background: 'var(--popup-surface)',
    border: '1px solid var(--accent)',
    borderRadius: '8px',
    color: 'var(--popup-text)',
    fontFamily: 'Inter, sans-serif',
    fontSize: '12px',
    zIndex: '9999',
    boxShadow: '0 6px 20px rgba(103,13,47,0.5)',
    outline: 'none',
  });
  input.value = 'My Theme';
  document.body.appendChild(input);

  const overlay = document.createElement('div');
  overlay.id = 'saveThemePrompt';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'transparent',
    zIndex: '9998',
  });

  const cleanup = () => {
    document.removeEventListener('mousedown', onOutside);
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  };

  const confirm = () => {
    const name = input.value.trim().slice(0, 40);
    cleanup();
    if (!name) return;
    saveNamedTheme(name);
  };

  const onKey = (e) => {
    if (e.key === 'Enter') confirm();
    if (e.key === 'Escape') cleanup();
  };
  const onOutside = () => cleanup();

  document.addEventListener('mousedown', onOutside);
  document.addEventListener('keydown', onKey);
  input.focus();
  input.select();
}

function saveNamedTheme(name) {
  const pageBg = document.getElementById('pageBgPicker').value || DEFAULT_BG;
  const accent = document.getElementById('activeTabGlowPicker').value || DEFAULT_ACCENT;
  const navbar = document.getElementById('navbarPicker').value || DEFAULT_NAVBAR;

  chrome.storage.local.get(['font'], (localData) => {
    chrome.storage.sync.get(['savedThemes'], (data) => {
      const themes = data.savedThemes || {};
      themes[name] = {
        pageBg,
        accent,
        navbar,
        font: localData.font || null,
      };
      chrome.storage.sync.set({ savedThemes: themes }, () => {
        renderSaved();
        showToast(`Saved "${name}"`);
      });
    });
  });
}

function fontDisplay(font) {
  if (!font) return { label: 'Inter', cls: 'default' };
  if (font.startsWith('data:')) return { label: 'Upload', cls: 'custom' };
  const map = {
    Inter: 'Inter',
    'system-ui': 'System UI',
    'Segoe UI': 'Segoe UI',
    Roboto: 'Roboto',
    'Noto Serif': 'Noto Serif',
    serif: 'Serif',
    monospace: 'Mono',
  };
  return { label: map[font] || font, cls: 'loaded' };
}

/**
 * Render the saved themes list
 */
export function renderSaved() {
  chrome.storage.local.get(['font'], (localData) => {
    const currentFont = localData.font || null;
    chrome.storage.sync.get(['savedThemes'], (data) => {
      const themes = data.savedThemes || {};
      const list = document.getElementById('savedList');
      const keys = Object.keys(themes);

      if (keys.length === 0) {
        list.innerHTML = '<div class="saved-empty">No saved themes yet</div>';
        return;
      }

      list.innerHTML = keys
        .map((name) => {
          const t = themes[name];
          const bg = t.pageBg || DEFAULT_BG;
          const accent = t.accent || DEFAULT_ACCENT;
          const navbar = t.navbar || DEFAULT_NAVBAR;
          const font = t.font || currentFont || null;
          const safeName = escapeHtml(name);
          const fd = fontDisplay(font);
          return `
          <div class="saved-row" data-name="${safeName}">
            <span class="saved-swatches">
              <span class="mini-swatch" style="background:${bg}" title="Page ${bg}"></span>
              <span class="mini-swatch" style="background:${accent}" title="Accent ${accent}"></span>
              <span class="mini-swatch" style="background:${navbar}" title="Navbar ${navbar}"></span>
              <span class="minifont" data-font-class="${fd.cls}">${escapeHtml(fd.label)}</span>
            </span>
            <span class="saved-name">${safeName}</span>
            <button class="btn tiny load-saved" title="Load theme" aria-label="Load theme">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
            <button class="btn tiny edit-saved" title="Edit theme" aria-label="Edit theme">
              <svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/></svg>
              <svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 3 3 16"/><path d="M2 12l7 7 15-15"/></svg>
            </button>
            <button class="btn tiny danger delete-saved" title="Delete theme" aria-label="Delete theme">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
        `;
        })
        .join('');

      // Hover preview (bg/accent/navbar swatches only)
      list.querySelectorAll('.saved-row').forEach((row) => {
        const name = row.dataset.name;
        const t = themes[name];
        if (!t) return;
        row.addEventListener('mouseenter', () =>
          debouncedPreview({ pageBg: t.pageBg, accent: t.accent, navbar: t.navbar })
        );
        row.addEventListener('mouseleave', () => restoreThemeOnBb());
      });

      // Load
      list.querySelectorAll('.load-saved').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const row = btn.closest('.saved-row');
          const name = row.dataset.name;
          const t = themes[name];
          if (!t) return;
          loadThemeIntoPickers(t);
          chrome.storage.sync.set({ customMode: true }, () => {
            applyCurrentTheme();
            if (t.font) applyFont(t.font);
          });
          showToast(`Loaded "${name}"`);
        });
      });

      // Edit — copy theme into the active pickers so the user can tweak then save
      list.querySelectorAll('.edit-saved').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const row = btn.closest('.saved-row');
          const name = row.dataset.name;
          const t = themes[name];
          if (!t) return;
          loadThemeIntoPickers(t);
          showToast(`Editing "${name}"`);
        });
      });

      // Delete
      list.querySelectorAll('.delete-saved').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const row = btn.closest('.saved-row');
          const name = row.dataset.name;
          if (!confirm(`Delete "${name}"?`)) return;
          delete themes[name];
          chrome.storage.sync.set({ savedThemes: themes }, () => {
            renderSaved();
            showToast(`Deleted "${name}"`);
          });
        });
      });
    });
  });
}

function loadThemeIntoPickers(t) {
  document.getElementById('pageBgPicker').value = t.pageBg || DEFAULT_BG;
  document.getElementById('activeTabGlowPicker').value = t.accent || DEFAULT_ACCENT;
  document.getElementById('navbarPicker').value = t.navbar || DEFAULT_NAVBAR;
  // show the Colors sub-tab
  document.querySelector('.tab-btn[data-tab="theme"]')?.click();
  document.querySelector('.sub-tab-btn[data-subtab="colors"]')?.click();
  updateContrastBadges();
}

/**
 * Re-derive the theme from the *current* pickers and apply (fallback)
 */
export function applyPickers() {
  const pageBg = document.getElementById('pageBgPicker').value || DEFAULT_BG;
  const accent = document.getElementById('activeTabGlowPicker').value || DEFAULT_ACCENT;
  const navbar = document.getElementById('navbarPicker').value || DEFAULT_NAVBAR;
  const { overrides, darkOverrides, staticVars } = derivePalette(pageBg, accent, navbar);
  chrome.storage.sync.set({ customMode: true, pageBg, accent, navbar });
  applyThemeToBb(overrides, darkOverrides, staticVars);
}

/**
 * Update hex labels + contrast badges in the Colors sub-tab
 * based on current picker values.
 */
export function updateContrastBadges() {
  const pairs = [
    { hexId: 'pageBgPicker', hexOut: 'hexPageBg', conOut: 'contrastPageBg', label: 'bg' },
    { hexId: 'activeTabGlowPicker', hexOut: 'hexAccent', conOut: 'contrastAccent', label: 'accent' },
    { hexId: 'navbarPicker', hexOut: 'hexNavbar', conOut: 'contrastNavbar', label: 'navbar' },
  ];
  pairs.forEach((p) => {
    const el = document.getElementById(p.hexId);
    const hexEl = document.getElementById(p.hexOut);
    const conEl = document.getElementById(p.conOut);
    if (!el || !hexEl || !conEl) return;
    const hex = el.value || DEFAULT_BG;
    hexEl.textContent = hex;

    const lum = luminance(hex);
    // text-on-bg contrast: dark bg (<.18) takes white text → good; light bg (>.8) takes dark text → good
    let ok, msg;
    if (p.label === 'bg' || p.label === 'navbar') {
      if (lum < 0.18 || lum > 0.8) { ok = true; msg = 'Good'; }
      else { ok = false; msg = 'Low'; }
    } else {
      // accent: treat as body color, ensure readable against both
      ok = lum > 0.2 && lum < 0.8;
      msg = ok ? 'Good' : 'Low';
    }
    conEl.textContent = msg;
    conEl.className = 'swatch-contrast ' + (ok ? 'ok' : 'warn');
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
        font: t.font || null,
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
          if (
            t.name &&
            t.pageBg &&
            t.accent &&
            t.navbar &&
            isValidHex(t.pageBg) &&
            isValidHex(t.accent) &&
            isValidHex(t.navbar)
          ) {
            themes[t.name] = {
              pageBg: t.pageBg,
              accent: t.accent,
              navbar: t.navbar,
              font: t.font || null,
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
