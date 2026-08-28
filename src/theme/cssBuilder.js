// ═════════════════════════════════════════════════════════
//  Bb Atelier — Full Theme CSS Builder
//  Generates the complete CSS string from palette overrides
// ═════════════════════════════════════════════════════════
//
//  HOW TO KNOW IF YOU NEED A TIER 2 OVERRIDE:
//  1. Right-click → Inspect the element
//  2. Find the winning rule in Styles pane
//  3. Look at the property value:
//     - `var(--palette-something)` → DON'T add a rule here!
//       Fix the variable in your `overrides` object instead.
//     - A literal hex/rgb with no `var()` → NOW it's a real gap.
//       Add it below with a comment noting which element it's for.
//  4. Before writing the selector, check specificity & state:
//     :hover, :focus, .active, .Mui-selected — if present, your
//     override needs to match that state or explicitly exclude it.

/**
 * Build the complete theme CSS string from palette overrides
 *
 * @param {object} overrides     - Light-mode CSS variable overrides
 * @param {object} darkOverrides - Dark-mode CSS variable overrides
 * @param {string} staticVars    - Static CSS variable string (grade colors, greys, etc.)
 * @returns {string} Complete CSS to inject
 */
export function buildFullThemeCss(overrides, darkOverrides, staticVars) {
  const lines = [];

  // ─── Tier 1: CSS variable overrides ───
  // The site reads almost everything from var(--palette-*, fallback),
  // so setting these at :root is the most powerful lever we have.

  lines.push(':root, .mode-light {');
  for (const [key, val] of Object.entries(overrides)) {
    lines.push(`  ${key}: ${val};`);
  }
  lines.push(staticVars);
  lines.push('}');

  lines.push('.mode-dark {');
  for (const [key, val] of Object.entries(darkOverrides)) {
    lines.push(`  ${key}: ${val};`);
  }
  lines.push(staticVars);
  lines.push('}');

  // ─── Tier 2: Only components with NO variable wiring ───
  // Confirmed hardcoded hex in source — no var() references at all.
  // Everything else (MUI, stream, header icons, etc.) uses var() and
  // updates automatically when Tier 1 variables are correct.
  lines.push(`
/* ─── Tier 2: Legacy Foundation overrides (no var() wiring in source) ─── */

/* Buttons */
.button.primary,
.button.hollow.primary {
  background-color: var(--palette-brand-main) !important;
  border-color: var(--palette-brand-dark) !important;
}
.button.secondary {
  background-color: var(--palette-secondary-main) !important;
}
.button.success {
  background-color: var(--palette-success-main) !important;
}
.button.warning {
  background-color: var(--palette-warning-main) !important;
}
.button.alert {
  background-color: var(--palette-error-main) !important;
}
.button.hollow {
  color: var(--palette-brand-main) !important;
  border-color: var(--palette-brand-main) !important;
}
.button.hollow:hover,
.button.hollow:focus {
  background-color: var(--palette-brand-main) !important;
  color: var(--palette-brand-contrastText) !important;
}

/* Alert boxes */
.alert-box {
  background-color: var(--palette-brand-main) !important;
  color: var(--palette-brand-contrastText) !important;
}
.alert-box.success {
  background-color: var(--palette-success-main) !important;
}
.alert-box.warning {
  background-color: var(--palette-warning-main) !important;
}
.alert-box.alert {
  background-color: var(--palette-error-main) !important;
}
.alert-box.info {
  background-color: var(--palette-info-main) !important;
}
.alert-box.secondary {
  background-color: var(--palette-secondary-main) !important;
}

/* Labels */
.label {
  background-color: var(--palette-brand-main) !important;
}
.label.success {
  background-color: var(--palette-success-main) !important;
}
.label.warning {
  background-color: var(--palette-warning-main) !important;
}
.label.alert {
  background-color: var(--palette-error-main) !important;
}
.label.info {
  background-color: var(--palette-info-main) !important;
}
.label.secondary {
  background-color: var(--palette-secondary-main) !important;
}

/* Spinners */
.spinner.bb-tertiary-color-primary,
.spinner.bb-tertiary-color-0 {
  border-color: var(--palette-brand-main) !important;
  border-top-color: transparent !important;
}
.spinner.bb-tertiary-color-success,
.spinner.bb-tertiary-color-1 {
  border-color: var(--palette-success-main) !important;
  border-top-color: transparent !important;
}
.spinner.bb-tertiary-color-warning,
.spinner.bb-tertiary-color-2 {
  border-color: var(--palette-warning-main) !important;
  border-top-color: transparent !important;
}
.spinner.bb-tertiary-color-alert,
.spinner.bb-tertiary-color-3 {
  border-color: var(--palette-error-main) !important;
  border-top-color: transparent !important;
}

/* MUI icons — real gap: some icon paths ship fill="none" for cutouts */
.MuiSvgIcon-root path:not([fill="none"]) {
  fill: currentColor !important;
}

/* ─── Header icons — hardcoded black on dark backgrounds ─── */
.base-header .svg-icon svg,
.base-header .svg-icon svg use,
.base-header bb-svg-icon svg,
.base-header bb-svg-icon svg use {
  fill: var(--palette-primary-contrastText, #ffffff) !important;
  stroke: var(--palette-primary-contrastText, #ffffff) !important;
}

/* Settings / gear icon in header */
.base-header-tools svg,
.base-header-tools svg use {
  fill: var(--palette-primary-contrastText, #ffffff) !important;
  stroke: var(--palette-primary-contrastText, #ffffff) !important;
}

/* Menu toggle hamburger icon */
.menu-toggle svg,
.menu-toggle svg path {
  fill: var(--palette-primary-contrastText, #ffffff) !important;
  stroke: var(--palette-primary-contrastText, #ffffff) !important;
}

/* General header interactive elements — ensure contrast */
.base-header a,
.base-header button {
  color: var(--palette-primary-contrastText, #ffffff) !important;
}

/* ─── Sidebar / navigation panel ─── */
.navigation-sidebar,
.bb-sidebar,
[class*="sidebar"] {
  background-color: var(--palette-background-b8, #1a1a1a) !important;
}

/* ─── Dropdown menus ─── */
.menu-content,
.dropdown-menu,
.bb-menu-content,
[class*="dropdown"] {
  background-color: var(--palette-background-paper, #ffffff) !important;
  color: var(--palette-text-primary, #262626) !important;
}

/* ─── Modal / dialog overlays ─── */
.modal-dialog,
.dialog-container,
.bb-modal,
[class*="modal"] {
  background-color: var(--palette-background-paper, #ffffff) !important;
  color: var(--palette-text-primary, #262626) !important;
}

/* ─── Course card hover states ─── */
.element-card:hover,
.course-card:hover,
[class*="course-element"]:hover {
  background-color: var(--palette-action-hover, rgba(0,0,0,0.04)) !important;
}

/* ─── Activity stream items (hover uses hashed classes) ─── */
.stream-item-container:hover,
.stream-item:hover,
[class*="stream-item"]:hover,
.item:hover,
[class^="item_"]:hover {
  background-color: var(--palette-action-hover, rgba(0,0,0,0.04)) !important;
}

/* Stream item title links */
.stream-item-container:hover .js-title-link,
.stream-item:hover .js-title-link,
[class*="stream-item"]:hover .js-title-link,
[class^="item_"]:hover a {
  color: var(--palette-link-hover) !important;
}

/* Stream item text colors — hardcoded rgb(38,38,38) */
.stream-item-container .js-title-link,
.stream-item .js-title-link,
[class*="stream-item"] .js-title-link {
  color: var(--palette-text-primary) !important;
}

/* ─── Tooltips ─── */
.tooltip,
.bb-tooltip,
[class*="tooltip"] {
  background-color: var(--palette-background-b10, #000000) !important;
  color: var(--palette-text-primary, #ffffff) !important;
}

/* ─── Generic list item hover (hardcoded backgrounds) ─── */
[class*="list-item"]:hover,
[class*="row"]:hover,
li:hover {
  background-color: var(--palette-action-hover, rgba(0,0,0,0.04)) !important;
}

/* ─── Input / select fields with hardcoded borders ─── */
input[type="text"],
input[type="email"],
input[type="number"],
input[type="search"],
input[type="url"],
input[type="password"],
textarea,
select {
  border-color: var(--palette-border-main, #cdcdcd) !important;
  background-color: var(--palette-background-paper, #ffffff) !important;
  color: var(--palette-text-primary, #262626) !important;
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--palette-focus-main, #a234b5) !important;
  outline-color: var(--palette-focus-main, #a234b5) !important;
}

/* ─── Scrollbar styling ─── */
::-webkit-scrollbar {
  background-color: var(--palette-background-b2, #f5f5f5) !important;
}
::-webkit-scrollbar-thumb {
  background-color: var(--palette-border-main, #cdcdcd) !important;
}

/* ─── Badge / notification count ─── */
.badge,
[class*="badge"],
[class*="count"] {
  background-color: var(--palette-brand-main, #a234b5) !important;
  color: var(--palette-brand-contrastText, #ffffff) !important;
}

/* ─── Progress bars ─── */
.progress,
[class*="progress-bar"] {
  background-color: var(--palette-background-b3, #e0e0e0) !important;
}
.progress-bar,
[class*="progress-fill"] {
  background-color: var(--palette-brand-main, #a234b5) !important;
}

/* ─── Tables ─── */
table {
  border-color: var(--palette-border-main, #cdcdcd) !important;
}
th {
  background-color: var(--palette-background-b2, #f5f5f5) !important;
  color: var(--palette-text-primary, #262626) !important;
}
td {
  border-color: var(--palette-divider, rgba(0,0,0,0.12)) !important;
  color: var(--palette-text-primary, #262626) !important;
}
tr:hover td {
  background-color: var(--palette-action-hover, rgba(0,0,0,0.04)) !important;
}
`);

  return lines.join('\n');
}