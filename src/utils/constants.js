// ═════════════════════════════════════════════════════════
//  Bb Atelier — Shared Constants
// ═════════════════════════════════════════════════════════

export const DEFAULT_BG = '#1a1a1a';
export const DEFAULT_ACCENT = '#670D2F';
export const DEFAULT_NAVBAR = '#121212';
export const DEFAULT_PAGETEXT = '#e0e0e0';

export const DEFAULT_SETTINGS = {
  masterEnabled: true,
  customMode: true,
  pageBg: DEFAULT_BG,
  accent: DEFAULT_ACCENT,
  // null = derive a darker shade of pageBg (see colorUtils.sidebarShade)
  navbar: null,
  pageText: DEFAULT_PAGETEXT,
};

export const DEFAULT_POSITION = '50% 50%';
export const PALETTE_KEYS = ['pageBg', 'accent', 'navbar', 'pageText', 'customMode'];
