// ═════════════════════════════════════════════════════════
//  Bb Atelier — Course & organization chrome (Tier 2)
//
//  Inside a course or organization, Blackboard draws its header bar and tab
//  bar in #262626. Tier 3 reads that as a "dark emphasis fill" and turns it
//  into the accent, which floods the whole bar. These rules give the chrome
//  the navbar's own colours instead and leave the accent for what it marks:
//  the active-tab underline and notification badges (both brand colours,
//  already remapped to the accent by Tier 3).
//
//  Hooks (read from the live site; no hashed classes):
//    • .bb-course-navigation course-page-header header — top bar (courses + orgs)
//    • .bb-course-navigation [role="toolbar"] — tab bar (its aria-label is
//      "Course Navigation" or "Organization Navigation", so it is not used)
//    • a[data-analytics-id="course.header.home"] — home button
//    • .MuiDivider-vertical in the header — Courses ▾ | course-name divider
//    • [aria-labelledby^="course.header.course-switcher"] — "Your Courses" popover
//    • a.sender-container — message sender (greyed by Blackboard's .inactive)
//  !important: the hashed CSS-in-JS rules and their Tier 3 mirrors win otherwise.
// ═════════════════════════════════════════════════════════

const HEADER = '.bb-course-navigation course-page-header header';
const TOOLBAR = '.bb-course-navigation [role="toolbar"]';
const HOME = '.bb-course-navigation a[data-analytics-id="course.header.home"]';
const SWITCHER = '[aria-labelledby^="course.header.course-switcher"] .MuiPaper-root';

export function buildCourseChromeCss() {
  return `
/* Course/organization header and tab bar: the navbar's colours, not the accent. */
${HEADER},
${TOOLBAR} {
  background-color: var(--navbar-bg) !important;
  border-bottom-color: var(--navbar-bg-darker) !important;
  color: var(--navbar-text) !important;
}
${HEADER} :is(a, button):not(${HOME}),
${TOOLBAR} a[data-analytics-id^="course.l1."] {
  color: var(--navbar-text) !important;
}
${TOOLBAR} a[data-analytics-id^="course.l1."]:not([aria-current="page"]) {
  color: color-mix(in srgb, var(--navbar-text) 78%, var(--navbar-bg)) !important;
}
/* Home button blends into the bar; a darker step of the bar on hover/focus. */
${HOME} {
  background-color: var(--navbar-bg) !important;
  color: var(--navbar-text) !important;
}
/* Home, "Courses ▾" and the course name: a darker step of the bar on hover/focus. */
${HEADER} :is(a, button)[data-analytics-id^="course.header."]:is(:hover, :focus-visible) {
  background-color: var(--navbar-bg-darker) !important;
}

/* Main navbar: the active item's left marker stays light on its accent fill. */
base-side-menu a.base-navigation-button-content.active::before {
  border-left-color: #ffffff !important;
}
/* Divider between "Courses ▾" and the course name. */
${HEADER} .MuiDivider-vertical {
  background-color: var(--navbar-bg-darker) !important;
  border-color: var(--navbar-bg-darker) !important;
}

/* "Your Courses" switcher: the page's surfaces, hairlines and accent. */
${SWITCHER} {
  background-color: var(--page-bg) !important;
  color: var(--page-text-1) !important;
  border: 1px solid var(--page-border) !important;
}
/* Blackboard sets white text on wrapper divs, so colour every element, then step
   secondary text (course code, term, status) down a level. */
${SWITCHER} * {
  color: var(--page-text-1) !important;
  border-color: var(--page-border) !important;
}
${SWITCHER} .MuiTypography-body2 {
  color: var(--page-text-2) !important;
}
${SWITCHER} .MuiDivider-root {
  background-color: var(--page-border) !important;
}
${SWITCHER} .MuiInputBase-root,
${SWITCHER} .MuiInputBase-input {
  background-color: var(--page-bg-lighter) !important;
  color: var(--page-text-1) !important;
}
${SWITCHER} .MuiOutlinedInput-notchedOutline {
  border-color: var(--page-border) !important;
}
${SWITCHER} .Mui-focused .MuiOutlinedInput-notchedOutline,
${SWITCHER} .MuiInputBase-root:focus-within .MuiOutlinedInput-notchedOutline {
  border-color: var(--accent-on-page) !important;
}
${SWITCHER} .MuiInputLabel-root {
  color: var(--page-text-2) !important;
  background: linear-gradient(to bottom, var(--page-bg) 50%, var(--page-bg-lighter) 50%);
}
${SWITCHER} .MuiTab-root {
  color: var(--page-text-2) !important;
}
${SWITCHER} .MuiTab-root.Mui-selected {
  color: var(--page-text-1) !important;
}
${SWITCHER} .MuiTabs-indicator {
  background-color: var(--accent-on-page) !important;
}
${SWITCHER} .MuiListItem-root a:is(:hover, :focus-visible) {
  background-color: var(--page-bg-hover) !important;
}

/* Messages: the sender's name reads as the heading of each message. */
a.sender-container,
a.sender-container bb-ui-username {
  color: var(--page-text-1) !important;
}
`;
}
