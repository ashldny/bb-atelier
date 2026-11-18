import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/content-entry.js',
    output: [
      {
        file: 'content.js',
        format: 'iife',
        sourcemap: true,
        intro:
          'if (globalThis.__bbAtelierBundleLoaded) return; globalThis.__bbAtelierBundleLoaded = true;',
      },
      {
        file: 'dist/content.js',
        format: 'iife',
        sourcemap: true,
        intro:
          'if (globalThis.__bbAtelierBundleLoaded) return; globalThis.__bbAtelierBundleLoaded = true;',
      },
    ],
    plugins: [resolve({ browser: true }), commonjs(), terser()],
  },
  {
    input: 'src/background.js',
    output: { file: 'background.js', format: 'iife', sourcemap: true },
    plugins: [resolve({ browser: true }), commonjs(), terser()],
  },
];
