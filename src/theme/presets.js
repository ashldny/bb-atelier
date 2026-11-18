// ═════════════════════════════════════════════════════════
//  Bb Atelier — Preset Themes
//  Equal-count Light and Dark built-in presets
//
//  Token mapping per preset:
//    pageBg   → --page-bg (also determines mode via isDark())
//    accent   → --accent
//    navbar   → --navbar-bg (derives --navbar-bg-darker, --navbar-text)
//    pageText → --page-text-1 (optional; auto-derives from contrastText(bg) if omitted)
//    --page-text-2 / --page-text-3 derived via CSS color-mix per mode (cssBuilder.js)
// ═════════════════════════════════════════════════════════

export const PRESET_THEMES = [
  // ── Light (4) — dark text on light background ──
  { name: 'Default Light', pageBg: '#ffffff', accent: '#670D2F', navbar: '#262626' },
  { name: 'Ocean',         pageBg: '#f0f4f8', accent: '#2563eb', navbar: '#1e293b' },
  { name: 'Forest',        pageBg: '#f0fdf4', accent: '#16a34a', navbar: '#1a2e1a' },
  { name: 'Sunset',        pageBg: '#fefce8', accent: '#ea580c', navbar: '#1c1917' },
  // ── Dark (4) — light text on dark background ──
  { name: 'Default Dark',  pageBg: '#1a1a1a', accent: '#670D2F', navbar: '#121212', pageText: '#e0e0e0' },
  { name: 'Midnight',      pageBg: '#0f172a', accent: '#e94560', navbar: '#020617', pageText: '#cbd5e1' },
  { name: 'Lavender',      pageBg: '#1e1b2e', accent: '#a855f7', navbar: '#13111c', pageText: '#d8d4e8' },
  { name: 'High Contrast', pageBg: '#000000', accent: '#22c55e', navbar: '#0a0a0a', pageText: '#ffffff' },
];
