console.log('🖌 BB Theme is here~!');

// ─── Apply theme ───────────────────────────────────────
function applyTheme(bg, surface, accent, isDark) {
  const old = document.getElementById('bb-custom-theme');
  if (old) old.remove();

  // ── Auto-derive all colors from just 3 inputs ──
  const text   = isDark ? lighten(bg, 85) : darken(bg, 85);
  const muted  = isDark ? lighten(bg, 55) : darken(bg, 55);
  const border = isDark ? lighten(bg, 13) : darken(bg, 13);
  const hover  = lighten(accent, 15);
  const sidebarBg = isDark ? darken(surface, 5) : darken(bg, 5);

  const style = document.createElement('style');
  style.id = 'bb-custom-theme';
  style.textContent = `
    :root, [class*="theme"], [class*="Mui"],
    .main-container, .content-frame, .content-pane {
      --palette-background-default: ${bg} !important;
      --palette-background-paper: ${surface} !important;
      --palette-text-primary: ${text} !important;
      --palette-text-secondary: ${muted} !important;
      --palette-text-hint: ${muted} !important;
      --palette-text-disabled: ${text}66 !important;
      --palette-brand-main: ${accent} !important;
      --palette-brand-light: ${hover} !important;
      --palette-brand-dark: ${darken(accent, 10)} !important;
      --palette-border-main: ${border} !important;
      --palette-divider: ${border} !important;
      --palette-link-active: ${accent} !important;
      --palette-link-hover: ${hover} !important;
      --palette-action-active: ${text} !important;
      --palette-action-hover: ${hover} !important;
      --palette-focus-main: ${accent} !important;
      --palette-primary-main: ${accent} !important;
      --palette-primary-light: ${hover} !important;
    }

    html, body {
      background-color: ${bg} !important;
      color: ${text} !important;
    }

    /* Sidebar (left navigation) */
    [class*="sidebar"],
    [class*="navigation"],
    [class*="MenuArea"],
    nav[class*="makeStyles"] {
      background-color: ${sidebarBg} !important;
    }

    /* Sidebar selected item */
    [class*="sidebar"] [class*="selected"],
    [class*="sidebar"] [class*="active"],
    [class*="MenuArea"] [class*="selected"] {
      background-color: ${accent} !important;
      color: #fff !important;
    }

    a { color: ${accent} !important; }
    a:hover { color: ${hover} !important; }

    ::selection { background: ${accent}40 !important; }

    * { scrollbar-color: ${accent} ${bg} !important; }
    ::-webkit-scrollbar { width: 8px !important; }
    ::-webkit-scrollbar-track { background: ${bg} !important; }
    ::-webkit-scrollbar-thumb { background: ${border} !important; border-radius: 4px !important; }

    /* Cards, popups, dropdowns */
    [class*="MuiPaper"] { background-color: ${surface} !important; }
    [class*="MuiDrawer"] [class*="paper"] { background-color: ${surface} !important; }
    [class*="MuiAppBar"] { background-color: ${bg} !important; }
    [class*="MuiTableCell"] { border-bottom-color: ${border} !important; }

    /* Top header / banner */
    [class*="themed-logo"],
    header[role="banner"] {
      background-color: ${bg} !important;
    }

    /* Inline-style backgrounds from MUI */
    [style*="background-color"]:not(img):not(svg):not([style*="transparent"]) {
      background-color: ${bg} !important;
    }
  `;

  document.head.appendChild(style);
}

// ─── Watch for MUI nuking our style ────────────────────
let observer = null;
let last = { bg: '#121212', surface: '#1E1E1E', accent: '#6366f1', isDark: true };

function startWatcher() {
  if (observer) observer.disconnect();
  observer = new MutationObserver(() => {
    if (!document.getElementById('bb-custom-theme')) {
      applyTheme(last.bg, last.surface, last.accent, last.isDark);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function resetTheme() {
  const el = document.getElementById('bb-custom-theme');
  if (el) el.remove();
  if (observer) observer.disconnect();
}

// ─── Load & apply ──────────────────────────────────────
function loadAndApply() {
  chrome.storage.sync.get(['customMode', 'customBg', 'customSurface', 'customAccent', 'isLightTheme'], (data) => {
    if (!data.customMode) return; // Default mode = no custom styles
    const isLight = data.isLightTheme === true;
    const theme = {
      bg:      data.customBg      || (isLight ? '#f8f8f8' : '#121212'),
      surface: data.customSurface || (isLight ? '#ffffff' : '#1E1E1E'),
      accent:  data.customAccent  || (isLight ? '#1a73e8' : '#6366f1'),
      isDark:  !isLight,
    };
    last = theme;
    applyTheme(theme.bg, theme.surface, theme.accent, !isLight);
    startWatcher();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAndApply);
} else {
  loadAndApply();
}

// ─── Message listener ───────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'applyTheme') {
    last = { bg: msg.bg, surface: msg.surface, accent: msg.accent, isDark: msg.isDark };
    applyTheme(msg.bg, msg.surface, msg.accent, msg.isDark);
    startWatcher();
  }
  if (msg.action === 'resetTheme') resetTheme();

  // ─── Apply font (from content script so it persists MUI re-renders) ───
  if (msg.action === 'applyFont') {
    const s = document.getElementById('bb-font-style') || document.createElement('style');
    s.id = 'bb-font-style';
    s.textContent = `body, * { font-family: "${msg.font}", sans-serif !important; }`;
    document.head.appendChild(s);
  }

  // ─── Scrape course names for course covers ───
  if (msg.action === 'getCourses') {
    const courses = [];
    // Try to find course elements in Blackboard Ultra
    document.querySelectorAll('[class*="course"], [class*="Course"], [class*="menu-item"]').forEach((el) => {
      const text = el.textContent?.trim();
      const href = el.closest('a')?.getAttribute('href') || el.getAttribute('href') || '';
      if (text && text.length > 1 && text.length < 80) {
        const id = href.split('/').pop() || text.toLowerCase().replace(/\s+/g, '-');
        if (!courses.find((c) => c.id === id)) {
          courses.push({ id, name: text });
        }
      }
    });
    // Fallback: just send page title
    if (courses.length === 0) {
      courses.push({ id: 'default', name: document.title || 'Blackboard' });
    }
    sendResponse(courses);
    return true; // Keep channel open for async response
  }

  return true;
});

// ─── Helpers ────────────────────────────────────────────
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
  const { r, g, b } = hexToRgb(hex);
  const f = 1 + percent / 100;
  return rgbToHex(Math.min(255, r * f), Math.min(255, g * f), Math.min(255, b * f));
}
function darken(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - percent / 100;
  return rgbToHex(r * f, g * f, b * f);
}