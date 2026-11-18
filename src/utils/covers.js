import { DEFAULT_POSITION } from './constants.js';
import { sanitizeUrl } from './sanitization.js';

export function parsePosition(value = DEFAULT_POSITION) {
  const parts = String(value)
    .trim()
    .split(/\s+/)
    .map((part) => Number.parseFloat(part));
  const clamp = (number) => (Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 50);
  return { x: clamp(parts[0]), y: clamp(parts[1]) };
}

export function normalizeCoverEntry(entry) {
  const source = typeof entry === 'string' ? { imageUrl: entry } : entry || {};
  const { x, y } = parsePosition(source.position);
  return { imageUrl: sanitizeUrl(source.imageUrl, { imageOnly: true }), position: `${x}% ${y}%` };
}
