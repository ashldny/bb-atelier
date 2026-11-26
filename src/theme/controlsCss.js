// ═════════════════════════════════════════════════════════
//  Bb Atelier — Form focus, favourites & loading spinners (Tier 2)
//
//  Read from the live Courses page:
//    • Focused MUI outlined fields (Terms / Filters): Tier 3 already turns the
//      border into the accent, but a CDN rule adds a 1px inset box-shadow in
//      Blackboard blue (#2f8df7), so the ring shows two colours.
//    • Sprite icons in Ultra purple: the starred star (icon-small-star-press) and the
//      feedback mark (icon-small-feedback-c) carry fill/stroke="#c56fd5" / "#a234b5"
//      written into the SVG sprite. <use> clones are styled through the symbol's own
//      elements, and CSS outranks presentation attributes.
//    • "Messages off" pill on Messages (.send-message-button-wrapper.messages-off): a CDN
//      #efefef fill under inherited light page text in dark themes.
//    • Scrollbars: Blackboard leaves every scroller on the browser's light default.
//      scrollbar-color is inherited, so the page sets it once; the sidebar and
//      header bars override it with navbar colours.
//  Hooks: .MuiOutlinedInput-root.Mui-focused, symbol + colour attributes,
//  .messages-off (no hashed classes).
// ═════════════════════════════════════════════════════════

export function buildControlsCss() {
  return `
/* Focused outlined fields: one accent ring. */
.MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
  border-color: var(--accent-on-page) !important;
  box-shadow: inset 0 0 0 1px var(--accent-on-page) !important;
}
.MuiInputLabel-root.Mui-focused {
  color: var(--accent-on-page) !important;
}

/* LOADING SPINNERS (all three kinds Ultra uses), in the accent:
   • bb-ui circular progress: arc stroke (#a234b5) from a hashed CDN rule Tier 3 cannot
     read. React pages render it with or without the <bb-ui-circular-progress> wrapper;
     its div[role=status] > svg[viewBox="-10 -10 220 220"] shape is stable either way.
   • MUI's own CircularProgress.
   • Angular .spinner (Calendar, Due list): a ring drawn by ::after borders in #c56fd5,
     two sides solid and two at half strength. */
bb-ui-circular-progress svg path,
[role="status"] > svg[viewBox="-10 -10 220 220"] path,
.MuiCircularProgress-circle {
  stroke: var(--accent-on-page) !important;
}
.spinner::after {
  border-color: var(--accent-on-page) var(--accent-on-page)
    color-mix(in srgb, var(--accent-on-page) 50%, transparent)
    color-mix(in srgb, var(--accent-on-page) 50%, transparent) !important;
}
.MuiCircularProgress-root {
  color: var(--accent-on-page) !important;
}

/* "Messages off" status pill: a quiet surface with secondary text, legible in every mode. */
.send-message-button-wrapper.messages-off {
  background-color: var(--page-bg-lighter) !important;
  border: 1px solid var(--page-border) !important;
  color: var(--page-text-2) !important;
}
.send-message-button-wrapper.messages-off :is(bb-translate, span, svg) {
  color: var(--page-text-2) !important;
}

/* Scrollbars: a soft thumb on the surface it scrolls. The track is transparent so
   panels, cards and menus show their own background behind it. */
:root {
  --bb-scroll-thumb: color-mix(in srgb, var(--page-text-1) 30%, var(--page-bg));
  scrollbar-color: var(--bb-scroll-thumb) var(--page-bg);
}
body,
body * {
  scrollbar-color: var(--bb-scroll-thumb) transparent;
}
base-side-menu,
base-side-menu *,
content-page-header,
content-page-header * {
  scrollbar-color: color-mix(in srgb, var(--navbar-text) 30%, var(--navbar-bg)) transparent;
}

/* Sprite icons drawn in Ultra purple (starred courses, feedback mark): the accent. */
symbol :is([fill="#c56fd5" i], [fill="#a234b5" i]) {
  fill: var(--accent-on-page) !important;
}
symbol :is([stroke="#c56fd5" i], [stroke="#a234b5" i]) {
  stroke: var(--accent-on-page) !important;
}
`;
}
