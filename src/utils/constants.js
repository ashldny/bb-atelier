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
// Theme keys in sync storage; the last three drive "match my device" light/dark switching.
export const PALETTE_KEYS = [
  'pageBg',
  'accent',
  'navbar',
  'pageText',
  'customMode',
  'followSystem',
  'lightPalette',
  'darkPalette',
];

// About tab feedback goes to a Google Form, anonymously: only the message and the
// extension version are sent. formId is the id in the form's /forms/d/e/<id>/viewform
// link; the entries are its "entry.<number>" field names. Empty formId = not set up.
export const FEEDBACK_FORM = {
  formId: '1FAIpQLSd_Yn2gI0bhGH8WUkMxgkRLoO5uoy_CGRK1kJVG89wUHQzg2g',
  messageEntry: 'entry.1538721259',
  // The form has no version question; add one and put its entry id here to collect it.
  versionEntry: '',
};
export const MAX_FEEDBACK_LENGTH = 2000;

// Typography → Text size: a multiplier on Blackboard's root font size (1 = unchanged).
export const TEXT_SCALE = { min: 0.85, max: 1.3, step: 0.05, default: 1 };
export function normalizeTextScale(value) {
  const scale = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(scale)) return TEXT_SCALE.default;
  const clamped = Math.min(TEXT_SCALE.max, Math.max(TEXT_SCALE.min, scale));
  const steps = Math.round(1 / TEXT_SCALE.step);
  return Math.round(clamped * steps) / steps;
}

// Chrome Web Store listing (item kdamchficcbjbpjlkoikmjhgbhdfmmgi).
export const STORE_URL =
  'https://chromewebstore.google.com/detail/kdamchficcbjbpjlkoikmjhgbhdfmmgi';
export const STORE_REVIEWS_URL = `${STORE_URL}/reviews`;
