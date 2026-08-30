// ═════════════════════════════════════════════════════════
//  Bb Atelier — Level 1 Theme Engine (Hardened)
//  Reuse Dark Reader detection/generation, drive colors from swatches
//  Public API only: enable / disable / exportGeneratedCSS
// ═════════════════════════════════════════════════════════

import { enable, disable, exportGeneratedCSS, setFetchMethod } from 'darkreader';
import * as css from 'css';
import valueParser from 'postcss-value-parser';
import { colord } from 'colord';

// ─── Color props — include shorthands now (tokenized, not whole-value) ──
export const COLOR_PROPS = new Set([
  'color',
  'background-color',
  'background',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'outline-color',
  'outline',
  'box-shadow',
  'text-shadow',
  'fill',
  'stroke',
]);

// Props that are shorthands and need token-level parsing (kept for docs)
export const SHORTHAND_PROPS = new Set(['background', 'box-shadow', 'text-shadow', 'border', 'outline']);

// ─── Cached AST/state ─────────────────────────────────────────
let _cachedAST = null;
let _cachedRawCSS = '';
let _colorCount = new Map(); // normalizedHex -> {count, originalValues:Set}
let _normalizedSet = new Set(); // Set of normalized hex strings

function resetCache() {
  _cachedAST = null;
  _cachedRawCSS = '';
  _colorCount = new Map();
  _normalizedSet = new Set();
}

// ─── Color normalization via colord (accurate round-trip) ─────
export function toHex(colorValue) {
  try {
    const c = colord(String(colorValue).trim());
    if (!c.isValid()) return null;
    return c.toHex().toLowerCase(); // #rrggbb
  } catch (_e) {
    return null;
  }
}

// ─── Tokenizer helpers for shorthand ──────────────────────────
function extractColorsFromValue(prop, value, important) {
  const results = [];
  const parsed = valueParser(value);

  parsed.walk((node) => {
    if (node.type === 'word' || node.type === 'function') {
      const raw = node.type === 'function' ? valueParser.stringify(node) : node.value;
      const lower = raw.toLowerCase();
      if (lower === 'none' || lower === 'transparent') {
        if (lower === 'transparent') {
          results.push({ raw, normalized: 'transparent', prop, important });
        }
        return;
      }
      const hex = toHex(raw);
      if (hex) {
        results.push({ raw, normalized: hex, prop, important: !!important });
      }
    }
  });

  return results;
}

// ─── Detection: neutral Dark Reader pass → parse → ranked list ─
export async function detectColors() {
  resetCache();

  // Neutral theme — let Dark Reader generate CSS for this page, discard its colors later
  const neutralTheme = {
    mode: 1,
    brightness: 100,
    contrast: 100,
    sepia: 0,
    grayscale: 0,
  };

  try {
    setFetchMethod(window.fetch.bind(window));
  } catch (_e) {
    /* ignore */
  }

  try {
    enable(neutralTheme, { invert: [], css: '', ignoreInlineStyle: [], ignoreImageAnalysis: [] });
  } catch (err) {
    console.warn('[BB ThemeEngine] enable failed', err);
    return { colors: [], css: '' };
  }

  // Give Dark Reader a tick to generate — 400ms for Ultra's late-loaded sheets
  await new Promise((r) => setTimeout(r, 400));

  let rawCSS = '';
  try {
    rawCSS = await exportGeneratedCSS();
  } catch (err) {
    console.warn('[BB ThemeEngine] exportGeneratedCSS failed', err);
    try {
      disable();
    } catch (_e) {
      /* ignore */
    }
    return { colors: [], css: '' };
  }

  try {
    disable();
  } catch (_e) {
    /* ignore */
  }

  _cachedRawCSS = rawCSS || '';

  if (!_cachedRawCSS) {
    return { colors: [], css: '' };
  }

  // Parse with css package
  let ast;
  try {
    ast = css.parse(_cachedRawCSS, { silent: true });
  } catch (err) {
    console.warn('[BB ThemeEngine] css.parse failed', err);
    return { colors: [], css: _cachedRawCSS };
  }

  _cachedAST = ast;

  // Walk rules → declarations
  const countMap = new Map(); // normalized -> {count, examples: Set, propSet: Set}

  function visitRules(rules, _mediaPrefix='') {
    if (!Array.isArray(rules)) return;
    for (const rule of rules) {
      if (rule.type === 'rule' && Array.isArray(rule.declarations)) {
        const selectorText = Array.isArray(rule.selectors) ? rule.selectors.join(', ').slice(0, 200) : (rule.selectors || '');
        for (const decl of rule.declarations) {
          if (!decl || decl.type !== 'declaration') continue;
          const prop = String(decl.property || '').toLowerCase();
          if (!COLOR_PROPS.has(prop)) continue;
          // Skip CSS variables declarations themselves (e.g. --palette-*)
          if (prop.startsWith('--')) continue;
          const value = String(decl.value || '');
          // Skip var() references — they are Tier 1 and will update via palette
          if (value.includes('var(')) continue;
          const important = !!decl.important;
          const colors = extractColorsFromValue(prop, value, important);
          for (const c of colors) {
            const key = c.normalized;
            // Skip near-transparent / very low alpha handled as transparent already
            if (key === 'transparent') continue;
            if (!countMap.has(key)) {
              countMap.set(key, { count: 0, examples: new Set(), propSet: new Set(), selectors: new Set(), important: false });
            }
            const entry = countMap.get(key);
            entry.count += 1;
            entry.examples.add(c.raw);
            entry.propSet.add(prop);
            if (selectorText) entry.selectors.add(selectorText);
            if (c.important) entry.important = true;
          }
        }
      } else if (rule.type === 'media' || rule.type === 'supports' || rule.type === 'keyframes') {
        visitRules(rule.rules, rule.type);
      }
    }
  }

  visitRules(ast.stylesheet.rules);

  // Build ranked list: most frequent first, deduped — includes selector context for mapping UI
  const ranked = Array.from(countMap.entries())
    .map(([normalized, info]) => ({
      normalized,
      count: info.count,
      example: Array.from(info.examples)[0] || normalized,
      props: Array.from(info.propSet),
      selectors: Array.from(info.selectors || []).slice(0,5),
      important: info.important,
    }))
    .sort((a, b) => b.count - a.count);

  _colorCount = countMap;
  _normalizedSet = new Set(ranked.map((r) => r.normalized));

  return { colors: ranked, css: _cachedRawCSS, ast };
}

