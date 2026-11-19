import { MAX_IMAGE_SIZE, validateFileSize, sanitizeUrl } from '../utils/sanitization.js';
import { updateStored } from '../utils/storage.js';
import { showToast } from '../utils/ui.js';
import { confirmDialog } from './dialog.js';

export async function readImage(file) {
  if (!validateFileSize(file.size, MAX_IMAGE_SIZE)) throw new Error('Choose an image under 2 MB.');
  if (!/^image\/(png|jpe?g|gif|webp|avif)$/i.test(file.type))
    throw new Error('Choose a PNG, JPG, GIF, WebP or AVIF image.');
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

export function initCoverLibrary(getCourse, saveCover) {
  let library = [];
  function render() {
    const grid = document.getElementById('libraryGrid');
    grid.replaceChildren();
    document.getElementById('clearLibraryBtn').disabled = !library.length;
    if (!library.length) {
      const empty = document.createElement('p');
      empty.className = 'library-empty';
      empty.textContent = 'No saved images yet.';
      grid.appendChild(empty);
      return;
    }
    library.forEach((item, index) => {
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
      library = changes.coverLibrary.newValue || [];
      render();
    }
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
