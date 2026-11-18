import { DEFAULT_POSITION } from './constants.js';
import { sanitizeUrl } from './sanitization.js';

const clamp = (number, min, max, fallback) =>
  Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
const round = (number) => Math.round(number * 100) / 100;

export function parsePosition(value = DEFAULT_POSITION) {
  const parts = String(value)
    .trim()
    .split(/\s+/)
    .map((part) => Number.parseFloat(part));
  return { x: clamp(parts[0], 0, 100, 50), y: clamp(parts[1], 0, 100, 50) };
}

/**
 * Crop frame over the whole image: centre (x, y) and width (scale) in percent of the
 * image, rotation in degrees, and the image's width/height ratio. Null when absent.
 */
export function normalizeCrop(crop) {
  if (!crop || typeof crop !== 'object') return null;
  const aspect = Number(crop.aspect);
  if (!Number.isFinite(aspect) || aspect < 0.05 || aspect > 20) return null;
  return {
    x: round(clamp(Number(crop.x), 0, 100, 50)),
    y: round(clamp(Number(crop.y), 0, 100, 50)),
    scale: round(clamp(Number(crop.scale), 5, 100, 100)),
    rotate: round(clamp(Number(crop.rotate), -180, 180, 0)),
    aspect: round(aspect * 1000) / 1000,
  };
}

/**
 * Keep a crop frame (banner-shaped, possibly rotated) entirely inside the image, so the
 * cover never shows empty space. A rotated rectangle fits an axis-aligned image exactly
 * when its bounding box does: first cap the width for this angle, then clamp the centre.
 * @param {{x:number,y:number,scale:number,rotate:number,aspect:number}} crop
 * @param {number} bannerAspect banner width / height
 */
export function fitCropToImage(crop, bannerAspect) {
  const height = 1 / crop.aspect; // image height in image-width units
  const angle = (crop.rotate * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const maxWidth = Math.min(1 / (cos + sin / bannerAspect), height / (sin + cos / bannerAspect));
  const width = Math.min(crop.scale / 100, maxWidth);
  const halfX = (width / 2) * (cos + sin / bannerAspect);
  const halfY = (width / 2) * (sin + cos / bannerAspect);
  const x = clamp(crop.x / 100, halfX, 1 - halfX, 0.5);
  const y = clamp((crop.y / 100) * height, halfY, height - halfY, height / 2);
  return {
    ...crop,
    // Round inward so rounding can never push an edge past the image.
    scale: Math.floor(width * 10000 + 1e-6) / 100,
    x: round(x * 100),
    y: round((y / height) * 100),
  };
}

export function normalizeCoverEntry(entry) {
  const source = typeof entry === 'string' ? { imageUrl: entry } : entry || {};
  const { x, y } = parsePosition(source.position);
  const normalized = {
    imageUrl: sanitizeUrl(source.imageUrl, { imageOnly: true }),
    position: `${x}% ${y}%`,
  };
  const crop = normalizeCrop(source.crop);
  if (crop) normalized.crop = crop;
  return normalized;
}
