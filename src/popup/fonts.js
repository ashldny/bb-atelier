import { showToast } from '../utils/ui.js';
import { isValidFont, MAX_FONT_SIZE, validateFileSize, cssUrl } from '../utils/sanitization.js';
import { syncSelect } from './customSelect.js';
import { FONT_GROUPS, fontFiles, fontStack } from '../utils/fontCatalog.js';
import { addCustomFont, customFontName, normalizeCustomFonts } from '../utils/customFonts.js';
import { escapeHtml } from '../utils/sanitization.js';

// Uploaded fonts (local.customFonts), cached so restoreFontControl stays synchronous.
let customFonts = [];
const customFamily = (index) => `BbCustomFont${index}`;

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

// Each uploaded font gets its own @font-face so the menu and the chips preview in it.
function renderCustomFaces() {
  document.getElementById('bb-custom-faces')?.remove();
  if (!customFonts.length) return;
  const style = document.createElement('style');
  style.id = 'bb-custom-faces';
  style.textContent = customFonts
    .map(
      ({ font }, index) =>
        `@font-face{font-family:'${customFamily(index)}';src:${cssUrl(font)};font-display:swap;}`
    )
    .join('');
  document.head.appendChild(style);
}

function renderCustomChips(current) {
  const list = document.getElementById('customFontList');
  list.innerHTML = customFonts
    .map(
      ({ name }, index) =>
        `<li><button class="custom-font-chip" type="button" data-index="${index}" aria-pressed="false" style="font-family:'${customFamily(index)}', sans-serif" title="Use ${escapeHtml(name)}">${escapeHtml(name)}</button></li>`
    )
    .join('');
  list.querySelectorAll('.custom-font-chip').forEach((chip) => {
    chip.setAttribute(
      'aria-pressed',
      String(customFonts[Number(chip.dataset.index)].font === current)
    );
  });
}

export function restoreFontControl(local = {}) {
  const select = document.getElementById('fontSelect');
  const group = document.getElementById('fontUploadGroup');
  const customName = document.getElementById('customFontName');
  const legacy = document.getElementById('fontLegacyGroup');
  const font = local.font || '';
  // A font applied from a saved theme or backup joins the list, so it can be chosen again.
  if (font.startsWith('data:') && isValidFont(font) && !customFontName(customFonts, font)) {
    customFonts = addCustomFont(customFonts, local.fontName || 'Uploaded font', font);
    chrome.storage.local.set({ customFonts }).catch(() => {});
    renderCustomFaces();
  }
  group.replaceChildren(
    ...customFonts.map(({ name, font: value }, index) => {
      const option = new Option(name, value);
      option.style.fontFamily = `'${customFamily(index)}', sans-serif`;
      return option;
    })
  );
  group.hidden = !customFonts.length;
  legacy.replaceChildren();
  customName.hidden = customFonts.length > 0;
  customName.textContent = 'No custom font yet';
  renderCustomChips(font);
  // A font from an older version stays selected even though it is no longer offered.
  if (font && ![...select.options].some((option) => option.value === font))
    legacy.appendChild(new Option(font, font));
  select.value = font;
  syncSelect(select);
  updateFontPreviewLive(font);
}

async function chooseFont(font) {
  try {
    if (!isValidFont(font)) throw new Error('Invalid font');
    const fontName = font.startsWith('data:')
      ? customFontName(customFonts, font) || 'Uploaded font'
      : font;
    await chrome.storage.local.set({ font, fontName });
    restoreFontControl({ font, fontName });
    document.dispatchEvent(new Event('bb-status-change'));
  } catch {
    showToast('Could not save the font. Try again.', 'error');
  }
}

export function initFonts(local) {
  customFonts = normalizeCustomFonts(local.customFonts);
  renderFontOptions();
  renderCustomFaces();
  restoreFontControl(local);
  const upload = document.getElementById('fontUpload');
  document
    .getElementById('fontSelect')
    .addEventListener('change', (event) => chooseFont(event.target.value));
  document.getElementById('customFontList').addEventListener('click', (event) => {
    const chip = event.target.closest('.custom-font-chip');
    if (chip) chooseFont(customFonts[Number(chip.dataset.index)]?.font);
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
      customFonts = addCustomFont(customFonts, file.name, font);
      await chrome.storage.local.set({ font, fontName: file.name, customFonts });
      renderCustomFaces();
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
