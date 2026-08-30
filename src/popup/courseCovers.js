// ═════════════════════════════════════════════════════════
//  Bb Atelier — Course Covers UI
//  Upload, preview, adjust position, remove course banner images,
//  image library, and cover from URL
// ═════════════════════════════════════════════════════════

import { escapeHtml, MAX_IMAGE_SIZE, validateFileSize } from '../utils/sanitization.js';

const DEFAULT_POSITION = '50% 50%';

let _currentPosition = DEFAULT_POSITION;
let currentCourseId = '';

function normalizeCoverEntry(entry) {
  if (!entry) return { imageUrl: '', position: DEFAULT_POSITION };
  if (typeof entry === 'string') return { imageUrl: entry, position: DEFAULT_POSITION };
  return { imageUrl: entry.imageUrl || '', position: entry.position || DEFAULT_POSITION };
}

function parsePosition(pos) {
  const parts = pos.split(' ').map(Number);
  return { x: parts[0] || 50, y: parts[1] || 50 };
}

function updateFocalUI(position) {
  const focal = document.getElementById('coverFocal');
  const text = document.getElementById('coverPositionText');
  const controls = document.getElementById('coverPositionControls');
  if (!focal || !text || !controls) return;

  const { x, y } = parsePosition(position);
  focal.style.left = x + '%';
  focal.style.top = y + '%';
  text.textContent = `${Math.round(x)}% ${Math.round(y)}%`;
  controls.style.display = 'flex';
  _currentPosition = position;
  const previewImg = document.getElementById('coverImage');
  if (previewImg) previewImg.style.objectPosition = `${x}% ${y}%`;
}

function sendToTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {});
  });
}

function setupFocalDrag() {
  const preview = document.getElementById('courseCoverPreview');
  const focal = document.getElementById('coverFocal');
  if (!preview || !focal) return;

  let dragging = false;

  function getPosition(e) {
    const rect = preview.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }

  function applyPosition(x, y) {
    const pos = `${x.toFixed(1)}% ${y.toFixed(1)}%`;
    updateFocalUI(pos);
    updateCoverPosition(currentCourseId, pos);
  }

  function onPointerDown(e) {
    if (!currentCourseId) return;
    dragging = true;
    e.preventDefault();
    const { x, y } = getPosition(e);
    applyPosition(x, y);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const { x, y } = getPosition(e);
    applyPosition(x, y);
  }

  function onPointerUp() {
    dragging = false;
  }

  focal.addEventListener('mousedown', onPointerDown);
  focal.addEventListener('touchstart', onPointerDown, { passive: false });
  preview.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('mouseup', onPointerUp);
  window.addEventListener('touchend', onPointerUp);
}

function updateCoverPosition(courseId, position) {
  if (!courseId) return;
  _currentPosition = position;
  chrome.storage.local.get(['courseCovers'], (data) => {
    const covers = data.courseCovers || {};
    const entry = normalizeCoverEntry(covers[courseId]);
    entry.position = position;
    covers[courseId] = entry;
    chrome.storage.local.set({ courseCovers: covers }, () => {
      sendToTab({
        action: 'applyCourseCover',
        courseId,
        imageUrl: entry.imageUrl,
        position,
      });
    });
  });
}

/**
 * Initialize the Course Covers tab
 */
