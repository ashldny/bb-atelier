// ═════════════════════════════════════════════════════════
//  Bb Atelier — Content headers, side panels & instructor text (Tier 2)
//
//  Read from the live site (assignment overview, submission view, Grade and
//  Feedback panel). These surfaces either take their colour from cross-origin
//  CDN rules Tier 3 cannot read, or from hashed rules Tier 3 remaps the wrong
//  way (#262626 bars read as "dark emphasis" and become the accent).
//
//  Hooks (no hashed classes):
//    • content-page-header header — assignment/test bar with breadcrumbs + Exit
//    • button[data-analytics-id$=".header.exit"] — that bar's X
//    • header.black-panel-header — submission panel title bar (CDN black title)
//    • .bb-offcanvas-panel .bb-close — side panel X ("×" glyph; CDN text-stroke + fill)
//    • .bb-offcanvas-panel.peek .bb-close — peek panel X tab (brand fill)
//    • .submission-card .panel — "Your Grade" box in Grade and Feedback (CDN #f5f5f5)
//    • .ql-editor.bb-editor, .vtbegenerated — instructor-written rich text
//  !important: the CDN and hashed CSS-in-JS rules (and their Tier 3 mirrors)
//  win otherwise.
// ═════════════════════════════════════════════════════════

const CONTENT_HEADER = 'content-page-header header';
const PANEL_HEADER = 'header.black-panel-header';
const EXIT = 'button[data-analytics-id$=".header.exit"]';
const PANEL_X = '.bb-offcanvas-panel > .bb-offcanvas-panel-wrap > .bb-close-offset > .bb-close';
const PEEK_X = '.bb-offcanvas-panel.peek > .bb-offcanvas-panel-wrap > .bb-close-offset > .bb-close';
const RICH_TEXT = ':is(.ql-editor.bb-editor, .vtbegenerated)';

// Near-black inline colours that instructors paste in from Word or Docs. Matched
// exactly (with or without spaces/semicolon) so "#000" never catches "#0000ff".
const DARK_INLINE = [
  'color: rgb(0, 0, 0)',
  'color:rgb(0,0,0)',
  'color: #000000',
  'color:#000000',
  'color: #000;',
  'color:#000;',
  'color: black',
  'color:black',
  'windowtext',
  'color: rgb(33, 33, 33)',
  'color: #212121',
  'color: rgb(34, 34, 34)',
  'color: #222222',
  'color: rgb(38, 38, 38)',
  'color: #262626',
  'color: rgb(51, 51, 51)',
  'color: #333333',
];
const DARK_INLINE_ENDINGS = ['color: #000', 'color:#000', 'color: #333', 'color:#333'];

function darkInlineSelector() {
  const contains = DARK_INLINE.map((value) => `[style*="${value}" i]`);
  const endings = DARK_INLINE_ENDINGS.map((value) => `[style$="${value}" i]`);
  return `${RICH_TEXT} :is(${[...contains, ...endings].join(', ')})`;
}

export function buildPanelsCss() {
  return `
/* Assignment/test header bar and submission title bar: the navbar's colours,
   with its own text colour on every title, crumb and icon inside. */
${CONTENT_HEADER},
${PANEL_HEADER} {
  background-color: var(--navbar-bg) !important;
  border-bottom-color: var(--navbar-bg-darker) !important;
  color: var(--navbar-text) !important;
}
${CONTENT_HEADER} :is(h1, h2, h3, p, span, a, li, nav, ol, button),
${PANEL_HEADER} :is(h1, h2, h3, p, span, a, button) {
  color: var(--navbar-text) !important;
}

/* The header bar's Exit X: part of the bar, a darker step on hover/focus. */
${CONTENT_HEADER} ${EXIT} {
  background: transparent !important;
  color: var(--navbar-text) !important;
}
${CONTENT_HEADER} ${EXIT}:is(:hover, :focus-visible) {
  background: var(--navbar-bg-darker) !important;
}

/* Side panel X (a "×" text glyph): Blackboard outlines it with a maroon
   -webkit-text-stroke and forces a white fill, which reads as a pink fringe in dark
   themes and vanishes in light ones. Plain glyph in the container's text colour. */
${PANEL_X} {
  color: var(--page-text-1) !important;
  -webkit-text-fill-color: currentColor !important;
  -webkit-text-stroke: 0 transparent !important;
  background-color: transparent !important;
}
.bb-offcanvas-panel-wrap:has(${PANEL_HEADER}, ${CONTENT_HEADER}) > .bb-close-offset > .bb-close {
  color: var(--navbar-text) !important;
}
/* Peek panels hang their X as a tab off the panel's left edge: a rounded tab in the
   panel's own surface, joined to it (no hairline, no folded-ribbon tail). */
${PEEK_X} {
  background-color: var(--page-bg) !important;
  border: 0 !important;
  border-radius: 10px 0 0 10px !important;
  box-shadow: -4px 0 12px rgb(0 0 0 / 0.18) !important;
}
${PEEK_X}:is(:hover, :focus-visible) {
  background-color: var(--page-bg-hover) !important;
}
${PEEK_X}::after {
  display: none !important;
}

/* Grade and Feedback: the "Your Grade" box sits on the panel, not on white. */
.submission-card .panel {
  background-color: var(--page-bg-lighter) !important;
  border-color: var(--page-border) !important;
  color: var(--page-text-1) !important;
}
.submission-card .panel.clickable-panel:is(:hover, :focus-within) {
  background-color: var(--page-bg-hover) !important;
}
.submission-card .panel .name,
.submission-card .panel .name * {
  color: var(--page-text-2) !important;
}

/* Instructions and descriptions: pasted near-black text follows the theme's text
   colour. Deliberate colours (red warnings, links, highlights) are left alone. */
${darkInlineSelector()} {
  color: var(--page-text-1) !important;
}
`;
}
