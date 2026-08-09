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
  const tileXInput = document.querySelector<HTMLInputElement>(
    'input[name="tileX"]'
  );
  const tileYInput = document.querySelector<HTMLInputElement>(
    'input[name="tileY"]'
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
}

renderPage(snapshot);
