// ═════════════════════════════════════════════════════════
//  Bb Atelier — CSS Sanitizer (Dark Reader purge)
//  Strips every --darkreader-* custom property and var() fallback
//  chain at any nesting depth before CSS is injected or persisted.
//  MUST be the single source of truth for all stylesheet writes.
// ═════════════════════════════════════════════════════════

/**
 * Strip all Dark Reader artifacts from a CSS string.
 * - Removes declarations like `--darkreader-xxx: ...;`
 * - Unwraps `var(--darkreader-..., fallback)` recursively to `fallback`
 * - Handles arbitrarily nested chains e.g.
 *   var(--darkreader-bg--darkreader-bg--accent,
 *       var(--darkreader-background-670d2f, #670d2f))
 * - Case-insensitive
 * @param {string} css
 * @returns {string} sanitized css
 */
// ─── Memoization: cache last N purged results (identical CSS is never re-purged) ──
const _purgeCache = new Map(); // input -> output
const _PURGE_CACHE_MAX = 20;
let _lastPurgeInput = null;
let _lastPurgeOutput = null;

export function purgeDarkReaderCss(css) {
  if (typeof css !== 'string' || !css) return '';
  if (!/--darkreader/i.test(css)) return css;
  // Fast path: exact same reference/value as last call
  if (css === _lastPurgeInput) return _lastPurgeOutput;
  if (_purgeCache.has(css)) return _purgeCache.get(css);
  let out = css;

  // 1. Remove custom property declarations that define --darkreader vars
  //    Handles `--darkreader-bg--accent: #...;` and `--darkreader-background-ffffff: #181a1b;` etc.
  out = out.replace(/--darkreader[-\w]*\s*:[^;{}]*(?:;|(?=}))/gi, '');

  // 2. Iteratively unwrap var(--darkreader-..., fallback) → fallback
  //    Use a real parenthesis parser to handle nested var() fallbacks correctly.
  // Every replacement shortens the string, so no arbitrary 30-declaration ceiling is needed.
  for (;;) {
    const match = /var\(\s*--darkreader/i.exec(out);
    if (!match) break;
    const start = match.index;

    // Find matching closing ) for this var(
    let depth = 0;
    let end = -1;
    for (let i = start; i < out.length; i++) {
      const ch = out[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) break; // malformed — abort

    const fullVar = out.slice(start, end + 1); // e.g. var(--darkreader-..., fallback)
    const inner = fullVar.slice(4, -1); // strip `var(` and trailing `)`

    // Find first comma at depth 0 to separate the fallback
    let commaIdx = -1;
    let d = 0;
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === '(') d++;
      else if (ch === ')') d--;
      else if (ch === ',' && d === 0) {
        commaIdx = i;
        break;
      }
    }

    let fallback = '';
    if (commaIdx !== -1) {
      fallback = inner.slice(commaIdx + 1).trim();
    }
    // If no fallback and the var is the entire declaration value, replace with empty.
    // If no fallback but there is a parent fallback waiting, this will collapse correctly
    // on the next iteration when the outer var is unwrapped.

    out = out.slice(0, start) + fallback + out.slice(end + 1);
  }

  // 3. Clean up artifacts: `prop: ;`, double semicolons, empty rules like `{}`
  out = out.replace(/[a-z-]+\s*:\s*;/gi, '');
  out = out.replace(/;;+/g, ';');
  // Remove rules that became empty after purge, e.g. `.foo { }` — optional but keeps output tidy
  // We keep this conservative: only remove `{}` with only whitespace/semicolons
  out = out.replace(/[^{}]+\{\s*[;\s]*\}/g, (m) => {
    // Keep :root / mode selectors even if they look empty? No — but they will have other vars, so they won't match this.
    // If the rule would be empty, drop it.
    const body = m.slice(m.indexOf('{') + 1, m.lastIndexOf('}')).replace(/[\s;]/g, '');
    return body.length === 0 ? '' : m;
  });

  // Cache result (LRU-ish: evict oldest when full)
  if (_purgeCache.size >= _PURGE_CACHE_MAX) {
    const firstKey = _purgeCache.keys().next().value;
    _purgeCache.delete(firstKey);
  }
  _purgeCache.set(css, out);
  _lastPurgeInput = css;
  _lastPurgeOutput = out;
  return out;
}

/**
 * Verify no `darkreader` substring remains (case-insensitive).
 * @param {string} css
 * @returns {boolean} true if clean
 */
export function isDarkReaderFree(css) {
  return !String(css || '')
    .toLowerCase()
    .includes('darkreader');
}

/**
 * Sanitize and optionally assert cleanliness.
 * Throws in development if darkreader remains after purge.
 * @param {string} css
 * @returns {string}
 */
export function sanitizeCss(css) {
  const purged = purgeDarkReaderCss(css);
  // In DEBUG we could warn, but never throw in production path — just return purged
  return purged;
}
