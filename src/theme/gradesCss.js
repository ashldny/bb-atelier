// ═════════════════════════════════════════════════════════
//  Bb Atelier — Grades, gradebook & "How Am I Doing?" (Tier 2)
//
//  These surfaces carry colour that Tier 3 cannot reach:
//    • Highcharts draws the progress charts as SVG with presentation
//      attributes (fill="#FFFFFF", stroke="#c575d2") and inline text styles,
//      not stylesheet rules. CSS outranks presentation attributes; the inline
//      text styles need !important.
//    • Icons, zoom buttons and grade pills are coloured by cross-origin CDN rules.
//    • The unread-grade dot is an SVG with a color="#a234b5" attribute.
//
//  Hooks (stable component classes, ids, data-* and SVG attributes; no hashed
//  classes):
//    • a.grade-progress-chart-link — "How Am I Doing?" icon on each grades card
//    • .telemetry-chart-container .highcharts-container — progress charts
//    • .zoom-button-group — chart + / − zoom buttons
//    • .telemetry-panel .fs-table — chart table view
//    • .customGradePill — coloured score pills
//    • [data-analytics-id="course.gradebook.student.grade.studentTabs"] — gradebook tabs
// ═════════════════════════════════════════════════════════

const CHART = '.telemetry-chart-container .highcharts-container';
const ULTRA_PURPLE = '"#c575d2" i';

export function buildGradesCss() {
  return `
/* "How Am I Doing?" icon: CDN paints it black, which vanishes on dark pages. */
a.grade-progress-chart-link,
a.grade-progress-chart-link svg {
  color: var(--page-text-1) !important;
  fill: currentColor !important;
  stroke: currentColor !important;
}

/* Progress charts: page surfaces and ink; "you" in the accent, the class
   average in secondary ink, activity columns as a soft ink tint. */
${CHART} .highcharts-background,
${CHART} .highcharts-legend > rect {
  fill: var(--page-bg-lighter) !important;
}
${CHART} :is(.highcharts-grid, .highcharts-axis) path {
  stroke: var(--page-border) !important;
}
${CHART} text {
  fill: var(--page-text-2) !important;
  color: var(--page-text-2) !important;
}
${CHART} text.highcharts-yaxis-title {
  fill: var(--page-text-1) !important;
}
${CHART} [stroke=${ULTRA_PURPLE}] {
  stroke: var(--accent-on-page) !important;
}
${CHART} [fill=${ULTRA_PURPLE}] {
  fill: var(--accent-on-page) !important;
}
${CHART} [stroke="#666666" i] {
  stroke: var(--page-text-2) !important;
}
${CHART} [fill="#666666" i] {
  fill: var(--page-text-2) !important;
}
${CHART} [stroke^="rgba(190, 190, 190"] {
  stroke: color-mix(in srgb, var(--page-text-1) 18%, transparent) !important;
}
${CHART} .highcharts-tooltip > path {
  fill: var(--page-bg-lighter) !important;
}
${CHART} .highcharts-legend-item span,
${CHART} .highcharts-tooltip span {
  color: var(--page-text-1) !important;
}

/* Zoom + / − buttons: a raised surface with visible icons in every theme. */
.zoom-button-group {
  background-color: var(--page-bg-lighter) !important;
  border-color: var(--page-border) !important;
}
.zoom-button-group .button {
  background-color: var(--page-bg-lighter) !important;
  border-color: var(--page-border) !important;
  color: var(--page-text-1) !important;
}
.zoom-button-group .button:is(:hover, :focus-visible) {
  background-color: var(--page-bg-hover) !important;
}
.zoom-button-group .button svg {
  fill: currentColor !important;
}

/* Chart table view. */
.telemetry-panel .fs-table {
  background-color: var(--page-bg) !important;
  color: var(--page-text-1) !important;
}
.telemetry-panel .fs-table :is(th, td) {
  color: var(--page-text-1) !important;
  border-color: var(--page-border) !important;
}
.telemetry-panel .fs-table thead tr,
.telemetry-panel .fs-table tbody tr {
  background-color: var(--page-bg) !important;
}
.telemetry-panel .fs-table.table-striped tbody tr:nth-child(even) {
  background-color: var(--page-bg-lighter) !important;
}

/* Grade pills keep their status colour, so their score stays dark ink. */
.customGradePill,
.customGradePill * {
  color: #1c1c1c !important;
}

/* Gradebook tabs and the unread-grade dot use Ultra's purple: the accent. */
[data-analytics-id="course.gradebook.student.grade.studentTabs"] .MuiTabs-indicator {
  background-color: var(--accent-on-page) !important;
}
svg[color="#a234b5" i] {
  color: var(--accent-on-page) !important;
}
`;
}
