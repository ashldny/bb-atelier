// ═════════════════════════════════════════════════════════
//  Bb Atelier — Popup Script v5 (2-Color + Auto-Derive)
// ═════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initTheme();
  initSaved();
  initCourseCovers();
  loadSettings();
});

// ─── Defaults ────────────────────────────────────────────
const DEFAULT_BG = '#ffffff';
const DEFAULT_ACCENT = '#a234b5';
const DEFAULT_NAVBAR = '#262626';

// ─── Luminance / contrast helpers ────────────────────────
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map(c => Math.min(255, Math.max(0, Math.round(c))).toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 7);
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rs = r / 255, gs = g / 255, bs = b / 255;
  const toLin = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLin(rs) + 0.7152 * toLin(gs) + 0.0722 * toLin(bs);
}

function isDark(hex) {
  return luminance(hex) < 0.5;
}

function lighten(hex, pct) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 + pct / 100;
  return rgbToHex(Math.min(255, r * f), Math.min(255, g * f), Math.min(255, b * f));
}

function darken(hex, pct) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - pct / 100;
  return rgbToHex(r * f, g * f, b * f);
}

function mix(hex1, hex2, ratio) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * ratio,
    c1.g + (c2.g - c1.g) * ratio,
    c1.b + (c2.b - c1.b) * ratio,
  );
}

function contrastText(bgHex) {
  return isDark(bgHex) ? '#ffffff' : 'rgb(38, 38, 38)';
}

