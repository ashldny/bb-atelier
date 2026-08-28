console.log('🖌 BB Theme v5.0 — Simplified');

// ─── Global debug flag ───
const BB_DEBUG = false;
function dbg(...args) {
  if (BB_DEBUG) console.log('[BbTheme]', ...args);
}

function sanitizeUrl(url) {
  const s = String(url).trim();
  if (s.startsWith('data:')) return s;
  try {
    const u = new URL(s);
    if (u.protocol === 'http:' || u.protocol === 'https:') return s;
  } catch {}
  return '';
}

// ─── Inject CSS ───────────────────────────────────────────
function injectCSS(css) {
  const old = document.getElementById('bb-custom-theme');
  if (old) old.remove();
  if (!css) return;
  const s = document.createElement('style');
  s.id = 'bb-custom-theme';
  s.textContent = css;
  document.head.appendChild(s);
}

let cssWatcher = null;

function startCSSWatcher(css) {
  if (cssWatcher) cssWatcher.disconnect();
  
  cssWatcher = new MutationObserver(() => {
    const ourStyle = document.getElementById('bb-custom-theme');
    if (!ourStyle) {
      injectCSS(css);
      return;
    }
    if (document.head && document.head.lastElementChild !== ourStyle) {
      document.head.appendChild(ourStyle);
    }
  });
  cssWatcher.observe(document.documentElement, { 
    childList: true, 
    subtree: true,
    attributes: false,
    characterData: false,
  });
}

function resetTheme() {
  ['bb-custom-theme', 'bb-font-style'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  if (cssWatcher) {
    cssWatcher.disconnect();
    cssWatcher = null;
  }
  chrome.storage.local.remove('cachedCSS');
}

// ─── Font ─────────────────────────────────────────────────
function applySystemFont(font) {
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
    const safeFont = font.replace(/[^a-zA-Z0-9\s\-]/g, '');
    s.textContent = `body,*{font-family:"${safeFont}",sans-serif!important;}`;
  }
  document.head.appendChild(s);
}

// ─── Storage ↻ Theme ──────────────────────────────────────
function loadAndApply() {
  chrome.storage.local.get(['cachedCSS'], (data) => {
    if (data.cachedCSS) {
      injectCSS(data.cachedCSS);
      startCSSWatcher(data.cachedCSS);
    }
  });
}

// ═════════════════════════════════════════════════════════
//  Course Covers
// ═════════════════════════════════════════════════════════
let courseBannerMap = {};
let coversCache = {};

const COURSE_ID_REGEX = /courses[\\/]_(\d+_\d+)/;
const ULTRA_COURSE_REGEX = /ultra\/course[\\/](\d+)/;

