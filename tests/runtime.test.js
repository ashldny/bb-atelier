import test from 'node:test';
import assert from 'node:assert/strict';
import { createDom, createHub, waitFor, imageData } from './helpers.js';
import { convexHull } from '../src/content/streamIcons.js';

const card =
  '<article class="element-card"><span class="multi-column-course-id">CMPS360</span><h4 class="course-title">Data Visualization</h4><div class="course-banner" style="height:120px"><img src="original.jpg"></div></article>';
const initial = {
  masterEnabled: true,
  customMode: true,
  pageBg: '#1a1a1a',
  accent: '#670d2f',
  navbar: '#121212',
  pageText: '#e0e0e0',
};

test('startup restores theme, font and covers together; disabling preserves saved data', async (t) => {
  const hub = createHub(initial, {
    font: 'Noto Serif',
    courseCovers: { CMPS360: { imageUrl: imageData, position: '0% 100%' } },
  });
  const page = await createDom(hub, {
    html: `<!DOCTYPE html><html><head></head><body>${card}</body></html>`,
  });
  t.after(page.close);
  assert.ok(page.document.querySelector('#bb-custom-theme'));
  assert.ok(page.document.querySelector('#bb-font-style').textContent.includes('NotoSerif/'));
  assert.equal(page.document.querySelector('.course-banner').dataset.bbCover, 'CMPS360');
  const originalStyle = page.document.querySelector('.course-banner').getAttribute('style');
  await hub.storage.sync.set({ masterEnabled: false });
  await waitFor(() => !page.document.querySelector('#bb-custom-theme'));
  assert.equal(page.document.querySelector('#bb-font-style'), null);
  assert.equal(page.document.querySelector('[data-bb-cover]'), null);
  assert.equal(hub.values.local.courseCovers.CMPS360.position, '0% 100%');
  assert.equal(hub.values.local.font, 'Noto Serif');
  assert.equal(page.document.querySelector('.course-banner').getAttribute('style'), originalStyle);
  await hub.storage.sync.set({ masterEnabled: true });
  await waitFor(() => page.document.querySelector('[data-bb-cover]'));
  assert.ok(page.document.querySelector('#bb-font-style'));
  assert.deepEqual(page.errors, []);
});

test('SPA cards restore covers without polling, and removing a cover preserves the site style', async (t) => {
  const hub = createHub(initial, { courseCovers: { CMPS360: imageData } });
  const page = await createDom(hub);
  t.after(page.close);
  page.document.querySelector('main').innerHTML = card;
  await waitFor(() => page.document.querySelector('[data-bb-cover]'));
  page.document.querySelector('.element-card').remove();
  page.document.querySelector('main').innerHTML = card;
  await waitFor(() => page.document.querySelector('[data-bb-cover]'));
  await hub.storage.local.set({ courseCovers: {} });
  await waitFor(() => !page.document.querySelector('[data-bb-cover]'));
  assert.equal(page.document.querySelector('.course-banner').style.height, '120px');
  assert.deepEqual(page.errors, []);
});

test('storage updates all frames without page reloads or content-side storage writes', async (t) => {
  const hub = createHub(initial);
  const top = await createDom(hub);
  const frame = await createDom(hub, { frameId: 1 });
  t.after(top.close);
  t.after(frame.close);
  const writes = hub.calls.writes.length;
  await hub.storage.sync.set({
    pageBg: '#f0f4f8',
    accent: '#2563eb',
    navbar: '#1e293b',
    pageText: null,
  });
  await waitFor(() =>
    [top, frame].every((page) =>
      page.document.querySelector('#bb-custom-theme').textContent.includes('--page-bg: #f0f4f8')
    )
  );
  assert.equal(hub.calls.writes.length, writes + 1);
  assert.deepEqual(top.errors, []);
  assert.deepEqual(frame.errors, []);
});

test('style repair survives removal and late site styles without observing page content', async (t) => {
  const hub = createHub(initial);
  const page = await createDom(hub);
  t.after(page.close);
  page.document.querySelector('#bb-custom-theme').remove();
  await waitFor(() => page.document.querySelector('#bb-custom-theme'));
  const siteStyle = page.document.createElement('style');
  siteStyle.textContent = ':root{--page-bg: red;}';
  page.document.head.appendChild(siteStyle);
  await waitFor(() => page.document.head.lastElementChild.id === 'bb-custom-theme');
  let changes = 0;
  const observer = new page.window.MutationObserver((records) => {
    changes += records.length;
  });
  observer.observe(page.document.head, { subtree: true, childList: true, characterData: true });
  for (let index = 0; index < 500; index++)
    page.document.querySelector('main').appendChild(page.document.createElement('div'));
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(changes, 0, 'ordinary page activity must not rewrite styles');
  assert.equal(hub.calls.writes.length, 0);
  observer.disconnect();
  assert.deepEqual(page.errors, []);
});

