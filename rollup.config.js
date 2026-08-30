import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default [
  // Hardened Level 1 content script — primary MV3 content_scripts entry (bundled, uses Dark Reader + css + postcss-value-parser + colord)
  // Produced as both content.js (manifest) and dist/content.js (spec)
  {
    input: 'src/content.js',
    output: {
      file: 'content.js',
      format: 'iife',
      name: 'BBAtelierDR',
      sourcemap: true,
    },
    external: ['fs', 'path', 'url'],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      terser(),
    ],
  },
  {
    input: 'src/content.js',
    output: {
      file: 'dist/content.js',
      format: 'iife',
      name: 'BBAtelierDR',
      sourcemap: true,
    },
    external: ['fs', 'path', 'url'],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      terser(),
    ],
  },
  // Background service worker
  {
    input: 'src/background.js',
    output: {
      file: 'background.js',
      format: 'iife',
      name: 'BBAtelierBG',
      sourcemap: true,
    },
    plugins: [resolve({ browser: true, preferBuiltins: false }), commonjs(), terser()],
  },
  // Legacy fallback (kept, not used by manifest)
  {
    input: 'src/content-entry.js',
    output: {
      file: 'dist/content-entry.js',
      format: 'iife',
      name: 'BBAtelierLegacy',
      sourcemap: true,
    },
    plugins: [resolve({ browser: true, preferBuiltins: false }), commonjs(), terser()],
  },
];
