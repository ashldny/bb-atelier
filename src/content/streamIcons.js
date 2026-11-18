// Activity-stream icons are single even-odd outline paths, so the timeline line behind them
// shows through their hollow middle, and a CSS background would fill the whole square box.
// Instead, a copy of each outline path is drawn underneath with nonzero fill: the result is
// the icon's silhouette, painted in the page background (see .bb-icon-fill in cssBuilder.js).
const ICON_PATHS = '.stream-panel-activity-icon svg path:not(.bb-icon-fill):not([data-bb-filled])';

export function createIconFiller() {
  let active = false;
  let observedBody = null;
  let timer = null;

  function fill() {
    timer = null;
    for (const path of document.querySelectorAll(ICON_PATHS)) {
      const silhouette = path.cloneNode(false);
      silhouette.removeAttribute('id');
      silhouette.setAttribute('class', 'bb-icon-fill');
      silhouette.setAttribute('fill', 'transparent');
      silhouette.setAttribute('fill-rule', 'nonzero');
      silhouette.setAttribute('clip-rule', 'nonzero');
      silhouette.setAttribute('aria-hidden', 'true');
      path.setAttribute('data-bb-filled', '');
      path.before(silhouette);
    }
  }

  const observer = new MutationObserver(() => {
    if (!timer) timer = setTimeout(fill, 60);
  });

  function update(enabled) {
    if (enabled === active && observedBody === document.body) return;
    active = enabled;
    observer.disconnect();
    clearTimeout(timer);
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
