// ═════════════════════════════════════════════════════════
//  Bb Atelier — Popup Entry Point
//  Initialises all tabs and restores saved state
// ═════════════════════════════════════════════════════════

import { initTabs } from './tabs.js';
import { initTheme } from './theme.js';
import { initSaved } from './savedThemes.js';
import { initCourseCovers } from './courseCovers.js';
import { loadSettings } from './settings.js';

// ─── Kick off everything on DOM ready ───
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initTheme();
  initSaved();
  initCourseCovers();
  loadSettings();
});