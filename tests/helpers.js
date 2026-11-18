import { JSDOM, VirtualConsole } from 'jsdom';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

export const imageData =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const bundles = new Map();
export async function bundle(entry) {
  if (entry === 'src/content-entry.js') return readFile('content.js', 'utf8');
  if (!bundles.has(entry))
    bundles.set(
      entry,
      build({ entryPoints: [entry], bundle: true, format: 'iife', write: false }).then(
        (result) => result.outputFiles[0].text
      )
    );
  return bundles.get(entry);
}
const copy = (value) => (value === undefined ? undefined : structuredClone(value));

export function createHub(initialSync = {}, initialLocal = {}) {
  const values = { sync: copy(initialSync), local: copy(initialLocal) };
  const listeners = new Set();
  const receivers = [];
  let backgroundHandlers;
  const calls = { writes: [], messages: [], injections: 0, requests: [], registrations: [] };
  const hub = {
    values,
    calls,
    receivers,
    activeUrl: 'https://elearning.qu.edu.qa/ultra/course',
    inject: null,
  };
  function event() {
    const handlers = new Set();
    return {
      addListener: (fn) => handlers.add(fn),
      removeListener: (fn) => handlers.delete(fn),
      emit: (...args) => [...handlers].forEach((fn) => fn(...args)),
    };
  }
  function storageArea(area) {
    return {
      get(keys, callback) {
        const data =
          keys === null
            ? copy(values[area])
            : Object.fromEntries(
                (Array.isArray(keys) ? keys : [keys])
                  .filter((key) => key in values[area])
                  .map((key) => [key, copy(values[area][key])])
              );
        if (callback) queueMicrotask(() => callback(data));
        return Promise.resolve(data);
      },
      set(patch, callback) {
        calls.writes.push({ area, patch: copy(patch) });
        const changes = {};
        for (const [key, value] of Object.entries(patch)) {
          if (JSON.stringify(values[area][key]) === JSON.stringify(value)) continue;
          changes[key] = { oldValue: copy(values[area][key]), newValue: copy(value) };
          values[area][key] = copy(value);
        }
        queueMicrotask(() => {
          if (Object.keys(changes).length) listeners.forEach((fn) => fn(changes, area));
          callback?.();
        });
        return Promise.resolve();
      },
      remove(keys, callback) {
        const changes = {};
        for (const key of Array.isArray(keys) ? keys : [keys]) {
          if (!(key in values[area])) continue;
          changes[key] = { oldValue: copy(values[area][key]) };
          delete values[area][key];
        }
        queueMicrotask(() => {
          if (Object.keys(changes).length) listeners.forEach((fn) => fn(changes, area));
          callback?.();
        });
        return Promise.resolve();
      },
      clear(callback) {
        return this.remove(Object.keys(values[area]), callback);
      },
    };
  }
  async function send(message, frameId = 0) {
    calls.messages.push(copy(message));
    const receiver = receivers.find((item) => item.frameId === frameId);
    if (!receiver) throw new Error('Could not establish connection. Receiving end does not exist.');
    return new Promise((resolve, reject) => {
      let accepted = false;
      for (const listener of receiver.handlers)
        accepted = listener(message, {}, resolve) || accepted;
      if (!accepted) reject(new Error('No message handler'));
    });
  }
  hub.chrome = (kind = 'popup', frameId = 0) => {
    const handlers = new Set();
    if (kind === 'background') backgroundHandlers = handlers;
    const storageListeners = new Set();
    if (kind === 'content') receivers.push({ handlers, frameId });
    return {
      dispose() {
        storageListeners.forEach((fn) => listeners.delete(fn));
        const index = receivers.findIndex((receiver) => receiver.handlers === handlers);
        if (index !== -1) receivers.splice(index, 1);
      },
      storage: {
        sync: storageArea('sync'),
        local: storageArea('local'),
        onChanged: {
          addListener: (fn) => {
            listeners.add(fn);
            storageListeners.add(fn);
          },
          removeListener: (fn) => {
            listeners.delete(fn);
            storageListeners.delete(fn);
          },
        },
      },
      runtime: {
        id: 'test-extension',
        getURL: (file) => `chrome-extension://test-extension/${file}`,
        getManifest: () => ({ version: '2.0', content_scripts: [{ js: ['content.js'] }] }),
        onMessage: { addListener: (fn) => handlers.add(fn) },
        onInstalled: event(),
        onStartup: event(),
        sendMessage: async (message) =>
          backgroundHandlers
            ? new Promise((resolve, reject) => {
                let accepted = false;
                for (const listener of backgroundHandlers)
                  accepted = listener(message, {}, resolve) || accepted;
                if (!accepted) reject(new Error('No background handler'));
              })
            : { success: true },
      },
      tabs: {
        query: async (_query, callback) => {
          const tabs = [{ id: 1, url: hub.activeUrl }];
          callback?.(tabs);
          return tabs;
        },
        sendMessage: async (_tab, message, options) => send(message, options?.frameId || 0),
      },
      scripting: {
        executeScript: async () => {
          calls.injections++;
          await hub.inject?.();
        },
        getRegisteredContentScripts: async () => calls.registrations,
        registerContentScripts: async (scripts) => {
          calls.registrations.push(...scripts);
        },
        unregisterContentScripts: async () => {
          calls.registrations.length = 0;
        },
      },
      permissions: {
        request: async (request) => {
          calls.requests.push(request);
          return hub.permission !== false;
        },
        contains: async () => hub.permission !== false,
        onRemoved: event(),
      },
    };
  };
  hub.storage = hub.chrome().storage;
  hub.send = send;
  return hub;
}

