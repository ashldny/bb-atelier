// ═════════════════════════════════════════════════════════
//  Bb Atelier — Theme Messaging (Chrome Tab Communication)
//  Sends theme/font commands to the content script
// ═════════════════════════════════════════════════════════

import { buildFullThemeCss } from '../theme/cssBuilder.js';

function sendToTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {});
  });
}

/**
 * Send a full theme CSS to the active Blackboard tab
 * @param {object} overrides
 * @param {object} darkOverrides
 * @param {string} staticVars
 */
export function applyThemeToBb(overrides, darkOverrides, staticVars) {
  const css = buildFullThemeCss(overrides, darkOverrides, staticVars);
  sendToTab({ action: 'applyThemeCSS', css });
}

/**
 * Preview a theme on the active Blackboard tab (temporary, not saved to storage)
 * @param {object} overrides
 * @param {object} darkOverrides
 * @param {string} staticVars
 */
export function previewThemeOnBb(overrides, darkOverrides, staticVars) {
  const css = buildFullThemeCss(overrides, darkOverrides, staticVars);
  sendToTab({ action: 'previewThemeCSS', css });
}

/**
 * Restore theme from storage after preview ends
 */
export function restoreThemeOnBb() {
  sendToTab({ action: 'restoreTheme' });
}

/**
 * Reset theme on the active Blackboard tab (back to default)
 */
export function resetThemeOnBb() {
  sendToTab({ action: 'resetTheme' });
}

/**
 * Apply a font to the active Blackboard tab
 * @param {string} font - Font name or data URL
 */
export function applyFont(font) {
  sendToTab({ action: 'applyFont', font });
}
