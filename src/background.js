import { DEFAULT_SETTINGS } from './utils/constants.js';
import { domainToPattern } from './utils/domains.js';
import { migrateLegacyStorage } from './utils/migrations.js';

const CUSTOM_ID = 'bb-atelier-custom';
let registration = Promise.resolve();
let startup;

function reconcileDomain() {
  registration = registration
    .catch(() => {})
    .then(async () => {
      const { bbTheme } = await chrome.storage.sync.get('bbTheme');
      const pattern = domainToPattern(bbTheme?.customDomain);
      const scripts = await chrome.scripting.getRegisteredContentScripts();
      const current = scripts.find((script) => script.id === CUSTOM_ID);
      const granted = pattern && (await chrome.permissions.contains({ origins: [pattern] }));
      if (current && (!granted || current.matches[0] !== pattern)) {
        await chrome.scripting.unregisterContentScripts({ ids: [CUSTOM_ID] });
      }
      if (!granted)
        return {
          success: !pattern,
          error: pattern ? 'Grant site access with Connect.' : undefined,
        };
      if (!current || current.matches[0] !== pattern)
        await chrome.scripting.registerContentScripts([
          {
            id: CUSTOM_ID,
            matches: [pattern],
            js: ['content.js'],
            runAt: 'document_start',
            allFrames: true,
            persistAcrossSessions: true,
          },
        ]);
      const tabs = await chrome.tabs.query({ url: pattern });
      await Promise.allSettled(
        tabs
          .filter((tab) => tab.id)
          .map((tab) =>
            chrome.scripting.executeScript({
              target: { tabId: tab.id, allFrames: true },
              files: ['content.js'],
            })
          )
      );
      return { success: true };
    });
  return registration;
}

async function initialize() {
  await migrateLegacyStorage();
  const saved = await chrome.storage.sync.get(['customMode', 'pageBg', 'accent', 'navbar']);
  if (!Object.keys(saved).length) await chrome.storage.sync.set(DEFAULT_SETTINGS);
  await reconcileDomain();
}

function ensureInitialized() {
  startup ||= initialize().catch((error) => {
    startup = undefined;
    throw error;
  });
  return startup;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (
    area === 'sync' &&
    changes.bbTheme?.newValue?.customDomain !== changes.bbTheme?.oldValue?.customDomain
  ) {
    reconcileDomain().catch((error) => console.warn('[BbAtelier] Custom site:', error.message));
  }
});
chrome.permissions.onRemoved.addListener(async () => {
  try {
    const { bbTheme } = await chrome.storage.sync.get('bbTheme');
    const pattern = domainToPattern(bbTheme?.customDomain);
    if (pattern && !(await chrome.permissions.contains({ origins: [pattern] }))) {
      // Also stop styling pages that were injected before the user revoked access.
      await chrome.storage.sync.set({ bbTheme: { ...bbTheme, customDomain: '' } });
    }
    await reconcileDomain();
  } catch (error) {
    console.warn('[BbAtelier] Site access:', error.message);
  }
});
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.action === 'initializeStorage') {
    ensureInitialized()
      .then(() => respond({ success: true }))
      .catch((error) => respond({ success: false, error: error.message }));
    return true;
  }
  if (message?.action === 'syncCustomDomain') {
    reconcileDomain()
      .then(respond)
      .catch((error) => respond({ success: false, error: error.message }));
    return true;
  }
  if (message?.action === 'getRegisteredDomains') {
    chrome.scripting
      .getRegisteredContentScripts()
      .then((scripts) => respond({ scripts }))
      .catch(() => respond({ scripts: [] }));
    return true;
  }
  return false;
});
chrome.runtime.onInstalled.addListener(() => ensureInitialized().catch(console.error));
chrome.runtime.onStartup.addListener(() => ensureInitialized().catch(console.error));
ensureInitialized().catch((error) => console.error('[BbAtelier] Startup:', error.message));
