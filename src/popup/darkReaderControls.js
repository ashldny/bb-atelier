// ═════════════════════════════════════════════════════════
//  Bb Atelier — Dark Reader Popup Controls (vanilla JS)
//  Full Theme options, selectorsToIgnore editor, domain scoping,
//  batch writes to chrome.storage.sync under one bbTheme key
// ═════════════════════════════════════════════════════════

import { DEFAULT_THEME, normalizeTheme, parseSelectorsTextarea } from '../theme/darkReaderTheme.js';
import { showToast } from '../utils/ui.js';

let _saveTimer = null;
let _currentTheme = { ...DEFAULT_THEME };

function sendToTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {});
  });
}

function readFormToTheme() {
  const brightness = Number(document.getElementById('drBrightness').value);
  const contrast = Number(document.getElementById('drContrast').value);
  const sepia = Number(document.getElementById('drSepia').value);
  const grayscale = Number(document.getElementById('drGrayscale').value);
  const modeEl = document.querySelector('input[name="drMode"]:checked');
  const mode = modeEl ? Number(modeEl.value) : 1;
  const hiddenSelectorsEl = document.getElementById('drIgnoreSelectors');
  const visibleSelectorsEl = document.getElementById('drIgnoreSelectorsVisible');
  const selectorsText = (visibleSelectorsEl && visibleSelectorsEl.value) || (hiddenSelectorsEl && hiddenSelectorsEl.value) || '';
  const selectors = parseSelectorsTextarea(selectorsText);
  const styleSystemControlsEl = document.getElementById('drStyleSystemControls');

  // Also read scrollbar/selection if present
  const scrollbarEl = document.getElementById('drScrollbar');
  const selectionEl = document.getElementById('drSelection');

  return normalizeTheme({
    ..._currentTheme,
    enabled: document.getElementById('drEnabled').checked,
    debug: document.getElementById('drDebug').checked,
    mode,
    brightness,
    contrast,
    sepia,
    grayscale,
    darkSchemeBackgroundColor:
      document.getElementById('drDarkBg').value || DEFAULT_THEME.darkSchemeBackgroundColor,
    darkSchemeTextColor:
      document.getElementById('drDarkText').value || DEFAULT_THEME.darkSchemeTextColor,
    lightSchemeBackgroundColor:
      document.getElementById('drLightBg').value || DEFAULT_THEME.lightSchemeBackgroundColor,
    lightSchemeTextColor:
      document.getElementById('drLightText').value || DEFAULT_THEME.lightSchemeTextColor,
    scrollbarColor: scrollbarEl
      ? scrollbarEl.value || 'auto'
      : _currentTheme.scrollbarColor || 'auto',
    selectionColor: selectionEl
      ? selectionEl.value || 'auto'
      : _currentTheme.selectionColor || 'auto',
    selectorsToIgnore: selectors,
    styleSystemControls: styleSystemControlsEl ? styleSystemControlsEl.checked : _currentTheme.styleSystemControls,
    // customDomain handled separately via saveDomain to avoid overwriting
    customDomain: _currentTheme.customDomain || '',
  });
}

