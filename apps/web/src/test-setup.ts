import { afterEach, vi } from 'vitest';

const realSetTimeout = globalThis.setTimeout.bind(globalThis);
const realClearTimeout = globalThis.clearTimeout.bind(globalThis);
const realSetInterval = globalThis.setInterval.bind(globalThis);
const realClearInterval = globalThis.clearInterval.bind(globalThis);
const activeTimeouts = new Set<ReturnType<typeof globalThis.setTimeout>>();
const activeIntervals = new Set<ReturnType<typeof globalThis.setInterval>>();

globalThis.setTimeout = ((handler, timeout, ...args) => {
  const timer = realSetTimeout(() => {
    activeTimeouts.delete(timer);
    if (typeof handler === 'function') {
      handler(...args);
      return;
    }
    void Function(handler)();
  }, timeout);
  activeTimeouts.add(timer);
  return timer;
}) as typeof globalThis.setTimeout;

globalThis.clearTimeout = ((timer) => {
  activeTimeouts.delete(timer);
  realClearTimeout(timer);
}) as typeof globalThis.clearTimeout;

globalThis.setInterval = ((handler, timeout, ...args) => {
  const timer = realSetInterval(() => {
    if (typeof handler === 'function') {
      handler(...args);
      return;
    }
    void Function(handler)();
  }, timeout);
  activeIntervals.add(timer);
  return timer;
}) as typeof globalThis.setInterval;

globalThis.clearInterval = ((timer) => {
  activeIntervals.delete(timer);
  realClearInterval(timer);
}) as typeof globalThis.clearInterval;

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();

  for (const timer of activeTimeouts) {
    realClearTimeout(timer);
  }
  activeTimeouts.clear();

  for (const timer of activeIntervals) {
    realClearInterval(timer);
  }
  activeIntervals.clear();

  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
