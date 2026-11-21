import { derivePalette } from '../theme/palette.js';
import { buildFullThemeCss } from '../theme/cssBuilder.js';
import { normalizePalette, resolvePalette } from '../theme/settings.js';
import { purgeDarkReaderCss } from '../utils/cssSanitizer.js';
import { createRuleRemapper } from './ruleRemapper.js';
import { createLogoTint } from './logoTint.js';

export function createThemeController(styles) {
  let signature = '';
  let previewTimer;
  let current = {};
  let active = false;
  let previewing = false;
  const remapper = createRuleRemapper(styles);
  const logoTint = createLogoTint();

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
    const nextSignature = JSON.stringify([palette, enabled]);
    if (signature === nextSignature && (!enabled || document.getElementById('bb-custom-theme')))
      return;
    signature = nextSignature;
    if (!enabled || !palette.customMode) {
      remapper.stop();
      logoTint.stop();
      styles.remove('bb-custom-theme');
      return;
    }
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

  return {
    apply,
    applyCss(css) {
      if (!active) return;
      clearTimeout(previewTimer);
      styles.set('bb-custom-theme', purgeDarkReaderCss(css));
    },
    preview(css) {
      if (!active) return;
      previewing = true;
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
      remapper.stop();
      logoTint.stop();
      styles.remove('bb-custom-theme');
    },
  };
}
