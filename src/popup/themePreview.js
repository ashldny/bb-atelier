import { derivePalette } from '../theme/palette.js';
import { previewThemeOnBb, restoreThemeOnBb } from '../messaging/themeMessaging.js';
import { debounce } from '../utils/ui.js';

// Hover previews for theme lists (saved themes, gallery): paint Blackboard with a palette
// while the pointer rests on it, then put the real theme back.
const preview = debounce((theme) => {
  const { overrides, darkOverrides, staticVars } = derivePalette(
    theme.pageBg,
    theme.accent,
    theme.navbar,
    theme.pageText
  );
  previewThemeOnBb(overrides, darkOverrides, staticVars);
}, 150);

export function bindHoverPreview(element, theme) {
  element.addEventListener('mouseenter', () => {
    if (document.getElementById('masterToggle').checked) preview(theme);
  });
  element.addEventListener('mouseleave', endPreview);
}

export function endPreview() {
  preview.cancel();
  restoreThemeOnBb();
}

export function cancelPreview() {
  preview.cancel();
}
