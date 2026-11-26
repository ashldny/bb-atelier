import { DEFAULT_BG, DEFAULT_ACCENT, normalizeTextScale } from '../utils/constants.js';
import { isValidHex } from '../utils/ui.js';
import { isValidFont, sanitizeUrl } from '../utils/sanitization.js';
import { normalizePalette, paletteOf } from '../theme/settings.js';
import { normalizeTheme } from '../theme/themeOptions.js';
import { normalizeCoverEntry } from '../utils/covers.js';
import { normalizeCustomFonts } from '../utils/customFonts.js';

const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);

export function validateSavedTheme(raw) {
  if (!isRecord(raw) || !['pageBg', 'accent'].every((key) => isValidHex(raw[key]))) return null;
  if (raw.navbar != null && !isValidHex(raw.navbar)) return null;
  if (raw.pageText != null && !isValidHex(raw.pageText)) return null;
  if (raw.font != null && !isValidFont(raw.font)) return null;
  return {
    ...normalizePalette({ ...raw, pageText: raw.pageText ?? null, navbar: raw.navbar ?? null }),
    customMode: true,
    font: raw.font || null,
  };
}

export function validateThemeCollection(raw) {
  if (!isRecord(raw)) throw new Error('Invalid saved themes');
  const result = Object.create(null);
  for (const [name, value] of Object.entries(raw)) {
    if (!name.trim() || name.length > 40) throw new Error('Theme names must be 1–40 characters');
    const theme = validateSavedTheme(value);
    if (!theme) throw new Error(`Invalid theme: ${name.slice(0, 40)}`);
    result[name] = theme;
  }
  return result;
}

export function validateSettingsImport(raw) {
  if (!isRecord(raw) || !isRecord(raw.sync)) throw new Error('Choose a Bb Atelier settings backup');
  const source = raw.sync;
  for (const key of ['pageBg', 'accent', 'navbar', 'pageText']) {
    if (source[key] != null && !isValidHex(source[key])) throw new Error(`Invalid ${key} color`);
  }
  const sync = {
    ...normalizePalette({
      pageBg: DEFAULT_BG,
      accent: DEFAULT_ACCENT,
      navbar: null,
      ...source,
    }),
    masterEnabled: source.masterEnabled !== false,
    bbTheme: normalizeTheme(source.bbTheme),
    // "Match my device" light/dark slots; invalid slots are dropped, not imported.
    followSystem: source.followSystem === true,
    lightPalette: paletteOf(source.lightPalette),
    darkPalette: paletteOf(source.darkPalette),
  };
  const local = {};
  const data = isRecord(raw.local) ? raw.local : {};
  if (data.font != null) {
    if (!isValidFont(data.font)) throw new Error('Invalid font in backup');
    local.font = data.font;
    local.fontName =
      typeof data.fontName === 'string' ? data.fontName.slice(0, 200) : 'Uploaded font';
  }
  if (data.customFonts != null) {
    if (!Array.isArray(data.customFonts)) throw new Error('Invalid custom fonts in backup');
    local.customFonts = normalizeCustomFonts(data.customFonts);
  }
  if (data.textScale != null) {
    const scale = normalizeTextScale(data.textScale);
    if (scale !== 1) local.textScale = scale;
  }
  const saved = data.savedThemes || source.savedThemes;
  if (saved) {
    const fonts = isRecord(data.savedThemeFonts) ? data.savedThemeFonts : {};
    local.savedThemes = validateThemeCollection(
      Object.fromEntries(
        Object.entries(saved).map(([name, theme]) => [
          name,
          {
            ...theme,
            font: theme.font || fonts[name] || null,
          },
        ])
      )
    );
  }
  const covers = data.courseCovers || source.courseCovers;
  if (covers) {
    if (!isRecord(covers)) throw new Error('Invalid covers');
    local.courseCovers = Object.fromEntries(
      Object.entries(covers).map(([id, entry]) => {
        const cover = normalizeCoverEntry(entry);
        if (!id || id.length > 200 || !cover.imageUrl) throw new Error('Invalid cover');
        return [id, cover];
      })
    );
  }
  if (data.coverLibrary) {
    if (!Array.isArray(data.coverLibrary)) throw new Error('Invalid image library');
    local.coverLibrary = data.coverLibrary.map((item) => {
      const dataUrl = sanitizeUrl(item?.dataUrl, { imageOnly: true });
      if (!dataUrl) throw new Error('Invalid library image');
      return { id: String(item.id).slice(0, 100), dataUrl };
    });
  }
  return { sync, local };
}
