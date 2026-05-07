console.log('CONTENT SCRIPT LOADED');

let currentSettings = null;

// ── Load Saved Theme ──────────────────────────
chrome.storage.sync.get(
  'bbTheme',
  (data) => {

    const settings = data.bbTheme;

    if (settings) {

      currentSettings = settings;

      applyTheme(settings);
    }

  }
);

// ── Listen For Popup Messages ─────────────────
chrome.runtime.onMessage.addListener(
  (msg) => {

    console.log('MESSAGE RECEIVED:', msg);

    // Apply live update
    if (msg.type === 'BB_THEME_UPDATE') {

      currentSettings = msg.settings;

      applyTheme(msg.settings);
    }

    // Reset theme
    if (msg.type === 'BB_THEME_RESET') {

      const existing =
        document.getElementById(
          'bb-custom-theme'
        );

      if (existing) {
        existing.remove();
      }

      currentSettings = null;
    }

  }
);

// ── Apply Theme Function ──────────────────────
function applyTheme(settings) {

  if (!document.head) return;

  // Remove old theme
  const existing = document.getElementById('bb-custom-theme');

  if (existing) {
existing.remove();
  }

  // Create style tag
  const style = document.createElement('style');

  style.id = 'bb-custom-theme';

  style.textContent = `

    /* ── Main Backgrounds ── */
    body,
    #site-wrap,
    .inner-wrap,
    #main-content-inner,
    .base-header,
    .route-view-container,
    .base-activity-dashboard-container {
      background-color:
        ${settings.bgColor} !important;

      color:
        ${settings.textColor} !important;
    }

    /* ── Text ── */
    body,
    div,
    span,
    p,
    li,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      color:
        ${settings.textColor} !important;
    }

    /* ── Links ── */
    a {
      color:
        ${settings.accentColor} !important;
    }

    /* ── Hover States ── */
    button:hover,
    a:hover,
    [bb-click-to-invoke-child]:hover {
      background-color:
        ${settings.hoverColor} !important;
    }

    /* ── Buttons ── */
    button {
      border-color:
        ${settings.accentColor} !important;
    }

  `;

  document.head.appendChild(style);

  console.log('THEME APPLIED');

}

// ── Blackboard SPA Support ────────────────────
const observer = new MutationObserver(() => {

  if (currentSettings) {
    applyTheme(currentSettings);
  }

});

observer.observe(
  document.documentElement,
  {
    childList: true,
    subtree: true
  }
);