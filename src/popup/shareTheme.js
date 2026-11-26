import { isGalleryConfigured, shareTheme, shareableFont } from '../messaging/galleryApi.js';
import { showToast } from '../utils/ui.js';
import { paletteSwatches } from './swatchMarkup.js';

// "Share to gallery" dialog, opened from a saved theme's share button.
let current = null;
let returnFocus = null;

function elements() {
  return {
    backdrop: document.getElementById('shareDialog'),
    name: document.getElementById('shareName'),
    author: document.getElementById('shareAuthor'),
    status: document.getElementById('shareStatus'),
    send: document.getElementById('shareSend'),
  };
}

function setStatus(text, error = false) {
  const { status } = elements();
  status.textContent = text;
  status.classList.toggle('err', error);
}

function close() {
  const { backdrop } = elements();
  backdrop.classList.remove('show');
  backdrop.hidden = true;
  current = null;
  returnFocus?.focus?.();
}

export async function openShareDialog(name, theme) {
  if (!isGalleryConfigured()) {
    showToast('The gallery isn’t open yet.', 'error');
    return;
  }
  const { backdrop, name: nameField, author } = elements();
  current = theme;
  returnFocus = document.activeElement;
  nameField.value = name.slice(0, 40);
  const { galleryAuthor } = await chrome.storage.local.get('galleryAuthor');
  author.value = typeof galleryAuthor === 'string' ? galleryAuthor.slice(0, 30) : '';
  document.getElementById('sharePreview').innerHTML = paletteSwatches(theme);
  const font = shareableFont(theme.font);
  document.getElementById('shareFont').textContent = font
    ? `Font: ${font}`
    : theme.font
      ? 'Your uploaded font stays private. Only built-in fonts are shared.'
      : 'Font: Blackboard default';
  setStatus('');
  backdrop.hidden = false;
  requestAnimationFrame(() => backdrop.classList.add('show'));
  nameField.focus();
  nameField.select();
}

export function initShareDialog() {
  const { backdrop, name, author, send } = elements();
  document.getElementById('shareCancel').addEventListener('click', close);
  backdrop.addEventListener('click', (event) => event.target === backdrop && close());
  backdrop.addEventListener('keydown', (event) => event.key === 'Escape' && close());
  document.getElementById('shareForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!current) return;
    const title = name.value.trim();
    if (!title) {
      setStatus('Give the theme a name.', true);
      return name.focus();
    }
    send.disabled = true;
    setStatus('Sharing…');
    try {
      const by = author.value.trim();
      await shareTheme(title, by, current);
      // Remembered so the next share is one click.
      await chrome.storage.local.set({ galleryAuthor: by });
      close();
      showToast(`Shared “${title}” to the gallery`);
      document.dispatchEvent(new Event('bb-gallery-change'));
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      send.disabled = false;
    }
  });
}