// ─── Derive ALL palette tokens from bg + accent + navbar ─
function derivePalette(pageBg, accent, navbar) {
  const dark = isDark(pageBg);

  // Base tones
  const bg = pageBg;
  const paper = dark ? lighten(bg, 20) : darken(bg, 3);
  const textPrimary = contrastText(bg);
  const textSecondary = dark ? lighten(bg, 75) : darken(bg, 35);
  const textDisabled = dark ? mix(bg, '#ffffff', 0.35) : mix(bg, '#000000', 0.25);
  const textHint = dark ? mix(bg, '#ffffff', 0.3) : mix(bg, '#000000', 0.2);

  const useNavbar = navbar && navbar !== pageBg && navbar !== '#000000';
  const primaryMain = useNavbar ? navbar : textPrimary;
  const primaryContrast = useNavbar ? contrastText(navbar) : (dark ? '#262626' : '#ffffff');
  const primaryLight = useNavbar ? lighten(navbar, 25) : (dark ? lighten(bg, 30) : lighten(primaryMain, 40));
  const primaryDark = useNavbar ? darken(navbar, 15) : (dark ? '#ffffff' : darken(primaryMain, 15));

  const borderMain = dark ? lighten(bg, 35) : darken(bg, 15);
  const borderDark = dark ? lighten(bg, 55) : darken(bg, 35);
  const divider = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  const secondaryMain = dark ? lighten(bg, 45) : darken(bg, 10);
  const secondaryContrast = contrastText(secondaryMain);
  const secondaryLight = dark ? lighten(bg, 55) : lighten(secondaryMain, 15);
  const secondaryDark = dark ? lighten(bg, 20) : darken(secondaryMain, 15);

  // Accent-derived
  const brandMain = accent;
  const brandContrast = contrastText(accent);
  const brandLight = lighten(accent, 40);
  const brandDark = darken(accent, 20);

  const linkActive = accent;
  const linkHover = lighten(accent, 15);
  const linkSelected = accent;
  const linkDisabled = dark ? mix(brighten(accent, 50), accent, 0.5) : mix(darken(accent, 50), accent, 0.3);

  const focusMain = dark ? lighten(accent, 20) : darken(accent, 10);
  const focusLight = dark ? darken(accent, 10) : lighten(accent, 20);
  const focusDark = darken(accent, 30);

  // Status colors
  const error = dark ? '#ff4a36' : '#c23e37';
  const errorContrast = '#ffffff';
  const errorLight = dark ? '#c23e37' : '#ffdad6';
  const errorDark = '#661d15';

  const success = dark ? '#39e379' : '#007d2c';
  const successContrast = '#ffffff';
  const successLight = dark ? '#007d2c' : '#e5f2e9';
  const successDark = dark ? 'rgb(39,158,84)' : 'rgb(0,87,30)';

  const info = dark ? '#2c9ede' : '#185677';
  const infoContrast = '#ffffff';
  const infoLight = dark ? '#185677' : '#d7f7ff';
  const infoDark = dark ? 'rgb(30,110,155)' : 'rgb(16,60,83)';

  const warning = dark ? '#ffe300' : '#ccb400';
  const warningContrast = '#262626';
  const warningLight = dark ? '#ccb400' : '#fff499';
  const warningDark = dark ? 'rgb(178,158,0)' : 'rgb(142,125,0)';

  const caution = dark ? '#ff6600' : '#c75000';
  const cautionLight = dark ? '#c75000' : '#ff6600';

  // Action colors
  const actionActive = textPrimary;
  const actionHover = dark ? '#ffffff' : '#000000';
  const actionSelected = actionHover;
  const actionDisabled = textDisabled;
  const actionDisabledBg = dark ? lighten(bg, 10) : darken(bg, 5);
  const actionFocus = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  // Background ramp (b1–b10)
  const b1 = bg;
  const b2 = paper;
  const b3 = dark ? lighten(bg, 12) : darken(bg, 6);
  const b4 = dark ? lighten(bg, 22) : darken(bg, 10);
  const b5 = dark ? lighten(bg, 30) : darken(bg, 16);
  const b6 = dark ? lighten(bg, 40) : darken(bg, 25);
  const b7 = dark ? lighten(bg, 50) : darken(bg, 35);
  const b8 = dark ? lighten(bg, 60) : darken(bg, 45);
  const b9 = dark ? lighten(bg, 75) : darken(bg, 60);
  const b10 = dark ? '#ffffff' : '#000000';

  // Indicator colors — derived from accent
  const indPrimary = isDark(accent) ? lighten(accent, 30) : accent;
  const indSecondary = isDark(error) ? lighten(error, 20) : error;

  // Static tokens (grade colors, greys, common)
  function staticVars() {
    return `
  --palette-grade-excellent: #1DCD6A;
  --palette-grade-veryGood: #86E64F;
  --palette-grade-good: #C9E04A;
  --palette-grade-fair: #67DBE2;
  --palette-grade-borderline: #6CC0F7;
  --palette-grade-warning: #96ADFF;
  --palette-grade-low: #C2A6E1;
  --palette-grade-veryLow: #E899E1;
  --palette-grade-critical: #FFE54A;
  --palette-grade-failing: #FFC04A;
  --palette-grade-severeFailing: #FFA557;
  --palette-grade-extremeFailing: #FF9192;
  --palette-common-black: #000;
  --palette-common-white: #fff;
  --palette-grey-50: #fafafa;
  --palette-grey-100: #f5f5f5;
  --palette-grey-200: #eeeeee;
  --palette-grey-300: #e0e0e0;
  --palette-grey-400: #bdbdbd;
  --palette-grey-500: #9e9e9e;
  --palette-grey-600: #757575;
  --palette-grey-700: #616161;
  --palette-grey-800: #424242;
  --palette-grey-900: #212121;
  --palette-grey-A100: #f5f5f5;
  --palette-grey-A200: #eeeeee;
  --palette-grey-A400: #bdbdbd;
  --palette-grey-A700: #616161;
  --palette-highContrastOnly-main: rgba(0,0,0,0.001);
  --palette-brand-ascend: #0054BC;
  --palette-brand-renew: #0DAC41;
  --palette-brand-pulse: #C8DA2B;
  /* Editor font colours */
  --editor-font-gray: #666666;
  --editor-font-purple: #a234b5;
  --editor-font-blue: #006dc7;
  --editor-font-green: #007d2c;
  --editor-font-red: #e00000;
  /* Editor highlight colours */
  --editor-highlight-gray: #f3f3f3;
  --editor-highlight-purple: #ffefff;
  --editor-highlight-blue: #e7f5ff;
  --editor-highlight-green: #effcf3;
  --editor-highlight-yellow: #fff5b8;
  --editor-highlight-orange: #fff4e9;
  --editor-highlight-red: #ffefef;
  /* Action palette (opacity / hover / focus) */
  --palette-action-active: #262626;
  --palette-action-hover: #000000;
  --palette-action-selected: #000000;
  --palette-action-disabled: #8c8c8c;
  --palette-action-disabledBackground: #e5e5e5;
  --palette-action-hoverOpacity: 0.04;
  --palette-action-selectedOpacity: 0.08;
  --palette-action-disabledOpacity: 0.38;
  --palette-action-focus: rgba(0,0,0,0.12);
  --palette-action-focusOpacity: 0.12;
  --palette-action-activatedOpacity: 0.12;`;
  }

  // Build the light-mode overrides object
  const overrides = {
    // Brand
    '--palette-mode': dark ? 'dark' : 'light',
    '--palette-brand-main': brandMain,
    '--palette-brand-contrastText': brandContrast,
    '--palette-brand-light': brandLight,
    '--palette-brand-dark': brandDark,
    '--palette-brandAlt-main': brandLight,
    '--palette-brandAlt-contrastText': contrastText(brandLight),
    // Primary
    '--palette-primary-main': primaryMain,
    '--palette-primary-contrastText': primaryContrast,
    '--palette-primary-light': primaryLight,
    '--palette-primary-dark': primaryDark,
    // Secondary
    '--palette-secondary-main': secondaryMain,
    '--palette-secondary-contrastText': secondaryContrast,
    '--palette-secondary-light': secondaryLight,
    '--palette-secondary-dark': secondaryDark,
    // Links & Focus
    '--palette-link-active': linkActive,
    '--palette-link-hover': linkHover,
    '--palette-link-selected': linkSelected,
    '--palette-link-disabled': linkDisabled,
    '--palette-focus-main': focusMain,
    '--palette-focus-light': focusLight,
    '--palette-focus-dark': focusDark,
    // Text
    '--palette-text-primary': textPrimary,
    '--palette-text-secondary': textSecondary,
    '--palette-text-disabled': textDisabled,
    '--palette-text-hint': textHint,
    // Surface / Background
    '--palette-background-default': bg,
    '--palette-background-paper': paper,
    '--palette-background-b1': b1,
    '--palette-background-b2': b2,
    '--palette-background-b3': b3,
    '--palette-background-b4': b4,
    '--palette-background-b5': b5,
    '--palette-background-b6': b6,
    '--palette-background-b7': b7,
    '--palette-background-b8': b8,
    '--palette-background-b9': b9,
    '--palette-background-b10': b10,
    // Borders
    '--palette-border-main': borderMain,
    '--palette-border-dark': borderDark,
    '--palette-divider': divider,
    // Actions
    '--palette-action-active': actionActive,
    '--palette-action-hover': actionHover,
    '--palette-action-selected': actionSelected,
    '--palette-action-disabled': actionDisabled,
    '--palette-action-disabledBackground': actionDisabledBg,
    '--palette-action-focus': actionFocus,
    // Status — error
    '--palette-error-main': error,
    '--palette-error-contrastText': errorContrast,
    '--palette-error-light': errorLight,
    '--palette-error-dark': errorDark,
    // Status — success
    '--palette-success-main': success,
    '--palette-success-contrastText': successContrast,
    '--palette-success-light': successLight,
    '--palette-success-dark': successDark,
    // Status — info
    '--palette-info-main': info,
    '--palette-info-contrastText': infoContrast,
    '--palette-info-light': infoLight,
    '--palette-info-dark': infoDark,
    // Status — warning
    '--palette-warning-main': warning,
    '--palette-warning-contrastText': warningContrast,
    '--palette-warning-light': warningLight,
    '--palette-warning-dark': warningDark,
    // Status — caution
    '--palette-caution-main': caution,
    '--palette-caution-light': cautionLight,
    // Indicator
    '--palette-indicatorPrimary-main': indPrimary,
    '--palette-indicatorPrimary-contrastText': '#ffffff',
    '--palette-indicatorPrimary-dark': indPrimary,
    '--palette-indicatorSecondary-main': indSecondary,
    '--palette-indicatorSecondary-contrastText': '#ffffff',
  };

  // Build the dark-mode overrides — same as light for the user's chosen colors
  const darkOverrides = { ...overrides };

  return { overrides, darkOverrides, staticVars: staticVars() };
}