export function initCourseCovers() {
  setupFocalDrag();
  setupCoverUrl();
  setupLibrary();

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs
      .sendMessage(tabs[0].id, { action: 'getCourses' })
      .then((courses) => {
        if (!courses || !Array.isArray(courses)) return;
        const select = document.getElementById('courseSelect');
        select.innerHTML = '<option value="">Select a course...</option>';
        courses.forEach((c) => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.name;
          select.appendChild(opt);
        });
      })
      .catch(() => {});
  });

  document.getElementById('courseSelect').addEventListener('change', (e) => {
    const courseId = e.target.value;
    if (!courseId) return;
    currentCourseId = courseId;
    chrome.storage.local.get(['courseCovers'], (data) => {
      const covers = data.courseCovers || {};
      const entry = normalizeCoverEntry(covers[courseId]);
      const img = document.getElementById('coverImage');
      const preview = document.getElementById('courseCoverPreview');
      img.src = entry.imageUrl;
      preview.classList.toggle('has-image', !!entry.imageUrl);
      const hint = document.getElementById('coverHint');
      if (entry.imageUrl) {
        hint.style.display = 'block';
        updateFocalUI(entry.position);
        sendToTab({
          action: 'applyCourseCover',
          courseId,
          imageUrl: entry.imageUrl,
          position: entry.position,
        });
      } else {
        hint.style.display = 'none';
        document.getElementById('coverFocal').style.left = '50%';
        document.getElementById('coverFocal').style.top = '50%';
        document.getElementById('coverPositionControls').style.display = 'none';
      }
      renderLibrary();
    });
  });

  document.getElementById('uploadCoverBtn').addEventListener('click', () => {
    document.getElementById('coverUpload').click();
  });

  document.getElementById('coverUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!validateFileSize(file.size, MAX_IMAGE_SIZE)) {
      alert('Image too large. Maximum size is 2MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const courseId = document.getElementById('courseSelect').value;
      if (!courseId) return;
      saveCover(courseId, dataUrl);
      addToLibrary(dataUrl);
    };
    reader.onerror = () => {
      alert('Failed to read image file. The file may be corrupted.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  document.getElementById('removeCoverBtn').addEventListener('click', () => {
    const courseId = document.getElementById('courseSelect').value;
    if (!courseId) return;
    chrome.storage.local.get(['courseCovers'], (data) => {
      const covers = data.courseCovers || {};
      delete covers[courseId];
      chrome.storage.local.set({ courseCovers: covers }, () => {
        document.getElementById('coverImage').src = '';
        document.getElementById('courseCoverPreview').classList.remove('has-image');
        document.getElementById('coverPositionControls').style.display = 'none';
        document.getElementById('coverHint').style.display = 'none';
        sendToTab({ action: 'resetCourseCover', courseId });
      });
    });
  });

  document.getElementById('resetPositionBtn').addEventListener('click', () => {
    if (!currentCourseId) return;
    updateFocalUI(DEFAULT_POSITION);
    updateCoverPosition(currentCourseId, DEFAULT_POSITION);
  });
}

function saveCover(courseId, imgData) {
  document.getElementById('coverImage').src = imgData;
  document.getElementById('courseCoverPreview').classList.add('has-image');
  document.getElementById('coverHint').style.display = 'block';
  updateFocalUI(DEFAULT_POSITION);

  const entry = { imageUrl: imgData, position: DEFAULT_POSITION };

  chrome.storage.local.get(['courseCovers'], (data) => {
    const covers = data.courseCovers || {};
    covers[courseId] = entry;
    chrome.storage.local.set({ courseCovers: covers }, () => {
      sendToTab({
        action: 'applyCourseCover',
        courseId,
        imageUrl: imgData,
        position: DEFAULT_POSITION,
      });
    });
  });
}

// ─── Cover from URL ──────────────────────────────────────

function setupCoverUrl() {
  const urlRow = document.getElementById('coverUrlInput');
  const urlField = document.getElementById('coverUrlField');
  const urlApply = document.getElementById('coverUrlApply');
  const urlCancel = document.getElementById('coverUrlCancel');

  document.getElementById('coverUrlBtn').addEventListener('click', () => {
    urlRow.style.display = urlRow.style.display === 'none' ? 'flex' : 'none';
    urlField.value = '';
    urlField.focus();
  });

  urlCancel.addEventListener('click', () => {
    urlRow.style.display = 'none';
    urlField.value = '';
  });

  urlApply.addEventListener('click', () => {
    const url = urlField.value.trim();
    if (!url) return;
    if (!url.match(/^https?:\/\//i)) {
      alert('Please enter a valid HTTP/HTTPS URL.');
      return;
    }
    fetchImageAsDataUrl(url);
  });

  urlField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') urlApply.click();
  });
}

