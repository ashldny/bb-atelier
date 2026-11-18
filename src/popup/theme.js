import { normalizePalette } from '../theme/settings.js';
import { derivePalette } from '../theme/palette.js';
import { contrastText, isDark, sidebarShade } from '../theme/colorUtils.js';
import { PRESET_THEMES } from '../theme/presets.js';
import { sendToTab, previewThemeOnBb, restoreThemeOnBb } from '../messaging/themeMessaging.js';
import { showToast, debounce } from '../utils/ui.js';
import { escapeHtml } from '../utils/sanitization.js';
import { initTabGroup } from './tabs.js';
import { updateContrastBadges } from './contrastBadges.js';
import { initFonts } from './fonts.js';

let palette;
let commitTimer;
const preview = debounce((value) => {
  const { overrides, darkOverrides, staticVars } = derivePalette(
    value.pageBg,
    value.accent,
    value.navbar,
    value.pageText
  );
  previewThemeOnBb(overrides, darkOverrides, staticVars);
}, 100);

export function readPalette() {
  return normalizePalette({
    pageBg: document.getElementById('pageBgPicker').value,
    accent: document.getElementById('activeTabGlowPicker').value,
    navbar: document.getElementById('autoNavbarToggle').checked
      ? null
      : document.getElementById('navbarPicker').value,
    pageText: document.getElementById('autoTextToggle').checked
      ? null
      : document.getElementById('pageTextPicker').value,
  });
}

export function setPaletteInputs(value) {
  palette = normalizePalette(value);
  document.getElementById('pageBgPicker').value = palette.pageBg;
  document.getElementById('activeTabGlowPicker').value = palette.accent;
  document.getElementById('navbarPicker').value = palette.navbar || sidebarShade(palette.pageBg);
  document.getElementById('autoNavbarToggle').checked = palette.navbar === null;
  document.getElementById('navbarPicker').disabled = palette.navbar === null;
  document.getElementById('pageTextPicker').value =
    palette.pageText || contrastText(palette.pageBg);
  document.getElementById('autoTextToggle').checked = palette.pageText === null;
  document.getElementById('pageTextPicker').disabled = palette.pageText === null;
  updateContrastBadges();
  highlightPreset();
}

function highlightPreset() {
  const current = readPalette();
  document.querySelectorAll('.preset-card').forEach((button) => {
    const preset = PRESET_THEMES[Number(button.dataset.index)];
    const selected =
      ['pageBg', 'accent'].every(
        (key) => current[key].toLowerCase() === preset[key].toLowerCase()
      ) &&
      current.navbar === (preset.navbar?.toLowerCase() || null) &&
      current.pageText === (preset.pageText?.toLowerCase() || null);
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

export async function applyCurrentTheme(value = readPalette(), { notify = false } = {}) {
  clearTimeout(commitTimer);
  preview.cancel();
  const next = normalizePalette(value);
  setPaletteInputs(next);
  try {
    await chrome.storage.sync.set(next);
    // Storage updates every open Blackboard tab; this also recovers a missing receiver.
    await sendToTab({ action: 'applyThemeCSS' });
    document.dispatchEvent(new Event('bb-status-change'));
    if (notify) showToast('Theme saved');
  } catch {
    showToast('Could not save the theme. Try again.', 'error');
  }
}

function renderPresets() {
  for (const [name, dark] of [
    ['Light', false],
    ['Dark', true],
  ]) {
    const grid = document.getElementById(`presetGrid${name}`);
    grid.innerHTML = PRESET_THEMES.map((preset, index) => ({ preset, index }))
      .filter(({ preset }) => isDark(preset.pageBg) === dark)
      .map(
        ({
          preset,
          index,
        }) => `<button type="button" class="preset-card" data-index="${index}" aria-pressed="false">
        <span class="preset-mini" aria-hidden="true" style="--mini-bg:${escapeHtml(preset.pageBg)};--mini-nav:${escapeHtml(preset.navbar || sidebarShade(preset.pageBg))};--mini-accent:${escapeHtml(preset.accent)};--mini-text:${escapeHtml(preset.pageText || contrastText(preset.pageBg))}">
          <span class="mini-nav"><span class="mini-nav-item"></span></span>
          <span class="mini-page"><span class="mini-title"></span><span class="mini-line"></span><span class="mini-line short"></span></span>
        </span><span class="preset-name">${escapeHtml(preset.name)}</span>
        <svg class="preset-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>
      </button>`
      )
      .join('');
    grid.querySelectorAll('.preset-card').forEach((card) => {
      const preset = PRESET_THEMES[Number(card.dataset.index)];
      const value = { ...preset, navbar: preset.navbar || null, pageText: preset.pageText || null };
      card.addEventListener('click', () => applyCurrentTheme(value, { notify: true }));
      card.addEventListener('mouseenter', () => {
        if (document.getElementById('masterToggle').checked) preview(value);
      });
      card.addEventListener('mouseleave', () => {
        preview.cancel();
        restoreThemeOnBb();
      });
    });
  }
}

export function initTheme(sync, local) {
  renderPresets();
  setPaletteInputs(sync);
  initFonts(local);
  initTabGroup('.sub-tab-btn', '.sub-content', 'subtab');
  const toggle = document.getElementById('masterToggle');
  const controls = document.getElementById('customizationControls');
  function masterState(enabled) {
    toggle.checked = enabled;
    controls.disabled = !enabled;
    document.getElementById('pausedNotice').hidden = enabled;
    document.body.classList.toggle('master-off', !enabled);
  }
  masterState(sync.masterEnabled !== false);
  toggle.addEventListener('change', async () => {
    const enabled = toggle.checked;
    masterState(enabled);
    try {
      await chrome.storage.sync.set({ masterEnabled: enabled });
      await sendToTab({ action: enabled ? 'enableAll' : 'disableAll' });
      document.dispatchEvent(new Event('bb-status-change'));
    } catch {
      masterState(!enabled);
      showToast('Could not save this change.', 'error');
    }
  });
  for (const id of ['pageBgPicker', 'activeTabGlowPicker', 'navbarPicker', 'pageTextPicker']) {
    const picker = document.getElementById(id);
    picker.addEventListener('input', () => {
      if (id === 'pageBgPicker' && document.getElementById('autoTextToggle').checked) {
        document.getElementById('pageTextPicker').value = contrastText(picker.value);
      }
      if (id === 'pageBgPicker' && document.getElementById('autoNavbarToggle').checked) {
        document.getElementById('navbarPicker').value = sidebarShade(picker.value);
      }
      updateContrastBadges();
      highlightPreset();
      preview(readPalette());
      clearTimeout(commitTimer);
      commitTimer = setTimeout(() => applyCurrentTheme(), 500);
    });
    picker.addEventListener('change', () => applyCurrentTheme());
  }
  document.getElementById('autoTextToggle').addEventListener('change', () => applyCurrentTheme());
  document.getElementById('autoNavbarToggle').addEventListener('change', () => applyCurrentTheme());
}
