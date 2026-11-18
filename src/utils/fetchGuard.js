// Used only by Dark Reader. Never replace window.fetch or block a whole CDN.
const failures = new Map();
const pending = new Map();
const RETRY_AFTER = 60_000;
const emptyCss = () => new Response('', { headers: { 'Content-Type': 'text/css' } });

export function isCorsBlockedUrl(url) {
  return Date.now() - (failures.get(String(url)) || 0) < RETRY_AFTER;
}

export async function hardenedFetch(url) {
  const key = String(url);
  if (isCorsBlockedUrl(key)) return emptyCss();
  if (!pending.has(key)) {
    pending.set(
      key,
      (async () => {
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(8000),
            credentials: 'omit',
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response;
        } catch {
          if (failures.size >= 100) failures.delete(failures.keys().next().value);
          failures.set(key, Date.now());
          return emptyCss();
        }
      })().finally(() => pending.delete(key))
    );
  }
  return (await pending.get(key)).clone();
}

export function resetFetchGuard() {
  failures.clear();
}
export function backoffDelay(attempt) {
  return Math.min(1000 * Math.pow(2, attempt - 1), 10000);
}
