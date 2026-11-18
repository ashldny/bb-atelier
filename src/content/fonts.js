import { cssUrl, isValidFont } from '../utils/sanitization.js';
import { fontFiles, fontStack } from '../utils/fontCatalog.js';

export function applyFont(styles, font) {
  if (!font || !isValidFont(font)) {
    styles.remove('bb-font-style');
    return;
  }
  const custom = font.startsWith('data:');
  let css = '';
  let family;
  if (custom) {
    css = `@font-face{font-family:'BbAtelierCustomFont';src:${cssUrl(font)};font-display:swap;}`;
    family = "'BbAtelierCustomFont', sans-serif";
  } else {
    for (const { path, weight } of fontFiles(font))
      css += `@font-face{font-family:'${font}';src:${cssUrl(chrome.runtime.getURL(path))} format('woff2');font-weight:${weight};font-display:swap;}`;
    family = fontStack(font);
  }
  // Preserve icon fonts and editable code. Override text-bearing controls as well as body.
  css += `body,body :where(p,span,a,div,h1,h2,h3,h4,h5,h6,label,button,input,select,textarea,li,td,th):not([class*="icon"]):not([class*="Icon"]):not(pre *):not(code *){font-family:${family}!important;}`;
  styles.set('bb-font-style', css);
}
