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
`);

  return lines.join('\n');
}