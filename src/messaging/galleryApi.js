// Theme gallery client: the only module that talks to the gallery backend.
import { GALLERY_CONFIG, GALLERY_PAGE_SIZE } from '../utils/galleryConfig.js';
import { isValidHex } from '../utils/ui.js';
import { hexToRgb, rgbToHex } from '../theme/colorUtils.js';
import { findFont } from '../utils/fontCatalog.js';

/** Only built-in catalog fonts travel with shared themes; uploaded font files never do. */
export const shareableFont = (font) => (typeof font === 'string' && findFont(font) ? font : null);

// The server accepts lowercase six-digit hex only.
const fullHex = (hex) => {
  if (!isValidHex(hex)) return null;
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r, g, b);
};

const HOST_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;

export function isGalleryConfigured() {
  return HOST_PATTERN.test(GALLERY_CONFIG.url) && !!GALLERY_CONFIG.publishableKey;
}

// An anonymous random id for this install, used only for rate limits, "one report per
// person" and recognising your own shared themes. The server stores a hash of it.
async function installId() {
  const { galleryInstallId } = await chrome.storage.local.get('galleryInstallId');
  if (typeof galleryInstallId === 'string' && /^[0-9a-f-]{36}$/.test(galleryInstallId))
    return galleryInstallId;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ galleryInstallId: id });
  return id;
}

const ERRORS = {
  limit: 'You’ve shared 5 themes today. Try again tomorrow.',
  duplicate: 'These exact colors are already in the gallery.',
  22001: 'That name is too long.',
  22023: 'Use letters, numbers and simple punctuation, with no links.',
};

async function call(fn, body) {
  if (!isGalleryConfigured()) throw new Error('The gallery isn’t set up yet.');
  let response;
  try {
    response = await fetch(`${GALLERY_CONFIG.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: GALLERY_CONFIG.publishableKey,
      },
      body: JSON.stringify(body),
      credentials: 'omit',
    });
  } catch {
    throw new Error('Could not reach the gallery. Check your connection.');
  }
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok)
    throw new Error(
      ERRORS[data?.hint] || ERRORS[data?.code] || 'The gallery had a problem. Try again.'
    );
  return data;
}

// Rows come from other people: keep only well-formed fields before anything renders them.
function toTheme(row) {
  if (!row || typeof row.id !== 'string' || !isValidHex(row.page_bg) || !isValidHex(row.accent))
    return null;
  return {
    id: row.id,
    name: String(row.name || 'Untitled').slice(0, 40),
    author: typeof row.author === 'string' ? row.author.slice(0, 30) : '',
    uses: Number.isFinite(row.uses) ? row.uses : 0,
    mine: row.mine === true,
    palette: {
      pageBg: row.page_bg,
      accent: row.accent,
      navbar: isValidHex(row.navbar) ? row.navbar : null,
      pageText: isValidHex(row.page_text) ? row.page_text : null,
    },
    font: shareableFont(row.font),
  };
}

export async function listGallery({ sort = 'popular', page = 0 } = {}) {
  const rows = await call('gallery_list', {
    sort: sort === 'new' ? 'new' : 'popular',
    page_size: GALLERY_PAGE_SIZE,
    page_offset: page * GALLERY_PAGE_SIZE,
    install_id: await installId(),
  });
  return Array.isArray(rows) ? rows.map(toTheme).filter(Boolean) : [];
}

export async function shareTheme(name, author, palette) {
  return call('gallery_share', {
    install_id: await installId(),
    theme_name: name,
    author_name: author || null,
    page_bg: fullHex(palette.pageBg),
    accent: fullHex(palette.accent),
    navbar: fullHex(palette.navbar),
    page_text: fullHex(palette.pageText),
    font: shareableFont(palette.font),
  });
}

export async function recordGalleryUse(id) {
  return call('gallery_use', { install_id: await installId(), theme_id: id });
}
export async function reportGalleryTheme(id) {
  return call('gallery_report', { install_id: await installId(), theme_id: id });
}
export async function unshareTheme(id) {
  return call('gallery_unshare', { install_id: await installId(), theme_id: id });
}
