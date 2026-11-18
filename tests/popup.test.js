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

test('covers refresh after navigation; keyboard positioning retains zero coordinates and saves once', async (t) => {
  const page = await setup(t, defaults, {
    courseCovers: { CMPS360: { imageUrl: imageData, position: '0% 100%' } },
  });
  page.content.document.querySelector('main').innerHTML =
    '<article class="element-card"><span class="multi-column-course-id">CMPS360</span><h4>Data Visualization</h4><div class="course-banner"></div></article>';
  page.document.querySelector('.tab-btn[data-tab="covers"]').click();
  await waitFor(() => page.$('courseSelect').options.length === 2);
  change(page.window, page.$('courseSelect'), 'CMPS360');
  assert.equal(page.$('coverFocal').style.left, '0%');
  assert.equal(page.$('coverFocal').style.top, '100%');
  const before = page.hub.calls.writes.length;
  page
    .$('coverFocal')
    .dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await waitFor(() => page.hub.values.local.courseCovers.CMPS360.position === '2% 100%');
  assert.equal(page.hub.calls.writes.length, before + 1);
  change(page.window, page.$('courseSelect'), '');
  assert.equal(page.$('coverEditor').disabled, true);
  assert.deepEqual(page.errors, []);
});

test('font reset and engine selector update persisted state without reloading the popup', async (t) => {
  const page = await setup(t, defaults, { font: 'Inter', fontName: 'Inter' });
  page.$('resetFontBtn').click();
  await waitFor(() => !('font' in page.hub.values.local) && page.$('fontSelect').value === '');
  assert.equal(page.$('fontSelect').value, '');
  const radio = page.document.querySelector('input[name="engine"][value="darkreader"]');
  // Verify the settings contract independently of Dark Reader's real-browser rendering.
  page.content.close();
  page.hub.chrome('content');
  page.hub.receivers[0].handlers.add((_message, _sender, respond) => {
    respond({ success: true });
    return true;
  });
  change(page.window, radio, true);
  await waitFor(() => page.hub.values.sync.bbTheme?.engine === 'darkreader');
  assert.ok(page.hub.calls.messages.some((message) => message.action === 'refreshSettings'));
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