// ─── Helper that needs hoisting ─────────────────────────
function brighten(hex, pct) {
  return lighten(hex, pct);
}

// ─── Build theme CSS ────────────────────────────────────
function buildFullThemeCss(overrides, darkOverrides, staticVars) {
  const lines = [];

  // :root, .mode-light
  lines.push(':root, .mode-light {');
  for (const [key, val] of Object.entries(overrides)) {
    lines.push(`  ${key}: ${val};`);
  }
  lines.push(staticVars);
  lines.push('}');

  // .mode-dark
  lines.push('.mode-dark {');
  for (const [key, val] of Object.entries(darkOverrides)) {
    lines.push(`  ${key}: ${val};`);
  }
  lines.push(staticVars);
  lines.push('}');

  // ─── Tier 2: Legacy Foundation overrides ───
  const accent = overrides['--palette-brand-main'];
  const primary = overrides['--palette-primary-main'];
  const link = overrides['--palette-link-active'];
  const error = overrides['--palette-error-main'];
  const success = overrides['--palette-success-main'];
  const warning = overrides['--palette-warning-main'];
  const info = overrides['--palette-info-main'];
  const caution = overrides['--palette-caution-main'];
  const secondary = overrides['--palette-secondary-main'];
  const legacyPrimary = link;

  lines.push(`
/* ─── Tier 2: Legacy Foundation overrides ─── */
/* Buttons */
.button.primary,
.button.hollow.primary {
  background-color: ${legacyPrimary} !important;
  border-color: ${darken(legacyPrimary, 10)} !important;
}
.button.primary:hover,
.button.hollow.primary:hover {
  background-color: ${darken(legacyPrimary, 15)} !important;
}
.button.primary:active,
.button.hollow.primary:active {
  background-color: ${darken(legacyPrimary, 25)} !important;
}
.button.secondary {
  background-color: ${secondary} !important;
  border-color: ${darken(secondary, 10)} !important;
}
.button.success {
  background-color: ${success} !important;
  border-color: ${darken(success, 10)} !important;
}
.button.warning {
  background-color: ${warning} !important;
  border-color: ${darken(warning, 10)} !important;
}
.button.alert {
  background-color: ${error} !important;
  border-color: ${darken(error, 10)} !important;
}
.button.hollow {
  color: ${legacyPrimary} !important;
  border-color: ${legacyPrimary} !important;
}
.button.hollow:hover,
.button.hollow:focus {
  background-color: ${legacyPrimary} !important;
  color: ${contrastText(legacyPrimary)} !important;
}
/* Alert boxes */
.alert-box {
  background-color: ${legacyPrimary} !important;
  color: ${contrastText(legacyPrimary)} !important;
}
.alert-box.success {
  background-color: ${success} !important;
}
.alert-box.warning {
  background-color: ${warning} !important;
}
.alert-box.alert {
  background-color: ${error} !important;
}
.alert-box.info {
  background-color: ${info || legacyPrimary} !important;
}
.alert-box.secondary {
  background-color: ${secondary} !important;
}
/* Labels */
.label {
  background-color: ${legacyPrimary} !important;
}
.label.success {
  background-color: ${success} !important;
}
.label.warning {
  background-color: ${warning} !important;
}
.label.alert {
  background-color: ${error} !important;
}
.label.info {
  background-color: ${info || legacyPrimary} !important;
}
.label.secondary {
  background-color: ${secondary} !important;
}
/* Spinners */
.spinner.bb-tertiary-color-primary,
.spinner.bb-tertiary-color-0 {
  border-color: ${accent} !important;
  border-top-color: transparent !important;
}
.spinner.bb-tertiary-color-success,
.spinner.bb-tertiary-color-1 {
  border-color: ${success} !important;
  border-top-color: transparent !important;
}
.spinner.bb-tertiary-color-warning,
.spinner.bb-tertiary-color-2 {
  border-color: ${warning} !important;
  border-top-color: transparent !important;
}
.spinner.bb-tertiary-color-alert,
.spinner.bb-tertiary-color-3 {
  border-color: ${error} !important;
  border-top-color: transparent !important;
}
/* Themed background utilities (navbar / sidebar) */
.themed-background-primary-fill-only {
  background-color: ${primary} !important;
}
.themed-background-primary-alt-fill-only {
  background-color: ${primary} !important;
}
.themed-logo-background-primary-fill {
  background-color: ${primary} !important;
}
/* Active nav link uses accent color (boosted specificity) */
.themed-background-primary-alt-fill-only.themed-background-primary-alt-fill-only[class*="active"],
.themed-background-primary-alt-fill-only.themed-background-primary-alt-fill-only [aria-current="page"],
.themed-background-primary-alt-fill-only.themed-background-primary-alt-fill-only .Mui-selected {
  background: ${accent} !important;
  color: ${contrastText(accent)} !important;
}
/* Nav item text & icons inside themed backgrounds */
.themed-background-primary-alt-fill-only [class*="listItemText"],
.themed-background-primary-alt-fill-only [class*="icon"] {
  color: ${contrastText(primary)} !important;
}
/* Sidebar divider borders */
.themed-logo-background-primary-fill {
  border-bottom-color: ${darken(primary, 12)} !important;
}
.themed-background-primary-fill-only nav .themed-background-primary-alt-fill-only {
  border-bottom-color: ${darken(primary, 12)} !important;
}
/* Header (logo area) text contrast */
.themed-logo-background-primary-fill * {
  color: ${contrastText(primary)} !important;
}

/* ─── Course Theme Color Preview (Accent, boosted specificity) ─── */
.color-selection-live-mode.color-selection-live-mode.color-selection-preview-bb-close .bb-close,
.color-selection-live-mode.color-selection-live-mode .active.base-navigation-button-content.active.base-navigation-button-content,
.color-selection-live-mode.color-selection-live-mode .active .integration-navigation-button-content.active .integration-navigation-button-content {
  background-color: ${accent} !important;
  color: ${contrastText(accent)} !important;
}

/* ─── Stream filter / dropdown inputs — themed surface + text ─── */
.MuiOutlinedInput-root,
.muiltr-qgg64x {
  background-color: var(--palette-background-paper) !important;
  color: var(--palette-text-primary) !important;
  border-color: var(--palette-border-main) !important;
}

/* ─── Stream filter floating label cutout — use page bg instead of white ─── */
.muiltr-dpz1f2.MuiInputLabel-shrink::before {
  background: linear-gradient(transparent 0%, transparent 49%, var(--palette-background-default) 50%, var(--palette-background-default) 100%) !important;
}

/* ─── Stream filter floating label text color ─── */
.muiltr-dpz1f2.MuiInputLabel-shrink {
  color: var(--palette-text-primary) !important;
}

/* ─── Stream filter dropdown menu (popover) ─── */
.muiltr-h6lxdq {
  background-color: var(--palette-background-paper) !important;
  color: var(--palette-text-primary) !important;
  border-color: var(--palette-border-main) !important;
}

/* ─── Stream filter dropdown arrow icon ─── */
.muiltr-gym1px {
  color: var(--palette-text-primary) !important;
}

/* ─── Activity stream item hover overlay ─── */
.base-recent-activity .activity-stream .activity-group .stream-item::before {
  background-color: color-mix(in srgb, var(--palette-common-black) 8%, var(--palette-background-default)) !important;
}

/* ─── Activity stream icon background — always blend with page bg ─── */
.element-image.stream-panel-activity-icon {
  background-color: transparent !important;
}
.element-image.stream-panel-activity-icon svg {
  background-color: transparent !important;
}

/* ─── Activity stream element details content — lighter text ─── */
.base-recent-activity .activity-stream .activity-group .stream-item .element-details .content {
  font-size: .875rem;
  color: var(--palette-text-hint, #999999) !important;
}

/* ─── Activity stream timestamp — lighter text ─── */
.base-recent-activity .activity-stream .activity-group .stream-item .timestamp {
  color: var(--palette-text-hint, #999999) !important;
}

/* ─── Element card timestamps, counts, badges — lighter text ─── */
.element-card .timestamp,
.element-card .count,
.element-card .badge {
  color: var(--palette-text-hint, #999999) !important;
}

/* ─── Split datetime spans (date + time) — lighter text ─── */
.js-split-datetime .date,
.js-split-datetime .time {
  color: var(--palette-text-hint, #999999) !important;
}
`);

  return lines.join('\n');
}

