import { imageSizeLimit, validateFileSize, sanitizeUrl } from '../utils/sanitization.js';
import { updateStored } from '../utils/storage.js';
import { showToast } from '../utils/ui.js';
import { confirmDialog } from './dialog.js';

export async function readImage(file) {
  if (!/^image\/(png|jpe?g|gif|webp|avif)$/i.test(file.type))
    throw new Error('Choose a PNG, JPG, GIF, WebP or AVIF image.');
  const limit = imageSizeLimit(file.type);
  if (!validateFileSize(file.size, limit))
    throw new Error(`Choose an image under ${limit / (1024 * 1024)} MB.`);
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read this image. Try another file.'));
    reader.readAsDataURL(file);
  });
  return dataUrl;
}

export function addToLibrary(dataUrl) {
  return updateStored('local', 'coverLibrary', (items = []) =>
    items.some((item) => item.dataUrl === dataUrl)
      ? items
      : [...items, { id: crypto.randomUUID(), dataUrl }]
  );
}

// Two rows of three thumbnails per page keeps the Covers tab short.
const PAGE_SIZE = 6;

export function initCoverLibrary(getCourse, saveCover) {
  let library = [];
  let page = 0;
  const pager = document.getElementById('libraryPager');
  const pageLabel = document.getElementById('libraryPageLabel');
  const prevBtn = document.getElementById('libraryPrevBtn');
  const nextBtn = document.getElementById('libraryNextBtn');
  function renderPager(pageCount) {
    pager.hidden = pageCount <= 1;
    pageLabel.textContent = `${page + 1} / ${pageCount}`;
    prevBtn.disabled = page === 0;
    nextBtn.disabled = page >= pageCount - 1;
  }
  function render() {
    const grid = document.getElementById('libraryGrid');
    grid.replaceChildren();
    document.getElementById('clearLibraryBtn').disabled = !library.length;
    const pageCount = Math.max(1, Math.ceil(library.length / PAGE_SIZE));
    page = Math.min(page, pageCount - 1);
    renderPager(pageCount);
    if (!library.length) {
      const empty = document.createElement('p');
      empty.className = 'library-empty';
      empty.textContent = 'No saved images yet.';
      grid.appendChild(empty);
      return;
    }
    const start = page * PAGE_SIZE;
    library.slice(start, start + PAGE_SIZE).forEach((item, offset) => {
      const index = start + offset;
      const url = sanitizeUrl(item.dataUrl, { imageOnly: true });
      if (!url) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'library-item';
      const choose = document.createElement('button');
      choose.type = 'button';
      choose.className = 'library-choose';
      choose.setAttribute('aria-label', `Use image ${index + 1} as cover`);
      const image = document.createElement('img');
      image.src = url;
      image.alt = '';
      image.loading = 'lazy';
      choose.appendChild(image);
      choose.addEventListener('click', async () => {
        if (!getCourse()) return showToast('Select a course first.', 'error');
        await saveCover(url);
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-library';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Remove image ${index + 1} from library`);
      remove.addEventListener('click', () =>
        updateStored('local', 'coverLibrary', (items = []) =>
          items.filter((entry) => entry.id !== item.id)
        ).catch(() => showToast('Could not remove the image.', 'error'))
      );
      wrapper.append(choose, remove);
      grid.appendChild(wrapper);
    });
  }
  chrome.storage.local.get('coverLibrary').then((data) => {
    library = data.coverLibrary || [];
    render();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.coverLibrary) {
      const next = changes.coverLibrary.newValue || [];
      // Jump to the last page when images are added so the new ones are visible.
      if (next.length > library.length) page = Math.ceil(next.length / PAGE_SIZE) - 1;
      library = next;
      render();
    }
  });
  prevBtn.addEventListener('click', () => {
    page -= 1;
    render();
  });
  nextBtn.addEventListener('click', () => {
    page += 1;
    render();
  });
  const input = document.getElementById('libraryUpload');
  document.getElementById('uploadLibraryBtn').addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const files = [...input.files];
    input.value = '';
    for (const file of files) {
      try {
        await addToLibrary(await readImage(file));
      } catch (error) {
        showToast(error.message, 'error');
      }
    }
  });
  document.getElementById('clearLibraryBtn').addEventListener('click', async () => {
    if (!library.length) return;
    const confirmed = await confirmDialog({
      title: 'Clear the image library?',
      message:
        'All saved images will be removed. Covers already set on your courses stay as they are.',
      confirmLabel: 'Clear library',
    });
    if (!confirmed) return;
    await chrome.storage.local.set({ coverLibrary: [] });
  });
}
