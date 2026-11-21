import test from 'node:test';
import assert from 'node:assert/strict';
import { createDom, createHub, createBackground, waitFor, change, imageData } from './helpers.js';

const defaults = {
  masterEnabled: true,
  customMode: true,
  pageBg: '#1a1a1a',
  accent: '#670d2f',
  navbar: '#121212',
  pageText: '#e0e0e0',
};
async function setup(t, sync = defaults, local = {}) {
  const hub = createHub(sync, local);
  const background = await createBackground(hub);
  const content = await createDom(hub);
  const popup = await createDom(hub, { popup: true });
  t.after(async () => {
    // Let already-awaited UI handlers finish before destroying their DOM context.
    await new Promise((resolve) => setTimeout(resolve, 40));
    content.close();
    popup.close();
    background.close();
  });
  return { hub, content, ...popup, $: (id) => popup.document.getElementById(id) };
}

test('popup boots cleanly; both tab groups support arrow keys and ARIA relationships', async (t) => {
  const page = await setup(t);
  const themeTab = page.document.querySelector('.tab-btn[data-tab="theme"]');
  themeTab.dispatchEvent(
    new page.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
  );
  assert.equal(page.$('tab-saved').hidden, false);
  assert.equal(page.$('tab-theme').hidden, true);
  assert.equal(page.document.activeElement.dataset.tab, 'saved');
  assert.equal(page.$('tab-saved').getAttribute('aria-labelledby'), 'nav-saved');
  themeTab.click();
  page.document
    .querySelector('.sub-tab-btn[data-subtab="presets"]')
    .dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  assert.equal(page.$('sub-font').hidden, false);
  assert.deepEqual(page.errors, []);
});

test('pausing keeps its switch enabled and preserves fonts and covers', async (t) => {
  const page = await setup(t, defaults, { font: 'Inter', courseCovers: { id: imageData } });
  change(page.window, page.$('masterToggle'), false);
  await waitFor(() => page.hub.values.sync.masterEnabled === false);
  assert.equal(page.$('masterToggle').disabled, false);
  assert.equal(page.$('customizationControls').disabled, true);
  assert.equal(page.$('pausedNotice').hidden, false);
  assert.ok(page.hub.values.local.courseCovers.id);
  change(page.window, page.$('masterToggle'), true);
  await waitFor(
    () =>
      page.$('customizationControls').disabled === false &&
      page.hub.values.sync.masterEnabled === true
  );
  assert.deepEqual(page.errors, []);
});

test('light presets use automatic text, and live color input batches storage writes', async (t) => {
  const page = await setup(t);
  page.document.querySelector('.preset-card[data-index="0"]').click();
  await waitFor(() => page.hub.values.sync.pageBg === '#ffffff');
  assert.equal(page.hub.values.sync.pageText, null);
  assert.equal(page.$('autoTextToggle').checked, true);
  assert.equal(page.$('pageTextPicker').disabled, true);
  const before = page.hub.calls.writes.length;
  for (let index = 0; index < 40; index++) {
    page.$('pageBgPicker').value = '#f0f4f8';
    page.$('pageBgPicker').dispatchEvent(new page.window.Event('input', { bubbles: true }));
  }
  assert.equal(page.hub.calls.writes.length, before);
  change(page.window, page.$('pageBgPicker'), '#f0f4f8');
  await waitFor(() => page.hub.values.sync.pageBg === '#f0f4f8');
  assert.equal(page.hub.calls.writes.length, before + 1);
  assert.equal(page.$('pageTextPicker').value, '#000000');
  assert.match(page.$('contrastSummary').textContent, /Good readability/);
  assert.deepEqual(page.errors, []);
});