function fetchImageAsDataUrl(url) {
  const courseId = document.getElementById('courseSelect').value;
  if (!courseId) {
    alert('Please select a course first.');
    return;
  }

  // Fetch through content script to bypass CORS
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs
      .sendMessage(tabs[0].id, { action: 'fetchImage', url })
      .then((result) => {
        if (!result || !result.dataUrl) {
          alert('Failed to fetch image. Check the URL and try again.');
          return;
        }
        saveCover(courseId, result.dataUrl);
        addToLibrary(result.dataUrl);
        document.getElementById('coverUrlInput').style.display = 'none';
        document.getElementById('coverUrlField').value = '';
      })
      .catch(() => {
        alert('Failed to fetch image. The server may block cross-origin requests.');
      });
  });
}

// ─── Image Library ───────────────────────────────────────

function setupLibrary() {
  document.getElementById('uploadLibraryBtn').addEventListener('click', () => {
    document.getElementById('libraryUpload').click();
  });

  document.getElementById('libraryUpload').addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    let processed = 0;
    files.forEach((file) => {
      if (!validateFileSize(file.size, MAX_IMAGE_SIZE)) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        addToLibrary(ev.target.result);
        processed++;
        if (processed === files.length) renderLibrary();
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  });

  document.getElementById('clearLibraryBtn').addEventListener('click', () => {
    if (!confirm('Clear all images from the library?')) return;
    chrome.storage.local.set({ coverLibrary: [] }, renderLibrary);
  });

  renderLibrary();
}

function addToLibrary(dataUrl) {
  chrome.storage.local.get(['coverLibrary'], (data) => {
    const lib = data.coverLibrary || [];
    if (lib.some((item) => item.dataUrl === dataUrl)) return;
    lib.push({ id: Date.now().toString(36), dataUrl });
    chrome.storage.local.set({ coverLibrary: lib }, renderLibrary);
  });
}

function renderLibrary() {
  chrome.storage.local.get(['coverLibrary', 'courseCovers'], (data) => {
    const lib = data.coverLibrary || [];
    const covers = data.courseCovers || {};
    const grid = document.getElementById('libraryGrid');
    const hint = document.getElementById('libraryHint');

    if (lib.length === 0) {
      grid.innerHTML = '<div class="library-empty">No images uploaded yet</div>';
      hint.style.display = 'none';
      return;
    }

    hint.style.display = currentCourseId ? 'block' : 'none';

    const assignedUrls = new Set();
    Object.values(covers).forEach((entry) => {
      const normalized = normalizeCoverEntry(entry);
      if (normalized.imageUrl) assignedUrls.add(normalized.imageUrl);
    });

    grid.innerHTML = lib
      .map((item) => {
        const isAssigned = assignedUrls.has(item.dataUrl);
        const safeId = escapeHtml(item.id);
        return `
        <div class="library-item ${isAssigned ? 'assigned' : ''}" data-id="${safeId}">
          <img src="${item.dataUrl}" alt="Library image" loading="lazy" />
          <button class="remove-library" data-id="${safeId}" title="Remove" aria-label="Remove"><svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="M6 6 18 18"/></svg></button>
        </div>
      `;
      })
      .join('');

    grid.querySelectorAll('.library-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-library')) return;
        if (!currentCourseId) {
          alert('Select a course first to assign this image.');
          return;
        }
        const id = el.dataset.id;
        const item = lib.find((i) => i.id === id);
        if (item) saveCover(currentCourseId, item.dataUrl);
      });
    });

    grid.querySelectorAll('.remove-library').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        chrome.storage.local.get(['coverLibrary'], (d) => {
          const updated = (d.coverLibrary || []).filter((i) => i.id !== id);
          chrome.storage.local.set({ coverLibrary: updated }, renderLibrary);
        });
      });
    });
  });
}
