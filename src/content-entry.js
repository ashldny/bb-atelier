// The sole MV3 content entry. Storage is the source of truth in every frame.
import { createStyleHost } from './content/styles.js';
import { createThemeController } from './content/theme.js';
import { createCoverController, scrapeCourses } from './content/covers.js';
import { applyFont } from './content/fonts.js';
import { auditTheme } from './content/themeAudit.js';
import { DEFAULT_SETTINGS, PALETTE_KEYS } from './utils/constants.js';
import { isValidFont } from './utils/sanitization.js';
import { normalizeCoverEntry } from './utils/covers.js';
import { isSupportedUrl } from './utils/domains.js';

function start() {
  if (globalThis.__bbAtelierLoaded) return;
  globalThis.__bbAtelierLoaded = true;
  const styles = createStyleHost();
  const theme = createThemeController(styles);
  const covers = createCoverController(styles);
  let sync = { ...DEFAULT_SETTINGS };
  let local = {};
  let sessionActive = true;
  let applied = false;
  let pending = false;
  let lastFont;

  const enabled = () =>
    sync.masterEnabled !== false &&
    sessionActive &&
    isSupportedUrl(location.href, sync.bbTheme?.customDomain);
  function render() {
    theme.apply(sync, enabled());
    const font = enabled() ? local.font : '';
    if (lastFont !== font) {
      applyFont(styles, font);
      lastFont = font;
    }
    covers.update(local.courseCovers, enabled());
    applied = true;
  }
  function scheduleRender() {
    if (!applied || pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      render();
    });
  }

  const early = [];
  chrome.storage.onChanged.addListener((changes, area) => {
    if (!applied) {
      early.push([changes, area]);
      return;
    }
    update(changes, area);
  });
  function update(changes, area) {
    const target = area === 'sync' ? sync : area === 'local' ? local : null;
    if (!target) return;
    for (const [key, change] of Object.entries(changes)) {
      if (change.newValue === undefined) delete target[key];
      else target[key] = change.newValue;
    }
    const relevant =
      area === 'sync'
        ? ['masterEnabled', 'bbTheme', ...PALETTE_KEYS].some((key) => key in changes)
        : ['font', 'courseCovers'].some((key) => key in changes);
    if (area === 'sync' && changes.masterEnabled?.newValue === true) sessionActive = true;
    if (area === 'local' && (changes.font || changes.courseCovers)) sessionActive = true;
    if (
      area === 'sync' &&
      (PALETTE_KEYS.some((key) => key in changes) ||
        (changes.bbTheme && changes.bbTheme.newValue?.engine !== changes.bbTheme.oldValue?.engine))
    ) {
      sessionActive = true;
    }
    if (relevant) scheduleRender();
  }

  const ready = (async () => {
    const [savedSync, savedLocal] = await Promise.all([
      chrome.storage.sync.get(['masterEnabled', 'bbTheme', ...PALETTE_KEYS]),
      chrome.storage.local.get(['font', 'courseCovers']),
    ]);
    sync = { ...DEFAULT_SETTINGS, ...savedSync };
    local = savedLocal;
    sessionActive = sync.bbTheme?.autoApply !== false;
    render();
    for (const event of early) update(...event);
    early.length = 0;
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', render, { once: true });
  })();

  async function handle(message) {
    await ready;
    const action = message?.action || message?.type;
    if (action === 'ping') return { success: true, enabled: enabled(), engine: theme.engine };
    if (action === 'getCourses') return scrapeCourses();
    if (action === 'getEngine') return { success: true, engine: theme.engine };
    if (action === 'auditTheme') return { success: true, enabled: enabled(), ...auditTheme() };
    if (action === 'previewThemeCSS') {
      if (typeof message.css !== 'string') throw new Error('Invalid theme CSS');
      theme.preview(message.css);
    } else if (action === 'restoreTheme') {
      theme.restore();
    } else if (
      action === 'applyThemeCSS' ||
      action === 'refreshSettings' ||
      action === 'BB_THEME_RESCAN'
    ) {
      sessionActive = true;
      render();
      if (action === 'applyThemeCSS' && typeof message.css === 'string')
        theme.applyCss(message.css);
    } else if (action === 'enableAll' || action === 'disableAll') {
      sync.masterEnabled = action === 'enableAll';
      sessionActive = action === 'enableAll';
      render();
    } else if (action === 'resetTheme') {
      theme.clear();
    } else if (action === 'applyFont' || action === 'resetFont') {
      const font = action === 'resetFont' ? '' : message.font;
      if (!isValidFont(font)) throw new Error('Invalid font');
      local.font = font;
      lastFont = enabled() ? font : '';
      applyFont(styles, enabled() ? font : '');
    } else if (
      ['applyCover', 'applyCourseCover', 'removeCover', 'resetCourseCover'].includes(action)
    ) {
      const id = message.courseId;
      if (typeof id !== 'string' || !id || id.length > 200) throw new Error('Invalid course');
      local.courseCovers = { ...local.courseCovers };
      if (action === 'removeCover' || action === 'resetCourseCover') delete local.courseCovers[id];
      else {
        const entry = normalizeCoverEntry({
          ...message,
          imageUrl: message.imageUrl || normalizeCoverEntry(local.courseCovers[id]).imageUrl,
        });
        if (!entry.imageUrl) throw new Error('Invalid cover URL');
        local.courseCovers[id] = entry;
      }
      covers.update(local.courseCovers, enabled());
    } else if (['drApply', 'drEnable', 'drDisable', 'applyTheme'].includes(action)) {
      sync.bbTheme = {
        ...sync.bbTheme,
        ...(message.theme || message.data || {}),
        engine: action === 'drDisable' ? 'native' : message.engine || 'darkreader',
      };
      render();
    } else return { success: false, error: 'Unknown action' };
    return { success: true, disabled: !enabled() };
  }

  const actions = new Set([
    'ping',
    'getCourses',
    'getEngine',
    'auditTheme',
    'applyThemeCSS',
    'previewThemeCSS',
    'restoreTheme',
    'resetTheme',
    'applyFont',
    'resetFont',
    'applyCover',
    'applyCourseCover',
    'removeCover',
    'resetCourseCover',
    'enableAll',
    'disableAll',
    'refreshSettings',
    'BB_THEME_RESCAN',
    'drApply',
    'drEnable',
    'drDisable',
    'applyTheme',
  ]);
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (!actions.has(message?.action || message?.type)) return false;
    handle(message)
      .then(respond)
      .catch((error) => respond({ success: false, error: error.message }));
    return true;
  });
  ready.catch((error) => console.error('[BbAtelier] Initialization failed:', error));
}

if (document.documentElement) start();
else
  new MutationObserver(function (_mutations, observer) {
    if (document.documentElement) {
      observer.disconnect();
      start();
    }
  }).observe(document, { childList: true });
