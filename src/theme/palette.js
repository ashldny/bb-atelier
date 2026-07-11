// ═════════════════════════════════════════════════════════
//  Bb Atelier — Palette Generation
//  Derives ALL theme tokens from just 3 colors (bg + accent + navbar)
// ═════════════════════════════════════════════════════════

import { isDark, lighten, darken, mix, contrastText, brighten } from './colorUtils.js';

/**
 * Generate a full palette object from 3 user-chosen colors
 *
 * @param {string} pageBg  - Page background hex
 * @param {string} accent  - Brand / accent hex
 * @param {string} navbar  - Navbar / sidebar hex
 * @returns {{ overrides: object, darkOverrides: object, staticVars: string }}
 */
export function derivePalette(pageBg, accent, navbar) {
  const dark = isDark(pageBg);

  // ─── Base tones ───
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

  // ─── Accent-derived ───
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

  // ─── Status colors ───
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

  // ─── Action colors ───
  const actionActive = textPrimary;
  const actionHover = dark ? '#ffffff' : '#000000';
  const actionSelected = actionHover;
  const actionDisabled = textDisabled;
  const actionDisabledBg = dark ? lighten(bg, 10) : darken(bg, 5);
  const actionFocus = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  // ─── Background ramp (b1–b10) ───
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

  // ─── Indicator colors — derived from accent ───
  const indPrimary = isDark(accent) ? lighten(accent, 30) : accent;
  const indSecondary = isDark(error) ? lighten(error, 20) : error;

  // ─── Static tokens (grade colors, greys, common) ───
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
  /* Action opacity (static values only — dynamic colors come from overrides) */
  --palette-action-hoverOpacity: 0.04;
  --palette-action-selectedOpacity: 0.08;
  --palette-action-disabledOpacity: 0.38;
  --palette-action-focusOpacity: 0.12;
  --palette-action-activatedOpacity: 0.12;`;
  }

  // ─── Build the light-mode overrides object ───
  const overrides = {
    // Brand
    '--palette-mode': dark ? 'dark' : 'light',
    '--palette-brand-main': brandMain,
    '--palette-brand-contrastText': brandContrast,
    '--palette-brand-light': brandLight,
    '--palette-brand-dark': brandDark,
    '--palette-brandAlt-main': lighten(brandMain, 30),
    '--palette-brandAlt-contrastText': contrastText(lighten(brandMain, 30)),
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
    '--palette-indicatorPrimary-dark': darken(indPrimary, 15),
    '--palette-indicatorSecondary-main': indSecondary,
    '--palette-indicatorSecondary-contrastText': '#ffffff',
  };

  // Dark-mode overrides — same as light for the user's chosen colors
  const darkOverrides = { ...overrides };

  return { overrides, darkOverrides, staticVars: staticVars() };
}