test('saved themes preserve custom text/font; names render as text; loading a default font clears a custom font', async (t) => {
  const page = await setup(t, defaults, { font: 'Noto Serif' });
  page.document.querySelector('.tab-btn[data-tab="saved"]').click();
  page.$('saveCurrentBtn').click();
  page.$('saveThemeName').value = '<b>Daily</b>';
  page
    .$('saveThemeForm')
    .dispatchEvent(new page.window.Event('submit', { bubbles: true, cancelable: true }));
  await waitFor(() => page.hub.values.local.savedThemes?.['<b>Daily</b>']);
  assert.equal(page.hub.values.local.savedThemes['<b>Daily</b>'].pageText, '#e0e0e0');
  assert.equal(page.hub.values.local.savedThemes['<b>Daily</b>'].font, 'Noto Serif');
  await waitFor(() => page.$('savedList').querySelector('.load-saved'));
  assert.equal(page.$('savedList').querySelector('b'), null);
  assert.match(page.$('savedList').textContent, /<b>Daily<\/b>/);
  await page.hub.storage.local.set({ savedThemes: { Plain: { ...defaults, font: null } } });
  await waitFor(() => page.$('savedList').querySelector('[data-name="Plain"]'));
  page.$('savedList').querySelector('.load-saved').click();
  await waitFor(() => !('font' in page.hub.values.local) && page.$('fontSelect').value === '');
  assert.equal(page.$('fontSelect').value, '');
  assert.deepEqual(page.errors, []);
});

test('saving a repeated name adds a numbered copy; delete asks in an in-popup dialog', async (t) => {
  const page = await setup(t, defaults, { savedThemes: { Daily: defaults } });
  page.document.querySelector('.tab-btn[data-tab="saved"]').click();
  page.$('saveCurrentBtn').click();
  page.$('saveThemeName').value = 'Daily';
  page
    .$('saveThemeForm')
    .dispatchEvent(new page.window.Event('submit', { bubbles: true, cancelable: true }));
  await waitFor(() => page.hub.values.local.savedThemes['Daily (1)']);
  assert.ok(page.hub.values.local.savedThemes.Daily);
  await waitFor(() => page.$('savedList').querySelector('[data-name="Daily (1)"]'));
  page.$('savedList').querySelector('[data-name="Daily (1)"] .delete-saved').click();
  await waitFor(() => !page.$('confirmDialog').hidden);
  page.$('confirmCancel').click();
  assert.ok(page.hub.values.local.savedThemes['Daily (1)']);
  page.$('savedList').querySelector('[data-name="Daily (1)"] .delete-saved').click();
  await waitFor(() => !page.$('confirmDialog').hidden);
  page.$('confirmOk').click();
  await waitFor(() => !page.hub.values.local.savedThemes['Daily (1)']);
  assert.ok(page.hub.values.local.savedThemes.Daily);
  assert.deepEqual(page.errors, []);
});

test('legacy collections migrate without losing saved uploaded fonts or covers', async (t) => {
  const font = 'data:font/woff2;base64,AAAA';
  const page = await setup(
    t,
    {
      ...defaults,
      savedThemes: { Daily: { ...defaults, hasBlob: true } },
      courseCovers: { legacy: imageData },
    },
    {
      savedThemeFonts: { Daily: font },
      courseCovers: { local: imageData },
    }
  );
  assert.equal(page.hub.values.local.savedThemes.Daily.font, font);
  assert.ok(page.hub.values.local.courseCovers.legacy);
  assert.ok(page.hub.values.local.courseCovers.local);
  assert.equal(page.hub.values.sync.savedThemes, undefined);
  assert.equal(page.hub.values.sync.courseCovers, undefined);
});

test('missing content scripts are injected once when the popup connects', async (t) => {
  const hub = createHub(defaults);
  let content;
  hub.inject = async () => {
    content = await createDom(hub);
  };
  const popup = await createDom(hub, { popup: true });
  t.after(() => {
    content?.close();
    popup.close();
  });
  await waitFor(
    () => popup.document.getElementById('connectionStatus').dataset.state === 'connected'
  );
  assert.equal(hub.calls.injections, 1);
  assert.ok(content.document.querySelector('#bb-custom-theme'));
  assert.deepEqual(popup.errors, []);
});

