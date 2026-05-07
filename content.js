console.log('BB Theme: content script running!');

// ── Theme Application ──────────────────────────────────────────────────────

// Load saved settings and apply them
chrome.storage.sync.get('bbTheme', (data) => {
  const settings = data.bbTheme;
  if (!settings) return;
  applyTheme(settings);
});

function applyTheme(settings) {
  const existing = document.getElementById('bb-custom-theme');
  if (existing) existing.remove();

  const style = document.createElement('style');
  style.id = 'bb-custom-theme';

  style.textContent = `

    /* ── Page background ── */
    body,
    #site-wrap,
    .inner-wrap,
    #main-content-inner,
    .base-activity-dashboard-container,
    .route-view-container {
      background-color: ${settings.bgColor} !important;
    }

    /* ── Sidebar / nav drawer ── */
    .MuiDrawerpaper-0-2-182,
    .themed-background-primary-fill-only,
    .themed-logo-background-primary-fill {
      background-color: ${settings.bgColor} !important;
    }

    /* ── Nav item hover & active states ── */
    .themed-background-primary-alt-fill-only:hover,
    .makeStylesactive-0-2-740,
    a.makeStylesactive-0-2-740 {
      background-color: ${settings.accentColor} !important;
    }

    /* ── Page header bar ── */
    .base-header,
    .commands_ac1f2108 {
      background-color: ${settings.bgColor} !important;
    }

    /* ── Activity stream item cards (resting state) ── */
    .stream-item-container,
    .base-recent-activity .activity-group,
    .base-recent-activity .activity-stream .activity-group
      [bb-click-to-invoke-child] {
      background-color: ${settings.bgColor} !important;
    }

    /* ── Activity stream item cards (hover state) ── */
    .base-recent-activity .activity-stream .activity-group
      [bb-click-to-invoke-child].child-is-invokable:hover {
      background-color: ${settings.hoverColor} !important;
    }

    /* ── Footer ── */
    [class*="makeStylesfooter"],
    .footer_ac1f2108,
    .footer_ec26d8ff {
      background-color: ${settings.bgColor} !important;
      border-top: 1px solid rgba(255,255,255,0.1) !important;
    }

    /* ── General text ── */
    body, div, span, p, li,
    h1, h2, h3, h4, h5, h6,
    .MuiTypographyroot-0-2-700,
    .headerText_ac1f2108,
    .content_b6e07515, .timestamp, .due-date {
      color: ${settings.textColor} !important;
    }

    /* ── Links ── */
    a,
    .root_519b8f72,
    .MuiLinkroot-0-2-694,
    .itemLink_1585b313 {
      color: ${settings.accentColor} !important;
    }

    /* ── Primary icons ── */
    .MuiSvgIconcolorPrimary-0-2-25 {
      color: ${settings.accentColor} !important;
    }

    /* ── Spinner ── */
    .circle_3a27529b {
      border-top-color: ${settings.accentColor} !important;
    }

    /* ── Focus ring ── */
    .fieldGroupIsFocused_7516d6cb,
    .fieldGroupIsFocused_7516d6cb:focus,
    .fieldGroupIsFocused_7516d6cb:hover {
      border-color: ${settings.accentColor} !important;
      box-shadow: inset 0 0 0 4px ${settings.accentColor}1a !important;
    }
  `;

  document.head.appendChild(style);
}

// Single listener handles both update and reset
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'BB_THEME_UPDATE') {
    applyTheme(msg.settings);
  }

  if (msg.type === 'BB_THEME_RESET') {
    const existing = document.getElementById('bb-custom-theme');
    if (existing) existing.remove();
  }
});