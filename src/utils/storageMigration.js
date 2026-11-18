// ═════════════════════════════════════════════════════════
//  Bb Atelier — Storage Migration (Dark Reader purge)
//  One-time self-heal for contaminated cachedCSS.
//  Called from popup boot and from content script fallback.
//  Never reads getComputedStyle — regenerates from palette source.
// ═════════════════════════════════════════════════════════
import { derivePalette } from '../theme/palette.js';
import { buildFullThemeCss } from '../theme/cssBuilder.js';
import { purgeDarkReaderCss, isDarkReaderFree } from './cssSanitizer.js';
import { DEFAULT_BG, DEFAULT_ACCENT, DEFAULT_NAVBAR } from './constants.js';

/**
 * If cachedCSS contains any --darkreader var or var(--darkreader...),
 * regenerate canonical CSS from sync's pageBg/accent/navbar and overwrite.
 * Returns true if migration ran, false if no action needed.
 */
export async function migrateContaminatedCachedCSS() {
  try {
    const local = await chrome.storage.local.get(['cachedCSS']);
    const cached = local.cachedCSS;
    if (!cached || typeof cached !== 'string') return false;
    if (isDarkReaderFree(cached)) return false;

    console.warn('[BbAtelier] migrateContaminatedCachedCSS: contaminated cachedCSS detected — regenerating canonical');

    const sync = await chrome.storage.sync.get(['pageBg', 'accent', 'navbar', 'pageText', 'customMode']);
    const hasCanonical = sync.pageBg || sync.accent || sync.navbar;

    let clean;
    if (sync.customMode !== false && hasCanonical) {
      const pageBg = sync.pageBg || DEFAULT_BG;
      const accent = sync.accent || DEFAULT_ACCENT;
      const navbar = sync.navbar || DEFAULT_NAVBAR;
      const pageText = sync.pageText || null;
      const { overrides, darkOverrides, staticVars } = derivePalette(pageBg, accent, navbar, pageText);
      const canonical = buildFullThemeCss(overrides, darkOverrides, staticVars);
      clean = purgeDarkReaderCss(canonical);
    } else {
      // No canonical theme stored — just purge the contaminated CSS
      clean = purgeDarkReaderCss(cached);
      // If purge left only fallbacks (hex) with no tokens, try to at least fix known affected rule
      // .stream-item::before must be color-mix(var(--page-bg) 85%, white)
      if (!clean.includes('var(--page-bg)')) {
        // Inject minimal canonical if completely token-free and no sync theme — use defaults
        const { overrides, darkOverrides, staticVars } = derivePalette(DEFAULT_BG, DEFAULT_ACCENT, DEFAULT_NAVBAR);
        clean = purgeDarkReaderCss(buildFullThemeCss(overrides, darkOverrides, staticVars));
      }
    }

    if (!isDarkReaderFree(clean)) {
      console.error('[BbAtelier] migration: clean CSS still contains darkreader — aborting write');
      return false;
    }

    await chrome.storage.local.set({ cachedCSS: clean });
    console.log('[BbAtelier] migration: cachedCSS purged and re-saved clean');
    return true;
  } catch (e) {
    console.error('[BbAtelier] migration failed', e);
    return false;
  }
}
