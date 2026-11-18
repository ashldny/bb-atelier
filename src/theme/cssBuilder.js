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
//  NEVER target hashed classes (.muiltr-xxxx, .makeStyles*-0-2-N, .css-N,
//  .name_abc123): they are regenerated per release and per page load, so a
//  rule written today silently hits a different element tomorrow. Literal
//  colours in those rules are handled automatically by Tier 3
//  (theme/colorRemap.js + content/ruleRemapper.js).
//  4. Before writing the selector, check specificity & state:
//     :hover, :focus, .active, .Mui-selected — if present, your
//     override needs to match that state or explicitly exclude it.
//
//  GLOBAL RULE: Never generate or reference Dark Reader variables.
//  All theme-derived colors must resolve through the canonical token table:
//    --page-bg, --page-bg-lighter, --page-bg-darker,
//    --page-text-1, --page-text-2, --page-text-3,
//    --navbar-bg, --navbar-bg-darker, --navbar-text,
//    --accent, --accent-text
//  (плюс legacy --palette-* aliases for backward compat, never Dark Reader variables)

import { purgeDarkReaderCss } from '../utils/cssSanitizer.js';

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
  // Canonical tokens --page-bg / --navbar-bg / --accent etc. are injected alongside --palette-*.

  lines.push(':root, .mode-light {');
  lines.push(
    '  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;'
  );
  for (const [key, val] of Object.entries(overrides)) {
    lines.push(`  ${key}: ${val};`);
  }
  lines.push(staticVars);
  lines.push('}');

  lines.push('.mode-dark {');
  lines.push(
    '  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;'
  );
  for (const [key, val] of Object.entries(darkOverrides)) {
    lines.push(`  ${key}: ${val};`);
  }
  lines.push(staticVars);
  lines.push('}');

  // ─── Derived text tiers (mode-scoped) ───
  // --page-text-1 is the anchor (user-chosen or preset-specified).
  // Light mode: tiers lighten toward white. Dark mode: tiers darken toward black.
  // Same anchor, same percentages, opposite direction — CSS recomputes on mode class change.
  lines.push(`/* ─── Derived text tiers (mode-scoped) ─── */
:root, .mode-light {
  --page-text-2: color-mix(in srgb, var(--page-text-1) 80%, white 20%);
  --page-text-3: color-mix(in srgb, var(--page-text-1) 30%, white 70%);
}
.mode-dark {
  --page-text-2: color-mix(in srgb, var(--page-text-1) 30%, black 70%);
  --page-text-3: color-mix(in srgb, var(--page-text-1) 80%, black 20%);
}`);

  // ─── Tier 2: Canonical Selectors (spec) ───
  // Every color value MUST be a var(--token) from the canonical token table.
  // No hardcoded hex/rgb/hsl. No Dark Reader references. No duplicates.
  lines.push(`
/* ─── Tier 2: Canonical Selectors (spec) ─── */

/* PAGE BACKGROUND */
.base-header {
  background-color: var(--page-bg);
}

/* PAGE TEXT/ICON COLOR 1 (darkest) */
@media only screen and (min-width: 64em) {
  body:not(.is-in-mobile-app) .base-header .page-title {
    color: var(--page-text-1);
  }
  body:not(.is-in-mobile-app) .base-header {
    border-bottom: 1px solid var(--page-text-1);
  }
}

.base-recent-activity .activity-stream .activity-group .stream-item .element-details .context a {
  color: var(--page-text-1);
}

.element-card .element-details .name a {
  color: var(--page-text-1);
}
/* SUPERSEDES earlier broad rule: .stream-item .js-title-link, [class*="stream-item"] .js-title-link */

#streams-filter-label {
  color: var(--page-text-1);
  background-color: var(--page-bg);
}

.MuiInputLabel-shrink::before {
  background: var(--page-bg);
}


/* PAGE TEXT/ICON COLOR 2 (lighten 20%) */
.base-recent-activity .activity-stream .activity-group .activity-group-title {
  color: var(--page-text-2);
}

.base-recent-activity .activity-stream .activity-group span.heading-date {
  color: var(--page-text-2);
}

.base-recent-activity .activity-stream .activity-group .stream-item .element-details .content {
  color: var(--page-text-2);
}

.element-card .element-details .author,
.element-card .element-details .time {
  color: var(--page-text-2);
}

@media only screen and (min-width: 40em) {
  .base-recent-activity .activity-stream .activity-group .stream-item .timestamp {
    color: var(--page-text-2);
  }
}

.button--secondary {
  background-color: var(--page-text-2);
  color: var(--page-text-1);
}

.base-recent-activity .activity-stream .activity-group .stream-item-container:after,
.base-recent-activity .activity-stream .activity-group:before {
  background-color: var(--page-text-2);
}
/* Value changed from Color1 in earlier spec to Color2 here — this replaces the old assignment */

.base-recent-activity .activity-stream .activity-group:after {
  background-color: var(--page-bg);
  border: 2px solid var(--page-text-2);
}
/* Value changed from Color1 in earlier spec to Color2 here — this replaces the old assignment */

/* PAGE TEXT/ICON COLOR 3 (lighten 70%) */
.base-recent-activity .activity-stream .activity-group .stream-item:before {
  background-color: color-mix(in srgb, var(--page-text-3) 85%, transparent);
}

/* ACCENT */
.color-selection-live-mode.color-selection-preview-bb-close .bb-close,
.color-selection-live-mode .active.base-navigation-button-content,
.color-selection-live-mode .active .integration-navigation-button-content {
  background-color: var(--accent) !important;
}


/* CALENDAR (Tier 2: literal colours in the cross-origin CDN stylesheet,
   which Tier 3 cannot read; these class names are stable, not hashed) */
/* Schedule/Due Dates and Day/Month switches: inactive half is literal #fff
   while its text is themed light, making it unreadable. .active-switch is
   the selected state and keeps the site's own styling. */
.button.small:is(.left-button, .right-button):not(.active-switch):not(.today-toggle) {
  background-color: var(--page-bg-lighter);
  color: var(--page-text-1);
}
/* FullCalendar grid surface and hairlines */
.fc-bg {
  background-color: var(--page-bg);
}
.fc-unthemed td,
.fc-unthemed th,
.fc-widget-content,
.fc-widget-header,
.fc-bg {
  border-color: var(--palette-divider);
}

/* CARRIED FORWARD FROM EARLIER ROUNDS, NOT ADDRESSED IN THIS DOC */
#streams-filter .MuiInputBase-root,
#streams-filter .MuiOutlinedInput-root {
  background-color: var(--page-bg-lighter) !important;
}

.stream-item:hover .js-title-link,
[class*="stream-item"]:hover .js-title-link {
  color: var(--page-text-2) !important;
}

/* .element-card, .stream-panel-activity-card
   -> background-color property intentionally omitted (removed entirely) */

/* .stream-item, .stream-item.angular-animate
   -> background-color property intentionally omitted (removed entirely)
   fallback only if selector can't be removed: background-color: var(--page-bg) !important; */
`);

  const raw = lines.join('\n');
  return purgeDarkReaderCss(raw);
}