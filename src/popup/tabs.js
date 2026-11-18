// Both tab groups use the same ARIA and keyboard behavior.
export function initTabGroup(buttonSelector, panelSelector, attribute, initial) {
  const buttons = [...document.querySelectorAll(buttonSelector)];
  const panels = [...document.querySelectorAll(panelSelector)];
  function activate(button, focus = false) {
    buttons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      item.id ||= `nav-${item.dataset[attribute]}`;
    });
    panels.forEach((panel) => {
      const selected = panel.dataset[attribute] === button.dataset[attribute];
      panel.classList.toggle('active', selected);
      panel.hidden = !selected;
      panel.setAttribute('aria-labelledby', `nav-${panel.dataset[attribute]}`);
    });
    // Slide the group's indicator (line or pill) under the active tab. Index-based CSS
    // math keeps it correct even while the group sits in a hidden panel.
    const nav = button.parentElement;
    nav.style.setProperty('--tab-count', String(buttons.length));
    nav.style.setProperty('--tab-index', String(buttons.indexOf(button)));
    if (focus) button.focus();
    document.dispatchEvent(
      new CustomEvent('bb-tab-change', {
        detail: { group: attribute, value: button.dataset[attribute] },
      })
    );
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => activate(button));
    button.addEventListener('keydown', (event) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? buttons.length - 1
            : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      activate(buttons[next], true);
    });
  });
  activate(buttons.find((button) => button.dataset[attribute] === initial) || buttons[0]);
}

export function initTabs(initial = 'theme') {
  initTabGroup('.tab-btn', '.tab-content', 'tab', initial);
  document.addEventListener('bb-tab-change', (event) => {
    if (event.detail.group === 'tab')
      chrome.storage.local.set({ activeTab: event.detail.value }).catch(() => {});
  });
}
