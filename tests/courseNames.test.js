import test from 'node:test';
import assert from 'node:assert/strict';
import { shortCourseName, shortCourseNames } from '../src/utils/covers.js';

test('course names drop the bracketed code and the section', () => {
  assert.equal(
    shortCourseName('(Fall_2026_CMAI480_16504_L52) Computer Vision L52'),
    'Computer Vision'
  );
  assert.equal(shortCourseName('Senior Project I L69'), 'Senior Project I');
  assert.equal(shortCourseName('Intro. to Proj. Manag. & Entr.'), 'Intro. to Proj. Manag. & Entr.');
  assert.equal(shortCourseName('(ONLY_A_CODE)'), '(ONLY_A_CODE)');
});

test('two sections of one course stay distinguishable', () => {
  const names = shortCourseNames([
    { name: '(Spring_2026_CMPS405_21722_L51) Operating Systems L51' },
    { name: '(Spring_2026_CMPS405_22146_B53) Operating Systems B53' },
    { name: '(Fall_2026_PHIL110_11693_L52) Introduction to Philosophy L52' },
  ]);
  assert.deepEqual(names, [
    'Operating Systems L51',
    'Operating Systems B53',
    'Introduction to Philosophy',
  ]);
});
