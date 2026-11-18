import { normalizeCoverEntry } from '../utils/covers.js';
import { sanitizeUrl } from '../utils/sanitization.js';
import { sendToTab } from '../messaging/themeMessaging.js';
import { updateStored } from '../utils/storage.js';
import { showToast, debounce } from '../utils/ui.js';
import { initCoverLibrary, readImage, addToLibrary } from './coverLibrary.js';
import { initCoverCrop, DEFAULT_BANNER_ASPECT } from './coverCrop.js';
import { syncSelect } from './customSelect.js';

export async function initCourseCovers() {
  let covers = (await chrome.storage.local.get('courseCovers')).courseCovers || {};
  let currentId = '';
  let request = 0;
  const bannerAspects = new Map();
  const select = document.getElementById('courseSelect');
  const image = document.getElementById('coverImage');
  const getEntry = () => normalizeCoverEntry(covers[currentId]);
  const controls = document.getElementById('coverEditor');
  const empty = document.getElementById('coursesEmpty');

  async function saveCover(imageUrl, crop = null, { quiet = false } = {}) {
    const id = currentId;
    if (!id) return;
    try {
      await updateStored('local', 'courseCovers', (current) => ({
        ...current,
        [id]: normalizeCoverEntry({ imageUrl, crop }),
      }));
      document.dispatchEvent(new Event('bb-status-change'));
      if (!quiet) showToast('Cover saved');
    } catch {
      showToast('Could not save the cover. Try again.', 'error');
    }
  }

  const previewCrop = debounce((crop) => {
    if (!currentId) return;
    sendToTab({ action: 'applyCover', courseId: currentId, crop }, { quiet: true });
  }, 60);
  const cropper = initCoverCrop({
    getEntry,
    getBannerAspect: () => bannerAspects.get(currentId) || DEFAULT_BANNER_ASPECT,
    onPreview: previewCrop,
    onSave: async (crop) => {
      previewCrop.cancel();
      const entry = getEntry();
      if (!currentId || !entry.imageUrl) return;
      // Update memory immediately so quick keyboard presses accumulate correctly.
      covers = { ...covers, [currentId]: { ...entry, crop } };
      await saveCover(entry.imageUrl, crop, { quiet: true });
    },
  });

  function render() {
    const entry = getEntry();
    controls.disabled = !currentId;
    document.getElementById('cropStage').hidden = !entry.imageUrl;
    document.getElementById('courseCoverPreview').classList.toggle('has-image', !!entry.imageUrl);
    if (entry.imageUrl) {
      if (image.getAttribute('src') !== entry.imageUrl) image.src = entry.imageUrl;
    } else image.removeAttribute('src');
    document.getElementById('coverPositionControls').hidden = !entry.imageUrl;
    document.getElementById('removeCoverBtn').disabled = !entry.imageUrl;
    cropper.render();
  }

  initCoverLibrary(() => currentId, saveCover);

  async function refreshCourses() {
    const token = ++request;
    const button = document.getElementById('refreshCoursesBtn');
    button.disabled = true;
    const courses = await sendToTab({ action: 'getCourses' }, { quiet: true });
    if (token !== request) return;
    button.disabled = false;
    const placeholder = new Option('Select a course…', '');
    placeholder.dataset.placeholder = '';
    select.replaceChildren(placeholder);
    bannerAspects.clear();
    if (Array.isArray(courses))
      for (const course of courses) {
        if (typeof course.id !== 'string' || typeof course.name !== 'string') continue;
        select.add(new Option(course.name, course.id));
        const aspect = Number(course.aspect);
        if (aspect >= 1 && aspect <= 8) bannerAspects.set(course.id, aspect);
      }
    // Courses can only be read from Blackboard's course list, so lock the menu elsewhere.
    const found = select.options.length > 1;
    empty.hidden = found;
    select.disabled = !found;
    placeholder.textContent = found ? 'Select a course…' : 'Open your Courses page first';
    if ([...select.options].some((option) => option.value === currentId)) select.value = currentId;
    else currentId = '';
    syncSelect(select);
    render();
  }
  document.getElementById('refreshCoursesBtn').addEventListener('click', refreshCourses);
  document.addEventListener('bb-tab-change', (event) => {
    if (event.detail.group === 'tab' && event.detail.value === 'covers') refreshCourses();
  });
  select.addEventListener('change', () => {
    previewCrop.cancel();
    currentId = select.value;
    render();
  });
  const upload = document.getElementById('coverUpload');
  document.getElementById('uploadCoverBtn').addEventListener('click', () => upload.click());
  upload.addEventListener('change', async () => {
    const file = upload.files[0];
    upload.value = '';
    if (!file) return;
    const id = currentId;
    try {
      const dataUrl = await readImage(file);
      if (id !== currentId) return;
      await saveCover(dataUrl);
      await addToLibrary(dataUrl);
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  document.getElementById('removeCoverBtn').addEventListener('click', async () => {
    const id = currentId;
    previewCrop.cancel();
    try {
      await updateStored('local', 'courseCovers', (current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch {
      showToast('Could not remove the cover.', 'error');
    }
  });
  const urlRow = document.getElementById('coverUrlInput');
  const urlField = document.getElementById('coverUrlField');
  document.getElementById('coverUrlBtn').addEventListener('click', () => {
    urlRow.hidden = !urlRow.hidden;
    if (!urlRow.hidden) urlField.focus();
  });
  document.getElementById('coverUrlCancel').addEventListener('click', () => {
    urlRow.hidden = true;
  });
  document.getElementById('coverUrlApply').addEventListener('click', async () => {
    const url = sanitizeUrl(urlField.value);
    if (!url || !/^https?:/i.test(url))
      return showToast('Enter an HTTP or HTTPS image URL.', 'error');
    await saveCover(url);
    urlRow.hidden = true;
    urlField.value = '';
  });
  urlField.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      document.getElementById('coverUrlApply').click();
    }
  });
  image.addEventListener('error', () => {
    if (image.getAttribute('src'))
      showToast('This image could not load. Try uploading the file.', 'error');
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.courseCovers) {
      covers = changes.courseCovers.newValue || {};
      render();
    }
  });
  render();
}
