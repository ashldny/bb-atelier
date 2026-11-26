import { normalizeTextScale } from '../utils/constants.js';

const STYLE_ID = 'bb-text-scale';

// Blackboard sizes text in rem, so scaling the root font size scales the text while the
// layout keeps its pixel widths. The site's own root size is measured with our rule
// switched off, so repeated calls never compound.
function siteRootSize() {
  const sheet = document.getElementById(STYLE_ID)?.sheet;
  if (sheet) sheet.disabled = true;
  const size = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  if (sheet) sheet.disabled = false;
  return size;
}

export function applyTextScale(styles, value) {
  const scale = normalizeTextScale(value);
  if (scale === 1 || !document.documentElement) {
    styles.remove(STYLE_ID);
    return;
  }
  styles.set(STYLE_ID, `html{font-size:${(siteRootSize() * scale).toFixed(2)}px!important;}`);
}
