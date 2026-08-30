// ═════════════════════════════════════════════════════════
//  Bb Atelier — Content Script (Hardened Level 1)
//  Pipeline: detectColors() → exportGeneratedCSS → disable → parse (css)
//            → ranked list → cache AST → buildRemappedCSS(colorMap)
//  Cheap re-apply on bbColorMap change; rescan only on sheet-count or
//  uncached inline-style color
// ═════════════════════════════════════════════════════════

import { enable, disable, isEnabled, setFetchMethod } from 'darkreader';
import { DEFAULT_THEME, normalizeTheme } from './theme/darkReaderTheme.js';
import {
  detectColors,
  buildRemappedCSS,
  getNormalizedSet,
  hasUncachedColorOnNodes,
} from './theme-engine.js';

// ─── DEBUG — gate console.log ─────────────────────────────────
const DEBUG = false;

function dbg(...args) {
  if (DEBUG) console.log('[BbAtelier DR]', ...args);
}

let _debugFromStorage = false;
function dbgDynamic(...args) {
  if (DEBUG || _debugFromStorage) console.log('[BbAtelier DR]', ...args);
}

let _masterEnabled = false;
let _masterLoaded = false;
chrome.storage.sync.get(['masterEnabled'], (data) => {
  _masterEnabled = data.masterEnabled !== false;
  _masterLoaded = true;
});

// ─── Theme: Style tag (single) ────────────────────────────────
const STYLE_ID = 'bb-theme-customizer-style';

function injectCustomCSS(cssText) {
  if (!_masterEnabled) return;
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = cssText || '';
}

function clearCustomCSS() {
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}

// ─── Legacy applyDarkReader fallback (for bbTheme mode) ───────
let _lastTheme = null;

function applyDarkReader(theme) {
  const normalized = normalizeTheme(theme);
  _debugFromStorage = !!normalized.debug;
  _lastTheme = normalized;
  if (!normalized.enabled) {
    dbgDynamic('disable() — fully revert');
    try {
      disable();
    } catch {}
    clearCustomCSS();
    return;
  }
  // For hardened path we prefer theme-engine; keep direct enable as fallback
  // if no cached AST yet — do a quick detect then remap
  dbgDynamic('legacy applyDarkReader fallback', normalized.mode);
  performDetectionAndApply();
}

// ─── Hardened Level 1 pipeline ────────────────────────────────
let _bbColorMap = {};
let _lastSheetCount = 0;
let _detectInProgress = false;
let _pendingRescan = false;

async function performDetectionAndApply() {
  if (!_masterEnabled) return;
  if (_detectInProgress) {
    _pendingRescan = true;
    return;
  }
  _detectInProgress = true;
  dbgDynamic('detectColors() start');

  try {
    setFetchMethod(window.fetch.bind(window));
  } catch {}

  const { colors } = await detectColors();
  _lastSheetCount = document.styleSheets.length;

  // Publish to popup
  try {
    await chrome.storage.local.set({ bbDetectedColors: colors });
  } catch {}

  // Build remapped with current colorMap (cheap if empty)
  const cssText = buildRemappedCSS(_bbColorMap);
  injectCustomCSS(cssText);

  dbgDynamic(`detectColors() done: ${colors.length} colors, sheets=${_lastSheetCount}, remapped ${Object.keys(_bbColorMap).length} entries`);

  _detectInProgress = false;
  if (_pendingRescan) {
    _pendingRescan = false;
    performDetectionAndApply();
  }
}

function cheapRemap() {
  if (!_masterEnabled) return;
  const cssText = buildRemappedCSS(_bbColorMap);
  injectCustomCSS(cssText);
  dbgDynamic('cheap remap', Object.keys(_bbColorMap).length);
}

// ─── Iframe handling ─────────────────────────────────────────
// Manifest already `all_frames:true` — each frame runs its own detect/apply cycle
dbg('all_frames:', window !== window.top ? 'iframe frame' : 'top frame');

