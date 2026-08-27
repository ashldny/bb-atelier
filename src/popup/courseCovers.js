// ═════════════════════════════════════════════════════════
//  Bb Atelier — Course Covers UI
//  Upload, preview, and remove course banner images
// ═════════════════════════════════════════════════════════

import { escapeHtml, MAX_IMAGE_SIZE, validateFileSize } from '../utils/sanitization.js';

/**
 * Initialize the Course Covers tab
 */
export function initCourseCovers() {
  // Request course list from the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getCourses' }, (courses) => {
      if (chrome.runtime.lastError) return;
      if (!courses || !Array.isArray(courses)) return;
      const select = document.getElementById('courseSelect');
      select.innerHTML = '<option value="">Select a course...</option>';
      courses.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
      });
    });
  });

  // Course selection changed — load existing cover or apply one
  document.getElementById('courseSelect').addEventListener('change', (e) => {
    const courseId = e.target.value;
    if (!courseId) return;
    chrome.storage.local.get(['courseCovers'], (data) => {
      const covers = data.courseCovers || {};
      const img = document.getElementById('coverImage');
      const preview = document.getElementById('courseCoverPreview');
      const imageUrl = covers[courseId] || '';
      img.src = imageUrl;
      preview.classList.toggle('has-image', !!imageUrl);
      if (imageUrl) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]?.id) return;
          chrome.tabs.sendMessage(tabs[0].id, { action: 'applyCourseCover', courseId, imageUrl }, () => {
          if (chrome.runtime.lastError) return;
        });
        });
      }
    });
  });

  // Upload cover button
  document.getElementById('uploadCoverBtn').addEventListener('click', () => {
    document.getElementById('coverUpload').click();
  });

  // File selected — save cover image
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
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  // Remove cover button
  document.getElementById('removeCoverBtn').addEventListener('click', () => {
    const courseId = document.getElementById('courseSelect').value;
    if (!courseId) return;
    chrome.storage.local.get(['courseCovers'], (data) => {
      const covers = data.courseCovers || {};
      delete covers[courseId];
      chrome.storage.local.set({ courseCovers: covers }, () => {
        // Also clean sync storage copy
        chrome.storage.sync.get(['courseCovers'], (sData) => {
          const sCovers = sData.courseCovers || {};
          delete sCovers[courseId];
          chrome.storage.sync.set({ courseCovers: sCovers }, () => {});
        });
        document.getElementById('coverImage').src = '';
        document.getElementById('courseCoverPreview').classList.remove('has-image');
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]?.id) return;
          chrome.tabs.sendMessage(tabs[0].id, { action: 'resetCourseCover', courseId }, () => {
          if (chrome.runtime.lastError) return;
        });
        });
      });
    });
  });
}

/**
 * Save a cover image for a course
 * @param {string} courseId
 * @param {string} imgData - Data URL of the image
 */
function saveCover(courseId, imgData) {
  document.getElementById('coverImage').src = imgData;
  document.getElementById('courseCoverPreview').classList.add('has-image');

  chrome.storage.local.get(['courseCovers'], (data) => {
    const covers = data.courseCovers || {};
    covers[courseId] = imgData;
    chrome.storage.local.set({ courseCovers: covers }, () => {
      chrome.storage.sync.set({ courseCovers: covers }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]?.id) return;
          chrome.tabs.sendMessage(tabs[0].id, { action: 'applyCourseCover', courseId, imageUrl: imgData }, () => {
          if (chrome.runtime.lastError) return;
        });
        });
      });
    });
  });
}