function applyFormValues(theme) {
  _currentTheme = normalizeTheme(theme);
  const t = _currentTheme;
  const drEnabled = document.getElementById('drEnabled');
  if (!drEnabled) return;
  drEnabled.checked = t.enabled;
  const drDebug = document.getElementById('drDebug');
  if (drDebug) drDebug.checked = t.debug;
  const modeRadio = document.querySelector(`input[name="drMode"][value="${t.mode}"]`);
  if (modeRadio) modeRadio.checked = true;
  const bEl = document.getElementById('drBrightness'); if (bEl) bEl.value = String(t.brightness);
  const cEl = document.getElementById('drContrast'); if (cEl) cEl.value = String(t.contrast);
  const sEl = document.getElementById('drSepia'); if (sEl) sEl.value = String(t.sepia);
  const gEl = document.getElementById('drGrayscale'); if (gEl) gEl.value = String(t.grayscale);
  const dBg = document.getElementById('drDarkBg'); if (dBg) dBg.value = t.darkSchemeBackgroundColor;
  const dTx = document.getElementById('drDarkText'); if (dTx) dTx.value = t.darkSchemeTextColor;
  const lBg = document.getElementById('drLightBg'); if (lBg) lBg.value = t.lightSchemeBackgroundColor;
  const lTx = document.getElementById('drLightText'); if (lTx) lTx.value = t.lightSchemeTextColor;
  const sb = document.getElementById('drScrollbar');
  const sel = document.getElementById('drSelection');
  if (sb) sb.value = t.scrollbarColor === 'auto' ? t.darkSchemeBackgroundColor : t.scrollbarColor;
  if (sel) sel.value = t.selectionColor === 'auto' ? t.darkSchemeBackgroundColor : t.selectionColor;
  const hiddenEl = document.getElementById('drIgnoreSelectors');
  const visibleEl = document.getElementById('drIgnoreSelectorsVisible');
  const joined = (t.selectorsToIgnore || []).join('\n');
  if (hiddenEl) hiddenEl.value = joined;
  if (visibleEl) visibleEl.value = joined;
  const styleEl = document.getElementById('drStyleSystemControls');
  if (styleEl) styleEl.checked = !!t.styleSystemControls;
  const domEl = document.getElementById('drCustomDomain'); if (domEl) domEl.value = t.customDomain || '';
  updateSliderLabels();
}

function updateSliderLabels() {
  const b = document.getElementById('drBrightness'); const bv = document.getElementById('drBrightnessVal'); if (b && bv) bv.textContent = String(b.value);
  const c = document.getElementById('drContrast'); const cv = document.getElementById('drContrastVal'); if (c && cv) cv.textContent = String(c.value);
  const s = document.getElementById('drSepia'); const sv = document.getElementById('drSepiaVal'); if (s && sv) sv.textContent = String(s.value);
  const g = document.getElementById('drGrayscale'); const gv = document.getElementById('drGrayscaleVal'); if (g && gv) gv.textContent = String(g.value);
}

function scheduleSaveAndApply() {
  const masterToggle = document.getElementById('masterToggle');
  if (masterToggle && !masterToggle.checked) return;
  updateSliderLabels();
  const next = readFormToTheme();
  _currentTheme = next;

  // Debounce storage write + live apply (≤1s as required)
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    // Batch write: one key bbTheme
    chrome.storage.sync.set({ bbTheme: next }, () => {
      // Live update via messaging to content script
      if (!next.enabled) {
        sendToTab({ action: 'drDisable' });
      } else {
        sendToTab({ action: 'drApply', theme: next });
      }
    });
  }, 300);
}

function saveDomain() {
  const input = document.getElementById('drCustomDomain');
  const status = document.getElementById('drDomainStatus');
  const raw = input.value.trim();
  // Allow empty (clear), or validate basic hostname
  if (raw && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(raw.split('/')[0].replace(/^\*\./, ''))) {
    status.style.display = 'block';
    status.textContent = 'Enter a valid host like blackboard.example.edu';
    status.style.color = '#9f1239';
    return;
  }

  const next = normalizeTheme({ ..._currentTheme, customDomain: raw });
  _currentTheme = next;
  chrome.storage.sync.set({ bbTheme: next }, () => {
    status.style.display = 'block';
    status.style.color = '#166534';
    status.textContent = raw
      ? `Domain saved: ${raw} — reload extension or reopen Blackboard`
      : 'Custom domain cleared';

    // Request optional host permission + trigger background registration
    if (raw) {
      const pattern = `*://${raw.replace(/^\*\./, '')}/*`;
      chrome.runtime.sendMessage({ action: 'requestHostPermission', pattern }).catch(() => {});
      chrome.permissions
        .request({ origins: [pattern] })
        .then((granted) => {
          status.textContent = granted
            ? `Permission granted for ${pattern}`
            : `Permission denied for ${pattern} — add via chrome://extensions → Site access`;
        })
        .catch(() => {});
    }
    showToast(raw ? 'Domain saved' : 'Domain cleared');
  });
}

