// Retained export for integrations that refresh popup controls after an import.
import { setPaletteInputs } from './theme.js';
import { restoreFontControl } from './fonts.js';
export async function loadSettings() {
  const [sync, local] = await Promise.all([
    chrome.storage.sync.get(null),
    chrome.storage.local.get(['font', 'fontName', 'textScale']),
  ]);
  setPaletteInputs(sync);
  restoreFontControl(local);
}
