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
import { buildCourseColorCss } from './courseColors.js';
import { buildCourseChromeCss } from './courseChromeCss.js';
import { buildLoginCss } from './loginCss.js';
import { buildGradesCss } from './gradesCss.js';
import { buildPanelsCss } from './panelsCss.js';
import { buildControlsCss } from './controlsCss.js';

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
  lines.push(`/* ─── Derived text tiers ───
   Secondary text steps toward the page background, never toward white or
   black: on a light page it stays dark, on a dark page it stays light, and
   both tiers keep at least ~4.5:1 contrast for any readable --page-text-1. */
:root, .mode-light, .mode-dark {
  --page-text-2: color-mix(in srgb, var(--page-text-1) 80%, var(--page-bg));
  --page-text-3: color-mix(in srgb, var(--page-text-1) 64%, var(--page-bg));
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
  /* Same hairline as the main/To Do divider, not a full-strength text line. */
  body:not(.is-in-mobile-app) .base-header {
    border-bottom: 1px solid var(--page-border);
  }
}

.base-recent-activity .activity-stream .activity-group .stream-item .element-details .context a {
  color: var(--page-text-1);
}

.element-card .element-details .name a {
  color: var(--page-text-1);
}
/* SUPERSEDES earlier broad rule: .stream-item .js-title-link, [class*="stream-item"] .js-title-link */

/* Activity stream "Filter" label sits on the field's top outline. Rather than paint a
   patch (which never matches the surface behind it), open MUI's outline notch to the
   label's width and let whatever is behind the label show through. */
#streams-filter-label,
#streams-filter-label::before {
  color: var(--page-text-1);
  background: transparent !important;
}
#streams-filter-combobox ~ .MuiOutlinedInput-notchedOutline > legend {
  max-width: 100% !important;
  background: transparent !important;
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

/* Secondary buttons (e.g. "View my grade"): a soft fill one step from the
   page, readable text, hairline border — never a text colour as the fill. */
.button--secondary {
  background-color: color-mix(in srgb, var(--page-bg), var(--page-text-1) 9%);
  color: var(--page-text-1);
  border: 1px solid var(--page-border);
}
.button--secondary:hover,
.button--secondary:focus-visible {
  background-color: color-mix(in srgb, var(--page-bg), var(--page-text-1) 16%);
  color: var(--page-text-1);
}

/* Activity stream timeline (line + start circle): a quiet guide in the page's own hue,
   so the icons and dates stay the focus. */
.base-recent-activity .activity-stream .activity-group .stream-item-container:after,
.base-recent-activity .activity-stream .activity-group:before {
  background-color: color-mix(in srgb, var(--page-border), var(--page-text-2) 25%);
}

.base-recent-activity .activity-stream .activity-group:after {
  background-color: var(--page-bg);
  border: 2px solid color-mix(in srgb, var(--page-border), var(--page-text-2) 25%);
}

/* PAGE TEXT/ICON COLOR 3 (lighten 70%) */
/* Activity stream hover band: a quiet shadow of the page, not grey text. */
.base-recent-activity .activity-stream .activity-group .stream-item:before {
  background-color: var(--page-bg-hover);
}

/* ACCENT (panel X buttons follow their container instead: see panelsCss.js) */
.color-selection-live-mode .active.base-navigation-button-content,
.color-selection-live-mode .active .integration-navigation-button-content {
  background-color: var(--accent-surface) !important;
}


/* SIDEBAR (Tier 2: stable hooks — the <base-side-menu> element, MUI's
   .MuiDrawer-paper and Blackboard's .themed-logo-* class. The drawer's own
   colours live in hashed JSS rules, so these selectors out-rank them by
   specificity rather than by guessing class names.) */
base-side-menu .MuiDrawer-paper,
base-side-menu .themed-logo-background-primary-fill {
  background-color: var(--navbar-bg);
  border-color: var(--navbar-bg-darker);
}
/* Sidebar items: literal #e5e5e5 in a hashed rule assumes a dark drawer. */
base-side-menu .MuiDrawer-paper :is(a, button, p, span, h2, h3, li) {
  color: var(--navbar-text);
}
base-side-menu .MuiDrawer-paper .themed-background-primary-alt-fill-only {
  color: var(--navbar-text-muted);
}
/* Active item sits on the accent fill, which always keeps white text legible. */
base-side-menu .MuiDrawer-paper .active,
base-side-menu .MuiDrawer-paper .active :is(span, p, svg) {
  color: #ffffff;
}
base-side-menu .MuiDrawer-paper a.active.base-navigation-button-content {
  background-color: var(--accent-surface) !important;
}
/* Hover: one step darker (or lighter, on a dark sidebar) than the sidebar. */
base-side-menu .MuiDrawer-paper a.base-navigation-button-content:not(.active):is(:hover, :focus-visible) {
  background-color: var(--navbar-hover) !important;
  color: var(--navbar-text);
}
/* Divider under the profile row: literal near-black in a hashed rule; match
   the line under the logo (--navbar-bg-darker). */
base-side-menu .MuiDrawer-paper a.MuiListItemButton-root {
  border-bottom-color: var(--navbar-bg-darker);
}
/* Institution logo artwork is white; darken it when the sidebar is light. */
base-side-menu .themed-logo-background-primary-fill img {
  filter: var(--logo-filter);
}

/* PAGE HELP "?" button (Fluent UI inside <bb-ui-pagehelp>): its colour comes
   from a CDN rule, so state hooks are aria-expanded / .is-expanded. */
bb-ui-pagehelp .js-page-help .ms-Button.ms-Button--icon {
  color: var(--page-text-2) !important;
}
bb-ui-pagehelp .js-page-help .ms-Button.ms-Button--icon:is(:hover, :focus-visible) {
  color: var(--page-text-1) !important;
}
bb-ui-pagehelp .js-page-help .ms-Button.ms-Button--icon:is([aria-expanded='true'], .is-expanded) {
  color: var(--accent-on-page) !important;
}

/* INSTITUTION PAGE banner: the title sits on the hero photo — keep it the
   site's own white. The logo's dark disc is baked into the uploaded image,
   so content/logoTint.js adds a knockout layer; here the disc takes the
   sidebar colour and the crest the sidebar text colour. */
.banner .banner__title,
.banner .banner__title-text {
  color: #ffffff !important;
}
.banner__logo:has(> .bb-logo-knockout) {
  position: relative;
  background-image: none !important;
  background-color: var(--navbar-bg) !important;
}
.bb-logo-ink {
  flood-color: var(--navbar-text);
}
.bb-logo-knockout {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  filter: url(#bb-logo-knockout-filter);
  pointer-events: none;
}

/* TOOLTIPS — legacy Angular (.enhanced-tooltip + pip), MUI and Fluent UI.
   One quiet surface everywhere: the sidebar colour, its text, a hairline. */
.enhanced-tooltip,
.MuiTooltip-tooltip,
.ms-Tooltip .ms-Callout-main,
.ms-Tooltip .ms-Callout-beak {
  background-color: var(--navbar-bg) !important;
  color: var(--navbar-text) !important;
  border-color: var(--page-border) !important;
}
.enhanced-tooltip-pip {
  background-color: var(--navbar-bg) !important;
  border-color: var(--page-border) !important;
}
.MuiTooltip-arrow {
  color: var(--navbar-bg) !important;
}
.enhanced-tooltip,
.MuiTooltip-tooltip,
.ms-Tooltip .ms-Callout {
  box-shadow: 0 4px 14px color-mix(in srgb, var(--page-text-1) 14%, transparent) !important;
}

/* ACTIVITY STREAM item icon: its box turns near-white on hover; keep it clear. */
.stream-panel-activity-icon,
.stream-item:hover .stream-panel-activity-icon,
.stream-item-container:hover .stream-panel-activity-icon {
  background-color: transparent !important;
}

/* ACTIVITY STREAM icon interiors: silhouettes added by content/streamIcons.js hide the
   timeline line inside each outline without filling the square box around it. */
.stream-panel-activity-icon .bb-icon-fill {
  fill: var(--page-bg) !important;
  stroke: none !important;
}

/* GRADES page: course-activity chart icon is a black-filled legacy SVG. */
.grade-progress-chart-link .svg-icon {
  fill: var(--page-text-2);
}
.grade-progress-chart-link:is(:hover, :focus-visible) .svg-icon {
  fill: var(--accent-on-page);
}
/* "Your instructor will allow access…" hatch: white stripes → page tones. */
.base-grades-empty-element {
  background-image: linear-gradient(
    45deg,
    var(--page-border) 1px,
    var(--page-bg) 0,
    var(--page-bg) calc(50% - 1px),
    var(--page-border) 0,
    var(--page-border) calc(50% + 1px),
    var(--page-bg) 0,
    var(--page-bg) calc(100% - 1px),
    var(--page-border) 0
  ) !important;
}

/* CALENDAR due dates: the white frame around each due item is the page. */
.element-card-container.deadline-course {
  background-color: var(--page-bg);
  border-color: var(--page-border);
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

  // Page-specific Tier 2 modules, each documented in its own file.
  const tier2 = [buildCourseColorCss, buildCourseChromeCss, buildLoginCss, buildGradesCss];
  lines.push(...[...tier2, buildPanelsCss, buildControlsCss].map((build) => build()));
  return purgeDarkReaderCss(lines.join('\n'));
}
