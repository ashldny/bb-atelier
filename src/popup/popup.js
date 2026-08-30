// ═════════════════════════════════════════════════════════
//  Bb Atelier — Popup Entry Point
//  Initialises all tabs and restores saved state
// ═════════════════════════════════════════════════════════

import { initTabs } from './tabs.js';
import { initTheme } from './theme.js';
import { initSaved } from './savedThemes.js';
import { initCourseCovers } from './courseCovers.js';
import { initDarkReaderControls } from './darkReaderControls.js';
import { initSwatches } from './swatches.js';
import { loadSettings } from './settings.js';
import { initSettingsTab } from './settingsTab.js';

// ─── Kick off everything on DOM ready ───
document.addEventListener('DOMContentLoaded', () => {
  try {
    initTabs();
  } catch (err) {
    console.error('[BbAtelier popup] initTabs failed', err);
  }
  try {
    initTheme();
  } catch (err) {
    console.error('[BbAtelier popup] initTheme failed', err);
  }
  try {
    initSaved();
  } catch (err) {
    console.error('[BbAtelier popup] initSaved failed', err);
  }
  try {
    initCourseCovers();
  } catch (err) {
    console.error('[BbAtelier popup] initCourseCovers failed', err);
  }
  try {
    initDarkReaderControls();
  } catch (err) {
    console.error('[BbAtelier popup] initDarkReaderControls failed', err);
  }
  try {
    initSwatches();
  } catch (err) {
    console.error('[BbAtelier popup] initSwatches failed', err);
  }
  try {
    loadSettings();
  } catch (err) {
    console.error('[BbAtelier popup] loadSettings failed', err);
  }
  try {
    initSettingsTab();
  } catch (err) {
    console.error('[BbAtelier popup] initSettingsTab failed', err);
  }
});
