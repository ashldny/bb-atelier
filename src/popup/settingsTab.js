import { showToast, setToastPreference } from '../utils/ui.js';
import { domainToPattern } from '../utils/domains.js';
import { updateOptions } from '../utils/storage.js';
import { downloadJson } from '../utils/files.js';
import { validateSettingsImport } from '../utils/importValidation.js';
import { validateFileSize } from '../utils/sanitization.js';
import { sendToTab, invalidateTargetTab } from '../messaging/themeMessaging.js';
import { DEFAULT_SETTINGS } from '../utils/constants.js';
import { setPaletteInputs } from './theme.js';
import { restoreFontControl } from './fonts.js';

export function initSettingsTab(sync) {
  document.getElementById('versionLabel').textContent =
    `Bb Atelier · ${chrome.runtime.getManifest().version}`;
  const input = document.getElementById('customDomainInput');
  const button = document.getElementById('saveCustomDomainBtn');
  const status = document.getElementById('customDomainStatus');
  input.value = sync.bbTheme?.customDomain || '';
  function showStatus(text, ok) {
    status.textContent = text;
    status.className = `settings-status ${ok ? 'ok' : 'err'}`;
  }
  async function connectDomain() {
    const raw = input.value.trim();
    const pattern = domainToPattern(raw);
    if (raw && !pattern) return showStatus('Enter a domain such as blackboard.example.edu.', false);
    button.disabled = true;
    try {
      // Request only from the original user gesture, before persisting the domain.
      if (pattern && !(await chrome.permissions.request({ origins: [pattern] }))) {
        showStatus('Site access was declined. Use Connect to try again.', false);
        return;
      }
      await updateOptions({ customDomain: raw });
      invalidateTargetTab();
      const result = await chrome.runtime.sendMessage({ action: 'syncCustomDomain' });
      if (!result?.success)
        throw new Error(result?.error || 'Could not connect this site. Try again.');
      showStatus(
        raw
          ? 'Connected. Open Blackboard on this domain to customize it.'
          : 'Custom domain removed.',
        true
      );
      document.dispatchEvent(new Event('bb-status-change'));
    } catch (error) {
      showStatus(error.message, false);
    } finally {
      button.disabled = false;
    }
  }
  button.addEventListener('click', connectDomain);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') connectDomain();
  });
  document.querySelectorAll('input[name="engine"]').forEach((radio) => {
    radio.checked = radio.value === (sync.bbTheme?.engine || 'native');
    radio.addEventListener('change', async () => {
      if (!radio.checked) return;
      try {
        await updateOptions({ engine: radio.value });
        await sendToTab({ action: 'refreshSettings' });
        showToast(radio.value === 'native' ? 'Using native styling' : 'Using Dark Reader');
      } catch {
        showToast('Could not change the engine.', 'error');
      }
    });
  });
  const autoApply = document.getElementById('autoApplyToggle');
  const toastToggle = document.getElementById('showToastToggle');
  autoApply.checked = sync.bbTheme?.autoApply !== false;
  toastToggle.checked = sync.bbTheme?.showToast !== false;
  autoApply.addEventListener('change', () =>
    updateOptions({ autoApply: autoApply.checked }).catch(() =>
      showToast('Could not save this setting.', 'error')
    )
  );
  toastToggle.addEventListener('change', () => {
    setToastPreference(toastToggle.checked);
    updateOptions({ showToast: toastToggle.checked }).catch(() =>
      showToast('Could not save this setting.', 'error')
    );
  });
  document.getElementById('clearCacheBtn').addEventListener('click', async () => {
    await chrome.storage.local.remove(['cachedCSS', 'bbDetectedColors']);
    await sendToTab({ action: 'refreshSettings' });
    showToast('Cache cleared');
  });
  document.getElementById('resetAllBtn').addEventListener('click', async () => {
    if (
      !confirm(
        'Reset all customization? This removes saved themes, fonts, covers and the image library. Export a backup first if you want to keep them.'
      )
    )
      return;
    try {
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      await chrome.storage.sync.set(DEFAULT_SETTINGS);
      refreshUi(DEFAULT_SETTINGS, {});
      await sendToTab({ action: 'refreshSettings' });
      showToast('Reset to Default Dark');
    } catch {
      showToast('Could not complete the reset. Try again.', 'error');
    }
  });
  document.getElementById('exportSettingsBtn').addEventListener('click', async () => {
    const [savedSync, local] = await Promise.all([
      chrome.storage.sync.get(null),
      chrome.storage.local.get(null),
    ]);
    delete local.cachedCSS;
    delete local.bbDetectedColors;
    downloadJson(
      { version: 2, exportedAt: new Date().toISOString(), sync: savedSync, local },
      'bb-atelier-settings.json'
    );
  });
  const fileInput = document.getElementById('importSettingsFile');
  document.getElementById('importSettingsBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      if (!validateFileSize(file.size, 30 * 1024 * 1024))
        throw new Error('Choose a backup under 30 MB.');
      const data = validateSettingsImport(JSON.parse(await file.text()));
      // A backup cannot silently grant access to another website.
      const pattern = domainToPattern(data.sync.bbTheme.customDomain);
      if (pattern && !(await chrome.permissions.contains({ origins: [pattern] }))) {
        data.sync.bbTheme.customDomain = '';
        showStatus('Custom domain needs site access. Enter it above and use Connect.', false);
      }
      await chrome.storage.local.set(data.local);
      await chrome.storage.sync.set(data.sync);
      refreshUi(data.sync, data.local);
      await sendToTab({ action: 'refreshSettings' });
      showToast('Backup imported');
    } catch (error) {
      showToast(error.message || 'Could not import this backup.', 'error');
    }
  });

  function refreshUi(next, local) {
    invalidateTargetTab();
    setPaletteInputs(next);
    restoreFontControl(local);
    input.value = next.bbTheme?.customDomain || '';
    autoApply.checked = next.bbTheme?.autoApply !== false;
    toastToggle.checked = next.bbTheme?.showToast !== false;
    setToastPreference(toastToggle.checked);
    document.querySelectorAll('input[name="engine"]').forEach((radio) => {
      radio.checked = radio.value === (next.bbTheme?.engine || 'native');
    });
    const toggle = document.getElementById('masterToggle');
    toggle.checked = next.masterEnabled !== false;
    document.getElementById('customizationControls').disabled = !toggle.checked;
    document.getElementById('pausedNotice').hidden = toggle.checked;
    document.body.classList.toggle('master-off', !toggle.checked);
    document.dispatchEvent(new Event('bb-status-change'));
  }
}