test('custom domain permission is requested once and declined requests never persist', async (t) => {
  const page = await setup(t);
  page.hub.permission = false;
  page.$('customDomainInput').value = 'https://blackboard.example.edu/ultra/';
  page.$('saveCustomDomainBtn').click();
  await waitFor(() => page.$('customDomainStatus').textContent.includes('declined'));
  assert.equal(page.hub.calls.requests.length, 1);
  assert.equal(page.hub.values.sync.bbTheme, undefined);
  page.hub.permission = true;
  page.$('saveCustomDomainBtn').click();
  await waitFor(() => page.hub.values.sync.bbTheme?.customDomain);
  assert.equal(page.hub.calls.requests[1].origins[0], '*://blackboard.example.edu/*');
  assert.match(page.$('customDomainStatus').textContent, /Connected/);
});

test('covers refresh after navigation; the crop frame stays inside the image and saves once per key', async (t) => {
  // Saved hanging off the bottom-left corner; the editor pulls it back inside the image.
  const crop = { x: 0, y: 100, scale: 40, rotate: 0, aspect: 1.5 };
  const page = await setup(t, defaults, {
    courseCovers: { CMPS360: { imageUrl: imageData, crop } },
  });
  page.document.querySelector('.tab-btn[data-tab="covers"]').click();
  // Off the course list the menu is locked with a hint.
  await waitFor(() => page.$('courseSelect').disabled);
  assert.equal(page.$('coursesEmpty').hidden, false);
  page.content.document.querySelector('main').innerHTML =
    '<article class="element-card"><span class="multi-column-course-id">CMPS360</span><h4>Data Visualization</h4><div class="course-banner"></div></article>';
  page.$('refreshCoursesBtn').click();
  await waitFor(() => page.$('courseSelect').options.length === 2);
  assert.equal(page.$('courseSelect').disabled, false);
  change(page.window, page.$('courseSelect'), 'CMPS360');
  // 40% wide frame of the default 2.6 banner shape on a 1.5 image: centre at 20% / 88.46%.
  assert.equal(page.$('cropBox').style.left, '20%');
  assert.equal(page.$('cropBox').style.top, '88.46%');
  const key = (name) =>
    page
      .$('cropBox')
      .dispatchEvent(new page.window.KeyboardEvent('keydown', { key: name, bubbles: true }));
  const before = page.hub.calls.writes.length;
  key('ArrowRight');
  await waitFor(() => page.hub.values.local.courseCovers.CMPS360.crop?.x === 21);
  assert.equal(page.hub.values.local.courseCovers.CMPS360.crop.y, 88.46);
  assert.equal(page.hub.calls.writes.length, before + 1);
  await waitFor(() =>
    page.content.document
      .getElementById('bb-cover-position-CMPS360')
      ?.textContent.includes('translate(-21%,-88.46%)')
  );
  // Pushing past the edge stops at the edge.
  key('ArrowLeft');
  key('ArrowLeft');
  key('ArrowLeft');
  await waitFor(() => page.hub.values.local.courseCovers.CMPS360.crop?.x === 20);
  change(page.window, page.$('courseSelect'), '');
  assert.equal(page.$('coverEditor').disabled, true);
  assert.deepEqual(page.errors, []);
});

test('font reset updates persisted state without reloading the popup', async (t) => {
  const page = await setup(t, defaults, { font: 'Inter', fontName: 'Inter' });
  page.$('resetFontBtn').click();
  await waitFor(() => !('font' in page.hub.values.local) && page.$('fontSelect').value === '');
  assert.equal(page.$('fontSelect').value, '');
  assert.equal(page.window.location.pathname, '/popup.html');
  assert.deepEqual(page.errors, []);
});

