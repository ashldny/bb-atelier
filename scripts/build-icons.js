// Raster counterparts of the existing artwork; Chrome manifest icons cannot be SVG.
import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
for (const size of [16, 48, 128]) {
  const source = readFileSync(`icons/icon${size}.svg`, 'utf8').replaceAll('%23', '#');
  const image = new Resvg(source, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: true },
  }).render();
  writeFileSync(`icons/icon${size}.png`, image.asPng());
}
