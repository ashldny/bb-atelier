import {
  isGalleryConfigured,
  listGallery,
  recordGalleryUse,
  reportGalleryTheme,
  unshareTheme,
} from '../messaging/galleryApi.js';
import { GALLERY_PAGE_SIZE } from '../utils/galleryConfig.js';
import { escapeHtml } from '../utils/sanitization.js';
import { showToast } from '../utils/ui.js';
import { updateStored } from '../utils/storage.js';
import { applyCurrentTheme } from './theme.js';
import { initTabGroup } from './tabs.js';
import { confirmDialog } from './dialog.js';
import { bindHoverPreview, cancelPreview, endPreview } from './themePreview.js';
import { paletteSwatches } from './swatchMarkup.js';
import { uniqueName } from './savedThemes.js';
import { initShareDialog } from './shareTheme.js';
import { restoreFontControl } from './fonts.js';
import { logoLoaderMarkup } from './logoLoader.js';

const ICONS = {
  keep: '<path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>',
  remove: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  report: '<path d="M4 22V4a1 1 0 0 1 1-1h12l-2 5 2 5H5"/>',
};

function iconButton(className, label, icon) {
  return `<button class="row-icon ${className}" type="button" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[icon]}</svg></button>`;
}

function rowMarkup(theme, index) {
  const name = escapeHtml(theme.name);
  const by = theme.mine
    ? 'Shared by you'
    : theme.author
      ? `by ${escapeHtml(theme.author)}`
      : 'Anonymous';
  const uses = `${theme.uses} ${theme.uses === 1 ? 'use' : 'uses'}`;
  const font = theme.font ? ` · ${escapeHtml(theme.font)}` : '';
  return `<div class="saved-row gallery-row" data-index="${index}">
    <button class="load-saved" type="button" aria-label="Use ${name}">
      ${paletteSwatches(theme.palette)}
      <span class="gallery-text">
        <span class="saved-name">${name}</span>
        <span class="gallery-meta">${by}${font} · ${uses}</span>
      </span>
    </button>
    ${iconButton('keep-gallery', `Save ${name} to My themes`, 'keep')}
    ${
      theme.mine
        ? iconButton('danger unshare-gallery', `Remove ${name} from the gallery`, 'remove')
        : iconButton('danger report-gallery', `Report ${name}`, 'report')
    }
  </div>`;
}

// Saved tab → Gallery: themes other people shared, loaded when the view first opens.
export function initGallery() {
  const list = document.getElementById('galleryList');
  const more = document.getElementById('galleryMoreBtn');
  const refresh = document.getElementById('galleryRefreshBtn');
  const chips = [...document.querySelectorAll('.gallery-toolbar .chip')];
  let sort = 'popular';
  let page = 0;
  let themes = [];
  let loaded = false;
  let request = 0;

  initShareDialog();
  initTabGroup('.library-btn', '.library-panel', 'library');

  function message(title, text = '') {
    list.innerHTML = `<div class="saved-empty"><strong>${escapeHtml(title)}</strong>${text ? `<p>${escapeHtml(text)}</p>` : ''}</div>`;
  }

  function render() {
    if (!themes.length)
      return message(
        'No shared themes yet.',
        'Be the first: open My themes and press the share icon on one of yours.'
      );
    list.innerHTML = themes.map(rowMarkup).join('');
    list.querySelectorAll('.gallery-row').forEach((row) => {
      const theme = themes[Number(row.dataset.index)];
      bindHoverPreview(row, theme.palette);
      row.querySelector('.load-saved').addEventListener('click', () => use(theme));
      row.querySelector('.keep-gallery').addEventListener('click', () => keep(theme));
      row.querySelector('.report-gallery')?.addEventListener('click', () => report(theme));
      row.querySelector('.unshare-gallery')?.addEventListener('click', () => unshare(theme));
    });
  }

  async function load({ append = false } = {}) {
    if (!isGalleryConfigured()) {
      more.hidden = true;
      refresh.disabled = true;
      return message('The gallery isn’t open yet.', 'Shared themes will show up here soon.');
    }
    const token = ++request;
    const nextPage = append ? page + 1 : 0;
    list.setAttribute('aria-busy', 'true');
    refresh.disabled = true;
    if (!append) list.innerHTML = logoLoaderMarkup('Loading themes…');
    try {
      const rows = await listGallery({ sort, page: nextPage });
      if (token !== request) return;
      page = nextPage;
      themes = append ? [...themes, ...rows] : rows;
      more.hidden = rows.length < GALLERY_PAGE_SIZE;
      loaded = true;
      render();
    } catch (error) {
      if (token !== request) return;
      if (append) showToast(error.message, 'error');
      else message('Could not load the gallery.', error.message);
    } finally {
      if (token === request) {
        list.setAttribute('aria-busy', 'false');
        refresh.disabled = false;
      }
    }
  }

  async function use(theme) {
    cancelPreview();
    await applyCurrentTheme({ ...theme.palette });
    // A shared font comes along; a theme without one keeps the font you already use.
    if (theme.font) {
      await chrome.storage.local.set({ font: theme.font, fontName: theme.font });
      restoreFontControl({ font: theme.font });
    }
    showToast(`Applied “${theme.name}”`);
    recordGalleryUse(theme.id).catch(() => {});
  }

  async function keep(theme) {
    try {
      let savedAs = theme.name;
      await updateStored('local', 'savedThemes', (current = {}) => {
        savedAs = uniqueName(theme.name, current);
        return { ...current, [savedAs]: { ...theme.palette, customMode: true, font: theme.font } };
      });
      showToast(`Saved “${savedAs}” to My themes`);
      recordGalleryUse(theme.id).catch(() => {});
    } catch {
      showToast('Could not save this theme. Try again.', 'error');
    }
  }

  function drop(theme) {
    themes = themes.filter((item) => item !== theme);
    render();
  }

  async function report(theme) {
    endPreview();
    const confirmed = await confirmDialog({
      title: 'Report this theme?',
      message: `“${theme.name}” will be hidden for you now, and from the gallery if others report it too.`,
      confirmLabel: 'Report',
    });
    if (!confirmed) return;
    try {
      await reportGalleryTheme(theme.id);
      drop(theme);
      showToast('Thanks. The theme was reported.');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function unshare(theme) {
    endPreview();
    const confirmed = await confirmDialog({
      title: 'Remove from the gallery?',
      message: `“${theme.name}” will no longer be shared. Your copy in My themes stays.`,
      confirmLabel: 'Remove',
    });
    if (!confirmed) return;
    try {
      await unshareTheme(theme.id);
      drop(theme);
      showToast(`Removed “${theme.name}” from the gallery`);
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      if (chip.dataset.sort === sort) return;
      sort = chip.dataset.sort;
      chips.forEach((item) => {
        item.classList.toggle('active', item === chip);
        item.setAttribute('aria-pressed', String(item === chip));
      });
      load();
    });
  });
  refresh.addEventListener('click', () => load());
  more.addEventListener('click', () => load({ append: true }));
  document.addEventListener('bb-tab-change', (event) => {
    if (event.detail.group === 'library' && event.detail.value === 'gallery' && !loaded) load();
  });
  document.addEventListener('bb-gallery-change', () => {
    loaded = false;
  });
}
