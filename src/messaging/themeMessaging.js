// ═════════════════════════════════════════════════════════
//  Bb Atelier — Theme Messaging (Chrome Tab Communication)
//  Sends theme/font commands to the content script
// ═════════════════════════════════════════════════════════

import { buildFullThemeCss } from '../theme/cssBuilder.js';

function logError(action, err) {
  if (chrome.runtime.lastError) {
    console.warn(`[BbTheme] ${action}:`, chrome.runtime.lastError.message);
  }
  if (err) {
    console.warn(`[BbTheme] ${action}:`, err.message || err);
  }
}

/**
 * Send a full theme CSS to the active Blackboard tab
 * @param {object} overrides
 * @param {object} darkOverrides
 * @param {string} staticVars
 */
export function applyThemeToBb(overrides, darkOverrides, staticVars) {
  const css = buildFullThemeCss(overrides, darkOverrides, staticVars);
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'applyThemeCSS',
      css: css,
    }, () => {
      logError('applyThemeCSS');
    });
  });
}

/**
 * Reset theme on the active Blackboard tab (back to default)
 */
export function resetThemeOnBb() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'resetTheme' }, () => {
      logError('resetTheme');
    });
  });
}

/**
 * Apply a font to the active Blackboard tab
 * @param {string} font - Font name or data URL
 */
export function applyFont(font) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'applyFont',
      font: font,
    }, () => {
      logError('applyFont');
    });
  });
}
