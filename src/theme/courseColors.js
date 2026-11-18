// ═════════════════════════════════════════════════════════
//  Bb Atelier — Course colour indicators
//
//  Blackboard tags every course with one of its fixed course colours
//  (`.course-color-1` … `.course-color-10`, plus grey `.course-color-classic`)
//  and paints them as stripes: the course-card and grades-tile bar
//  (`.element-card::before`), the activity-stream bar (`.element-details`
//  left border) and the calendar due-item outline. The values live in a
//  cross-origin CDN stylesheet, so they are recorded here (read from the
//  live site) and blended toward the user's accent. Each course keeps its
//  own recognisable hue, but the set now leans into the theme.
// ═════════════════════════════════════════════════════════

import { mix } from './colorUtils.js';

/** Blackboard Ultra's course colours, keyed by class suffix. */
export const BLACKBOARD_COURSE_COLORS = {
  classic: '#666666',
  1: '#c473d4',
  2: '#2fd9fc',
  3: '#ffe12b',
  4: '#ff6417',
  5: '#89f3db',
  6: '#fe5b91',
  7: '#85f472',
  8: '#22c7cc',
  9: '#ca22ad',
  10: '#157afb',
};

/** How far each course colour moves toward the accent (0 = untouched). */
export const COURSE_TINT = 0.4;

/**
 * Accent-tinted course colour tokens.
 * @param {string} accent
 * @returns {Record<string, string>} e.g. { '--course-color-2': '#…' }
 */
export function courseColorTokens(accent) {
  return Object.fromEntries(
    Object.entries(BLACKBOARD_COURSE_COLORS).map(([key, color]) => [
      `--course-color-${key}`,
      mix(color, accent, COURSE_TINT),
    ])
  );
}

/**
 * Tier 2 rules that repaint each course-colour stripe with its token.
 * Selectors are Blackboard's stable component classes, one per stripe type.
 * !important: the CDN rules are more specific (e.g. the activity-stream bar),
 * and these declarations are purely decorative stripe colours.
 * @returns {string}
 */
export function buildCourseColorCss() {
  return Object.keys(BLACKBOARD_COURSE_COLORS)
    .map((key) => {
      const cls = `.course-color-${key}`;
      const token = `var(--course-color-${key})`;
      return [
        `.element-card${cls}::before { background-color: ${token} !important; }`,
        `.element-details${cls} { border-left-color: ${token} !important; }`,
        `.element-card.due-item${cls} { border-color: ${token} !important; }`,
      ].join('\n');
    })
    .join('\n');
}
