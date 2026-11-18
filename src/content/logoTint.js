// Institution-page logo tint. Blackboard shows the institution logo as an
// uploaded image (white crest on a solid dark disc) in `.banner__logo`. CSS
// cannot recolour part of a bitmap, so while the theme is active we add a
// knockout layer that keeps only the bright crest (SVG luminance → alpha
// filter) and paints it in the sidebar text colour; cssBuilder.js gives the
// disc itself the sidebar colour. Stopping removes every trace.

import { beforeNextPaint, cancelBeforeNextPaint } from '../utils/frame.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFS_ID = 'bb-logo-knockout-defs';
const LAYER_CLASS = 'bb-logo-knockout';
const LOGO_SELECTOR = '.banner__logo';

function svg(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function ensureDefs() {
  if (document.getElementById(DEFS_ID) || !document.body) return;
  const root = svg('svg', {
    id: DEFS_ID,
    width: '0',
    height: '0',
    'aria-hidden': 'true',
    focusable: 'false',
    style: 'position:absolute;width:0;height:0;overflow:hidden',
  });
  const filter = svg('filter', {
    id: 'bb-logo-knockout-filter',
    'color-interpolation-filters': 'sRGB',
  });
  // alpha = 3 × luminance − 0.75: the dark disc (≈0.15) vanishes, the crest stays solid.
  filter.append(
    svg('feColorMatrix', {
      in: 'SourceGraphic',
      type: 'matrix',
      values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.64 2.15 0.22 0 -0.75',
      result: 'crest',
    }),
    svg('feFlood', { class: 'bb-logo-ink', result: 'ink' }),
    svg('feComposite', { in: 'ink', in2: 'crest', operator: 'in' })
  );
  root.append(filter);
  document.body.append(root);
}

function tintLogos() {
  for (const logo of document.querySelectorAll(LOGO_SELECTOR)) {
    if (logo.querySelector(`:scope > .${LAYER_CLASS}`)) continue;
    const image = getComputedStyle(logo).backgroundImage;
    if (!image || image === 'none' || !/^url\(/.test(image)) continue;
    const layer = document.createElement('span');
    layer.className = LAYER_CLASS;
    layer.setAttribute('aria-hidden', 'true');
    layer.style.backgroundImage = image;
    logo.append(layer);
  }
}

export function createLogoTint() {
  let observer = null;
  let timer = 0;

  function run() {
    timer = 0;
    ensureDefs();
    tintLogos();
  }
  function schedule() {
    if (!timer) timer = beforeNextPaint(run);
  }

  return {
    start() {
      if (observer) return;
      observer = new MutationObserver(schedule);
      observer.observe(document.documentElement, { childList: true, subtree: true });
      schedule();
    },
    stop() {
      observer?.disconnect();
      observer = null;
      cancelBeforeNextPaint(timer);
      timer = 0;
      document.querySelectorAll(`.${LAYER_CLASS}`).forEach((el) => el.remove());
      document.getElementById(DEFS_ID)?.remove();
    },
  };
}
