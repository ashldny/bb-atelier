// ═════════════════════════════════════════════════════════
//  Bb Atelier — Swatch Popup (hardened)
//  Reads bbDetectedColors + bbColorMap, renders swatches with
//  search/filter + Show more, writes bbColorMap on input
//  No bare npm import — uses canvas for toHex so popup ES modules load without bundling
// ═════════════════════════════════════════════════════════

import { escapeHtml } from '../utils/sanitization.js';

// Convert any CSS color value to #rrggbb — canvas-based (replaces colord for popup which is not bundled)
export function toHex(colorValue) {
  const s = String(colorValue || '').trim();
  if (!s) return null;
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) {
    const lower = s.toLowerCase();
    if (lower.length === 4)
      return `#${lower[1]}${lower[1]}${lower[2]}${lower[2]}${lower[3]}${lower[3]}`;
    return lower;
  }
  try {
    const canvas = document.createElement('canvas');
    // Some contexts may be unavailable in extension popup — guard
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) || canvas.getContext('2d');
    if (!ctx) return null;
    // Reset then set
    ctx.fillStyle = '#000000';
    ctx.fillStyle = s;
    const computed = String(ctx.fillStyle || '').toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(computed)) return computed;
    if (/^#[0-9a-f]{3}$/.test(computed))
      return `#${computed[1]}${computed[1]}${computed[2]}${computed[2]}${computed[3]}${computed[3]}`;
    // rgba / transparent handling
    if (computed === 'transparent' || computed === 'rgba(0, 0, 0, 0)') return 'transparent';
    return null;
  } catch {
    return null;
  }
}

let _detected = []; // [{normalized, count, example, props}]
let _colorMap = {}; // {normalized: hex}
let _showAll = false;
let _search = '';

function sendRescan() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, { type: 'BB_THEME_RESCAN' }).catch(() => {});
  });
}

function renderSwatches() {
  const list = document.getElementById('swatchList');
  const countEl = document.getElementById('swatchCount');
  const showMoreBtn = document.getElementById('swatchShowMore');
  if (!list) return;

  const query = _search.trim().toLowerCase();
  let filtered = _detected;
  if (query) {
    filtered = _detected.filter(
      (c) => c.normalized.toLowerCase().includes(query) || c.example.toLowerCase().includes(query)
    );
  }

  const cap = _showAll ? 100 : 25;
  const visible = filtered.slice(0, cap);
  const total = filtered.length;

  if (countEl) {
    countEl.textContent =
      total === 0
        ? 'No colors detected yet — try Rescan'
        : `${String(total)} color${total === 1 ? '' : 's'} found — showing ${String(visible.length)}`;
  }

  if (showMoreBtn) {
    if (total > 25) {
      showMoreBtn.style.display = 'block';
      showMoreBtn.textContent = _showAll
        ? 'Show less'
        : `Show more (${String(Math.min(100, total))}/${String(total)})`;
    } else {
      showMoreBtn.style.display = 'none';
    }
  }

  if (_detected.length === 0) {
    list.innerHTML =
      '<div class="saved-empty">No swatches yet — open a Blackboard course page then rescan</div>';
    return;
  }

  if (visible.length === 0) {
    list.innerHTML = '<div class="saved-empty">No matches for search</div>';
    return;
  }

  list.innerHTML = visible
    .map((c) => {
      const normalized = c.normalized.toLowerCase();
      const current = (_colorMap[normalized] || normalized).toLowerCase();
      const safeNorm = escapeHtml(normalized);
      const safeExample = escapeHtml(c.example);
      return `
        <div class="saved-row swatch-row" data-norm="${safeNorm}">
          <span class="saved-swatches" style="align-items:center; gap:6px">
            <span class="mini-swatch" style="background:${safeNorm}; width:14px; height:14px; border-radius:4px"></span>
            <span class="mini-swatch" style="background:${escapeHtml(current)}; width:14px; height:14px; border-radius:4px; border: 1px dashed rgba(255,255,255,0.3)"></span>
          </span>
          <span class="saved-name" title="${safeExample} — used ${String(c.count)}× — ${escapeHtml(c.props.join(', '))}" style="font-family:monospace; font-size:9px">
            ${safeNorm} <span style="opacity:0.5">(${String(c.count)})</span>
          </span>
          <input type="color" class="swatch-input" data-norm="${safeNorm}" value="${escapeHtml(current)}" style="width:28px; height:22px; padding:1px; border-radius:4px; border:1px solid rgba(255,255,255,0.15); cursor:pointer" />
        </div>
      `;
    })
    .join('');

  list.querySelectorAll('.swatch-input').forEach((input) => {
    input.addEventListener('input', (e) => {
      const norm = e.target.dataset.norm;
      const val = e.target.value.toLowerCase();
      if (!norm) return;
      // Only store if changed from detected
      if (val === norm) {
        delete _colorMap[norm];
      } else {
        _colorMap[norm] = val;
      }
      // Batch write single key bbColorMap
      chrome.storage.sync.set({ bbColorMap: { ..._colorMap } });
      // Update preview swatch instantly (no flash — content.js cheap remap is synchronous DOM update)
      const row = e.target.closest('.swatch-row');
      if (row) {
        const peer = row.querySelectorAll('.mini-swatch')[1];
        if (peer) peer.style.background = val;
      }
    });
  });
}

function loadAndRender() {
  chrome.storage.local.get(['bbDetectedColors'], (localData) => {
    chrome.storage.sync.get(['bbColorMap'], (syncData) => {
      _detected = Array.isArray(localData.bbDetectedColors) ? localData.bbDetectedColors : [];
      _colorMap =
        syncData.bbColorMap && typeof syncData.bbColorMap === 'object' ? syncData.bbColorMap : {};
      renderSwatches();
    });
  });
}

export function initSwatches() {
  const searchEl = document.getElementById('swatchSearch');
  const showMoreBtn = document.getElementById('swatchShowMore');
  const rescanBtn = document.getElementById('swatchRescanBtn');
  const resetBtn = document.getElementById('swatchResetBtn');

  loadAndRender();

  if (searchEl) {
    searchEl.addEventListener('input', (e) => {
      _search = e.target.value || '';
      renderSwatches();
    });
  }

  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', () => {
      _showAll = !_showAll;
      renderSwatches();
    });
  }

  if (rescanBtn) {
    rescanBtn.addEventListener('click', () => {
      rescanBtn.textContent = 'Scanning…';
      rescanBtn.disabled = true;
      sendRescan();
      setTimeout(() => {
        rescanBtn.textContent = 'Rescan';
        rescanBtn.disabled = false;
        loadAndRender();
      }, 1200);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      _colorMap = {};
      chrome.storage.sync.set({ bbColorMap: {} }, () => {
        renderSwatches();
      });
    });
  }

  // Live update when detection publishes new list (~2s after navigation)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.bbDetectedColors) {
      _detected = Array.isArray(changes.bbDetectedColors.newValue)
        ? changes.bbDetectedColors.newValue
        : [];
      renderSwatches();
    }
    if (area === 'sync' && changes.bbColorMap) {
      _colorMap = changes.bbColorMap.newValue || {};
      renderSwatches();
    }
  });
}
