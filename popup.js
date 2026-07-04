document.addEventListener('DOMContentLoaded', () => {
  initAppearance();
  initPresets();
  initCustomize();
  initSaved();
  initCourseCovers();
  loadSettings();
});

// ═════════════════════════════════════════════════════════
//  Messaging
// ═════════════════════════════════════════════════════════
function applyTheme(bg, surface, accent, isDark) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'applyTheme', bg, surface, accent, isDark,
    }).catch(() => {});
  });
}

function resetTheme() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'resetTheme' }).catch(() => {});
  });
}

// ═════════════════════════════════════════════════════════
//  Color helpers
// ═════════════════════════════════════════════════════════
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c =>
    Math.min(255, Math.max(0, Math.round(c))).toString(16).padStart(2, '0')
  ).join('').substring(0, 7);
}
function lighten(hex, percent) {
  if (!hex) return '#ffffff';
  const { r, g, b } = hexToRgb(hex);
  const f = 1 + percent / 100;
  return rgbToHex(Math.min(255, r * f), Math.min(255, g * f), Math.min(255, b * f));
}
function darken(hex, percent) {
  if (!hex) return '#000000';
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - percent / 100;
  return rgbToHex(r * f, g * f, b * f);
}

// ═════════════════════════════════════════════════════════
//  Toggle custom-theme vs default
// ═════════════════════════════════════════════════════════
function toggleCustomMode(enabled) {
  const els = [
    document.getElementById('presetsSection'),
    document.getElementById('applyCustomBtn'),
    document.getElementById('saveCurrentBtn'),
  ];
  els.forEach((el) => {
    if (!el) return;
    el.style.opacity = enabled ? '1' : '0.35';
    el.style.pointerEvents = enabled ? 'auto' : 'none';
  });
  // Color pickers
  ['customAccent', 'customBg', 'customSurface', 'fontSelect'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = !enabled;
  });
}

// ═════════════════════════════════════════════════════════
//  1. APPEARANCE
// ═════════════════════════════════════════════════════════
function initAppearance() {
  document.querySelectorAll('input[name="appearance"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const isCustom = radio.value === 'custom';
      chrome.storage.sync.set({ customMode: isCustom }, () => {
        toggleCustomMode(isCustom);
        if (isCustom) {
          // Load last used theme, fall back to last saved custom colors
          chrome.storage.sync.get(['customBg', 'customSurface', 'customAccent', 'lightPreset', 'isLightTheme'], (data) => {
            const isLight = data.lightPreset === 'default' || data.isLightTheme === true;
            const bg      = data.customBg      || (isLight ? '#f8f8f8' : '#121212');
            const surface = data.customSurface  || (isLight ? '#ffffff' : '#1E1E1E');
            const accent  = data.customAccent   || (isLight ? '#1a73e8' : '#6366f1');
            applyTheme(bg, surface, accent, !isLight);
          });
        } else {
          resetTheme();
        }
      });
    });
  });
}

// ═════════════════════════════════════════════════════════
//  2. PRESETS
// ═════════════════════════════════════════════════════════
const PRESETS = {
  'default':     { bg: '#f8f8f8', surface: '#ffffff', accent: '#1a73e8', isDark: false, name: 'Default' },
  'midnight':    { bg: '#0a0a1a', surface: '#1a1a2e', accent: '#a855f7', isDark: true,  name: 'Midnight' },
  'ocean':       { bg: '#0c1a2e', surface: '#162a3e', accent: '#38bdf8', isDark: true,  name: 'Ocean' },
  'forest':      { bg: '#0f1a0f', surface: '#1a2a1a', accent: '#22c55e', isDark: true,  name: 'Forest' },
  'lavender':    { bg: '#1a1025', surface: '#2a1a3e', accent: '#c084fc', isDark: true,  name: 'Lavender' },
  'rose':        { bg: '#1f0f14', surface: '#2e1420', accent: '#f43f5e', isDark: true,  name: 'Rose' },
  'sakura':      { bg: '#1a1218', surface: '#2a1a22', accent: '#f472b6', isDark: true,  name: 'Sakura' },
  'nord':        { bg: '#1e262b', surface: '#2e3b42', accent: '#88c0d0', isDark: true,  name: 'Nord' },
  'catppuccin':  { bg: '#11111b', surface: '#1e1e2e', accent: '#cba6f7', isDark: true,  name: 'Catppuccin' },
  'tokyo-night': { bg: '#0d111c', surface: '#161b2b', accent: '#7aa2f7', isDark: true,  name: 'Tokyo Night' },
  'solarized':   { bg: '#002b36', surface: '#073642', accent: '#268bd2', isDark: true,  name: 'Solarized' },
};

