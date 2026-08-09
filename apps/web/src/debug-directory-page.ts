import './debug-directory.css';
import { buildDebugDirectoryMarkup } from './debug-directory.ts';
import { loadHmrState, saveHmrState } from './hmr-state.ts';
import {
  loadPersistedPageScrollY,
  restorePersistedPageScrollY,
  savePersistedPageScrollY,
} from './page-scroll-state.ts';

const DEBUG_DIRECTORY_SCROLL_STORAGE_KEY = 'bworlds:debug-directory-scroll';
const DEBUG_DIRECTORY_HMR_STATE_KEY = 'bworlds:debug-directory:hmr';

const root = document.querySelector<HTMLElement>('#app');
const pageScrollStorage = globalThis.sessionStorage ?? null;
const pageLifecycleAbortController =
  typeof AbortController === 'function' ? new AbortController() : null;
const pageLifecycleSignal = pageLifecycleAbortController?.signal;
const initialScrollY =
  loadHmrState<{ scrollY: number }>(
    import.meta.hot,
    DEBUG_DIRECTORY_HMR_STATE_KEY
  )?.scrollY ??
  loadPersistedPageScrollY(
    pageScrollStorage,
    DEBUG_DIRECTORY_SCROLL_STORAGE_KEY
  );

if (root) {
  root.innerHTML = buildDebugDirectoryMarkup();
}

restorePersistedPageScrollY(initialScrollY);

function persistScrollPosition(): void {
  const scrollY = globalThis.scrollY ?? 0;
  saveHmrState(import.meta.hot, DEBUG_DIRECTORY_HMR_STATE_KEY, {
    scrollY,
  });
  savePersistedPageScrollY(
    pageScrollStorage,
    DEBUG_DIRECTORY_SCROLL_STORAGE_KEY,
    scrollY
  );
}

globalThis.addEventListener?.(
  'scroll',
  persistScrollPosition,
  pageLifecycleSignal
    ? { passive: true, signal: pageLifecycleSignal }
    : { passive: true }
);
globalThis.addEventListener?.(
  'pagehide',
  persistScrollPosition,
  pageLifecycleSignal ? { signal: pageLifecycleSignal } : undefined
);
import.meta.hot?.on('vite:beforeUpdate', persistScrollPosition);
import.meta.hot?.dispose(() => {
  pageLifecycleAbortController?.abort();
  persistScrollPosition();
});
