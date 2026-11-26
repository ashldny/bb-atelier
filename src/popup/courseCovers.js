import { normalizeCoverEntry, shortCourseNames } from '../utils/covers.js';
import { sanitizeUrl } from '../utils/sanitization.js';
import { getTargetTab, openCoursesPage, sendToTab } from '../messaging/themeMessaging.js';
import { updateStored } from '../utils/storage.js';
import { showToast, debounce } from '../utils/ui.js';
import { initCoverLibrary, readImage, addToLibrary } from './coverLibrary.js';
import { initCoverCrop, DEFAULT_BANNER_ASPECT } from './coverCrop.js';
import { syncSelect } from './customSelect.js';
import { confirmDialog } from './dialog.js';

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

  const emptyText = document.getElementById('coursesEmptyText');
  const openCourses = document.getElementById('openCoursesBtn');

  // Courses can only be read from Blackboard's Courses page, so everywhere else the menu
  // stays locked and the hint says where to go.
  function showEmpty(state) {
    empty.hidden = state === 'ready';
    openCourses.hidden = state !== 'elsewhere';
    emptyText.textContent =
      state === 'no-blackboard'
        ? 'Open Blackboard in this tab to choose a course.'
        : state === 'loading'
          ? 'Looking for your courses…'
          : 'Course covers are set from your Courses page in card view. Go there, then pick a course.';
  }

  async function refreshCourses() {
    const token = ++request;
    const button = document.getElementById('refreshCoursesBtn');
    button.disabled = true;
    const tab = await getTargetTab();
    const courses = tab ? await sendToTab({ action: 'getCourses' }, { quiet: true }) : null;
    if (token !== request) return false;
    button.disabled = !tab;
    const placeholder = new Option('Select a course…', '');
    placeholder.dataset.placeholder = '';
    select.replaceChildren(placeholder);
    bannerAspects.clear();
    const valid = Array.isArray(courses)
      ? courses.filter((course) => typeof course.id === 'string' && typeof course.name === 'string')
      : [];
    const names = shortCourseNames(valid);
    valid.forEach((course, index) => {
      const option = new Option(names[index], course.id);
      option.title = course.name;
      select.add(option);
      const aspect = Number(course.aspect);
      if (aspect >= 1 && aspect <= 8) bannerAspects.set(course.id, aspect);
    });
    const found = select.options.length > 1;
    showEmpty(found ? 'ready' : tab ? 'elsewhere' : 'no-blackboard');
    select.disabled = !found;
    placeholder.textContent = found
      ? 'Select a course…'
      : tab
        ? 'Go to your Courses page first'
        : 'Open Blackboard first';
    if ([...select.options].some((option) => option.value === currentId)) select.value = currentId;
    else currentId = '';
    syncSelect(select);
    render();
    return found;
  }

  // Blackboard draws course cards a moment after the page loads, so keep asking briefly.
  openCourses.addEventListener('click', async () => {
    if (!(await openCoursesPage())) return showEmpty('no-blackboard');
    showEmpty('loading');
    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (await refreshCourses()) return;
    }
  });
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
  const resetAll = document.getElementById('resetAllCoversBtn');
  function renderCount() {
    resetAll.disabled = !Object.keys(covers).length;
  }
  resetAll.addEventListener('click', async () => {
    const count = Object.keys(covers).length;
    if (!count) return;
    const confirmed = await confirmDialog({
      title: 'Reset all course covers?',
      message: `${count === 1 ? 'The custom cover' : `All ${count} custom covers`} will be removed and Blackboard's own images will come back. Images in your library stay.`,
      confirmLabel: 'Reset covers',
    });
    if (!confirmed) return;
    previewCrop.cancel();
    try {
      // Storage updates every open Blackboard tab, which restores the original banners.
      await chrome.storage.local.set({ courseCovers: {} });
      document.dispatchEvent(new Event('bb-status-change'));
      showToast('All covers reset');
    } catch {
      showToast('Could not reset the covers. Try again.', 'error');
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.courseCovers) {
      covers = changes.courseCovers.newValue || {};
      render();
      renderCount();
    }
  });
  render();
  renderCount();
}
