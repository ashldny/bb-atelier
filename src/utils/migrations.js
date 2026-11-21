import { normalizeTheme } from '../theme/themeOptions.js';

// Migrate media and theme collections out of sync's 8 KB per-item limit.
export async function migrateLegacyStorage() {
  const [sync, local] = await Promise.all([
    chrome.storage.sync.get(['savedThemes', 'courseCovers', 'bbTheme']),
    chrome.storage.local.get(['savedThemes', 'savedThemeFonts', 'courseCovers']),
  ]);
  const patch = {};
  const remove = [];
  if (sync.savedThemes) {
    patch.savedThemes = { ...sync.savedThemes, ...local.savedThemes };
    for (const [name, theme] of Object.entries(patch.savedThemes)) {
      patch.savedThemes[name] = {
        ...theme,
        font: theme.font || local.savedThemeFonts?.[name] || null,
      };
    }
    remove.push('savedThemes');
  }
  if (sync.courseCovers) {
    patch.courseCovers = { ...sync.courseCovers, ...local.courseCovers };
    remove.push('courseCovers');
  }
  // The Dark Reader engine was removed; drop its leftover fields so only the
  // general options (autoApply, showToast, customDomain) remain.
  if (sync.bbTheme && typeof sync.bbTheme === 'object' && 'engine' in sync.bbTheme) {
    await chrome.storage.sync.set({ bbTheme: normalizeTheme(sync.bbTheme) });
  }
  if (remove.length) {
    await chrome.storage.local.set(patch);
    await chrome.storage.sync.remove(remove);
  }
}
