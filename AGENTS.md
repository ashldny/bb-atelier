# AGENTS.md — Bb Atelier

> This file is the agent contract for this repo. Read it before any edit. Hermes, Cursor, Codex, and all subagents must obey it.

## 1. Project Overview

**Bb Atelier** — Chrome Extension (Manifest V3) that skins Blackboard Ultra.
- Entry: `manifest.json` → `content.js` (Rollup IIFE from `src/content-entry.js`) at `document_start` + `popup.html`
- Stack: Vanilla JS (ES Modules), Rollup, `chrome.storage` (sync + local), CSS Custom Properties, MutationObserver
- Supported hosts: `elearning.qu.edu.qa`, `*.blackboard.com`, `*.ultra.blackboard.com`
- Build: `npm run build` (rollup -c). **Never edit `content.js`/`content.js.map`/`darkreader.js` directly** — they are build artifacts.

## 2. Coding Standards (Enforced)

### DRY — Don't Repeat Yourself
- Extract duplicated logic to `src/utils/` or `src/theme/`. Never copy-paste `derivePalette` math, `sendToTab` wrappers, or color helpers.
- One source of truth per concern: `colorUtils.js` for color math, `sanitization.js` for escaping, `ui.js` for toast/debounce, `constants.js` for defaults.

### Modularity & Single Responsibility
- Keep modules < 400 lines. Split like `src/popup/{tabs,theme,savedThemes,courseCovers,settings}.js` already does.
- One module = one responsibility. Popup owns UI, `theme/` owns palette/CSS, `messaging/` owns `chrome.tabs.sendMessage`, `utils/` owns pure helpers.
- No circular imports. `popup/*` may import `theme/*` and `messaging/*`; `theme/*` never imports `popup/*`.

### SOLID (applied to JS modules)
- **S** — Single responsibility per file. **O** — Extend via new presets/plugins, don't edit core `palette.js` for one-off overrides (use Tier 2). **L** — Keep palette functions substitutable (same `{overrides, darkOverrides, staticVars}` shape). **I** — Small, focused interfaces (e.g. `isValidHex(hex) → boolean`). **D** — Popup depends on abstractions (`applyThemeToBb()`), not direct `chrome.tabs.sendMessage`.

### General
- ESM with `.js` extensions in imports, 2-space indent, semicolons consistent with existing files.
- No `var`, no `eval`, no `innerHTML` without `escapeHtml()`.
- Validate all external input: hex via `isValidHex()`, files via `validateFileSize()`, URLs via allowlist (`http:`, `https:`, `data:`).
- Respect CSP `script-src 'self'` — never inject remote scripts.

## 3. Theme System — Tier Workflow (Critical)

`src/theme/cssBuilder.js` has ~400 lines — read its header before touching themes.

1. **Inspect** the Blackboard element → DevTools → Styles pane → find the winning rule.
2. If value is `var(--palette-*, fallback)` → **fix `src/theme/palette.js` overrides** (Tier 1). Do NOT add a Tier 2 rule.
3. Only if value is a literal `hex/rgb` with **no** `var()` → add a Tier 2 rule in `cssBuilder.js` with a comment noting which element it targets.
4. Before writing the selector, check specificity & state: `:hover`, `:focus`, `.active`, `.Mui-selected` — your override must match that state or explicitly exclude it.

## 4. Messaging Contract

Popup ↔ Content script must stay in sync. After changing any `src/messaging/*.js`, update `src/content-entry.js` handler in the same PR.

Current canonical messages (popup → content):
- `applyThemeCSS { css }` / `previewThemeCSS { css }` / `restoreTheme` / `resetTheme`
- `applyFont { font }`
- `applyCover { courseId, imageUrl, position }` / `removeCover { courseId }`
- `enableAll` / `disableAll`

Content must `sendResponse({ success: true })` and `return true`.

## 5. Security

- All user strings rendered in popup → `escapeHtml()` from `sanitization.js`.
- URLs → allow only `http:`, `https:`, `data:`; reject `javascript:`.
- Limits: fonts 512KB (`MAX_FONT_SIZE`), images 2MB (`MAX_IMAGE_SIZE`).
- Font names → alphanumeric + spaces only.

## 6. Verification (Run Before Every Commit)

```bash
npm run build          # rollup must succeed; check content.js updated
npm run lint           # eslint + web-ext lint — zero errors
# Manual:
# 1. chrome://extensions → Load unpacked → select this folder
# 2. Open elearning.qu.edu.qa → toggle Default/Custom, hover preset, save/load theme, set cover
# 3. Check console for [BbAtelier] errors
```

## 7. File Map

```
manifest.json              # MV3 manifest (permissions, host_permissions, CSP)
popup.html / style.css     # Popup shell (420px, 3 tabs)
src/content-entry.js       # Content script source (dual-engine stub)
src/popup/{popup,tabs,theme,savedThemes,courseCovers,settings}.js
src/theme/{presets,palette,cssBuilder,colorUtils}.js
src/messaging/themeMessaging.js
src/utils/{constants,sanitization,ui}.js
Fonts/ / icons/            # Static assets (do not edit without design review)
```

## 8. What Not To Do

- Don't add Tier 2 CSS for something that already uses `var()` — fix the variable.
- Don't duplicate `sendToTab()` — import from `messaging/themeMessaging.js`.
- Don't bump `manifest.json` version without updating `package.json`.
- Don't commit `node_modules/`, `content.js.map` is allowed (sourcemap for debugging).
