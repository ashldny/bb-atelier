// Activity-stream icons are hollow outlines, so the timeline line behind them shows through
// their middle, and a CSS background would fill the whole square box. Instead each icon gets
// a shape underneath, painted in the page background (.bb-icon-fill in cssBuilder.js):
// the convex hull of the icon's outline. A hull also covers icons whose outline is open
// (the grade icon's page is broken by its pencil), which a plain filled copy would not.
import { beforeNextPaint, cancelBeforeNextPaint } from '../utils/frame.js';

const ICON_SVGS = '.stream-panel-activity-icon svg:not([data-bb-filled])';
const SVG_NS = 'http://www.w3.org/2000/svg';
const SAMPLES = 96;

function cross(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/** Andrew's monotone chain; returns hull points in order. */
export function convexHull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (const point of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
    upper.push(point);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function outlinePoints(svg) {
  const points = [];
  for (const path of svg.querySelectorAll('path')) {
    const length = path.getTotalLength();
    for (let i = 0; i <= SAMPLES; i++) {
      const { x, y } = path.getPointAtLength((length * i) / SAMPLES);
      points.push([x, y]);
    }
  }
  return points;
}

function addFill(svg) {
  svg.setAttribute('data-bb-filled', '');
  const paths = [...svg.querySelectorAll('path')];
  if (!paths.length) return;
  let shape;
  if (typeof paths[0].getTotalLength === 'function') {
    const hull = convexHull(outlinePoints(svg));
    if (hull.length < 3) return;
    shape = document.createElementNS(SVG_NS, 'polygon');
    shape.setAttribute('points', hull.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '));
  } else {
    // No geometry API (e.g. tests): fall back to a nonzero copy of the first outline.
    shape = paths[0].cloneNode(false);
    shape.removeAttribute('id');
    shape.setAttribute('fill-rule', 'nonzero');
    shape.setAttribute('clip-rule', 'nonzero');
  }
  shape.setAttribute('class', 'bb-icon-fill');
  shape.setAttribute('fill', 'transparent');
  shape.setAttribute('aria-hidden', 'true');
  svg.prepend(shape);
}

export function createIconFiller() {
  let active = false;
  let observedBody = null;
  let timer = null;

  function fill() {
    timer = null;
    for (const svg of document.querySelectorAll(ICON_SVGS)) {
      try {
        addFill(svg);
      } catch {
        // An icon that is not rendered yet has no geometry; skip it.
      }
    }
  }

  const observer = new MutationObserver(() => {
    if (!timer) timer = beforeNextPaint(fill);
  });

  function update(enabled) {
    if (enabled === active && observedBody === document.body) return;
    active = enabled;
    observer.disconnect();
    cancelBeforeNextPaint(timer);
    timer = null;
    observedBody = document.body;
    if (!active) {
      document.querySelectorAll('.bb-icon-fill').forEach((node) => node.remove());
      document
        .querySelectorAll('[data-bb-filled]')
        .forEach((node) => node.removeAttribute('data-bb-filled'));
      return;
    }
    if (!document.body) return;
    fill();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return { update };
}
