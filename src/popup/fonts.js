import { showToast } from '../utils/ui.js';
import { isValidFont, MAX_FONT_SIZE, validateFileSize, cssUrl } from '../utils/sanitization.js';
import { syncSelect } from './customSelect.js';
import { FONT_GROUPS, fontFiles, fontStack } from '../utils/fontCatalog.js';

export function updateFontPreviewLive(font = '') {
  const preview = document.getElementById('fontPreview');
  if (!preview || !isValidFont(font)) return;
  document.getElementById('bb-preview-face')?.remove();
  if (font.startsWith('data:')) {
    const style = document.createElement('style');
    style.id = 'bb-preview-face';
    style.textContent = `@font-face{font-family:'BbPreview';src:${cssUrl(font)};font-display:swap;}`;
    document.head.appendChild(style);
    preview.style.fontFamily = 'BbPreview, sans-serif';
  } else preview.style.fontFamily = font ? fontStack(font) : '';
}

// Build the typeface menu from the catalog; each option previews in its own font.
function renderFontOptions() {
  const faces = [];
  const groups = FONT_GROUPS.map((group) => {
    const element = document.createElement('optgroup');
    element.label = group.label;
    for (const font of group.fonts) {
      const option = new Option(font.name, font.name);
      option.style.fontFamily = fontStack(font.name);
      element.appendChild(option);
      for (const { path, weight } of fontFiles(font.name))
        faces.push(
          `@font-face{font-family:'${font.name}';src:${cssUrl(path)} format('woff2');font-weight:${weight};font-display:swap;}`
        );
    }
    return element;
  });
  document.getElementById('fontUploadGroup').before(...groups);
  const style = document.createElement('style');
  style.id = 'bb-font-catalog';
  style.textContent = faces.join('');
  document.head.appendChild(style);
}

export function restoreFontControl(local = {}) {
  const select = document.getElementById('fontSelect');
  const group = document.getElementById('fontUploadGroup');
  const customName = document.getElementById('customFontName');
  const legacy = document.getElementById('fontLegacyGroup');
  group.replaceChildren();
  legacy.replaceChildren();
  const custom = local.font?.startsWith('data:') && isValidFont(local.font);
  if (custom) {
    const name = local.fontName || 'Uploaded font';
    group.appendChild(new Option(`Custom · ${name}`, local.font));
    group.hidden = false;
    customName.textContent = name;
  } else {
    group.hidden = true;
    customName.textContent = 'No custom font yet';
  }
  customName.classList.toggle('active', custom);
  // A font from an older version stays selected even though it is no longer offered.
  const font = local.font || '';
  if (font && !custom && ![...select.options].some((option) => option.value === font))
    legacy.appendChild(new Option(font, font));
  select.value = font;
  syncSelect(select);
  updateFontPreviewLive(local.font);
}

export function initFonts(local) {
  renderFontOptions();
  restoreFontControl(local);
  const upload = document.getElementById('fontUpload');
  document.getElementById('fontSelect').addEventListener('change', async (event) => {
    try {
      const font = event.target.value;
      if (!isValidFont(font)) throw new Error('Invalid font');
      await chrome.storage.local.set({ font, fontName: font });
      updateFontPreviewLive(font);
      document
        .getElementById('customFontName')
        .classList.toggle('active', font.startsWith('data:'));
      document.dispatchEvent(new Event('bb-status-change'));
    } catch {
      showToast('Could not save the font. Try again.', 'error');
    }
  });
  document.getElementById('fontUploadBtn').addEventListener('click', () => upload.click());
  upload.addEventListener('change', async () => {
    const file = upload.files[0];
    upload.value = '';
    if (!file) return;
    if (!/\.(ttf|otf|woff2?)$/i.test(file.name) || !validateFileSize(file.size, MAX_FONT_SIZE)) {
      showToast('Choose a TTF, OTF, WOFF or WOFF2 file under 512 KB.', 'error');
      return;
    }
    try {
      const font = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        const extension = file.name.split('.').pop().toLowerCase();
        reader.onload = () =>
          resolve(reader.result.replace(/^data:[^;,]*;base64,/, `data:font/${extension};base64,`));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (!isValidFont(font)) throw new Error('Invalid font file');
      await chrome.storage.local.set({ font, fontName: file.name });
      restoreFontControl({ font, fontName: file.name });
      document.dispatchEvent(new Event('bb-status-change'));
      showToast('Font saved');
    } catch {
      showToast('Could not load this font. Try another file.', 'error');
    }
  });
  document.getElementById('resetFontBtn').addEventListener('click', async () => {
    try {
      await chrome.storage.local.remove(['font', 'fontName']);
      restoreFontControl();
      document.dispatchEvent(new Event('bb-status-change'));
      showToast('Using Blackboard’s font');
    } catch {
      showToast('Could not reset the font.', 'error');
    }
  });
}