function renderPresetCard(key, p) {
  const card = document.createElement('div');
  card.className = 'preset-card';
  card.dataset.preset = key;
  card.style.setProperty('--c1', p.bg);
  card.style.setProperty('--c2', p.surface);
  card.style.setProperty('--c3', p.accent);
  card.innerHTML = `
    <span class="preset-swatches">
      <span class="swatch" style="background:var(--c1)"></span>
      <span class="swatch" style="background:var(--c2)"></span>
      <span class="swatch" style="background:var(--c3)"></span>
    </span>
    <span class="preset-name">${p.name}</span>
  `;
  card.addEventListener('click', () => {
    const isCustom = document.querySelector('input[name="appearance"]:checked').value === 'custom';
    if (!isCustom) return;

    document.querySelectorAll('.preset-card').forEach((c) => c.classList.remove('active'));
    card.classList.add('active');

    const isLight = !p.isDark;
    chrome.storage.sync.set({
      preset: key,
      lightPreset: p.isDark ? null : key,
      isLightTheme: isLight,
      customBg: p.bg,
      customSurface: p.surface,
      customAccent: p.accent,
    }, () => {
      document.getElementById('customBg').value = p.bg;
      document.getElementById('customSurface').value = p.surface;
      document.getElementById('customAccent').value = p.accent;
      applyTheme(p.bg, p.surface, p.accent, p.isDark);
    });
  });
  return card;
}

function initPresets() {
  const lightGrid = document.getElementById('lightPresets');
  const darkGrid = document.getElementById('darkPresets');
  lightGrid.innerHTML = '';
  darkGrid.innerHTML = '';

  Object.entries(PRESETS).forEach(([key, p]) => {
    const card = renderPresetCard(key, p);
    if (p.isDark) {
      darkGrid.appendChild(card);
    } else {
      lightGrid.appendChild(card);
    }
  });
}

// ═════════════════════════════════════════════════════════
//  3. CUSTOMIZE
// ═════════════════════════════════════════════════════════
function initCustomize() {
  document.getElementById('applyCustomBtn').addEventListener('click', () => {
    const isCustom = document.querySelector('input[name="appearance"]:checked').value === 'custom';
    if (!isCustom) return;

    const bg = document.getElementById('customBg').value;
    const surface = document.getElementById('customSurface').value;
    const accent = document.getElementById('customAccent').value;

    // Determine if it's light or dark based on bg brightness
    const { r, g, b } = hexToRgb(bg);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const isDark = brightness < 128;

    chrome.storage.sync.set({
      preset: null,
      lightPreset: null,
      isLightTheme: !isDark,
      customBg: bg,
      customSurface: surface,
      customAccent: accent,
    }, () => {
      document.querySelectorAll('.preset-card').forEach((c) => c.classList.remove('active'));
      applyTheme(bg, surface, accent, isDark);
    });
  });

  // Font upload
  document.getElementById('fontSelect').addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      document.getElementById('fontUpload').click();
    } else {
      applyFont(e.target.value);
      chrome.storage.sync.set({ font: e.target.value });
    }
  });

  document.getElementById('fontUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      chrome.storage.sync.set({ font: dataUrl, fontName: file.name }, () => {
        applyFont(dataUrl);
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
}

function applyFont(font) {
  if (font.startsWith('data:')) {
    const style = document.getElementById('bb-font-style') || (() => {
      const s = document.createElement('style');
      s.id = 'bb-font-style';
      document.head.appendChild(s);
      return s;
    })();
    style.textContent = `
      @font-face {
        font-family: 'CustomFont';
        src: url(${font}) format('truetype');
      }
      body, * { font-family: 'CustomFont', sans-serif !important; }
    `;
  } else {
    const style = document.getElementById('bb-font-style');
    if (style) style.remove();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'applyFont',
        font: font,
      }).catch(() => {});
    });
  }
}

// ═════════════════════════════════════════════════════════
//  4. SAVED THEMES
// ═════════════════════════════════════════════════════════
function initSaved() {
  document.getElementById('saveCurrentBtn').addEventListener('click', () => {
    const isCustom = document.querySelector('input[name="appearance"]:checked').value === 'custom';
    if (!isCustom) return;

    const name = prompt('Theme name:', 'My Theme');
    if (!name) return;
    const bg = document.getElementById('customBg').value;
    const surface = document.getElementById('customSurface').value;
    const accent = document.getElementById('customAccent').value;
    chrome.storage.sync.get(['savedThemes'], (data) => {
      const themes = data.savedThemes || {};
      themes[name] = { bg, surface, accent };
      chrome.storage.sync.set({ savedThemes: themes }, renderSaved);
    });
  });
  renderSaved();
}

