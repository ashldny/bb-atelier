// ═════════════════════════════════════════════════════════
//  Bb Atelier — Settings Tab
//  Version, reset, cache, import/export, custom domain, engine
// ═════════════════════════════════════════════════════════

import { showToast } from '../utils/ui.js';

function domainToPattern(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  if (raw.includes('://') && raw.includes('*')) return raw;
  let host = raw;
  try {
    if (host.includes('://')) host = new URL(host).hostname;
    else host = host.split('/')[0];
  } catch { host = host.split('/')[0]; }
  host = host.replace(/^\*\./, '').replace(/^\./, '');
  if (!host || host.length < 3 || !host.includes('.')) return null;
  if (!/^[a-zA-Z0-9.-]+$/.test(host)) return null;
  return `*://${host}/*`;
}

export function initSettingsTab() {
  // Version label
  try {
    const v = chrome.runtime.getManifest()?.version || '';
    const el = document.getElementById('versionLabel');
    if (el && v) el.textContent = `v${v} — Bb Atelier`;
  } catch (_e) { void _e; }

  // ── Custom Domain ──
  const domainInput = document.getElementById('customDomainInput');
  const domainBtn = document.getElementById('saveCustomDomainBtn');
  const domainStatus = document.getElementById('customDomainStatus');

  function setStatus(msg, ok) {
    if (!domainStatus) return;
    domainStatus.textContent = msg;
    domainStatus.className = 'settings-status ' + (ok ? 'ok' : ok === false ? 'err' : '');
  }

  // load existing
  chrome.storage.sync.get(['bbTheme'], (data) => {
    const d = data?.bbTheme?.customDomain || '';
    if (domainInput) domainInput.value = d;
    if (d) setStatus(`Active: ${d}`, true);
  });

  domainBtn?.addEventListener('click', async () => {
    const raw = domainInput?.value?.trim() || '';
    if (!raw) {
      chrome.storage.sync.get(['bbTheme'], (data) => {
        const bb = data.bbTheme || {};
        delete bb.customDomain;
        chrome.storage.sync.set({ bbTheme: bb }, () => {
          setStatus('Custom domain cleared', true);
          showToast('Custom domain cleared');
        });
      });
      return;
    }
    const pattern = domainToPattern(raw);
    if (!pattern) {
      setStatus('Invalid domain — e.g. blackboard.my-uni.edu', false);
      return;
    }
    // request host permission
    try {
      const granted = await chrome.permissions.request({ origins: [pattern] });
      if (!granted) {
        setStatus('Host permission denied', false);
        return;
      }
    } catch (_e) { void _e; }
    chrome.storage.sync.get(['bbTheme'], (data) => {
      const bb = data.bbTheme || {};
      bb.customDomain = raw;
      chrome.storage.sync.set({ bbTheme: bb }, () => {
        chrome.runtime.sendMessage({ action: 'requestHostPermission', pattern }).catch(()=>{});
        setStatus(`Saved: ${raw} → ${pattern}`, true);
        showToast('Custom domain saved');
      });
    });
  });

  domainInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') domainBtn?.click();
  });

  // ── Engine ──
  const engineRadios = document.querySelectorAll('input[name="engine"]');
  chrome.storage.sync.get(['bbTheme'], (data) => {
    const engine = data?.bbTheme?.engine || 'native';
    engineRadios.forEach((r) => { r.checked = r.value === engine; });
  });
  engineRadios.forEach((r) => {
    r.addEventListener('change', () => {
      if (!r.checked) return;
      chrome.storage.sync.get(['bbTheme'], (data) => {
        const bb = data.bbTheme || {};
        bb.engine = r.value;
        chrome.storage.sync.set({ bbTheme: bb }, () => {
          showToast(`Engine: ${r.value}`);
          // notify content
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]?.id) return;
            if (r.value === 'darkreader') chrome.tabs.sendMessage(tabs[0].id, { action: 'drEnable' }).catch(()=>{});
            else chrome.tabs.sendMessage(tabs[0].id, { action: 'drDisable' }).catch(()=>{});
          });
        });
      });
    });
  });

  // ── General toggles ──
  const autoApply = document.getElementById('autoApplyToggle');
  const showToastToggle = document.getElementById('showToastToggle');

  chrome.storage.sync.get(['bbTheme'], (data) => {
    const bb = data.bbTheme || {};
    if (autoApply) autoApply.checked = bb.autoApply !== false;
    if (showToastToggle) showToastToggle.checked = bb.showToast !== false;
  });

  autoApply?.addEventListener('change', () => {
    chrome.storage.sync.get(['bbTheme'], (data) => {
      const bb = data.bbTheme || {};
      bb.autoApply = autoApply.checked;
      chrome.storage.sync.set({ bbTheme: bb });
    });
  });
  showToastToggle?.addEventListener('change', () => {
    chrome.storage.sync.get(['bbTheme'], (data) => {
      const bb = data.bbTheme || {};
      bb.showToast = showToastToggle.checked;
      chrome.storage.sync.set({ bbTheme: bb });
    });
  });

  // ── Data actions ──
  document.getElementById('resetAllBtn')?.addEventListener('click', () => {
    if (!confirm('Reset all Bb Atelier settings to defaults? This will clear themes, colors and advanced options.')) return;
    chrome.storage.sync.remove(['bbTheme','pageBg','accent','navbar','customMode','bbColorMap','activeTab'], () => {
      chrome.storage.local.remove(['cachedCSS','font','fontName','bbDetectedColors'], () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'resetTheme' }).catch(()=>{});
          if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'drDisable' }).catch(()=>{});
        });
        showToast('Settings reset');
        setTimeout(()=> location.reload(), 600);
      });
    });
  });

  document.getElementById('clearCacheBtn')?.addEventListener('click', () => {
    chrome.storage.local.remove(['cachedCSS','bbDetectedColors'], () => {
      chrome.storage.sync.remove(['bbColorMap'], () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { type: 'BB_THEME_RESCAN' }).catch(()=>{});
        });
        showToast('Cache cleared — rescanning');
      });
    });
  });

  document.getElementById('exportSettingsBtn')?.addEventListener('click', () => {
    chrome.storage.sync.get(null, (syncData) => {
      chrome.storage.local.get(null, (localData) => {
        const payload = { version: 1, exportedAt: new Date().toISOString(), sync: syncData, local: { font: localData.font, fontName: localData.fontName, cachedCSS: localData.cachedCSS } };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bb-atelier-settings.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Settings exported');
      });
    });
  });

  const importBtn = document.getElementById('importSettingsBtn');
  const importFile = document.getElementById('importSettingsFile');
  importBtn?.addEventListener('click', () => importFile?.click());
  importFile?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.sync) throw new Error('Invalid');
        chrome.storage.sync.set(data.sync, () => {
          if (data.local) chrome.storage.local.set(data.local, () => {
            showToast('Settings imported — reloading');
            setTimeout(()=> location.reload(), 800);
          });
          else { showToast('Settings imported'); setTimeout(()=> location.reload(), 800); }
        });
      } catch {
        showToast('Invalid settings file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}
