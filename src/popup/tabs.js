// ═════════════════════════════════════════════════════════
//  Bb Atelier — Tab Switching
// ═════════════════════════════════════════════════════════

/**
 * Initialize tab switching behaviour
 */
export function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabs.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      contents.forEach((c) => {
        c.classList.toggle('active', c.dataset.tab === tab);
      });

      chrome.storage.sync.set({ activeTab: tab });
    });
  });
}
