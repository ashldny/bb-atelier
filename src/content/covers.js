import { normalizeCoverEntry } from '../utils/covers.js';
import { cssUrl } from '../utils/sanitization.js';

const CARD = '.element-card, [class*="course-element"], [class*="course-card"], article';
const BANNER = '.course-banner';

function courseId(card) {
  const displayed = card.querySelector('.multi-column-course-id')?.textContent.trim();
  if (displayed) return displayed;
  const href =
    card.querySelector('a[href*="/course"], a[href*="/courses/"]')?.getAttribute('href') || '';
  return href.match(/(?:\/courses\/|\/ultra\/course\/)(_?\d+(?:_\d+)?)/)?.[1] || null;
}

function containingCourse(element) {
  let card = element.closest(CARD);
  while (card && !card.querySelector(BANNER)) card = card.parentElement?.closest(CARD);
  return card;
}

export function scrapeCourses() {
  const courses = new Map();
  document.querySelectorAll(CARD).forEach((card) => {
    const id = courseId(card);
    if (!id || courses.has(id)) return;
    const name = card.querySelector(
      '.course-title, .js-course-title-element, h4, [class*="title"]'
    )?.textContent;
    courses.set(id, { id, name: name?.trim().replace(/\s+/g, ' ').slice(0, 120) || id });
  });
  return [...courses.values()];
}

export function createCoverController(styles) {
  let covers = {};
  let enabled = false;
  let timer = null;
  let renderedCovers;
  let renderedEnabled;
  let renderedBody;
  const pending = new Set();
  const styledIds = new Set();
  const appliedImages = new Map();
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && containingCourse(mutation.target))
        pending.add(containingCourse(mutation.target));
      for (const node of mutation.addedNodes) {
        const element = node.nodeType === 1 ? node : node.parentElement;
        if (!element) continue;
        const card = containingCourse(element);
        if (card) pending.add(card);
        else if (element.matches?.(BANNER) || element.querySelector?.(BANNER)) pending.add(element);
      }
    }
    if (pending.size && !timer) timer = setTimeout(flush, 80);
  });

  function apply(root) {
    const banners = root.matches?.(BANNER) ? [root] : root.querySelectorAll(BANNER);
    for (const banner of banners) {
      const card = containingCourse(banner);
      const id = card && courseId(card);
      const entry = normalizeCoverEntry(covers[id]);
      if (id && entry.imageUrl) {
        if (banner.dataset.bbCover !== id) banner.dataset.bbCover = id;
      } else if (banner.hasAttribute('data-bb-cover')) banner.removeAttribute('data-bb-cover');
    }
  }

  function flush() {
    timer = null;
    if (enabled) for (const node of pending) if (node.isConnected) apply(node);
    pending.clear();
  }

  function update(nextCovers, active) {
    if (
      renderedCovers === nextCovers &&
      renderedEnabled === active &&
      renderedBody === document.body
    )
      return;
    renderedCovers = nextCovers;
    renderedEnabled = active;
    renderedBody = document.body;
    observer.disconnect();
    clearTimeout(timer);
    timer = null;
    pending.clear();
    enabled = active;
    covers = nextCovers || {};
    const nextIds = new Set();
    if (enabled)
      for (const [id, raw] of Object.entries(covers)) {
        const entry = normalizeCoverEntry(raw);
        if (!entry.imageUrl) continue;
        const styleId = `bb-cover-style-${encodeURIComponent(id)}`;
        const positionId = `bb-cover-position-${encodeURIComponent(id)}`;
        const selector = `.course-banner[data-bb-cover="${CSS.escape(id)}"]`;
        if (appliedImages.get(styleId) !== entry.imageUrl) {
          styles.set(
            styleId,
            `${selector}{background:${cssUrl(entry.imageUrl)} var(--bb-cover-position,50% 50%)/cover no-repeat!important;}
          ${selector} img{visibility:hidden!important;}
          ${selector}::before,${selector}::after{background:none!important;}`
          );
          appliedImages.set(styleId, entry.imageUrl);
        }
        styles.set(positionId, `${selector}{--bb-cover-position:${entry.position};}`);
        nextIds.add(styleId);
        nextIds.add(positionId);
      }
    for (const id of styledIds)
      if (!nextIds.has(id)) {
        styles.remove(id);
        appliedImages.delete(id);
      }
    styledIds.clear();
    for (const id of nextIds) styledIds.add(id);
    if (!enabled || !nextIds.size) {
      document
        .querySelectorAll('[data-bb-cover]')
        .forEach((node) => node.removeAttribute('data-bb-cover'));
      return;
    }
    apply(document);
    if (document.body)
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['href'],
      });
  }

  return { update };
}
