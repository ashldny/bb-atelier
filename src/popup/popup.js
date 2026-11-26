import { initTabs } from './tabs.js';
import { initTheme } from './theme.js';
import { initSaved } from './savedThemes.js';
import { initGallery } from './gallery.js';
import { initSystemScheme } from './systemScheme.js';
import { initAbout } from './about.js';
import { initCourseCovers } from './courseCovers.js';
import { initSettingsTab } from './settingsTab.js';
import { initCoverageAudit } from './coverageAudit.js';
import { initCustomSelects } from './customSelect.js';
import { DEFAULT_SETTINGS } from '../utils/constants.js';
import { setToastPreference, showToast } from '../utils/ui.js';
import { getTargetTab, sendToTab } from '../messaging/themeMessaging.js';

async function updateStatus() {
  const status = document.getElementById('connectionStatus');
  const tab = await getTargetTab();
  const connected = tab && (await sendToTab({ action: 'ping' }, { quiet: true }));
  const paused = !document.getElementById('masterToggle').checked;
  status.textContent = connected
    ? paused
      ? 'Customization paused'
      : connected.enabled
        ? 'Connected to Blackboard'
        : 'Choose a theme to apply'
    : 'Open Blackboard to see your changes';
  status.dataset.state = connected ? (paused ? 'paused' : 'connected') : 'idle';
  status.title = status.textContent;
}

async function boot() {
  try {
    const initialized = await chrome.runtime.sendMessage({ action: 'initializeStorage' });
    if (!initialized?.success)
      throw new Error(initialized?.error || 'Storage initialization failed');
    const [stored, local] = await Promise.all([
      chrome.storage.sync.get(null),
      chrome.storage.local.get(['font', 'fontName', 'customFonts', 'textScale', 'activeTab']),
    ]);
    const sync = { ...DEFAULT_SETTINGS, ...stored };
    setToastPreference(sync.bbTheme?.showToast !== false);
    initCustomSelects();
    initTheme(sync, local);
    initSaved();
    initGallery();
    initSystemScheme(sync);
    initSettingsTab(sync);
    initCoverageAudit();
    initAbout();
    // Course discovery runs on demand when its tab opens.
    await initCourseCovers();
    initTabs(local.activeTab || stored.activeTab);
    document.getElementById('masterToggle').disabled = false;
    document.body.removeAttribute('aria-busy');
    document.addEventListener('bb-status-change', updateStatus);
    updateStatus();
  } catch (error) {
    console.error('[BbAtelier] Popup startup:', error);
    showToast('Could not load your settings. Close and reopen the popup.', 'error');
    document.getElementById('connectionStatus').textContent = 'Settings could not load';
  }
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
