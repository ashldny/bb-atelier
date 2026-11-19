// "Match my device": keep one light and one dark theme, and let the page follow the
// device's light/dark mode. Applying any theme while this is on fills the slot for its
// brightness (theme.js → applyCurrentTheme); the content script picks the slot to paint.
import { PRESET_THEMES } from '../theme/presets.js';
import { isDark } from '../theme/colorUtils.js';
import { paletteOf, schemeSlot } from '../theme/settings.js';
import { setPaletteInputs, readPalette } from './theme.js';
import { showToast } from '../utils/ui.js';

const SCHEME_KEYS = ['followSystem', 'lightPalette', 'darkPalette'];
const deviceIsDark = () => matchMedia('(prefers-color-scheme: dark)').matches;
const same = (a, b) =>
  !!a && !!b && ['pageBg', 'accent', 'navbar', 'pageText'].every((key) => a[key] === b[key]);
const presetPalette = (preset) =>
  paletteOf({ ...preset, navbar: preset.navbar || null, pageText: preset.pageText || null });

export function initSystemScheme(initial) {
  const toggle = document.getElementById('followSystemToggle');
  const state = Object.fromEntries(SCHEME_KEYS.map((key) => [key, initial[key]]));

  // The two slot presets carry the selected outline; no extra note is needed.
  function render() {
    const on = state.followSystem === true;
    toggle.checked = on;
    const light = paletteOf(state.lightPalette);
    const dark = paletteOf(state.darkPalette);
    document.querySelectorAll('.preset-card').forEach((card) => {
      const palette = presetPalette(PRESET_THEMES[Number(card.dataset.index)]);
      card.classList.toggle('scheme-slot', on && (same(palette, light) || same(palette, dark)));
    });
  }

  toggle.addEventListener('change', async () => {
    const on = toggle.checked;
    try {
      if (on) {
        // Start from the current theme, and the first built-in preset for the other mode.
        const current = paletteOf(readPalette());
        const fallback = (darkMode) =>
          presetPalette(PRESET_THEMES.find((preset) => isDark(preset.pageBg) === darkMode));
        const slots = {
          lightPalette: paletteOf(state.lightPalette) || fallback(false),
          darkPalette: paletteOf(state.darkPalette) || fallback(true),
          [schemeSlot(current)]: current,
        };
        await chrome.storage.sync.set({ followSystem: true, ...slots });
        showToast('Now matching your device’s light and dark mode');
      } else {
        // Keep showing what the page shows now, so turning this off changes nothing.
        const shown = paletteOf(state[deviceIsDark() ? 'darkPalette' : 'lightPalette']);
        await chrome.storage.sync.set({ followSystem: false, ...(shown || {}) });
        if (shown) setPaletteInputs({ ...shown, customMode: true });
      }
    } catch {
      toggle.checked = !on;
      showToast('Could not save this setting.', 'error');
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !SCHEME_KEYS.some((key) => key in changes)) return;
    for (const key of SCHEME_KEYS) if (key in changes) state[key] = changes[key].newValue;
    render();
  });
  render();
}
