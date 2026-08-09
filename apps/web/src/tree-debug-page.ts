import './tree-debug.css';
import {
  buildTreeDebugMarkup,
  buildTreeDebugSummaryMarkup,
  createTreeDebugSnapshot,
  randomizeTreeDebugSeed,
  type TreeDebugOptions,
} from './tree-debug.ts';

const root = document.querySelector<HTMLElement>('#app');
let snapshot = createTreeDebugSnapshot();

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
}

renderPage(snapshot);
