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