export async function createDom(hub, { popup = false, frameId = 0, html, url } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => {
    if (!error.message.includes('Could not parse CSS stylesheet')) errors.push(error);
  });
  virtualConsole.on('error', (...args) => errors.push(args));
  const dom = new JSDOM(
    html ||
      (popup
        ? await readFile('popup.html', 'utf8')
        : '<!DOCTYPE html><html><head></head><body><main></main></body></html>'),
    {
      url:
        url ||
        (popup
          ? 'chrome-extension://test-extension/popup.html'
          : 'https://elearning.qu.edu.qa/ultra/course'),
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      virtualConsole,
    }
  );
  const window = dom.window;
  window.chrome = hub.chrome(popup ? 'popup' : 'content', frameId);
  window.CSS = {
    escape: (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`),
    supports: () => true,
  };
  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  window.fetch = async () => new Response('');
  window.Response = Response;
  window.AbortSignal = AbortSignal;
  window.confirm = () => true;
  // jsdom throws if an animation frame fires after its window closed; track and cancel them.
  const frames = new Set();
  let closed = false;
  const requestFrame = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    if (closed) return 0;
    const id = requestFrame((time) => {
      frames.delete(id);
      callback(time);
    });
    frames.add(id);
    return id;
  };
  const cancelFrame = window.cancelAnimationFrame.bind(window);
  window.cancelAnimationFrame = (id) => {
    frames.delete(id);
    cancelFrame(id);
  };
  const code = await bundle(popup ? 'src/popup/popup.js' : 'src/content-entry.js');
  window.eval(code);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await waitFor(() =>
    popup
      ? !window.document.body.hasAttribute('aria-busy')
      : hub.send({ action: 'ping' }, frameId).then((result) => result.success)
  );
  return {
    dom,
    window,
    document: window.document,
    errors,
    close: () => {
      closed = true;
      window.chrome.dispose();
      for (const id of frames) cancelFrame(id);
      frames.clear();
      window.close();
    },
  };
}

export async function waitFor(predicate, timeout = 2000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      if (await predicate()) return;
    } catch {
      /* Not ready. */
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail('Condition did not become true');
}

export function change(window, element, value) {
  if (element.type === 'checkbox' || element.type === 'radio') element.checked = value;
  else element.value = value;
  element.dispatchEvent(new window.Event('change', { bubbles: true }));
}

export async function createBackground(hub) {
  const dom = new JSDOM('', { runScripts: 'outside-only' });
  dom.window.chrome = hub.chrome('background');
  dom.window.eval(await bundle('src/background.js'));
  await dom.window.chrome.runtime.sendMessage({ action: 'initializeStorage' });
  return {
    close() {
      dom.window.chrome.dispose();
      dom.window.close();
    },
  };
}
