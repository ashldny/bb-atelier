// Crop editor: the whole image is shown and a frame shaped like the course banner sits on
// top. Drag the frame to move it, the corner handle to resize, the top knob to rotate.
// Crop values are percent of the image (see normalizeCrop in utils/covers.js).
import { normalizeCrop, fitCropToImage } from '../utils/covers.js';

export const DEFAULT_BANNER_ASPECT = 2.6;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value) => Math.round(value * 100) / 100;

/** Largest centred frame of the banner's shape that fits inside the image. */
export function defaultCrop(imageAspect, bannerAspect) {
  return {
    x: 50,
    y: 50,
    scale: round(clamp((bannerAspect / imageAspect) * 100, 5, 100)),
    rotate: 0,
    aspect: imageAspect,
  };
}

export function initCoverCrop({ getEntry, getBannerAspect, onPreview, onSave }) {
  const preview = document.getElementById('courseCoverPreview');
  const stage = document.getElementById('cropStage');
  const image = document.getElementById('coverImage');
  const box = document.getElementById('cropBox');
  const readout = document.getElementById('coverPositionText');
  let crop = null;
  let drag = null;

  function imageAspect() {
    if (image.naturalWidth && image.naturalHeight) return image.naturalWidth / image.naturalHeight;
    return normalizeCrop(getEntry().crop)?.aspect || 1.5;
  }

  function current() {
    const aspect = imageAspect();
    const saved = normalizeCrop(getEntry().crop);
    // Frames saved before containment existed may hang off the image; pull them in.
    return saved
      ? fitCropToImage({ ...saved, aspect }, getBannerAspect())
      : defaultCrop(aspect, getBannerAspect());
  }

  // Size the stage to the image's on-screen box, then place the frame inside it.
  function layout() {
    if (!crop) return;
    const aspect = imageAspect();
    const width = preview.clientWidth - 24;
    const height = preview.clientHeight - 24;
    if (width > 0 && height > 0) {
      const fitWidth = Math.min(width, height * aspect);
      stage.style.width = `${fitWidth}px`;
      stage.style.height = `${fitWidth / aspect}px`;
    }
    const stageWidth = stage.clientWidth || 300;
    box.style.left = `${crop.x}%`;
    box.style.top = `${crop.y}%`;
    box.style.width = `${crop.scale}%`;
    box.style.height = `${((crop.scale / 100) * stageWidth) / getBannerAspect()}px`;
    box.style.transform = `translate(-50%, -50%) rotate(${crop.rotate}deg)`;
    readout.textContent = `Size ${Math.round(crop.scale)}% · Rotation ${Math.round(crop.rotate)}°`;
  }

  // During a drag, start from the values at pointer-down: rotating shrinks the frame only
  // as far as the current angle needs, and it grows back when rotated back.
  function set(next, save = false) {
    const base = drag ? { ...drag.start, rotate: crop.rotate } : crop;
    crop = fitCropToImage(normalizeCrop({ ...base, ...next }), getBannerAspect());
    layout();
    if (save) onSave(crop);
    else onPreview(crop);
  }

  function centre() {
    const rect = stage.getBoundingClientRect();
    return {
      rect,
      x: rect.left + (crop.x / 100) * rect.width,
      y: rect.top + (crop.y / 100) * rect.height,
    };
  }

  box.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !crop) return;
    event.preventDefault();
    box.focus({ preventScroll: true });
    box.setPointerCapture(event.pointerId);
    drag = {
      mode: event.target.dataset.handle || 'move',
      startX: event.clientX,
      startY: event.clientY,
      start: { ...crop },
    };
    box.classList.add('dragging');
  });

  box.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const { rect, x, y } = centre();
    if (drag.mode === 'move') {
      set({
        x: drag.start.x + ((event.clientX - drag.startX) / rect.width) * 100,
        y: drag.start.y + ((event.clientY - drag.startY) / rect.height) * 100,
      });
    } else if (drag.mode === 'scale') {
      // Measure the pointer in the frame's own (rotated) axes.
      const angle = (crop.rotate * Math.PI) / 180;
      const dx = event.clientX - x;
      const dy = event.clientY - y;
      const along = Math.abs(dx * Math.cos(angle) + dy * Math.sin(angle));
      const across = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
      const width = Math.max(along * 2, across * 2 * getBannerAspect());
      set({ scale: (width / rect.width) * 100 });
    } else {
      let degrees = (Math.atan2(event.clientY - y, event.clientX - x) * 180) / Math.PI + 90;
      if (degrees > 180) degrees -= 360;
      const snapped = Math.round(degrees / 45) * 45;
      set({ rotate: Math.abs(degrees - snapped) < 4 ? snapped : degrees });
    }
  });

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    box.addEventListener(type, () => {
      if (!drag) return;
      drag = null;
      box.classList.remove('dragging');
      onSave(crop);
    });

  box.addEventListener('keydown', (event) => {
    if (!crop) return;
    const step = event.shiftKey ? 5 : 1;
    const actions = {
      ArrowLeft: { x: crop.x - step },
      ArrowRight: { x: crop.x + step },
      ArrowUp: { y: crop.y - step },
      ArrowDown: { y: crop.y + step },
      '+': { scale: crop.scale + 2 },
      '=': { scale: crop.scale + 2 },
      '-': { scale: crop.scale - 2 },
      '[': { rotate: crop.rotate - (event.shiftKey ? 15 : 1) },
      ']': { rotate: crop.rotate + (event.shiftKey ? 15 : 1) },
    };
    if (!actions[event.key]) return;
    event.preventDefault();
    set(actions[event.key], true);
  });

  document.getElementById('resetPositionBtn').addEventListener('click', () => {
    crop = defaultCrop(imageAspect(), getBannerAspect());
    layout();
    onSave(crop);
  });

  image.addEventListener('load', () => render());
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(preview);

  function render() {
    crop = getEntry().imageUrl ? current() : null;
    layout();
  }
  return { render };
}
