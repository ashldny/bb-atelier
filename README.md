# Bb Atelier

A Manifest V3 Chrome extension for personalizing Blackboard Ultra with themes, fonts and course covers.

## Use

1. Run `npm install` and `npm run build` (Node 22.13+ or 24 recommended).
2. Open `chrome://extensions`, enable Developer mode and load this folder unpacked.
3. Open Blackboard, then the extension popup.

If the extension is already loaded, use its **Reload** button once after updating this code. Changes made in the popup then apply live, including on already-open Blackboard pages and supported frames. Missing content scripts are recovered when the popup connects. No Blackboard reload is required for ordinary customization changes.

Supported sites are `elearning.qu.edu.qa` and `*.blackboard.com`, including Ultra subdomains. For another institution, enter its domain in Settings and choose **Connect**. Access is requested only for that domain. Clearing the domain or revoking its permission stops customization there.

## Features

- Eight light/dark presets, with temporary hover previews and an explicit selected state.
- Independent background, accent, sidebar and text colors; optional automatic text with measured WCAG contrast.
- Keyboard-accessible navigation and readable controls in an 800 × 580 popup with a scrolling content area.
- Named saved themes, including text colors and uploaded fonts, with JSON import/export.
- Inter and Noto Serif assets bundled locally; system-font choices and custom TTF, OTF, WOFF and WOFF2 uploads up to 512 KB.
- Course covers from uploads or image URLs. Drag or use arrow keys to position them. Uploaded images can be reused from the library; uploads are limited to 2 MB per image.
- A reversible master switch. Pausing styling preserves your themes, fonts, covers and library.
- Native CSS by default, with an optional live Dark Reader engine.
- Automatic application, confirmation preferences, complete backup import/export and an explicit reset action.

Image URLs load directly as images rather than going through a content-script fetch that cannot bypass CORS. A host that blocks image embedding may still require uploading the image instead.

## Development

```sh
npm run build    # One Rollup pipeline; content-entry.js is the sole content runtime
npm run dev      # Watch source changes
npm test         # Rebuild, then run DOM integration and validation tests
npm run lint     # ESLint, Chrome MV3 packaging checks and web-ext analysis
```

`content.js`, `content.js.map`, `background.js`, `background.js.map` and `dist/` are generated. Edit source modules instead. The old `build:esbuild` and `dev:esbuild` commands are compatibility aliases for the same Rollup pipeline.

The web-ext analyzer targets Firefox. `scripts/lint-extension.js` reports its results and excludes only the two Firefox-specific manifest errors for the absent Gecko ID/background fallback. This extension intentionally ships a Chrome MV3 service worker. Other errors still fail the check; advisory warnings remain visible. The script separately checks Chrome-required files and supported icon formats.

Chrome requires raster manifest icons. PNG counterparts preserve the existing SVG artwork. Regenerate them with `node scripts/build-icons.js`; the SVG source assets are unchanged.

## Runtime and storage

- `src/content-entry.js` subscribes to storage once and coordinates small modules in `src/content/`.
- `src/content/styles.js` watches the head for removed or superseded styles. It does not rescan Blackboard content on every mutation.
- Native styling does not run color detection, periodic rescans or computed-style sampling. Dark Reader runs only when selected; its fetch helper never replaces `window.fetch`.
- Covers follow added or recycled course cards. The observer is disconnected when covers are inactive. There is no cover polling loop.
- Color drags preview without per-event sync writes. Cover position drags reuse existing image data and write the final position on release.
- Compact preferences live in sync storage. Saved themes, uploaded fonts, covers and the image library live in local storage to avoid sync's per-item quota. The service worker migrates older collections before the popup reads them. These local collections no longer sync between computers; export a backup to transfer them.
- The popup uses one messaging helper. Storage changes update all connected supported frames; on-demand commands use the originally selected tab.
- Imports validate colors, fonts, image URLs and allowed fields. Imported CSS is never executed, and backups cannot silently grant site permissions.

The legacy color-scanning modules are retained as source references and are not part of the active content bundle or popup.

## Verification scope

Automated checks use the built content bundle and bundled popup modules in a DOM environment with simulated Chrome APIs. They cover restoration, pausing, navigation, style recovery, frame updates, messaging recovery, color-write batching, theme/font round trips, library uploads, imports, reset, domain registration and input validation. They also check that ordinary page mutations do not rewrite styles.

They do not replace a live Chrome/Blackboard check of layout, real course markup, uploaded font rendering or Dark Reader's dynamic rendering. Browser preview was blocked in this editing session, so those checks remain manual:

1. Reload the extension once and open Blackboard Ultra.
2. Switch presets and engines; check late-loaded dialogs and navigation without refreshing Blackboard.
3. Pause/resume; confirm covers and fonts return.
4. Save/load/import/export a theme with custom text and an uploaded font.
5. Open Courses, refresh the popup list, upload/position/remove a cover and navigate away/back.
6. Check popup scrolling, keyboard focus and the console for `[BbAtelier]` errors.
