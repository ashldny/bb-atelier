// ═════════════════════════════════════════════════════════
//  Bb Atelier — Background Service Worker
//  Handles dynamic content script registration for custom domains
//  MV3: chrome.scripting.registerContentScripts
// ═════════════════════════════════════════════════════════

const _STATIC_ID = 'bb-atelier-static';
const CUSTOM_ID = 'bb-atelier-custom';

/**
 * Normalize user-entered domain into a match pattern
 * Accepts: example.com, https://blackboard.example.edu, *.example.com
 */
function domainToPattern(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  // already a pattern
  if (raw.includes('://') && raw.includes('*')) return raw;
  let host = raw;
  // strip protocol + path
  try {
    if (host.includes('://')) {
      const u = new URL(host);
      host = u.hostname;
    } else {
      host = host.split('/')[0];
    }
  } catch {
    host = host.split('/')[0];
  }
  host = host.replace(/^\*\./, '').replace(/^\./, '');
  if (!host || host.length < 3 || !host.includes('.')) return null;
  if (!/^[a-zA-Z0-9.-]+$/.test(host)) return null;
  return `*://${host}/*`;
}

async function registerCustomDomain(pattern) {
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts();
    const hasCustom = existing.some((s) => s.id === CUSTOM_ID);
    if (hasCustom) {
      await chrome.scripting.unregisterContentScripts({ ids: [CUSTOM_ID] });
    }
    if (!pattern) return;
    await chrome.scripting.registerContentScripts([
      {
        id: CUSTOM_ID,
        matches: [pattern],
        js: ['content.js'],
        runAt: 'document_start',
        allFrames: true,
        persistAcrossSessions: true,
      },
    ]);
    console.log(`[BbAtelier BG] Registered custom domain: ${pattern}`);
  } catch (err) {
    console.warn('[BbAtelier BG] registerCustomDomain failed:', err);
  }
}

async function initFromStorage() {
  try {
    const data = await chrome.storage.sync.get(['bbTheme']);
    const customDomain = data?.bbTheme?.customDomain || '';
    const pattern = domainToPattern(customDomain);
    if (pattern) {
      await registerCustomDomain(pattern);
    }
  } catch (err) {
    console.warn('[BbAtelier BG] initFromStorage failed:', err);
  }
}

// Listen for bbTheme.customDomain changes → re-register
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (!changes.bbTheme) return;
  const newVal = changes.bbTheme.newValue || {};
  const oldVal = changes.bbTheme.oldValue || {};
  const newDomain = String(newVal.customDomain || '').trim();
  const oldDomain = String(oldVal.customDomain || '').trim();
  if (newDomain === oldDomain) return;
  const pattern = domainToPattern(newDomain);
  registerCustomDomain(pattern);
});

// Request optional host permission when custom domain is set
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'requestHostPermission' && msg.pattern) {
    chrome.permissions
      .request({ origins: [msg.pattern] })
      .then((granted) => sendResponse({ granted }))
      .catch(() => sendResponse({ granted: false }));
    return true;
  }
  if (msg.action === 'getRegisteredDomains') {
    chrome.scripting
      .getRegisteredContentScripts()
      .then((scripts) => sendResponse({ scripts }))
      .catch(() => sendResponse({ scripts: [] }));
    return true;
  }
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  initFromStorage();
});

chrome.runtime.onStartup.addListener(() => {
  initFromStorage();
});

initFromStorage();