test('multi-file library uploads are serialized and removing an image does not change its assigned cover', async (t) => {
  const page = await setup(t, defaults, { courseCovers: { kept: imageData } });
  const bytes = Uint8Array.from(Buffer.from(imageData.split(',')[1], 'base64'));
  const files = [
    new page.window.File([bytes], 'one.png', { type: 'image/png' }),
    new page.window.File([bytes, new Uint8Array([0])], 'two.png', { type: 'image/png' }),
  ];
  Object.defineProperty(page.$('libraryUpload'), 'files', { value: files, configurable: true });
  page.$('libraryUpload').dispatchEvent(new page.window.Event('change', { bubbles: true }));
  await waitFor(() => page.hub.values.local.coverLibrary?.length === 2);
  await waitFor(() => page.$('libraryGrid').querySelectorAll('.remove-library').length === 2);
  page.$('libraryGrid').querySelector('.remove-library').click();
  await waitFor(() => page.hub.values.local.coverLibrary.length === 1);
  assert.equal(page.hub.values.local.courseCovers.kept, imageData);
  assert.deepEqual(page.errors, []);
});

test('theme export/import round trips text and custom fonts without reloading', async (t) => {
  const font = 'data:font/woff2;base64,AAAA';
  const page = await setup(t, defaults, {
    savedThemes: { Reading: { ...defaults, pageText: '#eeeedd', font } },
  });
  let blob;
  page.window.URL.createObjectURL = (value) => {
    blob = value;
    return 'blob:test';
  };
  page.window.URL.revokeObjectURL = () => {};
  page.window.HTMLAnchorElement.prototype.click = () => {};
  page.$('exportThemesBtn').click();
  await waitFor(() => !!blob);
  const payload = await new Promise((resolve) => {
    const reader = new page.window.FileReader();
    reader.onload = () => resolve(JSON.parse(reader.result));
    reader.readAsText(blob);
  });
  assert.equal(payload.themes[0].pageText, '#eeeedd');
  assert.equal(payload.themes[0].font, font);
  await page.hub.storage.local.set({ savedThemes: {} });
  Object.defineProperty(page.$('importThemesFile'), 'files', {
    value: [{ size: 500, text: async () => JSON.stringify(payload) }],
    configurable: true,
  });
  page.$('importThemesFile').dispatchEvent(new page.window.Event('change', { bubbles: true }));
  await waitFor(() => page.hub.values.local.savedThemes.Reading);
  assert.equal(page.hub.values.local.savedThemes.Reading.pageText, '#eeeedd');
  assert.equal(page.hub.values.local.savedThemes.Reading.font, font);
  assert.equal(page.window.location.pathname, '/popup.html');
  assert.deepEqual(page.errors, []);
});

test('settings imports validate data and refresh current controls and the page live', async (t) => {
  const page = await setup(t);
  const payload = {
    sync: {
      ...defaults,
      pageBg: '#ffffff',
      pageText: null,
      bbTheme: { showToast: false },
      malicious: true,
    },
    local: { font: 'Noto Serif', cachedCSS: '<bad>', courseCovers: { saved: imageData } },
  };
  Object.defineProperty(page.$('importSettingsFile'), 'files', {
    value: [{ size: 500, text: async () => JSON.stringify(payload) }],
    configurable: true,
  });
  page.$('importSettingsFile').dispatchEvent(new page.window.Event('change', { bubbles: true }));
  await waitFor(
    () => page.$('pageBgPicker').value === '#ffffff' && page.$('fontSelect').value === 'Noto Serif'
  );
  assert.equal(page.hub.values.sync.malicious, undefined);
  assert.equal(page.hub.values.local.cachedCSS, undefined);
  assert.equal(page.$('autoTextToggle').checked, true);
  assert.equal(page.$('showToastToggle').checked, false);
  await waitFor(() =>
    page.content.document
      .querySelector('#bb-custom-theme')
      .textContent.includes('--page-bg: #ffffff')
  );
  assert.deepEqual(page.errors, []);
});

