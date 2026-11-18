import { parsePosition } from '../utils/covers.js';
import { DEFAULT_POSITION } from '../utils/constants.js';

export function updateFocalUI(position) {
  const { x, y } = parsePosition(position);
  const focal = document.getElementById('coverFocal');
  focal.style.left = `${x}%`;
  focal.style.top = `${y}%`;
  focal.setAttribute(
    'aria-label',
    `Cover position ${Math.round(x)} percent across, ${Math.round(y)} percent down. Use arrow keys to adjust.`
  );
  document.getElementById('coverPositionText').textContent =
    `${Math.round(x)}% / ${Math.round(y)}%`;
  document.getElementById('coverImage').style.objectPosition = `${x}% ${y}%`;
}

export function initCoverPosition(getEntry, previewPosition, savePosition) {
  const preview = document.getElementById('courseCoverPreview');
  const focal = document.getElementById('coverFocal');
  let dragging = false;
  let position = DEFAULT_POSITION;
  function move(event) {
    const rect = preview.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    position = `${x.toFixed(1)}% ${y.toFixed(1)}%`;
    updateFocalUI(position);
    previewPosition(position);
  }
  preview.addEventListener('pointerdown', (event) => {
    if (!getEntry().imageUrl || event.button !== 0) return;
    dragging = true;
    event.preventDefault();
    preview.setPointerCapture(event.pointerId);
    move(event);
  });
  preview.addEventListener('pointermove', (event) => {
    if (dragging) move(event);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    preview.addEventListener(type, () => {
      if (!dragging) return;
      dragging = false;
      savePosition(position);
    });
  focal.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const { x, y } = parsePosition(getEntry().position);
    const step = event.shiftKey ? 10 : 2;
    const nextX = Math.max(
      0,
      Math.min(100, x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0))
    );
    const nextY = Math.max(
      0,
      Math.min(100, y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0))
    );
    position = `${nextX}% ${nextY}%`;
    updateFocalUI(position);
    savePosition(position);
  });
  document
    .getElementById('resetPositionBtn')
    .addEventListener('click', () => savePosition(DEFAULT_POSITION));
}