// ─── Messaging ──────────────────────────────────────────
function applyThemeToBb(overrides, darkOverrides, staticVars) {
  const css = buildFullThemeCss(overrides, darkOverrides, staticVars);
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'applyThemeCSS',
      css: css,
    }).catch(() => {});
  });
}

function resetThemeOnBb() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'resetTheme' }).catch(() => {});
  });
}

// ═════════════════════════════════════════════════════════
//  Tab Switching
// ═════════════════════════════════════════════════════════
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabs.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      contents.forEach((c) => {
        c.classList.toggle('active', c.dataset.tab === tab);
      });

      chrome.storage.sync.set({ activeTab: tab });
    });
  });
}

// ═════════════════════════════════════════════════════════
//  Theme Tab (2-color + auto-derive)
// ═════════════════════════════════════════════════════════
function initTheme() {
  // Appearance radio
  document.querySelectorAll('input[name="appearance"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const isCustom = radio.value === 'custom';
      chrome.storage.sync.set({ customMode: isCustom }, () => {
        toggleColorSection(isCustom);
        if (isCustom) {
          applyCurrentTheme();
        } else {
          resetThemeOnBb();
        }
      });
    });
  });

  // Apply button
  document.getElementById('applyThemeBtn').addEventListener('click', () => {
    const isCustom = document.querySelector('input[name="appearance"]:checked').value === 'custom';
    if (!isCustom) return;
    applyCurrentTheme();
  });

  // Font
  document.getElementById('fontSelect').addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      document.getElementById('fontUpload').click();
    } else {
      applyFont(e.target.value);
      chrome.storage.sync.set({ font: e.target.value });
    }
  });

  document.getElementById('fontUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      chrome.storage.sync.set({ font: dataUrl, fontName: file.name }, () => {
        applyFont(dataUrl);
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
}

