// ═════════════════════════════════════════════════════════
//  Bb Atelier — Dark Reader Theme Defaults & Validation
//  Single source of truth for bbTheme stored in chrome.storage.sync
// ═════════════════════════════════════════════════════════

// Default bbTheme — persisted as one key `bbTheme` (batch writes)
export const DEFAULT_THEME = {
  // enable/disable is distinct from mode: disable() reverts styling entirely
  enabled: true,
  debug: false,
  mode: 1, // 1 = dark, 0 = light/dimmed (DarkReader Theme.mode)
  brightness: 100,
  contrast: 100,
  sepia: 0,
  grayscale: 0,
  darkSchemeBackgroundColor: '#181a1b',
  darkSchemeTextColor: '#e8e6e3',
  lightSchemeBackgroundColor: '#dcdad7',
  lightSchemeTextColor: '#181a1b',
  scrollbarColor: 'auto',
  selectionColor: 'auto',
  styleSystemControls: true,
  useFont: false,
  fontFamily: '',
  textStroke: 0,
  // Manual exceptions — one selector per line in popup textarea → array
  selectorsToIgnore: [],
  // Optional custom domain (e.g. blackboard.myuniversity.edu)
  customDomain: '',
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function clamp(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function sanitizeSelectors(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const raw of arr) {
    const s = String(raw).trim();
    if (!s || s.length > 500) continue;
    // Basic CSS selector sanity — must start with valid char and not contain dangerous chars
    if (/[<>]/.test(s)) continue;
    // Try to validate selector syntax when DOM is available (popup may not have target DOM, so guard)
    try {
      if (typeof document !== 'undefined' && document.querySelector) {
        // Use dummy fragment to test — will throw on invalid
        document.createDocumentFragment().querySelector(s);
      }
    } catch {
      continue;
    }
    out.push(s);
    if (out.length >= 100) break;
  }
  return out;
}

/**
 * Validate / normalize a raw bbTheme object from storage
 * @param {object} raw
 * @returns {object} normalized theme
 */
export function normalizeTheme(raw = {}) {
  const d = DEFAULT_THEME;
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : d.enabled,
    debug: typeof raw.debug === 'boolean' ? raw.debug : d.debug,
    mode: raw.mode === 0 || raw.mode === 1 ? raw.mode : d.mode,
    brightness: clamp(raw.brightness, 0, 200, d.brightness),
    contrast: clamp(raw.contrast, 0, 200, d.contrast),
    sepia: clamp(raw.sepia, 0, 100, d.sepia),
    grayscale: clamp(raw.grayscale, 0, 100, d.grayscale),
    darkSchemeBackgroundColor: HEX_RE.test(raw.darkSchemeBackgroundColor)
      ? raw.darkSchemeBackgroundColor
      : d.darkSchemeBackgroundColor,
    darkSchemeTextColor: HEX_RE.test(raw.darkSchemeTextColor)
      ? raw.darkSchemeTextColor
      : d.darkSchemeTextColor,
    lightSchemeBackgroundColor: HEX_RE.test(raw.lightSchemeBackgroundColor)
      ? raw.lightSchemeBackgroundColor
      : d.lightSchemeBackgroundColor,
    lightSchemeTextColor: HEX_RE.test(raw.lightSchemeTextColor)
      ? raw.lightSchemeTextColor
      : d.lightSchemeTextColor,
    scrollbarColor: typeof raw.scrollbarColor === 'string' ? raw.scrollbarColor : d.scrollbarColor,
    selectionColor: typeof raw.selectionColor === 'string' ? raw.selectionColor : d.selectionColor,
    styleSystemControls:
      typeof raw.styleSystemControls === 'boolean'
        ? raw.styleSystemControls
        : d.styleSystemControls,
    useFont: typeof raw.useFont === 'boolean' ? raw.useFont : d.useFont,
    fontFamily: typeof raw.fontFamily === 'string' ? raw.fontFamily.slice(0, 100) : d.fontFamily,
    textStroke: clamp(raw.textStroke, 0, 1, d.textStroke),
    selectorsToIgnore: sanitizeSelectors(raw.selectorsToIgnore),
    customDomain:
      typeof raw.customDomain === 'string' ? raw.customDomain.trim().slice(0, 200) : d.customDomain,
  };
}

/**
 * Parse textarea value (one selector per line) into array
 * @param {string} text
 * @returns {string[]}
 */
export function parseSelectorsTextarea(text) {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Build DynamicThemeFix from selectorsToIgnore
 * Dark Reader's `selectorsToIgnore` concept maps to multiple fix arrays
 * @param {string[]} selectors
 * @returns {{ignoreInlineStyle: string[], ignoreImageAnalysis: string[], invert: string[], css: string}}
 */
export function buildFixes(selectors) {
  const arr = sanitizeSelectors(selectors);
  // Preserve bb-cover banners from Dark Reader analysis (they rely on background-image)
  const extraIgnore = ['.course-banner[data-bb-cover]', '.course-banner img'];
  const merged = [...new Set([...arr, ...extraIgnore])];
  return {
    ignoreInlineStyle: [...merged],
    ignoreImageAnalysis: [...merged],
    invert: [],
    css: '/* bb-atelier: preserve covers */ .course-banner[data-bb-cover] { background-color: transparent !important; }',
  };
}

/**
 * Build Theme payload for Dark Reader enable() from normalized bbTheme
 * @param {object} theme - normalized
 * @returns {object} DarkReader Theme
 */
export function toDarkReaderTheme(theme) {
  // Ensure Dark Reader receives fully normalized payload — engine expects hex lowercased
  return {
    mode: theme.mode,
    brightness: theme.brightness,
    contrast: theme.contrast,
    sepia: theme.sepia,
    grayscale: theme.grayscale,
    darkSchemeBackgroundColor: String(theme.darkSchemeBackgroundColor).toLowerCase(),
    darkSchemeTextColor: String(theme.darkSchemeTextColor).toLowerCase(),
    lightSchemeBackgroundColor: String(theme.lightSchemeBackgroundColor).toLowerCase(),
    lightSchemeTextColor: String(theme.lightSchemeTextColor).toLowerCase(),
    scrollbarColor: theme.scrollbarColor === 'auto' ? '' : String(theme.scrollbarColor).toLowerCase(),
    selectionColor: theme.selectionColor === 'auto' ? '' : String(theme.selectionColor).toLowerCase(),
    styleSystemControls: !!theme.styleSystemControls,
    useFont: !!theme.useFont,
    fontFamily: String(theme.fontFamily || ''),
    textStroke: Number(theme.textStroke) || 0,
  };
}
