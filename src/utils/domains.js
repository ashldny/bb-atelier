// Shared domain validation for the popup, messaging and service worker.
export function domainToPattern(input) {
  const raw = String(input || '')
    .trim()
    .toLowerCase();
  if (!raw) return null;
  try {
    const wildcard = /^(?:https?:\/\/|\*:\/\/)?\*\./.test(raw);
    const normalized = raw.replace(/^\*:\/\//, 'https://').replace(/^(https?:\/\/)?\*\./, '$1');
    const url = new URL(normalized.includes('://') ? normalized : `https://${normalized}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port)
      return null;
    const host = url.hostname;
    if (
      host.length > 253 ||
      !host.includes('.') ||
      !host.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
    )
      return null;
    return `*://${wildcard ? '*.' : ''}${host}/*`;
  } catch {
    return null;
  }
}

export function isSupportedUrl(value, customDomain = '') {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const host = url.hostname;
    if (
      host === 'elearning.qu.edu.qa' ||
      host === 'blackboard.com' ||
      host.endsWith('.blackboard.com')
    )
      return true;
    const pattern = domainToPattern(customDomain);
    if (!pattern) return false;
    const target = pattern.slice(4, -2);
    return target.startsWith('*.')
      ? host === target.slice(2) || host.endsWith(`.${target.slice(2)}`)
      : host === target;
  } catch {
    return false;
  }
}
