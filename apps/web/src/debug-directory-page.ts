import './debug-directory.css';
import { buildDebugDirectoryMarkup } from './debug-directory.ts';
import {
  loadPersistedPageScrollY,
  restorePersistedPageScrollY,
  savePersistedPageScrollY,
} from './page-scroll-state.ts';

const DEBUG_DIRECTORY_SCROLL_STORAGE_KEY = 'bworlds:debug-directory-scroll';

const root = document.querySelector<HTMLElement>('#app');
const pageScrollStorage = globalThis.sessionStorage ?? null;
const initialScrollY = loadPersistedPageScrollY(
  pageScrollStorage,
  DEBUG_DIRECTORY_SCROLL_STORAGE_KEY
);

if (root) {
  root.innerHTML = buildDebugDirectoryMarkup();
}

restorePersistedPageScrollY(initialScrollY);

function persistScrollPosition(): void {
  savePersistedPageScrollY(
    pageScrollStorage,
    DEBUG_DIRECTORY_SCROLL_STORAGE_KEY,
    globalThis.scrollY ?? 0
  );
}

globalThis.addEventListener?.('scroll', persistScrollPosition, {
  passive: true,
});
globalThis.addEventListener?.('pagehide', persistScrollPosition);
import.meta.hot?.on('vite:beforeUpdate', persistScrollPosition);
import.meta.hot?.dispose(persistScrollPosition);
