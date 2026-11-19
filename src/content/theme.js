import { enable, disable, setFetchMethod } from 'darkreader';
import { normalizeTheme, toDarkReaderTheme, buildFixes } from '../theme/darkReaderTheme.js';
import { derivePalette } from '../theme/palette.js';
import { buildFullThemeCss } from '../theme/cssBuilder.js';
import { normalizePalette, resolvePalette } from '../theme/settings.js';
import { purgeDarkReaderCss } from '../utils/cssSanitizer.js';
import { hardenedFetch } from '../utils/fetchGuard.js';
import { isDark, contrastText } from '../theme/colorUtils.js';
import { createRuleRemapper } from './ruleRemapper.js';
import { createLogoTint } from './logoTint.js';

export function createThemeController(styles) {
  let signature = '';
  let engine = 'native';
  let activeDarkReader = false;
  let previewTimer;
  let current = {};
  let active = false;
  let previewing = false;
  const remapper = createRuleRemapper(styles);
  const logoTint = createLogoTint();

  function stopDarkReader() {
    if (activeDarkReader) disable();
    activeDarkReader = false;
  }

  function apply(settings, enabled) {
    current = settings;
    active = enabled;
    clearTimeout(previewTimer);
    if (previewing) {
      signature = '';
      previewing = false;
    }
    const prefersDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
    const palette = normalizePalette(resolvePalette(settings, prefersDark));
    const options = normalizeTheme(settings.bbTheme);
    const nextEngine = options.engine;
    const nextSignature = JSON.stringify([
      palette,
      options.engine,
      options.enabled,
      toDarkReaderTheme(options),
      options.selectorsToIgnore,
      enabled,
    ]);
    if (
      signature === nextSignature &&
      (activeDarkReader || !enabled || document.getElementById('bb-custom-theme'))
    )
      return;
    signature = nextSignature;
    engine = nextEngine;
    if (!enabled || !palette.customMode) {
      stopDarkReader();
      remapper.stop();
      logoTint.stop();
      styles.remove('bb-custom-theme');
      return;
    }
    if (engine === 'darkreader' && options.enabled) {
      remapper.stop();
      logoTint.stop();
      styles.remove('bb-custom-theme');
      setFetchMethod(hardenedFetch);
      const dynamic = {
        ...options,
        mode: isDark(palette.pageBg) ? 1 : 0,
        darkSchemeBackgroundColor: palette.pageBg,
        darkSchemeTextColor: palette.pageText || contrastText(palette.pageBg),
        lightSchemeBackgroundColor: palette.pageBg,
        lightSchemeTextColor: palette.pageText || contrastText(palette.pageBg),
        selectionColor: palette.accent,
      };
      enable(toDarkReaderTheme(dynamic), buildFixes(options.selectorsToIgnore));
      activeDarkReader = true;
    } else {
      stopDarkReader();
      const { overrides, darkOverrides, staticVars } = derivePalette(
        palette.pageBg,
        palette.accent,
        palette.navbar,
        palette.pageText
      );
      styles.set('bb-custom-theme', buildFullThemeCss(overrides, darkOverrides, staticVars));
      remapper.start();
      logoTint.start();
    }
  }

  return {
    apply,
    applyCss(css) {
      if (!active || engine !== 'native') return;
      clearTimeout(previewTimer);
      styles.set('bb-custom-theme', purgeDarkReaderCss(css));
    },
    get engine() {
      return engine;
    },
    preview(css) {
      if (!active) return;
      previewing = true;
      stopDarkReader();
      styles.set('bb-custom-theme', purgeDarkReaderCss(css));
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => this.restore(), 2500);
    },
    restore() {
      signature = '';
      apply(current, active);
    },
    clear() {
      signature = '';
      previewing = false;
      clearTimeout(previewTimer);
      stopDarkReader();
      remapper.stop();
      logoTint.stop();
      styles.remove('bb-custom-theme');
    },
  };
}