function renderSaved() {
  chrome.storage.sync.get(['savedThemes'], (data) => {
    const themes = data.savedThemes || {};
    const list = document.getElementById('savedList');
    const keys = Object.keys(themes);

    if (keys.length === 0) {
      list.innerHTML = '<div class="saved-empty">No saved themes yet</div>';
      return;
    }

    list.innerHTML = keys.map((name) => {
      const t = themes[name];
      return `
        <div class="saved-row" data-name="${name}">
          <span class="saved-swatches">
            <span class="mini-swatch" style="background:${t.bg}"></span>
            <span class="mini-swatch" style="background:${t.surface}"></span>
            <span class="mini-swatch" style="background:${t.accent}"></span>
          </span>
          <span class="saved-name">${name}</span>
          <button class="btn tiny load-saved" title="Load theme">▶</button>
          <button class="btn tiny danger delete-saved" title="Delete">✕</button>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.load-saved').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.saved-row');
        const name = row.dataset.name;
        chrome.storage.sync.get(['savedThemes'], (data) => {
          const t = data.savedThemes[name];
          if (!t) return;
          // Auto-detect light/dark from bg brightness
          const { r, g, b } = hexToRgb(t.bg);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          const isDark = brightness < 128;

          document.getElementById('customBg').value = t.bg;
          document.getElementById('customSurface').value = t.surface;
          document.getElementById('customAccent').value = t.accent;
          document.querySelectorAll('.preset-card').forEach((c) => c.classList.remove('active'));
          // Switch to custom mode if not already
          document.querySelector('input[name="appearance"][value="custom"]').click();
          applyTheme(t.bg, t.surface, t.accent, isDark);
        });
      });
    });

    list.querySelectorAll('.delete-saved').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.saved-row');
        const name = row.dataset.name;
        chrome.storage.sync.get(['savedThemes'], (data) => {
          const themes = data.savedThemes || {};
          delete themes[name];
          chrome.storage.sync.set({ savedThemes: themes }, renderSaved);
        });
      });
    });
  });
}

// ═════════════════════════════════════════════════════════
//  5. COURSE COVERS
// ═════════════════════════════════════════════════════════
function initCourseCovers() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getCourses' }, (courses) => {
      if (!courses || !Array.isArray(courses)) return;
      const select = document.getElementById('courseSelect');
      select.innerHTML = '<option value="">Select a course...</option>';
      courses.forEach((c) => {
        select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
    });
  });

  document.getElementById('courseSelect').addEventListener('change', (e) => {
    const courseId = e.target.value;
    if (!courseId) return;
    chrome.storage.sync.get(['courseCovers'], (data) => {
      const covers = data.courseCovers || {};
      const img = document.getElementById('coverImage');
      img.src = covers[courseId] || '';
    });
  });

  document.getElementById('uploadCoverBtn').addEventListener('click', () => {
    document.getElementById('coverUpload').click();
  });

  document.getElementById('coverUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const courseId = document.getElementById('courseSelect').value;
      if (!courseId) return;
      chrome.storage.sync.get(['courseCovers'], (data) => {
        const covers = data.courseCovers || {};
        covers[courseId] = dataUrl;
        chrome.storage.sync.set({ courseCovers: covers }, () => {
          document.getElementById('coverImage').src = dataUrl;
        });
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  document.getElementById('removeCoverBtn').addEventListener('click', () => {
    const courseId = document.getElementById('courseSelect').value;
    if (!courseId) return;
    chrome.storage.sync.get(['courseCovers'], (data) => {
      const covers = data.courseCovers || {};
      delete covers[courseId];
      chrome.storage.sync.set({ courseCovers: covers }, () => {
        document.getElementById('coverImage').src = '';
      });
    });
  });
}

// ═════════════════════════════════════════════════════════
//  Load all saved settings
// ═════════════════════════════════════════════════════════
function loadSettings() {
  chrome.storage.sync.get(
    ['customMode', 'preset', 'customBg', 'customSurface', 'customAccent', 'font', 'lightPreset', 'isLightTheme'],
    (data) => {
      // Appearance
      const isCustom = data.customMode === true;
      document.querySelector(`input[name="appearance"][value="${isCustom ? 'custom' : 'default'}"]`).checked = true;
      toggleCustomMode(isCustom);

      // Customize
      if (data.customBg)      document.getElementById('customBg').value = data.customBg;
      if (data.customSurface)  document.getElementById('customSurface').value = data.customSurface;
      if (data.customAccent)   document.getElementById('customAccent').value = data.customAccent;
      if (data.font) {
        const select = document.getElementById('fontSelect');
        const knownFonts = ['Inter', 'system-ui', 'Segoe UI', 'Roboto'];
        if (knownFonts.includes(data.font)) {
          select.value = data.font;
        } else {
          select.value = 'custom';
        }
      }

      // Preset highlight
      if (data.preset) {
        document.querySelectorAll('.preset-card').forEach((c) => c.classList.remove('active'));
        const match = document.querySelector(`.preset-card[data-preset="${data.preset}"]`);
        if (match) match.classList.add('active');
      }

      // Apply theme if in custom mode
      if (isCustom) {
        const isLight = data.lightPreset === 'default' || data.isLightTheme === true;
        const bg      = data.customBg      || (isLight ? '#f8f8f8' : '#121212');
        const surface = data.customSurface  || (isLight ? '#ffffff' : '#1E1E1E');
        const accent  = data.customAccent   || (isLight ? '#1a73e8' : '#6366f1');
        applyTheme(bg, surface, accent, !isLight);
      }
    }
  );
}