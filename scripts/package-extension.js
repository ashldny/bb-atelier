// Builds the Chrome Web Store upload: dist/bb-atelier-<version>.zip
// Only files the extension loads at runtime go in. Run `npm run build` first (npm run package does).
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

// Chrome versions are 1-4 dot-separated integers; package.json may pad with ".0".
const trim = (v) => v.replace(/(\.0)+$/, '');
if (trim(manifest.version) !== trim(pkg.version))
  throw new Error(`Version mismatch: manifest ${manifest.version} vs package.json ${pkg.version}`);

// Top-level files and folders the extension uses at runtime.
const INCLUDE = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'style.css',
  'icons',
  'src', // popup.html loads src/popup/popup.js as an unbundled ES module
  'Fonts',
];
// Fonts/WEB, OTF and TTF are an unused design-kit font, not part of the catalog.
const SKIP = [/\.map$/, /^Fonts\/(WEB|OTF|TTF)\//, /(^|\/)\.DS_Store$/, /\.md$/];

const files = [];
const walk = (p) => {
  if (statSync(p).isDirectory()) {
    for (const name of readdirSync(p)) walk(`${p}/${name}`);
  } else if (!SKIP.some((re) => re.test(p))) {
    files.push(p);
  }
};
for (const entry of INCLUDE) {
  if (!existsSync(entry)) throw new Error(`Missing ${entry}. Did the build run?`);
  walk(entry);
}

const zip = new JSZip();
for (const file of files.sort()) zip.file(file, readFileSync(file)); // forward-slash paths
const out = path.join('dist', `bb-atelier-${manifest.version}.zip`);
mkdirSync('dist', { recursive: true });
writeFileSync(
  out,
  await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  })
);
const kb = Math.round(statSync(out).size / 1024);
console.log(`${out}: ${files.length} files, ${kb} KB`);