// ─── SPA + MutationObserver (hardened heuristic) ──────────────
let _lastUrl = location.href;
const _origPushState = history.pushState;
const _origReplaceState = history.replaceState;

function onUrlChange() {
  if (!_masterEnabled) return;
  if (location.href === _lastUrl) return;
  _lastUrl = location.href;
  dbgDynamic('SPA navigation:', location.href);
  performDetectionAndApply();
}

history.pushState = function (...args) {
  const ret = _origPushState.apply(this, args);
  setTimeout(onUrlChange, 100);
  return ret;
};
history.replaceState = function (...args) {
  const ret = _origReplaceState.apply(this, args);
  setTimeout(onUrlChange, 100);
  return ret;
};
window.addEventListener('popstate', () => setTimeout(onUrlChange, 100));

// Debounced observer tick
let _moTimer = null;
let _lastAddedNodes = [];

const observer = new MutationObserver((mutations) => {
  if (!_masterEnabled) return;
  const added = [];
  for (const m of mutations) {
    for (const n of m.addedNodes) {
      if (n.nodeType === 1) added.push(n);
    }
  }
  if (added.length > 0) _lastAddedNodes = added;

  clearTimeout(_moTimer);
  _moTimer = setTimeout(() => {
    const currentSheetCount = document.styleSheets.length;
    const sheetChanged = currentSheetCount !== _lastSheetCount;
    if (sheetChanged) {
      dbgDynamic(`MO tick: sheets ${String(_lastSheetCount)}→${String(currentSheetCount)} → rescan`);
      performDetectionAndApply();
      return;
    }
    // Secondary: sampling computed styles on added nodes (inline styles won't change sheet count)
    const normalizedSet = getNormalizedSet();
    if (normalizedSet && normalizedSet.size > 0 && _lastAddedNodes.length > 0) {
      const hasNew = hasUncachedColorOnNodes(_lastAddedNodes, normalizedSet);
      if (hasNew) {
        dbgDynamic('MO tick: uncached inline color detected → rescan');
        performDetectionAndApply();
        _lastAddedNodes = [];
        return;
      }
    }
    _lastAddedNodes = [];
  }, 500);
});

