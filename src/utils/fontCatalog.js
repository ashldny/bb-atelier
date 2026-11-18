// Single source of truth for the fonts offered in the popup and applied on Blackboard.
// `dir` fonts are bundled from Fonts/<dir>/ (OFL, via @fontsource); the rest are system fonts.
// `weights` lists the bundled regular and bold files, in that order.

export const FONT_GROUPS = [
  {
    label: 'Sans serif',
    fonts: [
      { name: 'Inter', dir: 'Inter', file: 'inter', weights: [400, 600] },
      { name: 'Montserrat', dir: 'Montserrat', file: 'montserrat', weights: [400, 600] },
      { name: 'Poppins', dir: 'Poppins', file: 'poppins', weights: [400, 600] },
      { name: 'DM Sans', dir: 'DMSans', file: 'dm-sans', weights: [400, 600] },
      { name: 'Lato', dir: 'Lato', file: 'lato', weights: [400, 700] },
      { name: 'Helvetica', stack: "'Helvetica Neue', Helvetica, Arial" },
    ],
  },
  {
    label: 'Serif',
    fonts: [
      { name: 'Noto Serif', dir: 'NotoSerif', file: 'noto-serif', weights: [400, 600] },
      { name: 'Merriweather', dir: 'Merriweather', file: 'merriweather', weights: [400, 600] },
      { name: 'Lora', dir: 'Lora', file: 'lora', weights: [400, 600] },
      {
        name: 'Playfair Display',
        dir: 'PlayfairDisplay',
        file: 'playfair-display',
        weights: [400, 600],
      },
      { name: 'EB Garamond', dir: 'EBGaramond', file: 'eb-garamond', weights: [400, 600] },
      { name: 'Times New Roman', stack: "'Times New Roman', Times" },
    ],
  },
  {
    label: 'Easy reading',
    fonts: [
      {
        name: 'Atkinson Hyperlegible',
        dir: 'AtkinsonHyperlegible',
        file: 'atkinson-hyperlegible',
        weights: [400, 700],
      },
      { name: 'Lexend', dir: 'Lexend', file: 'lexend', weights: [400, 600] },
    ],
  },
  {
    label: 'Playful',
    fonts: [
      { name: 'Space Grotesk', dir: 'SpaceGrotesk', file: 'space-grotesk', weights: [400, 600] },
      { name: 'Quicksand', dir: 'Quicksand', file: 'quicksand', weights: [400, 600] },
      { name: 'Comfortaa', dir: 'Comfortaa', file: 'comfortaa', weights: [400, 600] },
      { name: 'Caveat', dir: 'Caveat', file: 'caveat', weights: [400, 600] },
    ],
  },
  {
    label: 'Monospace',
    fonts: [
      { name: 'JetBrains Mono', dir: 'JetBrainsMono', file: 'jetbrains-mono', weights: [400, 600] },
      { name: 'IBM Plex Mono', dir: 'IBMPlexMono', file: 'ibm-plex-mono', weights: [400, 600] },
    ],
  },
];

const GENERIC = { Serif: 'serif', Monospace: 'monospace', Playful: 'sans-serif' };
const BY_NAME = new Map(
  FONT_GROUPS.flatMap((group) =>
    group.fonts.map((font) => [
      font.name,
      { ...font, generic: GENERIC[group.label] || 'sans-serif' },
    ])
  )
);
// Fonts from earlier versions that may still be stored; applied but no longer offered.
const LEGACY = { 'system-ui': 'sans-serif', 'Segoe UI': 'sans-serif', Roboto: 'sans-serif' };

export function findFont(name) {
  return BY_NAME.get(name) || null;
}

/** Bundled font files for a catalog font: [{ path, weight }] relative to the extension root. */
export function fontFiles(name) {
  const font = BY_NAME.get(name);
  if (!font?.dir) return [];
  return font.weights.map((weight) => ({
    path: `Fonts/${font.dir}/${font.file}-latin-${weight}-normal.woff2`,
    weight,
  }));
}

/** Full CSS font-family value (with fallbacks) for a stored font choice. */
export function fontStack(name) {
  if (name === 'serif' || name === 'monospace') return name;
  if (name === 'system-ui') return 'system-ui, sans-serif';
  const font = BY_NAME.get(name);
  const generic = font?.generic || LEGACY[name] || 'sans-serif';
  return `${font?.stack || `'${name}'`}, ${generic}`;
}