export function initDarkReaderControls() {
  // Guard: popup no longer ships the standalone Dark Reader sliders UI.
  // If none of the expected elements exist, become a no-op instead of crashing
  // and breaking tabs/presets rendering.
  if (!document.getElementById('drEnabled') && !document.getElementById('drBrightness')) {
    return;
  }
  // Load bbTheme from storage
  chrome.storage.sync.get(['bbTheme'], (data) => {
    const raw = data.bbTheme || {};
    // Migration: if legacy pageBg/accent exists but no bbTheme, seed from them
    if (Object.keys(raw).length === 0) {
      chrome.storage.sync.get(['pageBg', 'accent', 'navbar'], (legacy) => {
        if (legacy.pageBg || legacy.accent) {
          // Seed darkScheme colors from legacy picks for familiarity
          const seeded = normalizeTheme({
            ...DEFAULT_THEME,
            darkSchemeBackgroundColor: legacy.pageBg || DEFAULT_THEME.darkSchemeBackgroundColor,
          });
          applyFormValues(seeded);
          chrome.storage.sync.set({ bbTheme: seeded });
        } else {
          applyFormValues(DEFAULT_THEME);
        }
      });
    } else {
      applyFormValues(raw);
    }
  });

  // Wire all controls to batch save
  const sliderIds = ['drBrightness', 'drContrast', 'drSepia', 'drGrayscale'];
  sliderIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', scheduleSaveAndApply);
  });

  const colorIds = [
    'drDarkBg',
    'drDarkText',
    'drLightBg',
    'drLightText',
    'drScrollbar',
    'drSelection',
  ];
  colorIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', scheduleSaveAndApply);
  });

  document.getElementById('drEnabled')?.addEventListener('change', scheduleSaveAndApply);
  document.getElementById('drDebug')?.addEventListener('change', scheduleSaveAndApply);

  document.querySelectorAll('input[name="drMode"]').forEach((radio) => {
    radio.addEventListener('change', scheduleSaveAndApply);
  });

  const hiddenIgnore = document.getElementById('drIgnoreSelectors');
  const visibleIgnore = document.getElementById('drIgnoreSelectorsVisible');
  if (hiddenIgnore) hiddenIgnore.addEventListener('input', scheduleSaveAndApply);
  if (visibleIgnore) {
    visibleIgnore.addEventListener('input', () => {
      if (hiddenIgnore) hiddenIgnore.value = visibleIgnore.value;
      scheduleSaveAndApply();
    });
  }
  const styleEl2 = document.getElementById('drStyleSystemControls');
  if (styleEl2) styleEl2.addEventListener('change', scheduleSaveAndApply);

  // Domain
  document.getElementById('drSaveDomainBtn')?.addEventListener('click', saveDomain);
  document.getElementById('drCustomDomain')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveDomain();
  });

  // ── Sync main 3-color pickers → Dark Reader scheme (combined tab) ──
  // Page Background → darkSchemeBackgroundColor (and light when in light mode)
  // This keeps the "simple 3 colors" UX while feeding the Dark Reader engine
  const mainPickers = ['pageBgPicker', 'activeTabGlowPicker', 'navbarPicker'];
  mainPickers.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      const pageBg = document.getElementById('pageBgPicker')?.value;
      const accent = document.getElementById('activeTabGlowPicker')?.value;
      if (pageBg) {
        const drDarkBg = document.getElementById('drDarkBg');
        const drLightBg = document.getElementById('drLightBg');
        if (drDarkBg) drDarkBg.value = pageBg;
        // Light scheme gets a lightened variant if pageBg is dark
        if (drLightBg && pageBg.toLowerCase() !== drLightBg.value.toLowerCase()) {
          // keep light BG independent unless user wants sync — no auto overwrite
        }
      }
      if (accent) {
        const drSel = document.getElementById('drSelection');
        if (drSel) drSel.value = accent;
      }
      scheduleSaveAndApply();
    });
  });

  // Presets already set the 3 pickers + call applyCurrentTheme; also sync to DR
  ['presetGrid','presetGridLight','presetGridDark'].forEach(id => {
    const g = document.getElementById(id);
    if (!g) return;
    g.addEventListener('click', () => {
      setTimeout(() => {
        const pageBg = document.getElementById('pageBgPicker')?.value;
        if (pageBg) {
          const drDarkBg = document.getElementById('drDarkBg');
          if (drDarkBg) drDarkBg.value = pageBg;
        }
        scheduleSaveAndApply();
      }, 50);
    });
  });
}