if (document.documentElement) {
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

// ─── Course covers & Fonts (kept for backward compat) ───────
let courseBannerMap = {};
let coversCache = {};
const COURSE_ID_REGEX = /courses[\\/](\d+_\d+)/;
const ULTRA_COURSE_REGEX = /ultra\/course[\\/](\d+)/;

function sanitizeUrl(url) {
  const s = String(url).trim();
  if (s.startsWith('data:')) return s;
  try {
    const u = new URL(s);
    if (u.protocol === 'http:' || u.protocol === 'https:') return s;
  } catch {}
  return '';
}

function getCourseIdFromCard(card) {
  if (!card) return null;
  const idEl = card.querySelector('.multi-column-course-id');
  if (idEl) return idEl.textContent.trim();
  const link = card.querySelector('a[href*="ultra/course"], a[href*="courses/"]');
  if (link) {
    const href = link.getAttribute('href') || '';
    const m = href.match(COURSE_ID_REGEX) || href.match(ULTRA_COURSE_REGEX);
    if (m) return m[1];
  }
  return null;
}

function scrapeCourses() {
  const courses = [];
  const seen = new Set();
  courseBannerMap = {};
  document.querySelectorAll('.course-banner').forEach((banner) => {
    const card = banner.closest('.element-card, [class*="course-element"], [class*="course-card"], article');
    if (!card) return;
    const id = getCourseIdFromCard(card);
    if (!id || seen.has(id)) return;
    seen.add(id);
    const titleEl = card.querySelector('.course-title, .js-course-title-element, h4, [class*="title"]');
    const name = (titleEl?.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 60) || 'Unknown Course';
    courses.push({ id, name });
    courseBannerMap[id] = banner;
  });
  if (courses.length === 0) {
    document.querySelectorAll('.element-card, [class*="course-element"], [class*="course-card"]').forEach((card) => {
      const id = getCourseIdFromCard(card);
      if (!id || seen.has(id)) return;
      seen.add(id);
      const titleEl = card.querySelector('.course-title, .js-course-title-element, h4, [class*="title"]');
      const name = (titleEl?.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 60) || 'Unknown Course';
      courses.push({ id, name });
      const banner = card.querySelector('.course-banner');
      if (banner) courseBannerMap[id] = banner;
    });
  }
  return courses;
}

function getCourseBannerElements(courseId) {
  const results = [];
  const mapped = courseBannerMap[courseId];
  if (mapped && document.contains(mapped)) results.push(mapped);
  document.querySelectorAll('.course-banner').forEach((banner) => {
    if (results.length > 0) return;
    const card = banner.closest('.element-card, [class*="course-element"], [class*="course-card"], article');
    if (!card) return;
    const id = getCourseIdFromCard(card);
    if (id === courseId) results.push(banner);
  });
  return results;
}

function applyCourseCover(courseId, imageUrl, position) {
  if (!_masterEnabled) return 0;
  const safeImageUrl = sanitizeUrl(imageUrl);
  const safeCourseId = String(courseId).replace(/[^a-zA-Z0-9_-]/g, '');
  const safePosition = String(position || '50% 50%').replace(/[^0-9.%\s]/g, '');
  const banners = getCourseBannerElements(courseId);
  if (banners.length === 0) return 0;
  if (!safeImageUrl) return 0;
  banners.forEach((el) => {
    const styleId = `bb-cover-style-${safeCourseId}`;
    const oldStyle = document.getElementById(styleId);
    if (oldStyle) oldStyle.remove();
    el.setAttribute('data-bb-cover', safeCourseId);
    const s = document.createElement('style');
    s.id = styleId;
    s.textContent = `
      .course-banner[data-bb-cover="${safeCourseId}"] {
        background: url('${safeImageUrl}') ${safePosition} / cover no-repeat !important;
        background-image: url('${safeImageUrl}') !important;
        background-repeat: no-repeat !important;
        background-size: cover !important;
        background-position: ${safePosition} !important;
        background-color: transparent !important;
      }
      .course-banner[data-bb-cover="${safeCourseId}"] img { display: none !important; visibility: hidden !important; opacity: 0 !important; }
      .course-banner[data-bb-cover="${safeCourseId}"]::before, .course-banner[data-bb-cover="${safeCourseId}"]::after { background: none !important; background-image: none !important; content: none !important; }
      .course-banner[data-bb-cover="${safeCourseId}"] > * { background: none !important; background-image: none !important; }
    `;
    document.head.appendChild(s);
    el.setAttribute(
      'style',
      `background: url('${safeImageUrl}') ${safePosition} / cover no-repeat !important; background-image: url('${safeImageUrl}') !important; background-repeat: no-repeat !important; background-size: cover !important; background-position: ${safePosition} !important; background-color: transparent !important;`
    );
  });
  return banners.length;
}

function restoreAllCovers() {
  if (!_masterEnabled) return 0;
  scrapeCourses();
  const courseIds = Object.keys(coversCache);
  if (courseIds.length === 0) return 0;
  let applied = 0;
  courseIds.forEach((courseId) => {
    const entry = coversCache[courseId];
    if (entry) {
      const imageUrl = typeof entry === 'string' ? entry : entry.imageUrl;
      const position = typeof entry === 'string' ? '50% 50%' : entry.position || '50% 50%';
      if (imageUrl) {
        const result = applyCourseCover(courseId, imageUrl, position);
        if (result > 0) applied++;
      }
    }
  });
  return applied;
}

function loadCoversFromStorage(callback) {
  chrome.storage.sync.get(['courseCovers'], (syncData) => {
    chrome.storage.local.get(['courseCovers'], (localData) => {
      const syncCovers = syncData.courseCovers || {};
      const localCovers = localData.courseCovers || {};
      const merged = { ...syncCovers, ...localCovers };
      Object.keys(merged).forEach((key) => {
        if (typeof merged[key] === 'string') merged[key] = { imageUrl: merged[key], position: '50% 50%' };
      });
      chrome.storage.local.set({ courseCovers: merged }, () => {
        coversCache = merged;
        if (callback) callback(merged);
      });
    });
  });
}

function restoreCourseCovers() {
  loadCoversFromStorage((covers) => {
    const courseIds = Object.keys(covers);
    if (courseIds.length === 0) return;
    let retries = 120;
    const poll = () => {
      const totalBanners = document.querySelectorAll('.course-banner').length;
      if (totalBanners > 0) restoreAllCovers();
      const totalBannersNow = document.querySelectorAll('.course-banner').length;
      const coveredBannersNow = document.querySelectorAll('.course-banner[data-bb-cover]').length;
      const allCovered = totalBannersNow > 0 && totalBannersNow === coveredBannersNow;
      if ((!allCovered || totalBannersNow === 0) && retries > 0) {
        retries--;
        setTimeout(poll, 300);
      } else if (!allCovered) {
        setTimeout(() => restoreAllCovers(), 2000);
      }
    };
    setTimeout(poll, 500);
  });
}

function resetCourseCover(courseId) {
  delete coversCache[courseId];
  const styleId = `bb-cover-style-${courseId}`;
  const styleEl = document.getElementById(styleId);
  if (styleEl) styleEl.remove();
  const mapped = courseBannerMap[courseId];
  if (mapped && document.contains(mapped)) {
    mapped.removeAttribute('style');
    mapped.removeAttribute('data-bb-cover');
  }
  document.querySelectorAll('.course-banner').forEach((banner) => {
    const card = banner.closest('.element-card, [class*="course-element"], [class*="course-card"], article');
    if (!card) return;
    const id = getCourseIdFromCard(card);
    if (id === courseId) {
      banner.removeAttribute('style');
      banner.removeAttribute('data-bb-cover');
    }
  });
  chrome.storage.local.get(['courseCovers'], (data) => {
    const covers = data.courseCovers || {};
    delete covers[courseId];
    chrome.storage.local.set({ courseCovers: covers });
  });
  chrome.storage.sync.get(['courseCovers'], (data) => {
    const covers = data.courseCovers || {};
    if (covers[courseId]) {
      delete covers[courseId];
      chrome.storage.sync.set({ courseCovers: covers });
    }
  });
}

function applySystemFont(font) {
  if (!_masterEnabled) return;
  const id = 'bb-font-style';
  const old = document.getElementById(id);
  if (old) old.remove();
  if (!font) return;
  const s = document.createElement('style');
  s.id = id;
  if (font.startsWith('data:')) {
    const safeUrl = sanitizeUrl(font);
    if (!safeUrl) return;
    s.textContent = `@font-face{font-family:'CustomFont';src:url('${safeUrl}') format('truetype');}body,*{font-family:'CustomFont',sans-serif!important;}`;
  } else {
    const safeFont = font.replace(/[^a-zA-Z0-9\s-]/g, '');
    s.textContent = `body,*{font-family:"${safeFont}",sans-serif!important;}`;
  }
  document.head.appendChild(s);
}

function resetNativeTheme() {
  ['bb-custom-theme', 'bb-font-style'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  clearCustomCSS();
  chrome.storage.local.remove('cachedCSS');
}

// ─── Message handler (unified + hardened) ────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  try {
    const blockedWhileDisabled = ['applyThemeCSS', 'previewThemeCSS', 'restoreTheme', 'applyTheme', 'BB_THEME_RESCAN', 'drApply'];
    if (!_masterEnabled && (blockedWhileDisabled.includes(msg.action) || blockedWhileDisabled.includes(msg.type))) {
      sendResponse({ success: false, disabled: true });
      return true;
    }
    if (msg.type === 'BB_THEME_RESCAN' || msg.action === 'BB_THEME_RESCAN') {
      dbgDynamic('BB_THEME_RESCAN → full detect');
      performDetectionAndApply().then(() => sendResponse({ success: true }));
      return true;
    }
    if (msg.action === 'drApply' && msg.theme) {
      applyDarkReader(msg.theme);
      sendResponse({ success: true });
      return true;
    }
    if (msg.action === 'drDisable') {
      try {
        disable();
      } catch {}
      clearCustomCSS();
      sendResponse({ success: true });
      return true;
    }
    if (msg.action === 'applyTheme' && msg.engine) {
      if (msg.engine === 'darkreader') {
        applyDarkReader(msg.data);
      } else if (msg.data && msg.data.css) {
        const s = document.createElement('style');
        s.id = 'bb-custom-theme';
        s.textContent = msg.data.css;
        document.head.appendChild(s);
      }
      sendResponse({ success: true });
      return true;
    }
    if (msg.action === 'getEngine') {
      sendResponse({ engine: isEnabled() ? 'darkreader' : 'native' });
      return true;
    }
    if (msg.action === 'applyThemeCSS') {
      try {
        disable();
      } catch {}
      const s = document.createElement('style');
      s.id = 'bb-custom-theme';
      s.textContent = msg.css;
      document.head.appendChild(s);
      chrome.storage.local.set({ cachedCSS: msg.css });
      sendResponse({ success: true });
      return true;
    }
    if (msg.action === 'previewThemeCSS') {
      const s = document.createElement('style');
      s.id = 'bb-custom-theme';
      s.textContent = msg.css;
      const old = document.getElementById('bb-custom-theme');
      if (old) old.remove();
      document.head.appendChild(s);
      sendResponse({ success: true });
      return true;
    }
    if (msg.action === 'restoreTheme') {
      chrome.storage.local.get(['cachedCSS'], (data) => {
        if (data.cachedCSS) {
          const s = document.createElement('style');
          s.id = 'bb-custom-theme';
          s.textContent = data.cachedCSS;
          document.head.appendChild(s);
        }
      });
      sendResponse({ success: true });
      return true;
    }
    if (msg.action === 'resetTheme') {
      try {
        disable();
      } catch {}
      resetNativeTheme();
      sendResponse({ success: true });
      return true;
    }
    if (msg.action === 'applyFont') {
      applySystemFont(msg.font);
      sendResponse({ success: true });
      return true;
    }
    if (msg.action === 'getCourses') {
      sendResponse(scrapeCourses());
      return true;
    }
    if (msg.action === 'applyCourseCover') {
      if (!msg.courseId || !msg.imageUrl) {
        sendResponse({ success: false, error: 'Missing courseId or imageUrl' });
        return true;
      }
      coversCache[msg.courseId] = { imageUrl: msg.imageUrl, position: msg.position || '50% 50%' };
      applyCourseCover(msg.courseId, msg.imageUrl, msg.position);
      chrome.storage.local.get(['courseCovers'], (data) => {
        const covers = data.courseCovers || {};
        covers[msg.courseId] = { imageUrl: msg.imageUrl, position: msg.position || '50% 50%' };
        chrome.storage.local.set({ courseCovers: covers }, () => sendResponse({ success: true }));
      });
      return true;
    }
    if (msg.action === 'resetCourseCover') {
      if (!msg.courseId) {
        sendResponse({ success: false, error: 'Missing courseId' });
        return true;
      }
      resetCourseCover(msg.courseId);
      sendResponse({ success: true });
      return true;
    }
    if (msg.action === 'disableAll') {
      _masterEnabled = false;
      _masterLoaded = true;
      try {
        disable();
      } catch {}
      resetNativeTheme();
      Object.keys(coversCache).forEach((id) => resetCourseCover(id));
      coversCache = {};
      sendResponse({ success: true });
      return true;
    }
    if (msg.action === 'enableAll') {
      _masterEnabled = true;
      _masterLoaded = true;
      chrome.storage.sync.get(['bbTheme', 'bbColorMap'], (data) => {
        const theme = data.bbTheme ? normalizeTheme(data.bbTheme) : DEFAULT_THEME;
        _bbColorMap = data.bbColorMap || {};
        applyDarkReader(theme);
        if (Object.keys(_bbColorMap).length === 0) performDetectionAndApply();
        else cheapRemap();
      });
      chrome.storage.local.get(['font'], (data) => {
        if (data.font) applySystemFont(data.font);
      });
      restoreCourseCovers();
      sendResponse({ success: true });
      return true;
    }
    if (msg.action === 'fetchImage') {
      fetch(msg.url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          const reader = new FileReader();
          reader.onload = () => sendResponse({ dataUrl: reader.result });
          reader.onerror = () => sendResponse({ dataUrl: null, error: 'Failed to read image' });
          reader.readAsDataURL(blob);
        })
        .catch((err) => sendResponse({ dataUrl: null, error: err.message || 'Fetch failed' }));
      return true;
    }
    return false;
  } catch (err) {
    console.error('[BbAtelier] Message handler error:', err);
    sendResponse({ success: false, error: err.message });
    return true;
  }
});