function getCourseIdFromCard(card) {
  if (!card) return null;
  const idEl = card.querySelector('.multi-column-course-id');
  if (idEl) {
    const raw = idEl.textContent.trim();
    return raw;
  }
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
  dbg(`applyCourseCover(${courseId})`);

  const safeImageUrl = sanitizeUrl(imageUrl);
  const safeCourseId = String(courseId).replace(/[^a-zA-Z0-9_-]/g, '');
  const safePosition = String(position || '50% 50%').replace(/[^0-9.%\s]/g, '');

  const banners = getCourseBannerElements(courseId);

  if (banners.length === 0) {
    dbg(`⚠ No banner found for ${courseId} — trying URL match or any visible banner`);
    const courseIds = Object.keys(coversCache);
    if (courseIds.length === 1) {
      const fallback = document.querySelectorAll('.course-banner');
      for (const b of fallback) {
        if (b.getBoundingClientRect().width > 50) {
          banners.push(b);
          break;
        }
      }
    }
  }

  if (banners.length === 0) {
    dbg(`✗ No banner to apply cover for ${courseId}`);
    return 0;
  }

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
      .course-banner[data-bb-cover="${safeCourseId}"] img {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      .course-banner[data-bb-cover="${safeCourseId}"]::before,
      .course-banner[data-bb-cover="${safeCourseId}"]::after {
        background: none !important;
        background-image: none !important;
        content: none !important;
      }
      .course-banner[data-bb-cover="${safeCourseId}"] > * {
        background: none !important;
        background-image: none !important;
      }
    `;
    document.head.appendChild(s);

    el.setAttribute('style',
      `background: url('${safeImageUrl}') ${safePosition} / cover no-repeat !important; ` +
      `background-image: url('${safeImageUrl}') !important; ` +
      `background-repeat: no-repeat !important; ` +
      `background-size: cover !important; ` +
      `background-position: ${safePosition} !important; ` +
      `background-color: transparent !important;`
    );

    const imgs = el.querySelectorAll('img');
    imgs.forEach((img) => img.style.setProperty('display', 'none', 'important'));

    const imgDiv = el.querySelector('.image-div, [class*="image"]');
    if (imgDiv) {
      imgDiv.setAttribute('style', 'background: none !important; background-image: none !important;');
    }
  });

  dbg(`✓ Applied cover for ${courseId} on ${banners.length} banner(s)`);
  return banners.length;
}

function restoreAllCovers() {
  scrapeCourses();
  const courseIds = Object.keys(coversCache);
  if (courseIds.length === 0) return 0;

  let applied = 0;
  courseIds.forEach((courseId) => {
    const entry = coversCache[courseId];
    if (entry) {
      const imageUrl = typeof entry === 'string' ? entry : entry.imageUrl;
      const position = typeof entry === 'string' ? '50% 50%' : (entry.position || '50% 50%');
      if (imageUrl) {
        const result = applyCourseCover(courseId, imageUrl, position);
        if (result > 0) applied++;
      }
    }
  });

  const urlMatch = window.location.href.match(ULTRA_COURSE_REGEX);
  if (urlMatch) {
    const courseIdFromUrl = urlMatch[1];
    const entry = coversCache[courseIdFromUrl];
    if (entry && applied === 0) {
      const imageUrl = typeof entry === 'string' ? entry : entry.imageUrl;
      const position = typeof entry === 'string' ? '50% 50%' : (entry.position || '50% 50%');
      if (imageUrl) {
        dbg(`⚠ URL matched course ${courseIdFromUrl} but no banner found — trying inside-course banners`);
        const safeUrl = sanitizeUrl(imageUrl);
        const safePosition = String(position).replace(/[^0-9.%\s]/g, '');
        if (safeUrl) {
          document.querySelectorAll('[class*="banner"], [class*="header"]').forEach((el) => {
            if (el.getBoundingClientRect().width > 100 && el.getBoundingClientRect().height > 50) {
              el.setAttribute('data-bb-cover', courseIdFromUrl);
              el.setAttribute('style',
                `background: url('${safeUrl}') ${safePosition} / cover no-repeat !important; ` +
                `background-image: url('${safeUrl}') !important;`
              );
              applied++;
            }
          });
        }
      }
    }
  }

  return applied;
}

function loadCoversFromStorage(callback) {
  chrome.storage.sync.get(['courseCovers'], (syncData) => {
    chrome.storage.local.get(['courseCovers'], (localData) => {
      const syncCovers = syncData.courseCovers || {};
      const localCovers = localData.courseCovers || {};

      dbg(`📦 sync covers: ${Object.keys(syncCovers).length}, local covers: ${Object.keys(localCovers).length}`);

      const merged = { ...syncCovers, ...localCovers };

      // Normalize: convert old string-only entries to { imageUrl, position }
      Object.keys(merged).forEach((key) => {
        const val = merged[key];
        if (typeof val === 'string') {
          merged[key] = { imageUrl: val, position: '50% 50%' };
        }
      });

      chrome.storage.local.set({ courseCovers: merged }, () => {
        const prevCount = Object.keys(coversCache).length;
        coversCache = merged;
        dbg(`📦 coversCache updated: ${Object.keys(merged).length} courses (was ${prevCount})`);
        if (callback) callback(merged);
      });
    });
  });
}

function restoreCourseCovers() {
  loadCoversFromStorage((covers) => {
    const courseIds = Object.keys(covers);
    if (courseIds.length === 0) {
      dbg('📭 No covers in storage');
      return;
    }

    dbg(`🔄 Starting cover restore for ${courseIds.length} course(s)`);

    let retries = 120;
    const poll = () => {
      const totalBanners = document.querySelectorAll('.course-banner').length;
      
      if (totalBanners > 0) {
        const applied = restoreAllCovers();
        if (applied > 0) dbg(`✅ Poll: applied ${applied}/${courseIds.length} covers`);
      } else {
        dbg(`⏳ Poll: no banners yet in DOM (retries left: ${retries})`);
      }

      const totalBannersNow = document.querySelectorAll('.course-banner').length;
      const coveredBannersNow = document.querySelectorAll('.course-banner[data-bb-cover]').length;
      const allCovered = totalBannersNow > 0 && totalBannersNow === coveredBannersNow;

      if ((!allCovered || totalBannersNow === 0) && retries > 0) {
        retries--;
        setTimeout(poll, 300);
      } else {
        dbg(`🏁 Poll exhausted: total=${totalBannersNow} allCovered=${allCovered} retries=${retries}`);
        if (!allCovered) {
          setTimeout(() => {
            restoreAllCovers();
            dbg(`🏁 Final attempt done: ${document.querySelectorAll('.course-banner[data-bb-cover]').length}/${document.querySelectorAll('.course-banner').length} covered`);
          }, 2000);
        }
      }
    };
    setTimeout(poll, 500);
  });
}

function setupCoverWatch() {
  const mo = new MutationObserver((mutations) => {
    const hasBannerChange = mutations.some(m =>
      Array.from(m.addedNodes).some(n =>
        n.nodeType === 1 && (
          n.matches?.('.course-banner, [class*="course-element"], [class*="course-card"]') ||
          n.querySelector?.('.course-banner')
        )
      )
    );

    if (!hasBannerChange) return;
    if (Object.keys(coversCache).length === 0) return;

    dbg('👀 Observer detected banner change — restoring');
    restoreAllCovers();
  });

  if (document.documentElement) {
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
}

// ═════════════════════════════════════════════════════════
//  Initialization
// ═════════════════════════════════════════════════════════
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (changes.masterEnabled) {
    if (changes.masterEnabled.newValue === false) {
      resetTheme();
      Object.keys(coversCache).forEach((id) => resetCourseCover(id));
      coversCache = {};
    } else {
      loadAndApply();
      chrome.storage.local.get(['font'], (data) => {
        if (data.font) applySystemFont(data.font);
      });
      restoreCourseCovers();
    }
    return;
  }

  chrome.storage.sync.get(['masterEnabled'], (data) => {
    if (data.masterEnabled === false) return;

    if (changes.cachedCSS) {
      const css = changes.cachedCSS.newValue;
      if (css) {
        injectCSS(css);
        startCSSWatcher(css);
      } else {
        resetTheme();
      }
    }
    if (changes.courseCovers) {
      coversCache = changes.courseCovers.newValue || {};
      dbg(`📨 Storage changed (${areaName}) — coversCache updated (${Object.keys(coversCache).length} courses)`);
      restoreAllCovers();
    }
    if (changes.font) {
      applySystemFont(changes.font.newValue);
    }
  });
});

function initialize() {
  chrome.storage.sync.get(['masterEnabled'], (data) => {
    if (data.masterEnabled === false) {
      dbg('⏸ Master toggle is OFF — skipping initialization');
      return;
    }
    loadAndApply();
    chrome.storage.local.get(['font'], (fData) => {
      if (fData.font) applySystemFont(fData.font);
    });
    restoreCourseCovers();
    setupCoverWatch();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// ─── Message Listener ─────────────────────────────────────

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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    // ─── Apply theme (CSS string from popup) ───
    if (msg.action === 'applyThemeCSS') {
      injectCSS(msg.css);
      startCSSWatcher(msg.css);
      chrome.storage.local.set({ cachedCSS: msg.css });
      return false;
    }

    // ─── Preview theme (temporary, not saved) ───
    if (msg.action === 'previewThemeCSS') {
      injectCSS(msg.css);
      startCSSWatcher(msg.css);
      return false;
    }

    // ─── Restore theme from storage (end preview) ───
    if (msg.action === 'restoreTheme') {
      loadAndApply();
      return false;
    }

    // ─── Reset theme ───
    if (msg.action === 'resetTheme') {
      resetTheme();
      return false;
    }

    // ─── Apply font ───
    if (msg.action === 'applyFont') {
      applySystemFont(msg.font);
      return false;
    }

    // ─── Scrape course names ───
    if (msg.action === 'getCourses') {
      sendResponse(scrapeCourses());
      return true;
    }

    // ─── Apply course cover ───
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
        chrome.storage.local.set({ courseCovers: covers }, () => {
          sendResponse({ success: true });
        });
      });
      return true;
    }

    // ─── Reset course cover ───
    if (msg.action === 'resetCourseCover') {
      if (!msg.courseId) {
        sendResponse({ success: false, error: 'Missing courseId' });
        return true;
      }
      resetCourseCover(msg.courseId);
      sendResponse({ success: true });
      return true;
    }

    // ─── Disable all customization ───
    if (msg.action === 'disableAll') {
      resetTheme();
      Object.keys(coversCache).forEach((id) => resetCourseCover(id));
      coversCache = {};
      sendResponse({ success: true });
      return true;
    }

    // ─── Enable all customization ───
    if (msg.action === 'enableAll') {
      loadAndApply();
      chrome.storage.local.get(['font'], (data) => {
        if (data.font) applySystemFont(data.font);
      });
      restoreCourseCovers();
      sendResponse({ success: true });
      return true;
    }

    // ─── Fetch image as data URL (bypass CORS) ───
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
    console.error('[BbTheme] Message handler error:', err);
    return false;
  }
});