// Tier 3: walk the page's own same-origin stylesheets (including CSS-in-JS
// rules inserted through insertRule, which never touch the DOM) and emit
// mirror rules that route literal neutral colours through theme tokens.
// Because the mirror rules reuse Blackboard's selector text verbatim, they
// keep working when hashed class names change between releases or page loads.
import { REMAPPED_PROPS, remapValue } from '../theme/colorRemap.js';

const STYLE_ID = 'bb-theme-remap';
const SCAN_INTERVAL = 400;

function isOwnSheet(sheet) {
  const node = sheet.ownerNode;
  return Boolean(
    node && ((node.id && node.id.startsWith('bb-')) || node.classList?.contains('darkreader'))
  );
}

/** Build one mirror rule for a style rule, or '' when nothing needs remapping. */
export function mirrorRule(rule) {
  const decls = [];
  for (const prop of REMAPPED_PROPS) {
    const value = rule.style.getPropertyValue(prop);
    if (!value) continue;
    const next = remapValue(prop, value);
    if (!next) continue;
    const important = rule.style.getPropertyPriority(prop) ? ' !important' : '';
    // Shorthand `background` would also reset images; only the colour moves.
    const target = prop === 'background' ? 'background-color' : prop;
    decls.push(`${target}: ${next}${important};`);
  }
  return decls.length ? `${rule.selectorText} { ${decls.join(' ')} }` : '';
}

export function createRuleRemapper(styles) {
  let seen = new WeakSet();
  const output = new Map(); // css text -> true, insertion ordered
  let active = false;
  let timer = 0;
  let observer = null;

  function walk(rules, wrap) {
    for (const rule of rules) {
      if (seen.has(rule)) continue;
      seen.add(rule);
      if (rule.selectorText !== undefined && rule.style) {
        const text = mirrorRule(rule);
        if (text) output.set(wrap(text), true);
      } else if (rule.conditionText !== undefined && rule.cssRules) {
        const at = rule.constructor?.name === 'CSSSupportsRule' ? '@supports' : '@media';
        const cond = rule.conditionText || rule.media?.mediaText;
        walk(rule.cssRules, (inner) => wrap(`${at} ${cond} { ${inner} }`));
      } else if (rule.cssRules && rule.constructor?.name === 'CSSLayerBlockRule') {
        walk(rule.cssRules, wrap);
      }
    }
  }

  function scan() {
    timer = 0;
    if (!active) return;
    const before = output.size;
    for (const sheet of document.styleSheets) {
      if (isOwnSheet(sheet)) continue;
      let rules;
      try {
        rules = sheet.cssRules; // cross-origin sheets throw; Tier 1 covers those
      } catch {
        continue;
      }
      walk(rules, (text) => text);
    }
    if (output.size !== before) styles.set(STYLE_ID, [...output.keys()].join('\n'));
  }

  function schedule() {
    if (!active || timer) return;
    timer = setTimeout(scan, SCAN_INTERVAL);
  }

  return {
    start() {
      if (active) return;
      active = true;
      scan();
      // CSS-in-JS injects rules when components mount, so DOM changes are the cue.
      observer = new MutationObserver(schedule);
      observer.observe(document.documentElement, { childList: true, subtree: true });
      if (document.readyState !== 'complete')
        window.addEventListener('load', schedule, { once: true });
    },
    stop() {
      active = false;
      clearTimeout(timer);
      timer = 0;
      observer?.disconnect();
      observer = null;
      output.clear();
      seen = new WeakSet();
      styles.remove(STYLE_ID);
    },
    /** Forget processed rules (e.g. after the site swaps stylesheets wholesale). */
    rescan() {
      if (!active) return;
      this.stop();
      this.start();
    },
  };
}
