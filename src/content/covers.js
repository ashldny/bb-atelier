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
    // Banner shape lets the popup draw a crop frame that matches this page's cards.
    const box = card.querySelector(BANNER)?.getBoundingClientRect();
    const aspect =
      box?.width && box?.height ? Math.round((box.width / box.height) * 100) / 100 : null;
    courses.set(id, {
      id,
      name: name?.trim().replace(/\s+/g, ' ').slice(0, 120) || id,
      aspect,
    });
  });
  return [...courses.values()];
}

// Cropped covers draw the whole image on ::before, scaled so the frame's width fills the
// banner, then rotated about the banner centre: frame centre (x%, y%) lands in the middle.
function imageRule(selector, entry) {
  const url = cssUrl(entry.imageUrl);
  if (!entry.crop)
    return `${selector}{background:${url} var(--bb-cover-position,50% 50%)/cover no-repeat!important;}
${selector} img{visibility:hidden!important;}
${selector}::before,${selector}::after{background:none!important;}`;
  return `${selector}{background:none!important;position:relative!important;overflow:hidden!important;}
${selector} img{visibility:hidden!important;}
${selector}::after{background:none!important;}
${selector}::before{content:''!important;display:block!important;position:absolute!important;left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;width:var(--bb-crop-w,100%)!important;height:auto!important;max-width:none!important;aspect-ratio:var(--bb-crop-ar,1.5)!important;background:${url} center/100% 100% no-repeat!important;transform-origin:0 0!important;transform:var(--bb-crop-t,translate(-50%,-50%))!important;opacity:1!important;pointer-events:none!important;z-index:0!important;}`;
}

function positionRule(selector, entry) {
  const crop = entry.crop;
  if (!crop) return `${selector}{--bb-cover-position:${entry.position};}`;
  return `${selector}{--bb-crop-w:${(10000 / crop.scale).toFixed(2)}%;--bb-crop-ar:${crop.aspect};--bb-crop-t:rotate(${-crop.rotate}deg) translate(${-crop.x}%,${-crop.y}%);}`;
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
        // The heavy image rule only changes with the image or mode; drags rewrite the
        // small position rule.
        const key = `${entry.crop ? 'crop' : 'cover'}|${entry.imageUrl}`;
        if (appliedImages.get(styleId) !== key) {
          styles.set(styleId, imageRule(selector, entry));
          appliedImages.set(styleId, key);
        }
        styles.set(positionId, positionRule(selector, entry));
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
