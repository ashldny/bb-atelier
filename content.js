console.log('🖌 BB Theme v5.0 — Simplified');

// ─── Global debug flag ───
const BB_DEBUG = false;
function dbg(...args) {
  if (BB_DEBUG) console.log('[BbTheme]', ...args);
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
let burstTimer = null;

function startCSSWatcher(css) {
  if (cssWatcher) cssWatcher.disconnect();
  
  // Watch for any DOM changes — if BB adds/updates styles, re-inject ours at the end
  cssWatcher = new MutationObserver(() => {
    const ourStyle = document.getElementById('bb-custom-theme');
    if (!ourStyle) {
      // Our style was removed — re-inject entirely
      injectCSS(css);
      return;
    }
    // Move our style to the very end of <head> so it always wins
    // (BB might add new <style> after ours)
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

  // Also run a short burst of re-injections to beat async CSS
  if (burstTimer) clearTimeout(burstTimer);
  let attempts = 0;
  const maxAttempts = 8;
  const burstInject = () => {
    const ourStyle = document.getElementById('bb-custom-theme');
    if (ourStyle && document.head) {
      document.head.appendChild(ourStyle); // ensure it's last
    } else {
      injectCSS(css); // re-inject if missing
    }
    attempts++;
    if (attempts < maxAttempts) {
      burstTimer = setTimeout(burstInject, 400);
    } else {
      burstTimer = null;
    }
  };
  burstTimer = setTimeout(burstInject, 600);
}

function resetTheme() {
  if (burstTimer) {
    clearTimeout(burstTimer);
    burstTimer = null;
  }
  ['bb-custom-theme', 'bb-font-style'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  if (cssWatcher) {
    cssWatcher.disconnect();
    cssWatcher = null;
  }
  if (coverWatchInterval) {
    clearInterval(coverWatchInterval);
    coverWatchInterval = null;
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
    s.textContent = `@font-face{font-family:'CustomFont';src:url(${font}) format('truetype');}body,*{font-family:'CustomFont',sans-serif!important;}`;
  } else {
    s.textContent = `body,*{font-family:"${font}",sans-serif!important;}`;
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
const coverStyleMap = {};
let coversCache = {};

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
    const m = href.match(/courses[\\/]_(\d+_\d+)/) || href.match(/ultra\/course[\\/](\d+)/);
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

function applyCourseCover(courseId, imageUrl) {
  dbg(`applyCourseCover(${courseId})`);

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

  banners.forEach((el) => {
    const styleId = `bb-cover-style-${courseId}`;
    const oldStyle = document.getElementById(styleId);
    if (oldStyle) oldStyle.remove();
    coverStyleMap[courseId] = styleId;

    el.setAttribute('data-bb-cover', courseId);

    const s = document.createElement('style');
    s.id = styleId;
    s.textContent = `
      .course-banner[data-bb-cover="${courseId}"] {
        background: url('${imageUrl}') center / cover no-repeat !important;
        background-image: url('${imageUrl}') !important;
        background-repeat: no-repeat !important;
        background-size: cover !important;
        background-position: center !important;
        background-color: transparent !important;
      }
      .course-banner[data-bb-cover="${courseId}"] img {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      .course-banner[data-bb-cover="${courseId}"]::before,
      .course-banner[data-bb-cover="${courseId}"]::after {
        background: none !important;
        background-image: none !important;
        content: none !important;
      }
      .course-banner[data-bb-cover="${courseId}"] > * {
        background: none !important;
        background-image: none !important;
      }
    `;
    document.head.appendChild(s);

    el.setAttribute('style',
      `background: url('${imageUrl}') center / cover no-repeat !important; ` +
      `background-image: url('${imageUrl}') !important; ` +
      `background-repeat: no-repeat !important; ` +
      `background-size: cover !important; ` +
      `background-position: center !important; ` +
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
    const imageUrl = coversCache[courseId];
    if (imageUrl) {
      const result = applyCourseCover(courseId, imageUrl);
      if (result > 0) applied++;
    }
  });

  const urlMatch = window.location.href.match(/ultra\/course[\\/]_(\d+_\d+)/);
  if (urlMatch) {
    const courseIdFromUrl = urlMatch[1];
    if (coversCache[courseIdFromUrl] && applied === 0) {
      dbg(`⚠ URL matched course ${courseIdFromUrl} but no banner found — trying inside-course banners`);
      document.querySelectorAll('[class*="banner"], [class*="header"]').forEach((el) => {
        if (el.getBoundingClientRect().width > 100 && el.getBoundingClientRect().height > 50) {
          el.setAttribute('data-bb-cover', courseIdFromUrl);
          el.setAttribute('style',
            `background: url('${coversCache[courseIdFromUrl]}') center / cover no-repeat !important; ` +
            `background-image: url('${coversCache[courseIdFromUrl]}') !important;`
          );
          applied++;
        }
      });
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

let coverWatchInterval = null;

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

  coverWatchInterval = setInterval(() => {
    const missing = document.querySelectorAll('.course-banner:not([data-bb-cover])');
    if (missing.length === 0) return;

    const courseIds = Object.keys(coversCache);
    if (courseIds.length === 0) return;

    dbg(`⏰ Interval: ${missing.length} banners missing covers — restoring`);
    restoreAllCovers();
  }, 1500);
}

// ═════════════════════════════════════════════════════════
//  Initialization
// ═════════════════════════════════════════════════════════
chrome.storage.onChanged.addListener((changes, areaName) => {
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

function initialize() {
  loadAndApply();
  chrome.storage.sync.get(['font'], (data) => {
    if (data.font) applySystemFont(data.font);
  });
  restoreCourseCovers();
  setupCoverWatch();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

window.addEventListener('load', () => {
  setTimeout(() => {
    loadCoversFromStorage(() => {
      dbg('🔄 Late load re-apply');
      restoreAllCovers();
    });
  }, 3000);
});

// ─── Message Listener ─────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // ─── Apply theme (CSS string from popup) ───
  if (msg.action === 'applyThemeCSS') {
    injectCSS(msg.css);
    startCSSWatcher(msg.css);
    chrome.storage.local.set({ cachedCSS: msg.css });
  }

  // ─── Reset theme ───
  if (msg.action === 'resetTheme') {
    resetTheme();
  }

  // ─── Apply font ───
  if (msg.action === 'applyFont') {
    applySystemFont(msg.font);
  }

  // ─── Scrape course names ───
  if (msg.action === 'getCourses') {
    sendResponse(scrapeCourses());
    return true;
  }

  // ─── Apply course cover ───
  if (msg.action === 'applyCourseCover') {
    coversCache[msg.courseId] = msg.imageUrl;
    applyCourseCover(msg.courseId, msg.imageUrl);
    chrome.storage.local.get(['courseCovers'], (data) => {
      const covers = data.courseCovers || {};
      covers[msg.courseId] = msg.imageUrl;
      chrome.storage.local.set({ courseCovers: covers });
    });
    sendResponse({ success: true });
    return true;
  }

  // ─── Reset course cover ───
  if (msg.action === 'resetCourseCover') {
    delete coversCache[msg.courseId];
    const styleId = coverStyleMap[msg.courseId];
    if (styleId) {
      const styleEl = document.getElementById(styleId);
      if (styleEl) {
        styleEl.remove();
        delete coverStyleMap[msg.courseId];
      }
    }
    const mapped = courseBannerMap[msg.courseId];
    if (mapped && document.contains(mapped)) {
      mapped.removeAttribute('style');
      mapped.removeAttribute('data-bb-cover');
    }
    document.querySelectorAll('.course-banner').forEach((banner) => {
      const card = banner.closest('.element-card, [class*="course-element"], [class*="course-card"], article');
      if (!card) return;
      const id = getCourseIdFromCard(card);
      if (id === msg.courseId) {
        banner.removeAttribute('style');
        banner.removeAttribute('data-bb-cover');
      }
    });
    chrome.storage.local.get(['courseCovers'], (data) => {
      const covers = data.courseCovers || {};
      delete covers[msg.courseId];
      chrome.storage.local.set({ courseCovers: covers });
    });
    sendResponse({ success: true });
    return true;
  }

  return true;
});