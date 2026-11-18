import { buildFullThemeCss } from '../theme/cssBuilder.js';
import { purgeDarkReaderCss } from '../utils/cssSanitizer.js';
import { isSupportedUrl } from '../utils/domains.js';
import { showToast } from '../utils/ui.js';

let targetPromise;
const recovery = new Map();

// Capture the target once: a late response must never jump to another active tab.
export function getTargetTab() {
  if (!targetPromise)
    targetPromise = Promise.all([
      chrome.tabs.query({ active: true, currentWindow: true }),
      chrome.storage.sync.get('bbTheme'),
    ]).then(([tabs, data]) => {
      const tab = tabs[0];
      return tab?.id && isSupportedUrl(tab.url, data.bbTheme?.customDomain) ? tab : null;
    });
  return targetPromise;
}

export function invalidateTargetTab() {
  targetPromise = undefined;
}

export async function sendToTab(message, { quiet = false } = {}) {
  try {
    const tab = await getTargetTab();
    if (!tab) return null;
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, message, { frameId: 0 });
    } catch {
      if (!recovery.has(tab.id)) {
        recovery.set(
          tab.id,
          chrome.scripting
            .executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['content.js'] })
            .finally(() => recovery.delete(tab.id))
        );
      }
      await recovery.get(tab.id);
      response = await chrome.tabs.sendMessage(tab.id, message, { frameId: 0 });
    }
    if (response?.success === false && response.error) throw new Error(response.error);
    return response;
  } catch (error) {
    if (!quiet) showToast('Could not reach Blackboard. Reopen the popup to try again.', 'error');
    console.warn('[BbAtelier] Tab connection:', error.message);
    return null;
  }
}

export function applyThemeToBb(overrides, darkOverrides, staticVars) {
  const css = purgeDarkReaderCss(buildFullThemeCss(overrides, darkOverrides, staticVars));
  return sendToTab({ action: 'applyThemeCSS', css });
}
export function previewThemeOnBb(overrides, darkOverrides, staticVars) {
  const css = purgeDarkReaderCss(buildFullThemeCss(overrides, darkOverrides, staticVars));
  return sendToTab({ action: 'previewThemeCSS', css }, { quiet: true });
}
export function restoreThemeOnBb() {
  return sendToTab({ action: 'restoreTheme' }, { quiet: true });
}
export function resetThemeOnBb() {
  return sendToTab({ action: 'resetTheme' });
}
export function applyFont(font) {
  return sendToTab({ action: 'applyFont', font });
}
export function resetFontOnBb() {
  return applyFont('');
}