// ─── Initialize from storage ────────────────────────────────
async function initialize() {
  const syncData = await chrome.storage.sync.get(['bbTheme', 'bbColorMap', 'masterEnabled']);
  _masterEnabled = syncData.masterEnabled !== false;
  _masterLoaded = true;
  if (syncData.masterEnabled === false) {
    dbgDynamic('masterEnabled === false — skipping init');
    return;
  }

  _bbColorMap = syncData.bbColorMap || {};

  if (syncData.bbTheme) {
    const theme = normalizeTheme(syncData.bbTheme);
    _debugFromStorage = !!theme.debug;
    // Still seed Dark Reader debug, but primary is theme-engine pipeline
    if (theme.enabled === false) {
      dbgDynamic('bbTheme disabled — skipping detection');
    } else {
      await performDetectionAndApply();
    }
  } else {
    const localData = await chrome.storage.local.get(['cachedCSS']);
    if (localData.cachedCSS) {
      dbgDynamic('fallback to cachedCSS');
      const s = document.createElement('style');
      s.id = 'bb-custom-theme';
      s.textContent = localData.cachedCSS;
      document.head.appendChild(s);
    } else {
      await performDetectionAndApply();
    }
  }

  chrome.storage.local.get(['font'], (fData) => {
    if (fData.font) applySystemFont(fData.font);
  });
  restoreCourseCovers();
}

