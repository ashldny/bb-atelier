import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackground, createHub, waitFor } from './helpers.js';

test('custom domains register only with permission and clearing them unregisters immediately', async (t) => {
  const hub = createHub({ bbTheme: { customDomain: 'https://school.example.edu/ultra' } });
  hub.permission = false;
  const background = await createBackground(hub);
  t.after(background.close);
  assert.equal(hub.calls.registrations.length, 0);
  const api = hub.chrome();
  const denied = await api.runtime.sendMessage({ action: 'syncCustomDomain' });
  assert.equal(denied.success, false);
  hub.permission = true;
  const result = await api.runtime.sendMessage({ action: 'syncCustomDomain' });
  assert.equal(result.success, true);
  assert.equal(hub.calls.registrations[0].matches[0], '*://school.example.edu/*');
  assert.equal(hub.calls.injections, 1, 'newly connected sites also reach existing tabs');
  await hub.storage.sync.set({ bbTheme: { customDomain: '' } });
  await waitFor(() => hub.calls.registrations.length === 0);
});

test('startup seeds defaults only for a fresh profile', async (t) => {
  const fresh = createHub();
  const first = await createBackground(fresh);
  t.after(first.close);
  assert.equal(fresh.values.sync.pageBg, '#1a1a1a');
  const existing = createHub({ pageBg: '#ffffff', pageText: null });
  const second = await createBackground(existing);
  t.after(second.close);
  assert.equal(existing.values.sync.pageBg, '#ffffff');
  assert.equal(existing.values.sync.pageText, null);
});
