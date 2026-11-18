// In-popup confirmation dialog, replacing the browser's native confirm() box.
let pending = null;

/**
 * @param {{ title: string, message: string, confirmLabel?: string }} options
 * @returns {Promise<boolean>} true when the user confirms
 */
export function confirmDialog({ title, message, confirmLabel = 'Delete' }) {
  const backdrop = document.getElementById('confirmDialog');
  const ok = document.getElementById('confirmOk');
  const cancel = document.getElementById('confirmCancel');
  pending?.(false);
  const returnFocus = document.activeElement;
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  ok.textContent = confirmLabel;
  backdrop.hidden = false;
  requestAnimationFrame(() => backdrop.classList.add('show'));
  cancel.focus();

  return new Promise((resolve) => {
    function finish(result) {
      pending = null;
      backdrop.classList.remove('show');
      backdrop.hidden = true;
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      backdrop.removeEventListener('click', onBackdrop);
      backdrop.removeEventListener('keydown', onKey);
      returnFocus?.focus?.();
      resolve(result);
    }
    const onOk = () => finish(true);
    const onCancel = () => finish(false);
    const onBackdrop = (event) => event.target === backdrop && finish(false);
    const onKey = (event) => {
      if (event.key === 'Escape') finish(false);
      if (event.key === 'Tab') {
        // Keep focus on the two buttons while the dialog is open.
        event.preventDefault();
        (document.activeElement === ok ? cancel : ok).focus();
      }
    };
    pending = finish;
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
    backdrop.addEventListener('click', onBackdrop);
    backdrop.addEventListener('keydown', onKey);
  });
}
