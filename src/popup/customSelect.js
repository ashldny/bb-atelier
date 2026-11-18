// Styled dropdown layered over a native <select>. The native element stays the source of
// truth (value, change events, tests); this only renders a matching trigger and menu.
const instances = new WeakMap();
let openInstance = null;

const CHEVRON =
  '<svg class="select-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

function closeOpen() {
  openInstance?.close();
}

export function enhanceSelect(select) {
  if (instances.has(select)) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'select';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'select-trigger';
  trigger.id = `${select.id}Trigger`;
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = `<span class="select-value"></span>${CHEVRON}`;
  const menu = document.createElement('ul');
  menu.className = 'select-menu';
  menu.id = `${select.id}Menu`;
  menu.setAttribute('role', 'listbox');
  menu.tabIndex = -1;
  menu.hidden = true;
  trigger.setAttribute('aria-controls', menu.id);

  select.before(wrapper);
  wrapper.append(select, trigger, menu);
  select.classList.add('select-native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  document.querySelector(`label[for="${select.id}"]`)?.setAttribute('for', trigger.id);

  let active = -1;
  const keepOpen = select.hasAttribute('data-keep-open');
  const items = () => [...menu.querySelectorAll('.select-option')];

  function highlight(index) {
    const list = items();
    if (!list.length) return;
    active = Math.max(0, Math.min(index, list.length - 1));
    list.forEach((item, i) => item.classList.toggle('highlighted', i === active));
    list[active].scrollIntoView?.({ block: 'nearest' });
    menu.setAttribute('aria-activedescendant', list[active].id);
  }

  function addOption(option, index) {
    const item = document.createElement('li');
    item.className = 'select-option';
    item.id = `${select.id}-opt-${index}`;
    item.setAttribute('role', 'option');
    item.dataset.value = option.value;
    item.textContent = option.textContent;
    // Lets a font option preview in its own typeface.
    if (option.style.fontFamily) item.style.fontFamily = option.style.fontFamily;
    if (option.parentElement.tagName === 'OPTGROUP') item.classList.add('in-group');
    const selected = option.value === select.value;
    item.setAttribute('aria-selected', String(selected));
    if (selected) item.classList.add('selected');
    menu.appendChild(item);
  }

  function build() {
    menu.replaceChildren();
    let index = 0;
    for (const child of select.children) {
      if (child.tagName === 'OPTGROUP') {
        if (child.hidden || child.hasAttribute('data-menu-skip') || !child.children.length)
          continue;
        const heading = document.createElement('li');
        heading.className = 'select-group';
        heading.setAttribute('role', 'presentation');
        heading.textContent = child.label;
        menu.appendChild(heading);
        for (const option of child.children) addOption(option, index++);
      } else if (!child.hasAttribute('data-placeholder')) addOption(child, index++);
    }
    sync();
  }

  function sync() {
    const option = select.selectedOptions[0];
    trigger.querySelector('.select-value').textContent = option?.textContent || '';
    trigger.classList.toggle('placeholder', !option?.value);
    // Guarded: re-setting the attribute would re-trigger the disabled observer below.
    if (trigger.disabled !== select.disabled) trigger.disabled = select.disabled;
    for (const item of items()) {
      const selected = item.dataset.value === select.value;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-selected', String(selected));
    }
  }

  function open() {
    if (trigger.disabled || !items().length) return;
    closeOpen();
    build();
    // Open upward when the scroll area below the trigger is too short.
    // Either way, cap the height so the menu stays inside the popup.
    const scroller = wrapper.closest('main') || document.body;
    const area = scroller.getBoundingClientRect();
    const box = trigger.getBoundingClientRect();
    const below = area.bottom - box.bottom;
    const above = box.top - area.top;
    const up = below < 200 && above > below;
    wrapper.classList.toggle('drop-up', up);
    menu.style.maxHeight = `${Math.max(120, Math.min(248, (up ? above : below) - 14))}px`;
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    wrapper.classList.add('open');
    openInstance = api;
    highlight(
      Math.max(
        0,
        items().findIndex((item) => item.dataset.value === select.value)
      )
    );
    menu.focus({ preventScroll: true });
  }

  function close(returnFocus = false) {
    if (menu.hidden) return;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    wrapper.classList.remove('open');
    if (openInstance === api) openInstance = null;
    if (returnFocus) trigger.focus();
  }

  // data-keep-open selects (the font list) stay open so people can try several options.
  function choose(value) {
    if (!keepOpen) close(true);
    if (value === select.value) return;
    select.value = value;
    sync();
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  trigger.addEventListener('click', () => (menu.hidden ? open() : close()));
  trigger.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      open();
    }
  });
  menu.addEventListener('click', (event) => {
    const item = event.target.closest('.select-option');
    if (item) choose(item.dataset.value);
  });
  menu.addEventListener('mousemove', (event) => {
    const item = event.target.closest('.select-option');
    if (item) highlight(items().indexOf(item));
  });
  menu.addEventListener('keydown', (event) => {
    const list = items();
    const keys = {
      ArrowDown: () => highlight(active + 1),
      ArrowUp: () => highlight(active - 1),
      Home: () => highlight(0),
      End: () => highlight(list.length - 1),
      Enter: () => {
        if (list[active]) choose(list[active].dataset.value);
        if (keepOpen) close(true);
      },
      ' ': () => list[active] && choose(list[active].dataset.value),
      Escape: () => close(true),
      Tab: () => close(),
    };
    if (!keys[event.key]) return;
    if (event.key !== 'Tab') event.preventDefault();
    keys[event.key]();
  });
  select.addEventListener('change', sync);
  // Options are rebuilt by other modules (course refresh, uploaded fonts).
  new MutationObserver(build).observe(select, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', 'disabled'],
  });

  const api = { close, sync, build };
  instances.set(select, api);
  build();
}

/** Re-read the native select after its value was set programmatically. */
export function syncSelect(select) {
  instances.get(select)?.sync();
}

export function initCustomSelects(root = document) {
  root.querySelectorAll('select').forEach(enhanceSelect);
  document.addEventListener('pointerdown', (event) => {
    if (openInstance && !event.target.closest('.select.open')) closeOpen();
  });
  // A disabled fieldset does not fire events, so re-sync when it toggles.
  new MutationObserver(() => root.querySelectorAll('select').forEach(syncSelect)).observe(
    document.body,
    { subtree: true, attributes: true, attributeFilter: ['disabled'] }
  );
}
