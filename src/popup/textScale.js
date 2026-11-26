import { TEXT_SCALE, normalizeTextScale } from '../utils/constants.js';
import { showToast, debounce } from '../utils/ui.js';

// Typography → Text size. Storage is the channel: open Blackboard tabs pick up
// local.textScale through chrome.storage.onChanged.
export function initTextScale(local = {}) {
  const range = document.getElementById('textScaleRange');
  const label = document.getElementById('textScaleValue');
  const preview = document.getElementById('fontPreview');
  const reset = document.getElementById('resetTextScaleBtn');

  function show(scale) {
    const percent = Math.round(scale * 100);
    range.value = String(percent);
    range.setAttribute('aria-valuetext', `${percent}%`);
    label.textContent = `${percent}%`;
    const span = (TEXT_SCALE.max - TEXT_SCALE.min) * 100;
    range.style.setProperty('--fill', `${((percent - TEXT_SCALE.min * 100) / span) * 100}%`);
    preview.style.fontSize = scale === 1 ? '' : `${scale}em`;
    reset.disabled = scale === 1;
  }

  const save = debounce(async (scale) => {
    try {
      if (scale === 1) await chrome.storage.local.remove('textScale');
      else await chrome.storage.local.set({ textScale: scale });
      document.dispatchEvent(new Event('bb-status-change'));
    } catch {
      showToast('Could not save the text size. Try again.', 'error');
    }
  }, 120);

  range.addEventListener('input', () => {
    const scale = normalizeTextScale(Number(range.value) / 100);
    show(scale);
    save(scale);
  });
  reset.addEventListener('click', () => {
    show(1);
    save(1);
  });
  show(normalizeTextScale(local.textScale));
}