test('reset clears the data promised in its prompt and applies defaults without a popup reload', async (t) => {
  const page = await setup(
    t,
    { ...defaults, pageBg: '#ffffff' },
    {
      font: 'Inter',
      savedThemes: { Daily: defaults },
      courseCovers: { id: imageData },
      coverLibrary: [{ id: 'one', dataUrl: imageData }],
    }
  );
  page.$('resetAllBtn').click();
  await waitFor(
    () => page.$('pageBgPicker').value === '#1a1a1a' && !page.hub.values.local.savedThemes
  );
  assert.equal(page.hub.values.local.font, undefined);
  assert.equal(page.hub.values.local.courseCovers, undefined);
  assert.equal(page.hub.values.local.coverLibrary, undefined);
  assert.equal(page.$('masterToggle').checked, true);
  assert.equal(page.window.location.pathname, '/popup.html');
  assert.deepEqual(page.errors, []);
});

test('reset all covers confirms first, clears every cover and keeps the library', async (t) => {
  const page = await setup(t, defaults, {
    courseCovers: { a: imageData, b: imageData },
    coverLibrary: [imageData],
  });
  await waitFor(() => !page.$('resetAllCoversBtn').disabled);
  page.$('resetAllCoversBtn').click();
  await waitFor(() => !page.$('confirmDialog').hidden);
  page.$('confirmCancel').click();
  assert.equal(Object.keys(page.hub.values.local.courseCovers).length, 2);
  page.$('resetAllCoversBtn').click();
  await waitFor(() => !page.$('confirmDialog').hidden);
  page.$('confirmOk').click();
  await waitFor(() => Object.keys(page.hub.values.local.courseCovers).length === 0);
  await waitFor(() => page.$('resetAllCoversBtn').disabled);
  assert.equal(page.hub.values.local.coverLibrary.length, 1);
  assert.deepEqual(page.errors, []);
});

test('match my device keeps a light and a dark theme and the page shows the device one', async (t) => {
  // The test window reports a light device (matchMedia → false).
  const page = await setup(t);
  page.$('followSystemToggle').click();
  await waitFor(() => page.hub.values.sync.followSystem === true);
  // The current dark theme fills the dark slot; light starts from the first light preset.
  assert.equal(page.hub.values.sync.darkPalette.pageBg, '#1a1a1a');
  assert.equal(page.hub.values.sync.lightPalette.pageBg, '#ffffff');
  await waitFor(() =>
    page.document.querySelector('.preset-card[data-index="0"]').classList.contains('scheme-slot')
  );
  await waitFor(() =>
    page.content.document
      .querySelector('#bb-custom-theme')
      .textContent.includes('--page-bg: #ffffff')
  );
  // Picking a dark preset fills only the dark slot; the light device keeps the light theme.
  const neon = [...page.document.querySelectorAll('.preset-card')].find((card) =>
    card.textContent.includes('Neon City')
  );
  neon.click();
  await waitFor(() => page.hub.values.sync.darkPalette.pageBg === '#0b0d1e');
  assert.equal(page.hub.values.sync.lightPalette.pageBg, '#ffffff');
  await waitFor(() => neon.classList.contains('scheme-slot'));
  assert.match(page.$('toast')?.textContent || page.document.body.textContent, /dark theme/);
  assert.ok(
    page.content.document
      .querySelector('#bb-custom-theme')
      .textContent.includes('--page-bg: #ffffff')
  );
  // Turning it off keeps what the page shows now.
  page.$('followSystemToggle').click();
  await waitFor(() => page.hub.values.sync.followSystem === false);
  assert.equal(page.hub.values.sync.pageBg, '#ffffff');
  assert.deepEqual(page.errors, []);
});

