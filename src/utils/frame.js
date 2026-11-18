// Run DOM/CSS fix-ups right before the next paint, so content Blackboard just mounted is
// never shown in its own colours first. Coalesce by keeping the returned id until it runs.
// Falls back to a ~1 frame timeout where requestAnimationFrame is unavailable.
export function beforeNextPaint(callback) {
  return typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame(callback)
    : setTimeout(callback, 16);
}

export function cancelBeforeNextPaint(id) {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
  else clearTimeout(id);
}
