// ═════════════════════════════════════════════════════════
//  Bb Atelier — Theme Tab UI
//  Handles color pickers, appearance radio, font upload,
//  theme presets, slots, and preview on hover
// ═════════════════════════════════════════════════════════

import { derivePalette } from '../theme/palette.js';
import { applyThemeToBb, resetThemeOnBb, applyFont, previewThemeOnBb, restoreThemeOnBb } from '../messaging/themeMessaging.js';
import { MAX_FONT_SIZE, validateFileSize } from '../utils/sanitization.js';
import { DEFAULT_BG, DEFAULT_ACCENT, DEFAULT_NAVBAR } from '../utils/constants.js';
import { PRESET_THEMES } from '../theme/presets.js';
import { showToast, debounce } from '../utils/ui.js';

/**
 * Initialize the Theme tab UI (colour pickers, appearance toggle, font, apply button)
 */
export function initTheme() {
  renderPresets();
  setupMasterToggle();

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
      chrome.storage.local.set({ font: e.target.value });
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
      chrome.storage.local.set({ font: dataUrl, fontName: file.name }, () => {
        applyFont(dataUrl);
      });
    };
    reader.onerror = () => {
      alert('Failed to read font file. The file may be corrupted.');
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
    showToast('Theme applied');
  });
}

// ─── Preset Themes ───────────────────────────────────────

const debouncedPreview = debounce((preset) => {
  const { overrides, darkOverrides, staticVars } = derivePalette(
    preset.pageBg, preset.accent, preset.navbar,
  );
  previewThemeOnBb(overrides, darkOverrides, staticVars);
}, 150);

function renderPresets() {
  const grid = document.getElementById('presetGrid');
  grid.innerHTML = PRESET_THEMES.map((preset, i) => `
    <div class="preset-card" data-index="${i}">
      <div class="preset-swatches">
        <span class="preset-swatch" style="background:${preset.pageBg}"></span>
        <span class="preset-swatch" style="background:${preset.navbar}"></span>
        <span class="preset-swatch" style="background:${preset.accent}"></span>
      </div>
      <span class="preset-name">${preset.name}</span>
    </div>
  `).join('');

  grid.querySelectorAll('.preset-card').forEach((card) => {
    const index = parseInt(card.dataset.index, 10);
    const preset = PRESET_THEMES[index];

    card.addEventListener('mouseenter', () => debouncedPreview(preset));
    card.addEventListener('mouseleave', () => restoreThemeOnBb());

    card.addEventListener('click', () => {
      document.getElementById('pageBgPicker').value = preset.pageBg;
      document.getElementById('activeTabGlowPicker').value = preset.accent;
      document.getElementById('navbarPicker').value = preset.navbar;

      document.querySelector('input[name="appearance"][value="custom"]').click();
      applyCurrentTheme();

      grid.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });
}

// ─── Master Toggle ───────────────────────────────────────

function setupMasterToggle() {
  const toggle = document.getElementById('masterToggle');

  chrome.storage.sync.get(['masterEnabled'], (data) => {
    const enabled = data.masterEnabled !== false;
    toggle.checked = enabled;
    document.body.classList.toggle('master-off', !enabled);
  });

  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.storage.sync.set({ masterEnabled: enabled });
    document.body.classList.toggle('master-off', !enabled);

    if (enabled) {
      sendToTab({ action: 'enableAll' });
      const isCustom = document.querySelector('input[name="appearance"]:checked').value === 'custom';
      if (isCustom) {
        applyCurrentTheme();
      }
      chrome.storage.local.get(['font'], (data) => {
        if (data.font) {
          applyFont(data.font);
        }
      });
    } else {
      sendToTab({ action: 'disableAll' });
    }
  });
}

function sendToTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {});
  });
}