test('a settings backup carries covers with their crop frame and the device-mode themes', async (t) => {
  const crop = { x: 40, y: 50, scale: 60, rotate: 5, aspect: 1.5 };
  const page = await setup(t, defaults, {
    courseCovers: { _1_1: { imageUrl: imageData, position: '50% 50%', crop } },
    coverLibrary: [{ id: 'a', dataUrl: imageData }],
  });
  await page.hub.storage.sync.set({
    followSystem: true,
    lightPalette: { pageBg: '#fdf2f6', accent: '#c2416f', navbar: null, pageText: null },
    darkPalette: { pageBg: '#0b0d1e', accent: '#ff2e97', navbar: null, pageText: '#cfe9ff' },
  });
  let blob;
  page.window.URL.createObjectURL = (value) => {
    blob = value;
    return 'blob:test';
  };
  page.window.URL.revokeObjectURL = () => {};
  page.window.HTMLAnchorElement.prototype.click = () => {};
  page.$('exportSettingsBtn').click();
  await waitFor(() => !!blob);
  const payload = await new Promise((resolve) => {
    const reader = new page.window.FileReader();
    reader.onload = () => resolve(JSON.parse(reader.result));
    reader.readAsText(blob);
  });
  await page.hub.storage.local.set({ courseCovers: {}, coverLibrary: [] });
  await page.hub.storage.sync.set({ followSystem: false, lightPalette: null, darkPalette: null });
  Object.defineProperty(page.$('importSettingsFile'), 'files', {
    value: [{ size: 500, text: async () => JSON.stringify(payload) }],
    configurable: true,
  });
  page.$('importSettingsFile').dispatchEvent(new page.window.Event('change', { bubbles: true }));
  await waitFor(() => page.hub.values.local.courseCovers._1_1);
  assert.deepEqual(page.hub.values.local.courseCovers._1_1.crop, crop);
  assert.equal(page.hub.values.local.coverLibrary.length, 1);
  assert.equal(page.hub.values.sync.followSystem, true);
  assert.equal(page.hub.values.sync.darkPalette.pageText, '#cfe9ff');
  assert.deepEqual(page.errors, []);
});

test('about tab feedback opens an in-popup dialog and never opens a mail app', async (t) => {
  const page = await setup(t);
  page.document.querySelector('.tab-btn[data-tab="about"]').click();
  assert.match(page.$('versionLabel').textContent, /^Version /);
  assert.equal(page.document.querySelector('a[href^="mailto:"]'), null);
  page.$('feedbackBtn').click();
  await waitFor(() => !page.$('feedbackDialog').hidden);
  // Empty notes are not sent.
  page.$('feedbackForm').dispatchEvent(new page.window.Event('submit', { cancelable: true }));
  await waitFor(() => /Write a note first/.test(page.$('feedbackStatus').textContent));
  page.$('feedbackCancel').click();
  assert.equal(page.$('feedbackDialog').hidden, true);
  assert.deepEqual(page.errors, []);
});

test('feedback posts only the message and version to the configured form', async () => {
  const { FEEDBACK_FORM } = await import('../src/utils/constants.js');
  const { sendFeedback } = await import('../src/utils/feedback.js');
  const saved = { ...FEEDBACK_FORM };
  Object.assign(FEEDBACK_FORM, {
    formId: '1FAIpQLSexampleexampleexample',
    messageEntry: 'entry.111',
    versionEntry: 'entry.222',
  });
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => calls.push({ url, options });
  try {
    await sendFeedback('  Love the presets  ', '2.0');
    assert.equal(
      calls[0].url,
      'https://docs.google.com/forms/d/e/1FAIpQLSexampleexampleexample/formResponse'
    );
    assert.equal(calls[0].options.credentials, 'omit');
    assert.equal(String(calls[0].options.body), 'entry.111=Love+the+presets&entry.222=2.0');
    await assert.rejects(sendFeedback('   ', '2.0'), /Write a note first/);
  } finally {
    globalThis.fetch = realFetch;
    Object.assign(FEEDBACK_FORM, saved);
  }
});