function toggleColorSection(enabled) {
  const el = document.getElementById('colorSection');
  el.style.opacity = enabled ? '1' : '0.35';
  el.style.pointerEvents = enabled ? 'auto' : 'none';
}

function applyCurrentTheme() {
  const pageBg = document.getElementById('pageBgPicker').value || DEFAULT_BG;
  const accent = document.getElementById('activeTabGlowPicker').value || DEFAULT_ACCENT;
  const navbar = document.getElementById('navbarPicker').value || DEFAULT_NAVBAR;

  const { overrides, darkOverrides, staticVars } = derivePalette(pageBg, accent, navbar);

  chrome.storage.sync.set({
    customMode: true,
    pageBg: pageBg,
    accent: accent,
    navbar: navbar,
  }, () => {
    applyThemeToBb(overrides, darkOverrides, staticVars);
  });
}

function applyFont(font) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'applyFont',
      font: font,
    }).catch(() => {});
  });
}

// ═════════════════════════════════════════════════════════
//  Saved Themes
// ═════════════════════════════════════════════════════════
function initSaved() {
  document.getElementById('saveCurrentBtn').addEventListener('click', () => {
    const isCustom = document.querySelector('input[name="appearance"]:checked').value === 'custom';
    if (!isCustom) return;

    const name = prompt('Theme name:', 'My Theme');
    if (!name) return;

    const pageBg = document.getElementById('pageBgPicker').value || DEFAULT_BG;
    const accent = document.getElementById('activeTabGlowPicker').value || DEFAULT_ACCENT;
    const navbar = document.getElementById('navbarPicker').value || DEFAULT_NAVBAR;

    chrome.storage.sync.get(['savedThemes'], (data) => {
      const themes = data.savedThemes || {};
      themes[name] = { pageBg, accent, navbar };
      chrome.storage.sync.set({ savedThemes: themes }, renderSaved);
    });
  });
  renderSaved();
}

