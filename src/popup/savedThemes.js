import { applyCurrentTheme, readPalette, setPaletteInputs } from './theme.js';
import { restoreFontControl } from './fonts.js';
import { derivePalette } from '../theme/palette.js';
import { sidebarShade } from '../theme/colorUtils.js';
import { previewThemeOnBb, restoreThemeOnBb } from '../messaging/themeMessaging.js';
import { escapeHtml, validateFileSize } from '../utils/sanitization.js';
import { showToast, debounce } from '../utils/ui.js';
import { updateStored } from '../utils/storage.js';
import { validateSavedTheme, validateThemeCollection } from '../utils/importValidation.js';
import { downloadJson } from '../utils/files.js';
import { confirmDialog } from './dialog.js';

const preview = debounce((theme) => {
  const { overrides, darkOverrides, staticVars } = derivePalette(
    theme.pageBg,
    theme.accent,
    theme.navbar,
    theme.pageText
  );
  previewThemeOnBb(overrides, darkOverrides, staticVars);
}, 150);

export function uniqueName(name, existing) {
  if (!Object.hasOwn(existing, name)) return name;
  let index = 1;
  while (Object.hasOwn(existing, `${name} (${index})`)) index++;
  return `${name} (${index})`;
}

export function initSaved() {
  const form = document.getElementById('saveThemeForm');
  const nameInput = document.getElementById('saveThemeName');
  document.getElementById('saveCurrentBtn').addEventListener('click', () => {
    form.hidden = !form.hidden;
    if (!form.hidden) {
      nameInput.focus();
      nameInput.select();
    }
  });
  document.getElementById('cancelSaveThemeBtn').addEventListener('click', () => {
    form.hidden = true;
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return nameInput.focus();
    try {
      const local = await chrome.storage.local.get('font');
      let savedAs = name;
      await updateStored('local', 'savedThemes', (current = {}) => {
        // Never overwrite: a repeated name is stored as "Name (1)", "Name (2)", …
        savedAs = uniqueName(name, current);
        return { ...current, [savedAs]: { ...readPalette(), font: local.font || null } };
      });
      form.hidden = true;
      showToast(`Saved “${savedAs}”`);
    } catch {
      showToast('Could not save this theme. Try again.', 'error');
    }
  });
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') form.hidden = true;
  });
  document.getElementById('exportThemesBtn').addEventListener('click', async () => {
    const { savedThemes = {} } = await chrome.storage.local.get('savedThemes');
    downloadJson(
      {
        version: 2,
        themes: Object.entries(savedThemes).map(([name, theme]) => ({ name, ...theme })),
      },
      'bb-atelier-themes.json'
    );
  });
  const fileInput = document.getElementById('importThemesFile');
  document.getElementById('importThemesBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      if (!validateFileSize(file.size, 10 * 1024 * 1024))
        throw new Error('Choose a JSON file under 10 MB');
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.themes)) throw new Error('Choose a Bb Atelier theme export');
      if (!data.themes.every((theme) => typeof theme?.name === 'string'))
        throw new Error('Each theme needs a name');
      const themes = validateThemeCollection(
        Object.fromEntries(data.themes.map((theme) => [theme.name, theme]))
      );
      await updateStored('local', 'savedThemes', (current) => ({ ...current, ...themes }));
      showToast(`Imported ${Object.keys(themes).length} themes`);
    } catch (error) {
      showToast(error.message || 'Invalid theme file', 'error');
    }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.savedThemes) renderSaved();
  });
  renderSaved();
}

export async function renderSaved() {
  const { savedThemes = {} } = await chrome.storage.local.get('savedThemes');
  const list = document.getElementById('savedList');
  const entries = Object.entries(savedThemes)
    .map(([name, value]) => [name, validateSavedTheme(value)])
    .filter(([, theme]) => theme);
  document.getElementById('savedCount').textContent = entries.length
    ? `${entries.length} saved ${entries.length === 1 ? 'theme' : 'themes'}`
    : '';
  if (!entries.length) {
    list.innerHTML =
      '<div class="saved-empty"><strong>Keep a look you love.</strong><p>Choose your colors, then save the current theme here.</p></div>';
    return;
  }
  list.innerHTML = entries
    .map(
      ([name, theme]) => `<div class="saved-row" data-name="${escapeHtml(name)}">
    <button class="load-saved" type="button" aria-label="Apply ${escapeHtml(name)}">
      <span class="saved-swatches" aria-hidden="true">${[theme.pageBg, theme.navbar || sidebarShade(theme.pageBg), theme.accent].map((color) => `<span class="mini-swatch" style="background:${escapeHtml(color)}"></span>`).join('')}</span>
      <span class="saved-name">${escapeHtml(name)}</span>
    </button>
    <button class="btn tiny edit-saved" type="button" aria-label="Edit ${escapeHtml(name)}">Edit</button>
    <button class="btn tiny danger delete-saved" type="button" aria-label="Delete ${escapeHtml(name)}">Delete</button>
  </div>`
    )
    .join('');
  list.querySelectorAll('.saved-row').forEach((row) => {
    const name = row.dataset.name;
    const theme = savedThemes[name];
    row.addEventListener('mouseenter', () => {
      if (document.getElementById('masterToggle').checked) preview(theme);
    });
    row.addEventListener('mouseleave', () => {
      preview.cancel();
      restoreThemeOnBb();
    });
    row.querySelector('.load-saved').addEventListener('click', async () => {
      preview.cancel();
      await applyCurrentTheme(theme);
      if (theme.font)
        await chrome.storage.local.set({
          font: theme.font,
          fontName: theme.font.startsWith('data:') ? 'Saved font' : theme.font,
        });
      else await chrome.storage.local.remove(['font', 'fontName']);
      restoreFontControl({ font: theme.font });
      showToast(`Applied “${name}”`);
    });
    row.querySelector('.edit-saved').addEventListener('click', () => {
      preview.cancel();
      setPaletteInputs(theme);
      document.querySelector('.tab-btn[data-tab="theme"]').click();
      document.querySelector('.sub-tab-btn[data-subtab="colors"]').click();
      restoreThemeOnBb();
    });
    row.querySelector('.delete-saved').addEventListener('click', async () => {
      preview.cancel();
      restoreThemeOnBb();
      const confirmed = await confirmDialog({
        title: 'Delete this theme?',
        message: `“${name}” will be removed from your saved themes. This can’t be undone.`,
      });
      if (!confirmed) return;
      await updateStored('local', 'savedThemes', (current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
      showToast(`Deleted “${name}”`);
    });
  });
}
