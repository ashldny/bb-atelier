// ═════════════════════════════════════════════════════════
//  Bb Atelier — UI Utilities
//  Toast notifications, debounce, hex validation
// ═════════════════════════════════════════════════════════

/**
 * Show a brief toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
let toastsEnabled = true;
export function setToastPreference(enabled) {
  toastsEnabled = enabled;
}

export function showToast(message, type = 'success') {
  if (!toastsEnabled && type !== 'error') return;
  const existing = document.querySelector('.bb-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `bb-toast bb-toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 1800);
}

/**
 * Debounce a function
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export function debounce(fn, ms) {
  let timer;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/**
 * Check if a string is a valid hex color
 * @param {string} hex
 * @returns {boolean}
 */
export function isValidHex(hex) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
}
