// ═════════════════════════════════════════════════════════
//  Bb Atelier — Contrast Badges (shared)
//  Extracted from savedThemes.js to break theme ↔ savedThemes cycle
// ═════════════════════════════════════════════════════════
import { luminance } from '../theme/colorUtils.js';
import { DEFAULT_BG } from '../utils/constants.js';

/**
 * Update hex labels + contrast badges in the Colors sub-tab
 * based on current picker values.
 */
export function updateContrastBadges() {
  const pairs = [
    { hexId: 'pageBgPicker', hexOut: 'hexPageBg', conOut: 'contrastPageBg', label: 'bg' },
    { hexId: 'activeTabGlowPicker', hexOut: 'hexAccent', conOut: 'contrastAccent', label: 'accent' },
    { hexId: 'navbarPicker', hexOut: 'hexNavbar', conOut: 'contrastNavbar', label: 'navbar' },
  ];
  pairs.forEach((p) => {
    const el = document.getElementById(p.hexId);
    const hexEl = document.getElementById(p.hexOut);
    const conEl = document.getElementById(p.conOut);
    if (!el || !hexEl || !conEl) return;
    const hex = el.value || DEFAULT_BG;
    hexEl.textContent = hex;
    const lum = luminance(hex);
    let ok, msg;
    if (p.label === 'bg' || p.label === 'navbar') {
      if (lum < 0.18 || lum > 0.8) { ok = true; msg = 'Good'; }
      else { ok = false; msg = 'Low'; }
    } else {
      ok = lum > 0.2 && lum < 0.8;
      msg = ok ? 'Good' : 'Low';
    }
    conEl.textContent = msg;
    conEl.className = 'swatch-contrast ' + (ok ? 'ok' : 'warn');
  });
}