// Watch for color map changes (cheap path, no re-detect)
chrome.storage.onChanged.addListener((changes, area) => {
  if (changes.masterEnabled) {
    _masterEnabled = changes.masterEnabled.newValue !== false;
    _masterLoaded = true;
    if (changes.masterEnabled.newValue === false) {
      try {
        disable();
      } catch {}
      resetNativeTheme();
      Object.keys(coversCache).forEach((id) => resetCourseCover(id));
      coversCache = {};
    } else {
      initialize();
    }
    return;
  }
  if (!_masterEnabled) return;
  if (area === 'sync' && changes.bbColorMap) {
    _bbColorMap = changes.bbColorMap.newValue || {};
    dbgDynamic('bbColorMap changed → cheap remap');
    cheapRemap();
  }
  if (area === 'sync' && changes.bbTheme) {
    const next = normalizeTheme(changes.bbTheme.newValue || {});
    _debugFromStorage = !!next.debug;
    if (next.enabled === false) {
      try {
        disable();
      } catch {}
      clearCustomCSS();
    } else {
      // Re-apply via detection (bbTheme changes may affect neutral generation)
      performDetectionAndApply();
    }
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

console.log('[BbAtelier] Content script loaded — Hardened Level 1 (all_frames:', window !== window.top, ')');
