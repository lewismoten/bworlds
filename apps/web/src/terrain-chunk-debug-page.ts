import './terrain-chunk-debug.css';
import {
  buildTerrainChunkDebugMarkup,
  createTerrainChunkDebugSnapshot,
  normalizeTerrainChunkDebugOptions,
  type TerrainChunkDebugOptions,
} from './terrain-chunk-debug.ts';

const root = document.querySelector<HTMLElement>('#app');

renderPage(createTerrainChunkDebugSnapshot());

function renderPage(
  snapshot: ReturnType<typeof createTerrainChunkDebugSnapshot>
) {
  if (!root) {
    return;
  }
  root.innerHTML = buildTerrainChunkDebugMarkup(snapshot);

  const form = document.querySelector<HTMLFormElement>(
    '#terrain-chunk-debug-form'
  );
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    renderPage(createTerrainChunkDebugSnapshot(readOptions(form)));
  });
}

function readOptions(
  form: HTMLFormElement | null
): Partial<TerrainChunkDebugOptions> {
  if (!form) {
    return normalizeTerrainChunkDebugOptions(null);
  }
  const data = new FormData(form);
  return {
    seed: String(data.get('seed') ?? ''),
    chunkX: Number(data.get('chunkX') ?? 0),
    chunkY: Number(data.get('chunkY') ?? 0),
    lodStepMultiplier: Number(data.get('lodStepMultiplier') ?? 1) as 1 | 2 | 4,
    includeDiagonals: data.get('includeDiagonals') === 'on',
  };
}
