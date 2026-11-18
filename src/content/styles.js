// Watch the head only. Blackboard's content mutations never trigger style work.
export function createStyleHost() {
  const styles = new Map();
  let scheduled = false;
  let head = null;
  const headObserver = new MutationObserver(scheduleRepair);
  const rootObserver = new MutationObserver(scheduleRepair);

  // Blackboard injects its institution theme as a <style> inside
  // <bb-theme-css-injector> in the body. Anything in <head> loses to it, so
  // when the last site stylesheet lives in the body, ours go to the body's end.
  function lastSiteSheetInBody() {
    const sheets = document.styleSheets;
    for (let i = sheets.length - 1; i >= 0; i--) {
      const node = sheets[i].ownerNode;
      if (!node || styles.has(node.id) || node.classList?.contains('darkreader')) continue;
      return document.body?.contains(node) ? node : null;
    }
    return null;
  }

  function repair() {
    scheduled = false;
    headObserver.disconnect();
    const bodySheet = lastSiteSheetInBody();
    const target = bodySheet ? document.body : document.head || document.documentElement;
    if (!target) return;
    for (const [id, css] of styles) {
      let style = document.getElementById(id);
      if (!style) {
        style = document.createElement('style');
        style.id = id;
      }
      if (style.textContent !== css) style.textContent = css;
      // Reorder only when a site stylesheet was inserted after our styles.
      if (
        style.parentNode !== target ||
        (bodySheet &&
          !(bodySheet.compareDocumentPosition(style) & Node.DOCUMENT_POSITION_FOLLOWING)) ||
        [...target.children]
          .slice([...target.children].indexOf(style) + 1)
          .some(
            (node) =>
              (node.tagName === 'STYLE' || node.tagName === 'LINK') &&
              !styles.has(node.id) &&
              !node.classList.contains('darkreader')
          )
      ) {
        target.appendChild(style);
      }
    }
    head = document.head || document.documentElement;
    headObserver.observe(head, { childList: true, subtree: true, characterData: true });
  }

  function scheduleRepair() {
    if (scheduled || !styles.size) return;
    scheduled = true;
    queueMicrotask(repair);
  }

  if (document.documentElement) rootObserver.observe(document.documentElement, { childList: true });
  return {
    set(id, css) {
      if (!css) {
        this.remove(id);
        return;
      }
      if (styles.get(id) === css && document.getElementById(id)?.textContent === css) return;
      styles.set(id, css);
      repair();
    },
    remove(id) {
      styles.delete(id);
      document.getElementById(id)?.remove();
      if (!styles.size) headObserver.disconnect();
    },
    repair,
  };
}
