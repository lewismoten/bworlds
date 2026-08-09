import './tree-debug.css';
import {
  createTreeDebugPagePersistenceController,
  loadTreeDebugPagePersistenceState,
} from './tree-debug-page-persistence.ts';
import { restorePersistedPageScrollY } from './page-scroll-state.ts';
import {
  buildTreeDebugMarkup,
  buildTreeDebugSummaryMarkup,
  createTreeDebugSnapshot,
  normalizeTreeDebugOptions,
  randomizeTreeDebugSeed,
  type TreeDebugOptions,
} from './tree-debug.ts';

const root = document.querySelector<HTMLElement>('#app');
const persistedState = loadTreeDebugPagePersistenceState(
  globalThis.sessionStorage ?? null,
  undefined,
  import.meta.hot
);
const pagePersistence = createTreeDebugPagePersistenceController({
  storage: globalThis.sessionStorage ?? null,
  hmr: import.meta.hot,
});
let snapshot = createTreeDebugSnapshot(persistedState?.options);

function collectOptions(
  form: HTMLFormElement | null
): Partial<TreeDebugOptions> {
  if (!form) {
    return {};
  }
  const data = new FormData(form);
  return {
    tileX: Number(data.get('tileX') ?? 0),
    tileY: Number(data.get('tileY') ?? 0),
    yearProgress: Number(data.get('yearProgress') ?? 0),
    detailLevel: String(data.get('detailLevel') ?? ''),
    consumer: String(data.get('consumer') ?? ''),
    speciesMode: String(data.get('speciesMode') ?? ''),
    treeIndex: Number(data.get('treeIndex') ?? 0),
  } as Partial<TreeDebugOptions>;
}

function renderPage(nextSnapshot: typeof snapshot): void {
  snapshot = nextSnapshot;
  if (!root) {
    return;
  }
  const scrollY = Math.max(0, Math.round(globalThis.scrollY ?? 0));

  root.innerHTML = buildTreeDebugMarkup(snapshot);

  const form = document.querySelector<HTMLFormElement>('#tree-debug-form');
  const summary = document.querySelector<HTMLElement>('#tree-debug-summary');
  const randomizeButton = document.querySelector<HTMLButtonElement>(
    '#tree-debug-randomize'
  );
  const cycleButton =
    document.querySelector<HTMLButtonElement>('#tree-debug-cycle');
  const tileXInput = document.querySelector<HTMLInputElement>(
    'input[name="tileX"]'
  );
  const tileYInput = document.querySelector<HTMLInputElement>(
    'input[name="tileY"]'
  );
  const treeIndexInput = document.querySelector<HTMLInputElement>(
    'input[name="treeIndex"]'
  );

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    renderPage(createTreeDebugSnapshot(collectOptions(form)));
  });

  form?.addEventListener('input', () => {
    const nextSnapshot = createTreeDebugSnapshot(collectOptions(form));
    snapshot = nextSnapshot;
    if (summary) {
      summary.innerHTML = buildTreeDebugSummaryMarkup(nextSnapshot);
    }
    persistPageState(form);
  });

  randomizeButton?.addEventListener('click', () => {
    const randomized = randomizeTreeDebugSeed(collectOptions(form));
    if (tileXInput) {
      tileXInput.value = String(randomized.tileX);
    }
    if (tileYInput) {
      tileYInput.value = String(randomized.tileY);
    }
    renderPage(createTreeDebugSnapshot(randomized));
  });

  cycleButton?.addEventListener('click', () => {
    const currentOptions = collectOptions(form);
    const nextTreeIndex =
      Math.max(0, Math.round(currentOptions.treeIndex ?? 0)) + 1;
    if (treeIndexInput) {
      treeIndexInput.value = String(nextTreeIndex);
    }
    renderPage(
      createTreeDebugSnapshot({
        ...currentOptions,
        treeIndex: nextTreeIndex,
      })
    );
  });

  persistPageState(form, scrollY);
  restorePersistedPageScrollY(scrollY);
}

function persistPageState(
  form: HTMLFormElement | null,
  scrollY = Math.max(0, Math.round(globalThis.scrollY ?? 0))
): void {
  pagePersistence.save({
    options: normalizeTreeDebugOptions(collectOptions(form)),
    scrollY,
  });
}

globalThis.addEventListener?.(
  'scroll',
  () => {
    const form = document.querySelector<HTMLFormElement>('#tree-debug-form');
    persistPageState(form);
  },
  { passive: true }
);

renderPage(snapshot);
restorePersistedPageScrollY(persistedState?.scrollY ?? 0);

globalThis.addEventListener?.('pagehide', () => {
  const form = document.querySelector<HTMLFormElement>('#tree-debug-form');
  persistPageState(form);
  pagePersistence.flush();
});

import.meta.hot?.on('vite:beforeUpdate', () => {
  const form = document.querySelector<HTMLFormElement>('#tree-debug-form');
  persistPageState(form);
  pagePersistence.flush();
});

import.meta.hot?.dispose(() => {
  const form = document.querySelector<HTMLFormElement>('#tree-debug-form');
  persistPageState(form);
  pagePersistence.flush();
});
