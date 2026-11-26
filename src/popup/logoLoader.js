import { escapeHtml } from '../utils/sanitization.js';

// Loading state drawn with the Bb Atelier mark: the stem is drawn, then the bowl, on a
// loop (style.css .logo-loader). Geometry matches icons/icon128.svg; the bowl starts at
// the stem side so the "b" reads as one stroke.
export function logoLoaderMarkup(label = 'Loading…') {
  return `<div class="logo-loader" role="status">
    <svg viewBox="0 0 128 128" aria-hidden="true">
      <g transform="translate(64 64) scale(1.3) translate(-64 -63)">
        <line class="logo-stem" x1="40" y1="24" x2="40" y2="102" pathLength="1" />
        <circle class="logo-bowl" cx="66" cy="80" r="22" pathLength="1" transform="rotate(180 66 80)" />
      </g>
    </svg>
    <span>${escapeHtml(label)}</span>
  </div>`;
}
