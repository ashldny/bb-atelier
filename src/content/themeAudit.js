// Theme coverage audit. Finds visible elements whose colours do not come from
// the active palette, and says where each colour came from, so the fix can go
// to the right tier:
//   inline style            → Tier 2 rule with a stable selector (or ignore)
//   cross-origin stylesheet → Tier 2 rule (Tier 3 cannot read those sheets)
//   site rule               → should already be Tier 3; report it as a remap gap
import { parseColor, chroma } from '../theme/colorRemap.js';

const TOKENS = [
  '--page-bg',
  '--page-bg-lighter',
  '--page-text-1',
  '--page-text-2',
  '--page-text-3',
  '--page-border',
  '--navbar-bg',
  '--navbar-text',
  '--navbar-text-muted',
  '--accent',
  '--accent-surface',
  '--accent-on-page',
];
const PROPS = ['background-color', 'color', 'border-top-color'];
const MAX_ELEMENTS = 4000;
const TOLERANCE = 10;

/** Accept rgb()/rgba() and the color(srgb …) form color-mix() computes to. */
function toRgb(value) {
  const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(value);
  if (srgb) return [+srgb[1] * 255, +srgb[2] * 255, +srgb[3] * 255, srgb[4] ? +srgb[4] : 1];
  return parseColor(value);
}

function resolveTokens() {
  const probe = document.createElement('div');
  probe.style.display = 'none';
  document.documentElement.appendChild(probe);
  const colors = [];
  for (const token of TOKENS) {
    probe.style.color = `var(${token})`;
    const rgb = toRgb(getComputedStyle(probe).color);
    if (rgb) colors.push(rgb);
  }
  probe.remove();
  colors.push([255, 255, 255, 1], [0, 0, 0, 1]);
  return colors;
}

/** Distance from point p to the segment a–b in RGB space. */
function segmentDistance(p, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1;
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / len)
  );
  return Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1], p[2] - a[2] - t * ab[2]);
}

/** A colour is "themed" if it is a token, or a color-mix between two tokens. */
function isThemed(rgb, tokens) {
  for (let i = 0; i < tokens.length; i++)
    for (let j = i; j < tokens.length; j++)
      if (segmentDistance(rgb, tokens[i], tokens[j]) <= TOLERANCE) return true;
  return false;
}

function describe(el) {
  const classes = [...el.classList]
    .filter((c) => !/^(muiltr-|css-)|-0-2-\d+$|_[0-9a-f]{6,}$/.test(c))
    .slice(0, 3);
  return (
    el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + classes.map((c) => `.${c}`).join('')
  );
}

function stablePath(el) {
  const parts = [];
  for (let node = el; node && parts.length < 3 && node !== document.body; node = node.parentElement)
    parts.unshift(describe(node));
  return parts.join(' > ');
}

function sourceOf(el, prop) {
  if (el.style.getPropertyValue(prop)) return 'inline style';
  let crossOrigin = false;
  for (const sheet of document.styleSheets) {
    if (sheet.ownerNode?.id?.startsWith('bb-')) continue;
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      crossOrigin = true;
      continue;
    }
    const stack = [...rules];
    while (stack.length) {
      const rule = stack.pop();
      if (rule.cssRules && !rule.selectorText) stack.push(...rule.cssRules);
      else if (rule.selectorText && rule.style?.getPropertyValue(prop)) {
        try {
          if (el.matches(rule.selectorText)) return 'site rule';
        } catch {
          /* unsupported selector */
        }
      }
    }
  }
  return crossOrigin ? 'cross-origin stylesheet' : 'inherited / default';
}

/**
 * @returns {{ checked: number, issues: Array<{path: string, prop: string, color: string, source: string, count: number}> }}
 */
export function auditTheme() {
  const tokens = resolveTokens();
  const groups = new Map();
  let checked = 0;
  for (const el of document.body?.querySelectorAll('*') || []) {
    if (checked >= MAX_ELEMENTS) break;
    if (el.closest('svg, img, video, canvas, iframe, [data-bb-cover]')) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.opacity === '0') continue;
    checked++;
    for (const prop of PROPS) {
      if (prop === 'border-top-color' && parseFloat(style.borderTopWidth) === 0) continue;
      if (prop === 'color' && !el.childNodes.length) continue;
      const value = style.getPropertyValue(prop);
      const rgb = toRgb(value);
      if (!rgb || rgb[3] < 0.1 || isThemed(rgb, tokens)) continue;
      // Strongly coloured text and borders are status/grade meaning; leave them.
      // Saturated backgrounds are still reported (that is where brand leaks show).
      if (prop !== 'background-color' && chroma(rgb) > 0.35) continue;
      const path = stablePath(el);
      const key = `${path}|${prop}|${value}`;
      const group = groups.get(key);
      if (group) group.count++;
      else groups.set(key, { path, prop, color: value, source: sourceOf(el, prop), count: 1 });
    }
  }
  const issues = [...groups.values()].sort((a, b) => b.count - a.count).slice(0, 40);
  return { checked, issues };
}
