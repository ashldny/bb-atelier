import { cssUrl, isValidFont } from '../utils/sanitization.js';

const BUNDLED_FONTS = {
  Inter: ['Inter/inter-latin-400-normal.woff2', 'Inter/inter-latin-600-normal.woff2'],
  'Noto Serif': [
    'NotoSerif/noto-serif-latin-400-normal.woff2',
    'NotoSerif/noto-serif-latin-600-normal.woff2',
  ],
};

export function applyFont(styles, font) {
  if (!font || !isValidFont(font)) {
    styles.remove('bb-font-style');
    return;
  }
  const custom = font.startsWith('data:');
  const family = custom ? 'BbAtelierCustomFont' : font;
  let css = custom
    ? `@font-face{font-family:'${family}';src:${cssUrl(font)};font-display:swap;}`
    : '';
  const files = BUNDLED_FONTS[font];
  if (files)
    files.forEach((file, index) => {
      css += `@font-face{font-family:'${family}';src:${cssUrl(chrome.runtime.getURL(`Fonts/${file}`))} format('woff2');font-weight:${index ? 600 : 400};font-display:swap;}`;
    });
  // Preserve icon fonts and editable code. Override text-bearing controls as well as body.
  const familyValue = ['system-ui', 'serif', 'monospace'].includes(family) ? family : `'${family}'`;
  css += `body,body :where(p,span,a,div,h1,h2,h3,h4,h5,h6,label,button,input,select,textarea,li,td,th):not([class*="icon"]):not([class*="Icon"]):not(pre *):not(code *){font-family:${familyValue},${font === 'serif' || font === 'Noto Serif' ? 'serif' : font === 'monospace' ? 'monospace' : 'sans-serif'}!important;}`;
  styles.set('bb-font-style', css);
}