export function getDetectedColors() {
  // Return cached ranked list without re-running
  if (_colorCount.size === 0) return [];
  const ranked = Array.from(_colorCount.entries())
    .map(([normalized, info]) => ({
      normalized,
      count: info.count,
      example: Array.from(info.examples)[0] || normalized,
      props: Array.from(info.propSet),
      selectors: Array.from(info.selectors || []).slice(0,5),
      important: info.important,
    }))
    .sort((a, b) => b.count - a.count);
  return ranked;
}

export function getCachedAST() {
  return _cachedAST;
}

export function getNormalizedSet() {
  return _normalizedSet;
}

// ─── Remap: clone AST → substitute via tokenizer → stringify ─
export function buildRemappedCSS(colorMap) {
  if (!_cachedAST) {
    // No cached AST — nothing to remap
    return _cachedRawCSS || '';
  }

  // colorMap: { normalizedHex (lower) -> newHex (lower or as authored) }
  // Normalize keys to lower
  const normMap = new Map();
  for (const [k, v] of Object.entries(colorMap || {})) {
    const nk = String(k).toLowerCase();
    const nv = String(v).toLowerCase();
    // Validate new color is parseable; allow hex only for now but colord validates
    if (toHex(nv) || nv === 'transparent') {
      normMap.set(nk, nv);
    }
  }

  if (normMap.size === 0) {
    // No substitutions — return original stringified
    try {
      return css.stringify(_cachedAST);
    } catch (_e) {
      return _cachedRawCSS;
    }
  }

  // Deep clone AST (JSON round-trip is fine for css AST)
  const clone = JSON.parse(JSON.stringify(_cachedAST));

  function visitAndReplace(rules) {
    if (!Array.isArray(rules)) return;
    for (const rule of rules) {
      if (rule.type === 'rule' && Array.isArray(rule.declarations)) {
        for (const decl of rule.declarations) {
          if (!decl || decl.type !== 'declaration') continue;
          const prop = String(decl.property || '').toLowerCase();
          if (!COLOR_PROPS.has(prop)) continue;
          const originalValue = String(decl.value || '');
          const important = !!decl.important;

          // Token-level remap via postcss-value-parser
          const parsed = valueParser(originalValue);
          let changed = false;

          parsed.walk((node) => {
            if (node.type === 'word' || node.type === 'function') {
              const raw = node.type === 'function' ? valueParser.stringify(node) : node.value;
              const norm = toHex(raw);
              if (!norm) return;
              const replacement = normMap.get(norm.toLowerCase());
              if (replacement) {
                changed = true;
                // Preserve function vs word shape: if original was rgb(), replace with hex (colord out is hex)
                // For simplicity, replace node.value / stringify with new hex
                if (node.type === 'function') {
                  // Replace whole function node with word containing hex
                  node.type = 'word';
                  node.value = replacement;
                  delete node.nodes;
                } else {
                  node.value = replacement;
                }
              }
            }
          });

          if (changed) {
            decl.value = parsed.toString();
            // Preserve !important if original had it
            if (important) {
              decl.important = true;
            }
          }
        }
      } else if (rule.type === 'media' || rule.type === 'supports') {
        visitAndReplace(rule.rules);
      }
    }
  }

  visitAndReplace(clone.stylesheet.rules);

  try {
    const out = css.stringify(clone);
    // css.stringify may drop !important if decl.important wasn't set before; ensure
    // But we set it above when original had it, so it will emit `!important`
    return out;
  } catch (_e) {
    return _cachedRawCSS;
  }
}

// ─── Sampling helper for MutationObserver secondary check ────
const SAMPLE_PROPS = ['color', 'background-color', 'border-top-color'];

export function hasUncachedColorOnNodes(nodes, normalizedSet) {
  if (!nodes || nodes.length === 0) return false;
  if (!normalizedSet || normalizedSet.size === 0) return false;

  for (const n of nodes) {
    if (!(n instanceof Element)) continue;
    // Sample a few props via getComputedStyle
    let cs;
    try {
      cs = getComputedStyle(n);
    } catch (_e) {
      continue;
    }
    for (const prop of SAMPLE_PROPS) {
      const val = cs.getPropertyValue(prop);
      if (!val) continue;
      const hex = toHex(val);
      if (!hex) continue;
      if (!normalizedSet.has(hex.toLowerCase())) {
        // New color not in cache — likely new content with different palette
        return true;
      }
    }
    // Also check first child if element is container
    if (n.children && n.children.length > 0) {
      const first = n.children[0];
      if (first instanceof Element) {
        try {
          const cs2 = getComputedStyle(first);
          for (const prop of SAMPLE_PROPS) {
            const val = cs2.getPropertyValue(prop);
            const hex = toHex(val);
            if (hex && !normalizedSet.has(hex.toLowerCase())) return true;
          }
        } catch (_e) {
          /* ignore */
        }
      }
    }
  }
  return false;
}
