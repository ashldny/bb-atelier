// ═════════════════════════════════════════════════════════
//  Bb Atelier — Preset Themes
//  Equal-count Light and Dark built-in presets (6 each)
//
//  Token mapping per preset:
//    pageBg   → --page-bg (also determines mode via isDark())
//    accent   → --accent
//    navbar   → omitted: the sidebar is derived as a darker shade of pageBg
//    pageText → --page-text-1 (optional; auto-derives from contrastText(bg) if omitted)
//    --page-text-2 / --page-text-3 derived via CSS color-mix per mode (cssBuilder.js)
// ═════════════════════════════════════════════════════════

export const PRESET_THEMES = [
  // ── Light (6) — dark text on light background ──
  { name: 'Default Light', pageBg: '#ffffff', accent: '#670D2F' },
  { name: 'Ocean',         pageBg: '#f0f4f8', accent: '#2563eb' },
  { name: 'Forest',        pageBg: '#f0fdf4', accent: '#16a34a' },
  { name: 'Sunset',        pageBg: '#fefce8', accent: '#ea580c' },
  { name: 'Blossom',       pageBg: '#fdf2f6', accent: '#c2416f' },
  { name: 'Lilac',         pageBg: '#f6f2fd', accent: '#7c4dcc' },
  // ── Dark (6) — light text on dark background ──
  { name: 'Default Dark',  pageBg: '#1a1a1a', accent: '#670D2F', pageText: '#e0e0e0' },
  { name: 'Midnight',      pageBg: '#0f172a', accent: '#e94560', pageText: '#cbd5e1' },
  { name: 'Lavender',      pageBg: '#1e1b2e', accent: '#a855f7', pageText: '#d8d4e8' },
  { name: 'High Contrast', pageBg: '#000000', accent: '#22c55e', pageText: '#ffffff' },
  { name: 'Crimson Noir',  pageBg: '#0c0a0a', accent: '#a3192e', pageText: '#e9dfdf' },
  { name: 'Neon City',     pageBg: '#0b0d1e', accent: '#ff2e97', pageText: '#cfe9ff' },
];
