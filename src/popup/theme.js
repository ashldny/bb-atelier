// ═════════════════════════════════════════════════════════
//  Bb Atelier — Theme Tab UI
//  Handles color pickers, font upload and theme presets
//  Presets / Colors / Font are sub-tabs inside Theme
// ═════════════════════════════════════════════════════════

import { derivePalette } from '../theme/palette.js';
import {
  applyThemeToBb,
  applyFont,
} from '../messaging/themeMessaging.js';
import { MAX_FONT_SIZE, validateFileSize } from '../utils/sanitization.js';
import { DEFAULT_BG, DEFAULT_ACCENT, DEFAULT_NAVBAR } from '../utils/constants.js';
import { PRESET_THEMES } from '../theme/presets.js';
import { showToast } from '../utils/ui.js';
import { updateContrastBadges } from './savedThemes.js';

/**
 * Initialize the Theme tab UI (colour pickers, font, presets)
 */
export function initTheme() {
  renderPresets();
  setupMasterToggle();
  setupSubTabs();
  setupAutoApply();
  updateContrastBadges();

  // Font — live preview + apply on select change
  const fontSelect = document.getElementById('fontSelect');
  const fontUpload = document.getElementById('fontUpload');

  fontSelect.addEventListener('change', (e) => {
    const masterToggle = document.getElementById('masterToggle');
    if (masterToggle && !masterToggle.checked) return;
    const val = e.target.value;
    if (val && val !== 'custom') {
      applyFont(val);
      chrome.storage.local.set({ font: val, fontName: val });
      updateFontPreviewLive(val);
    }
  });

  // Upload Font — separate button (icon in HTML)
  document.getElementById('fontUploadBtn').addEventListener('click', () => {
    fontUpload.click();
  });

  fontUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Validate font file by extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext)) {
      showToast('Invalid font file type', 'error');
      e.target.value = '';
      return;
    }
    if (!validateFileSize(file.size, MAX_FONT_SIZE)) {
      showToast('Font too large — max 512KB', 'error');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      // Binary blobs stored in local (sync caps at ~100KB per item)
      chrome.storage.local.set({ font: dataUrl, fontName: file.name }, () => {
        applyFont(dataUrl);
        addUploadedFontOption(file.name, dataUrl);
        updateFontPreviewLive(dataUrl);
      });
    };
    reader.onerror = () => {
      showToast('Failed to read font file', 'error');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
}

/**
 * Update the live font preview element
 * @param {string} font - family name or data-url
 */
export function updateFontPreviewLive(font) {
  const preview = document.getElementById('fontPreview');
  if (!preview) return;
  if (font.startsWith('data:')) {
    preview.style.fontFamily = 'CustomFont, sans-serif';
    let face = document.getElementById('bb-preview-face');
    if (!face) {
      face = document.createElement('style');
      face.id = 'bb-preview-face';
      document.head.appendChild(face);
    }
    face.textContent = `@font-face{font-family:'CustomFont';src:url('${font}') format('truetype');}`;
  } else {
    preview.style.fontFamily = font;
  }
}

/**
 * Add an uploaded font to the grouped select and select it
 * @param {string} name - human label
 * @param {string} dataUrl - data-url value
 */
function addUploadedFontOption(name, dataUrl) {
  const group = document.getElementById('fontUploadGroup');
  const select = document.getElementById('fontSelect');
  if (!group || !select) return;
  group.style.display = 'block';
  const opt = document.createElement('option');
  opt.value = dataUrl;
  opt.textContent = name;
  group.appendChild(opt);
  select.value = dataUrl;
}

/**
 * Sub-navbar inside Theme tab: Presets | Colors | Font
 */
function setupSubTabs() {
  const btns = document.querySelectorAll('.sub-tab-btn');
  const panels = document.querySelectorAll('.sub-content');
  if (!btns.length || !panels.length) return;
  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.subtab;
      btns.forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      panels.forEach((p) => {
        p.classList.toggle('active', p.dataset.subtab === target);
      });
    });
  });
}

/**
 * Auto-apply theme when any color picker changes (replaces Apply button)
 * Debounced to avoid spamming storage/messaging on drag
 */
function setupAutoApply() {
  const ids = ['pageBgPicker', 'activeTabGlowPicker', 'navbarPicker'];
  let timer = null;
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        applyCurrentTheme();
        updateContrastBadges();
      }, 80);
    });
    el.addEventListener('change', () => {
      clearTimeout(timer);
      applyCurrentTheme();
      updateContrastBadges();
    });
  });
}

/**
 * Enable / disable the colour picker section (kept for compat)
 * @param {boolean} _enabled
 */
export function toggleColorSection(_enabled) {
  // no-op: colors now in sub-tab, always visible when sub-tab active
}

/**
 * Read the current colour pickers, derive palette, apply theme
 */
export function applyCurrentTheme() {
  const masterToggle = document.getElementById('masterToggle');
  if (masterToggle && !masterToggle.checked) return;
  const pageBg = document.getElementById('pageBgPicker').value || DEFAULT_BG;
  const accent = document.getElementById('activeTabGlowPicker').value || DEFAULT_ACCENT;
  const navbar = document.getElementById('navbarPicker').value || DEFAULT_NAVBAR;

  const { overrides, darkOverrides, staticVars } = derivePalette(pageBg, accent, navbar);

  chrome.storage.sync.set(
    {
      customMode: true,
      pageBg: pageBg,
      accent: accent,
      navbar: navbar,
    },
    () => {
      applyThemeToBb(overrides, darkOverrides, staticVars);
      updateContrastBadges();
      showToast('Theme applied');
    }
  );
}

// ─── Preset Themes — split Light / Dark, click to apply only (no hover preview) ───

function isLightPreset(preset) {
  const hex = preset.pageBg.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6;
}

function renderPresets() {
  const lightGrid = document.getElementById('presetGridLight');
  const darkGrid = document.getElementById('presetGridDark');
  if (!lightGrid || !darkGrid) return;

  const light = PRESET_THEMES.filter(isLightPreset);
  const dark = PRESET_THEMES.filter((p) => !isLightPreset(p));

  function cardHtml(preset, i) {
    return `
    <div class="preset-card" data-index="${i}">
      <div class="preset-dots">
        <span class="preset-dot" style="background:${preset.pageBg}"></span>
        <span class="preset-dot" style="background:${preset.navbar}"></span>
        <span class="preset-dot" style="background:${preset.accent}"></span>
      </div>
      <span class="preset-name">${preset.name}</span>
    </div>
  `;
  }

  const lightHtml = light.map((p) => cardHtml(p, PRESET_THEMES.indexOf(p))).join('');
  const darkHtml = dark.map((p) => cardHtml(p, PRESET_THEMES.indexOf(p))).join('');
  lightGrid.innerHTML = lightHtml;
  darkGrid.innerHTML = darkHtml;

  function bindGrid(grid) {
    grid.querySelectorAll('.preset-card').forEach((card) => {
      const index = parseInt(card.dataset.index, 10);
      const preset = PRESET_THEMES[index];
      card.addEventListener('click', () => {
        document.getElementById('pageBgPicker').value = preset.pageBg;
        document.getElementById('activeTabGlowPicker').value = preset.accent;
        document.getElementById('navbarPicker').value = preset.navbar;
        applyCurrentTheme();
        document.querySelectorAll('.preset-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
      });
    });
  }
  bindGrid(lightGrid);
  bindGrid(darkGrid);
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
      applyCurrentTheme();
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