function renderSaved() {
  chrome.storage.sync.get(['savedThemes'], (data) => {
    const themes = data.savedThemes || {};
    const list = document.getElementById('savedList');
    const keys = Object.keys(themes);

    if (keys.length === 0) {
      list.innerHTML = '<div class="saved-empty">No saved themes yet~</div>';
      return;
    }

    list.innerHTML = keys.map((name) => {
      const t = themes[name];
      const bg = t.pageBg || DEFAULT_BG;
      const accent = t.accent || DEFAULT_ACCENT;
      return `
        <div class="saved-row" data-name="${name}">
          <span class="saved-swatches">
            <span class="mini-swatch" style="background:${bg}"></span>
            <span class="mini-swatch" style="background:${accent}"></span>
          </span>
          <span class="saved-name">${name}</span>
          <button class="btn tiny load-saved" title="Load theme">▶</button>
          <button class="btn tiny danger delete-saved" title="Delete">✕</button>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.load-saved').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.saved-row');
        const name = row.dataset.name;
        chrome.storage.sync.get(['savedThemes'], (data) => {
          const t = data.savedThemes[name];
          if (!t) return;

          document.getElementById('pageBgPicker').value = t.pageBg || DEFAULT_BG;
          document.getElementById('activeTabGlowPicker').value = t.accent || DEFAULT_ACCENT;
          document.getElementById('navbarPicker').value = t.navbar || DEFAULT_NAVBAR;

          document.querySelector('input[name="appearance"][value="custom"]').click();

          const { overrides, darkOverrides, staticVars } = derivePalette(t.pageBg || DEFAULT_BG, t.accent || DEFAULT_ACCENT, t.navbar || DEFAULT_NAVBAR);

          chrome.storage.sync.set({
            customMode: true,
          }, () => {
            applyThemeToBb(overrides, darkOverrides, staticVars);
          });
        });
      });
    });

    list.querySelectorAll('.delete-saved').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.saved-row');
        const name = row.dataset.name;
        chrome.storage.sync.get(['savedThemes'], (data) => {
          const themes = data.savedThemes || {};
          delete themes[name];
          chrome.storage.sync.set({ savedThemes: themes }, renderSaved);
        });
      });
    });
  });
}

// ═════════════════════════════════════════════════════════
//  Course Covers
// ═════════════════════════════════════════════════════════
function initCourseCovers() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getCourses' }, (courses) => {
      if (!courses || !Array.isArray(courses)) return;
      const select = document.getElementById('courseSelect');
      select.innerHTML = '<option value="">Select a course...</option>';
      courses.forEach((c) => {
        select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
    });
  });

  document.getElementById('courseSelect').addEventListener('change', (e) => {
    const courseId = e.target.value;
    if (!courseId) return;
    chrome.storage.local.get(['courseCovers'], (data) => {
      const covers = data.courseCovers || {};
      const img = document.getElementById('coverImage');
      const preview = document.getElementById('courseCoverPreview');
      const imageUrl = covers[courseId] || '';
      img.src = imageUrl;
      preview.classList.toggle('has-image', !!imageUrl);
      if (imageUrl) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]?.id) return;
          chrome.tabs.sendMessage(tabs[0].id, { action: 'applyCourseCover', courseId, imageUrl }).catch(() => {});
        });
      }
    });
  });

  document.getElementById('uploadCoverBtn').addEventListener('click', () => {
    document.getElementById('coverUpload').click();
  });

  document.getElementById('coverUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const courseId = document.getElementById('courseSelect').value;
      if (!courseId) return;
      function saveCover(imgData) {
        chrome.storage.local.get(['courseCovers'], (data) => {
          const covers = data.courseCovers || {};
          covers[courseId] = imgData;
          chrome.storage.local.set({ courseCovers: covers }, () => {
            chrome.storage.sync.set({ courseCovers: covers }, () => {});
          });
        });
        document.getElementById('coverImage').src = imgData;
        document.getElementById('courseCoverPreview').classList.add('has-image');
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]?.id) return;
          chrome.tabs.sendMessage(tabs[0].id, { action: 'applyCourseCover', courseId, imageUrl: imgData }).catch(() => {});
        });
      }
      saveCover(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  document.getElementById('removeCoverBtn').addEventListener('click', () => {
    const courseId = document.getElementById('courseSelect').value;
    if (!courseId) return;
    chrome.storage.local.get(['courseCovers'], (data) => {
      const covers = data.courseCovers || {};
      delete covers[courseId];
      chrome.storage.local.set({ courseCovers: covers }, () => {
        chrome.storage.sync.get(['courseCovers'], (sData) => {
          const sCovers = sData.courseCovers || {};
          delete sCovers[courseId];
          chrome.storage.sync.set({ courseCovers: sCovers }, () => {});
        });
        document.getElementById('coverImage').src = '';
        document.getElementById('courseCoverPreview').classList.remove('has-image');
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]?.id) return;
          chrome.tabs.sendMessage(tabs[0].id, { action: 'resetCourseCover', courseId }).catch(() => {});
        });
      });
    });
  });
}

// ═════════════════════════════════════════════════════════
//  Load settings
// ═════════════════════════════════════════════════════════
function loadSettings() {
  chrome.storage.sync.get(
    ['activeTab', 'customMode', 'pageBg', 'accent', 'navbar', 'font'],
    (data) => {
      // Restore last active tab
      if (data.activeTab) {
        const targetBtn = document.querySelector(`.tab-btn[data-tab="${data.activeTab}"]`);
        if (targetBtn) targetBtn.click();
      }

      // Appearance
      const isCustom = data.customMode === true;
      document.querySelector(`input[name="appearance"][value="${isCustom ? 'custom' : 'default'}"]`).checked = true;
      toggleColorSection(isCustom);

      // Color pickers
      document.getElementById('pageBgPicker').value = data.pageBg || DEFAULT_BG;
      document.getElementById('activeTabGlowPicker').value = data.accent || DEFAULT_ACCENT;
      document.getElementById('navbarPicker').value = data.navbar || DEFAULT_NAVBAR;

      // Font
      if (data.font) {
        const select = document.getElementById('fontSelect');
        const knownFonts = ['Inter', 'system-ui', 'Segoe UI', 'Roboto'];
        if (knownFonts.includes(data.font)) {
          select.value = data.font;
        } else {
          select.value = 'custom';
        }
      }

      // Apply on load if custom mode, otherwise reset any lingering custom theme
      if (isCustom) {
        const { overrides, darkOverrides, staticVars } = derivePalette(
          data.pageBg || DEFAULT_BG,
          data.accent || DEFAULT_ACCENT,
          data.navbar || DEFAULT_NAVBAR,
        );
        applyThemeToBb(overrides, darkOverrides, staticVars);
      } else {
        resetThemeOnBb();
      }
    }
  );
}