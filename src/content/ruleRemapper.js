// Tier 3: walk the page's own same-origin stylesheets (including CSS-in-JS
// rules inserted through insertRule, which never touch the DOM) and emit a
// mirror sheet that routes literal colours through theme tokens.
//
// Cascade safety: every rule that sets a colour longhand is mirrored — with
// the remapped value, or its original value when no remap applies — in the
// site's own document order. A remapped white rule therefore can never beat
// a later site rule that it used to lose to (e.g. a dark sidebar override).
import {
  REMAPPED_PROPS,
  remapValue,
  parseColor,
  chroma,
  createBrandMatcher,
} from '../theme/colorRemap.js';

const STYLE_ID = 'bb-theme-remap';
const SCAN_INTERVAL = 400;
// Blackboard paints its institution theme through these stable class hooks.
const BRAND_SELECTOR = /color-selection|themed-/;
const COLOR_TOKEN = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi;

function isOwnSheet(sheet) {
  const node = sheet.ownerNode;
  return Boolean(
    node && ((node.id && node.id.startsWith('bb-')) || node.classList?.contains('darkreader'))
  );
}

function readableSheets() {
  const out = [];
  for (const sheet of document.styleSheets) {
    if (isOwnSheet(sheet)) continue;
    try {
      out.push(sheet.cssRules); // cross-origin sheets throw; Tier 1/2 cover those
    } catch {
      /* cross-origin */
    }
  }
  return out;
}

function forEachStyleRule(rules, visit, wrap = (t) => t) {
  for (const rule of rules) {
    if (rule.selectorText !== undefined && rule.style) visit(rule, wrap);
    else if (rule.conditionText !== undefined && rule.cssRules) {
      const at = rule.constructor?.name === 'CSSSupportsRule' ? '@supports' : '@media';
      const cond = rule.conditionText || rule.media?.mediaText;
      forEachStyleRule(rule.cssRules, visit, (inner) => wrap(`${at} ${cond} { ${inner} }`));
    } else if (rule.cssRules && rule.constructor?.name === 'CSSLayerBlockRule') {
      forEachStyleRule(rule.cssRules, visit, wrap);
    }
  }
}

/** Saturated colours Blackboard uses in its institution-theme rules, most used first. */
export function collectBrandColors(sheets) {
  const counts = new Map();
  for (const rules of sheets) {
    forEachStyleRule(rules, (rule) => {
      if (!BRAND_SELECTOR.test(rule.selectorText)) return;
      for (const match of rule.style.cssText.match(COLOR_TOKEN) || []) {
        const rgba = parseColor(match);
        if (!rgba || chroma(rgba) < 0.2) continue;
        const key = rgba.slice(0, 3).map(Math.round).join(',');
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key.split(',').map(Number));
}

/** Build one mirror rule for a style rule, or '' when it sets no colour longhands. */
export function mirrorRule(rule, brandOf) {
  const decls = [];
  let changed = false;
  for (const prop of REMAPPED_PROPS) {
    const value = rule.style.getPropertyValue(prop);
    if (!value) continue;
    const next = remapValue(prop, value, brandOf);
    if (next) changed = true;
    const important = rule.style.getPropertyPriority(prop) ? ' !important' : '';
    decls.push(`${prop}: ${next || value}${important};`);
  }
  // Rules with nothing to remap are still mirrored when they set a colour, so
  // that their position in the cascade relative to remapped rules is kept.
  return decls.length ? { text: `${rule.selectorText} { ${decls.join(' ')} }`, changed } : null;
}

export function createRuleRemapper(styles) {
  let cache = new WeakMap(); // CSSStyleRule -> mirror | null
  let brandKey = '';
  let brandOf = createBrandMatcher();
  let signature = '';
  let lastCss = '';
  let active = false;
  let timer = 0;
  let observer = null;

  function sheetSignature(sheets) {
    return sheets.map((rules) => rules.length).join(',');
  }

  function scan() {
    timer = 0;
    if (!active) return;
    const sheets = readableSheets();
    const nextSignature = sheetSignature(sheets);
    if (nextSignature === signature) return;
    signature = nextSignature;
    // A stylesheet appeared or changed: make sure ours still come after it.
    styles.repair?.();

    const brand = collectBrandColors(sheets);
    const nextBrandKey = brand.map((c) => c.join(',')).join(';');
    if (nextBrandKey !== brandKey) {
      brandKey = nextBrandKey;
      brandOf = createBrandMatcher(brand);
      cache = new WeakMap();
    }

    const out = [];
    let remapped = 0;
    for (const rules of sheets) {
      forEachStyleRule(rules, (rule, wrap) => {
        let mirror = cache.get(rule);
        if (mirror === undefined) {
          mirror = mirrorRule(rule, brandOf);
          cache.set(rule, mirror);
        }
        if (!mirror) return;
        if (mirror.changed) remapped++;
        out.push(wrap(mirror.text));
      });
    }
    // Pure pass-through copies are pointless when nothing was remapped.
    const css = remapped ? out.join('\n') : '';
    if (css !== lastCss) {
      lastCss = css;
      styles.set(STYLE_ID, css);
    }
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
      cache = new WeakMap();
      signature = '';
      lastCss = '';
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
