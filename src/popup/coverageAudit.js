// Settings → Theme coverage: asks the open Blackboard page which visible parts
// still use Blackboard's own colours, and lists them with where they came from.
import { sendToTab } from '../messaging/themeMessaging.js';
import { escapeHtml } from '../utils/sanitization.js';
import { showToast } from '../utils/ui.js';

const SOURCE_LABEL = {
  'inline style': 'set directly on the element',
  'cross-origin stylesheet': 'Blackboard’s CDN stylesheet',
  'site rule': 'page stylesheet',
  'inherited / default': 'browser default',
};

function toReport(result) {
  return [
    `Bb Atelier coverage report — ${new Date().toISOString()}`,
    `Checked ${result.checked} elements, ${result.issues.length} unthemed groups`,
    '',
    ...result.issues.map((i) => `${i.count}× ${i.prop} ${i.color} | ${i.source} | ${i.path}`),
  ].join('\n');
}

export function initCoverageAudit() {
  const button = document.getElementById('auditThemeBtn');
  const copy = document.getElementById('copyAuditBtn');
  const summary = document.getElementById('auditSummary');
  const list = document.getElementById('auditList');
  let report = '';

  button.addEventListener('click', async () => {
    button.disabled = true;
    summary.className = 'settings-status';
    summary.textContent = 'Checking…';
    list.replaceChildren();
    const result = await sendToTab({ action: 'auditTheme' }, { quiet: true });
    button.disabled = false;
    if (!result?.success) {
      summary.textContent = 'Open a Blackboard page in this tab, then check again.';
      summary.classList.add('err');
      copy.hidden = true;
      return;
    }
    if (!result.enabled) {
      summary.textContent = 'Turn customization on to check theme coverage.';
      summary.classList.add('err');
      copy.hidden = true;
      return;
    }
    report = toReport(result);
    copy.hidden = !result.issues.length;
    if (!result.issues.length) {
      summary.textContent = `Everything on this page uses your theme (${result.checked} elements checked).`;
      summary.classList.add('ok');
      return;
    }
    summary.textContent = `${result.issues.length} areas still use Blackboard’s colours.`;
    list.innerHTML = result.issues
      .slice(0, 12)
      .map(
        (i) => `<li>
          <span class="audit-chip" style="background:${escapeHtml(i.color)}"></span>
          <span><strong>${escapeHtml(i.path)}</strong>
          <small>${escapeHtml(i.prop)} · ${escapeHtml(SOURCE_LABEL[i.source] || i.source)} · ${i.count}×</small></span>
        </li>`
      )
      .join('');
  });

  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(report);
      showToast('Report copied');
    } catch {
      showToast('Could not copy the report.', 'error');
    }
  });
}
