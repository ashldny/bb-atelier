// Serialize read-modify-write operations within a popup to prevent lost updates.
const queues = new Map();
export function updateStored(area, key, transform) {
  const queueKey = `${area}:${key}`;
  const operation = (queues.get(queueKey) || Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const data = await chrome.storage[area].get(key);
      const value = transform(data[key]);
      await chrome.storage[area].set({ [key]: value });
      return value;
    });
  queues.set(queueKey, operation);
  operation
    .finally(() => {
      if (queues.get(queueKey) === operation) queues.delete(queueKey);
    })
    .catch(() => {});
  return operation;
}

export function updateOptions(patch) {
  return updateStored('sync', 'bbTheme', (current) => ({ ...current, ...patch }));
}