test('auto-apply off leaves a new page alone until a user applies their theme', async (t) => {
  const hub = createHub({ ...initial, bbTheme: { autoApply: false } }, { font: 'Inter' });
  const page = await createDom(hub);
  t.after(page.close);
  assert.equal(page.document.querySelector('#bb-custom-theme'), null);
  assert.equal(page.document.querySelector('#bb-font-style'), null);
  await hub.send({ action: 'applyThemeCSS' });
  assert.ok(page.document.querySelector('#bb-custom-theme'));
  assert.ok(page.document.querySelector('#bb-font-style'));
  assert.deepEqual(page.errors, []);
});

test('temporary previews restore the saved theme and duplicate injection is harmless', async (t) => {
  const hub = createHub(initial);
  const page = await createDom(hub);
  t.after(page.close);
  const original = page.document.querySelector('#bb-custom-theme').textContent;
  const listenerCount = hub.receivers[0].handlers.size;
  await hub.send({ action: 'previewThemeCSS', css: ':root{--page-bg:pink;}' });
  assert.equal(
    page.document.querySelector('#bb-custom-theme').textContent,
    ':root{--page-bg:pink;}'
  );
  await hub.send({ action: 'restoreTheme' });
  assert.equal(page.document.querySelector('#bb-custom-theme').textContent, original);
  const { bundle } = await import('./helpers.js');
  page.window.eval(await bundle('src/content-entry.js'));
  assert.equal(hub.receivers[0].handlers.size, listenerCount);
  assert.equal(page.document.querySelectorAll('#bb-custom-theme').length, 1);
});

test('clearing a custom domain reverts existing pages; page visibility and fetch stay untouched', async (t) => {
  const hub = createHub({ ...initial, bbTheme: { customDomain: 'school.example.edu' } });
  const page = await createDom(hub, {
    url: 'https://school.example.edu/ultra',
    html: '<html><head></head><body><main hidden aria-hidden="true"></main></body></html>',
  });
  t.after(page.close);
  assert.ok(page.document.querySelector('#bb-custom-theme'));
  const fetch = page.window.fetch;
  await hub.storage.sync.set({ bbTheme: { customDomain: '' } });
  await waitFor(() => !page.document.querySelector('#bb-custom-theme'));
  assert.equal(page.document.querySelector('main').hidden, true);
  assert.equal(page.document.querySelector('main').getAttribute('aria-hidden'), 'true');
  assert.equal(page.window.fetch, fetch);
  assert.deepEqual(page.errors, []);
});

test('focal-point previews reuse image data and update only a small position stylesheet', async (t) => {
  const hub = createHub(initial, {
    courseCovers: { CMPS360: { imageUrl: imageData, position: '50% 50%' } },
  });
  const page = await createDom(hub, {
    html: `<!DOCTYPE html><html><head></head><body>${card}</body></html>`,
  });
  t.after(page.close);
  const imageStyle = page.document.getElementById('bb-cover-style-CMPS360');
  const original = imageStyle.textContent;
  const result = await hub.send({ action: 'applyCover', courseId: 'CMPS360', position: '10% 90%' });
  assert.equal(result.success, true);
  assert.equal(imageStyle.textContent, original);
  const positionStyle = page.document.getElementById('bb-cover-position-CMPS360');
  assert.ok(positionStyle.textContent.includes('10% 90%'));
  assert.ok(positionStyle.textContent.length < 150);
  assert.equal(hub.calls.writes.length, 0);
});

test('activity icons get a page-coloured fill underneath, removed again when disabled', async (t) => {
  const icon =
    '<div class="stream-panel-activity-icon"><svg viewBox="0 0 38 38"><path fill="currentColor" fill-rule="evenodd" d="M0 0h38v38H0zM4 4v30h30V4z"></path></svg></div>';
  const hub = createHub(initial);
  const page = await createDom(hub, {
    html: `<!DOCTYPE html><html><head></head><body><main>${icon}</main></body></html>`,
  });
  t.after(page.close);
  const fill = () => page.document.querySelector('.bb-icon-fill');
  await waitFor(() => fill());
  assert.equal(fill().getAttribute('fill-rule'), 'nonzero');
  assert.equal(fill().nextElementSibling.getAttribute('fill-rule'), 'evenodd');
  assert.match(
    page.document.querySelector('#bb-custom-theme').textContent,
    /\.bb-icon-fill\s*\{\s*fill: var\(--page-bg\)/
  );
  // Icons rendered later by the SPA are filled too, exactly once.
  page.document.querySelector('main').insertAdjacentHTML('beforeend', icon);
  await waitFor(() => page.document.querySelectorAll('.bb-icon-fill').length === 2);
  await hub.storage.sync.set({ masterEnabled: false });
  await waitFor(() => !fill());
  assert.equal(page.document.querySelectorAll('[data-bb-filled]').length, 0);
  assert.deepEqual(page.errors, []);
});

test('icon fill hull wraps open outlines and ignores interior points', () => {
  // An outline with a gap on the right (like the grade icon's page) plus inner detail.
  const points = [
    [0, 0],
    [38, 0],
    [38, 10],
    [38, 24],
    [38, 38],
    [0, 38],
    [12, 12],
    [20, 20],
    [5, 30],
  ];
  assert.deepEqual(convexHull(points), [
    [0, 0],
    [38, 0],
    [38, 38],
    [0, 38],
  ]);
});
