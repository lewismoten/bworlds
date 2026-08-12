import { resolveHashSeedInput } from '@bworlds/core/hash';
import { createOverworldTerrainSignalSampler } from '@bworlds/overworld-support';
import {
  analyzeTerrainSplatChunkSeam,
  createOverworldTerrainSplatDefinitions,
  createTerrainChunkWireframeDebugView,
  createTerrainHeightField,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
  createTerrainSplatHeightGeometryPlan,
  createTerrainSplatSampleGrid,
  createTerrainSplatViewerDebugModel,
  type TerrainChunkWireframeDebugView,
  type TerrainMaterialLayerCatalogEntry,
  type TerrainMaterialLayerId,
  type TerrainSplatSampleGrid,
} from '@bworlds/terrain-splat-support';
import {
  createBuiltinContentPackCatalog,
  createWorldGenerator,
  getTerrainChunkCellBounds,
  getTerrainChunkHeightSampleBounds,
  type TerrainChunkCellBounds,
  type TerrainChunkHeightSampleBounds,
} from '@bworlds/worldgen';

export type TerrainChunkDebugOptions = {
  seed: string;
  chunkX: number;
  chunkY: number;
  lodStepMultiplier: 1 | 2 | 4;
  includeDiagonals: boolean;
};

export type TerrainChunkDebugCell = {
  column: number;
  row: number;
  colorHex: string;
  dominantLayerId: string | null;
  dominantWeightPercent: string;
  activeLayerIds: readonly string[];
};

export type TerrainChunkDebugSeamSummary = {
  edge: 'east' | 'south';
  mismatchCount: number;
  matchesExactly: boolean;
  seamLength: number;
  heightMaxDelta: number;
  dominantNeighborLayerId: string | null;
  mismatchPreview: readonly {
    code: string;
    layerId: string | null;
    primaryWeight: string;
    adjacentWeight: string;
  }[];
};

export type TerrainChunkDebugSnapshot = {
  options: TerrainChunkDebugOptions;
  chunkBounds: TerrainChunkCellBounds;
  sampleBounds: TerrainChunkHeightSampleBounds;
  sampleGridSizeLabel: string;
  activeLayerIds: readonly string[];
  dominantLayerId: string | null;
  cellCount: number;
  chunkCells: readonly TerrainChunkDebugCell[];
  heightRange: {
    min: number;
    max: number;
  };
  wireframe: TerrainChunkWireframeDebugView;
  seamSummaries: readonly TerrainChunkDebugSeamSummary[];
  geometry: {
    vertexCount: number;
    triangleCount: number;
    lodStepMultiplier: number;
  };
};

const DEFAULT_TERRAIN_CHUNK_DEBUG_OPTIONS: TerrainChunkDebugOptions = {
  seed: 'bworlds-alpha',
  chunkX: 0,
  chunkY: 0,
  lodStepMultiplier: 1,
  includeDiagonals: false,
};

const builtinPackCatalog = createBuiltinContentPackCatalog();
const pluginRegistry = builtinPackCatalog.createRegistry(
  builtinPackCatalog.defaultPackIds
);
const terrainMaterialLayers = createTerrainMaterialLayerCatalog([
  {
    id: 'grass-a',
    baseColorTextureId: 'grass-a/base',
    normalTextureId: 'grass-a/normal',
    roughnessTextureId: 'grass-a/roughness',
    textureScale: 3,
    defaultTint: '#88aa55',
    defaultRoughness: 0.9,
  },
  {
    id: 'grass-b',
    baseColorTextureId: 'grass-b/base',
    normalTextureId: 'grass-b/normal',
    roughnessTextureId: 'grass-b/roughness',
    textureScale: 3,
    defaultTint: '#7ea24a',
    defaultRoughness: 0.88,
  },
  {
    id: 'soil',
    baseColorTextureId: 'soil/base',
    normalTextureId: 'soil/normal',
    roughnessTextureId: 'soil/roughness',
    textureScale: 2,
    defaultTint: '#7b5a3d',
    defaultRoughness: 0.8,
  },
  {
    id: 'leaf',
    baseColorTextureId: 'leaf/base',
    normalTextureId: 'leaf/normal',
    roughnessTextureId: 'leaf/roughness',
    textureScale: 2,
    defaultTint: '#5f6f31',
    defaultRoughness: 0.92,
  },
  {
    id: 'rock',
    baseColorTextureId: 'rock/base',
    normalTextureId: 'rock/normal',
    roughnessTextureId: 'rock/roughness',
    textureScale: 4,
    defaultTint: '#7f7f7f',
    defaultRoughness: 0.7,
  },
  {
    id: 'sand',
    baseColorTextureId: 'sand/base',
    normalTextureId: 'sand/normal',
    roughnessTextureId: 'sand/roughness',
    textureScale: 4,
    defaultTint: '#c9bb82',
    defaultRoughness: 0.65,
  },
  {
    id: 'dirt',
    baseColorTextureId: 'dirt/base',
    normalTextureId: 'dirt/normal',
    roughnessTextureId: 'dirt/roughness',
    textureScale: 3,
    defaultTint: '#876748',
    defaultRoughness: 0.82,
  },
  {
    id: 'gravel',
    baseColorTextureId: 'gravel/base',
    normalTextureId: 'gravel/normal',
    roughnessTextureId: 'gravel/roughness',
    textureScale: 3,
    defaultTint: '#8f8a80',
    defaultRoughness: 0.76,
  },
  {
    id: 'mud',
    baseColorTextureId: 'mud/base',
    normalTextureId: 'mud/normal',
    roughnessTextureId: 'mud/roughness',
    textureScale: 2,
    defaultTint: '#5e4c38',
    defaultRoughness: 0.94,
  },
  {
    id: 'snow',
    baseColorTextureId: 'snow/base',
    normalTextureId: 'snow/normal',
    roughnessTextureId: 'snow/roughness',
    textureScale: 5,
    defaultTint: '#f1f4fb',
    defaultRoughness: 0.42,
  },
  {
    id: 'road-dirt',
    baseColorTextureId: 'road-dirt/base',
    normalTextureId: 'road-dirt/normal',
    roughnessTextureId: 'road-dirt/roughness',
    textureScale: 3,
    defaultTint: '#9c7a50',
    defaultRoughness: 0.9,
  },
  {
    id: 'road-gravel',
    baseColorTextureId: 'road-gravel/base',
    normalTextureId: 'road-gravel/normal',
    roughnessTextureId: 'road-gravel/roughness',
    textureScale: 3,
    defaultTint: '#979186',
    defaultRoughness: 0.82,
  },
  {
    id: 'road-stone',
    baseColorTextureId: 'road-stone/base',
    normalTextureId: 'road-stone/normal',
    roughnessTextureId: 'road-stone/roughness',
    textureScale: 3,
    defaultTint: '#8d8578',
    defaultRoughness: 0.74,
  },
  {
    id: 'road-mud',
    baseColorTextureId: 'road-mud/base',
    normalTextureId: 'road-mud/normal',
    roughnessTextureId: 'road-mud/roughness',
    textureScale: 2,
    defaultTint: '#6b553d',
    defaultRoughness: 0.95,
  },
  {
    id: 'trail-dirt',
    baseColorTextureId: 'trail-dirt/base',
    normalTextureId: 'trail-dirt/normal',
    roughnessTextureId: 'trail-dirt/roughness',
    textureScale: 3,
    defaultTint: '#8e7149',
    defaultRoughness: 0.9,
  },
  {
    id: 'trail-gravel',
    baseColorTextureId: 'trail-gravel/base',
    normalTextureId: 'trail-gravel/normal',
    roughnessTextureId: 'trail-gravel/roughness',
    textureScale: 3,
    defaultTint: '#8d877d',
    defaultRoughness: 0.82,
  },
  {
    id: 'trail-grass',
    baseColorTextureId: 'trail-grass/base',
    normalTextureId: 'trail-grass/normal',
    roughnessTextureId: 'trail-grass/roughness',
    textureScale: 3,
    defaultTint: '#72934a',
    defaultRoughness: 0.88,
  },
]);
const terrainKindCatalog = createTerrainKindSplatCatalog(
  createOverworldTerrainSplatDefinitions({
    grassLayerIds: ['grass-a', 'grass-b'],
    soilLayerId: 'soil',
    leafLayerId: 'leaf',
    rockLayerId: 'rock',
    sandLayerId: 'sand',
    dirtLayerId: 'dirt',
    gravelLayerId: 'gravel',
    mudLayerId: 'mud',
    snowLayerId: 'snow',
    dirtRoadLayerId: 'road-dirt',
    gravelRoadLayerId: 'road-gravel',
    stoneRoadLayerId: 'road-stone',
    muddyRoadLayerId: 'road-mud',
    dirtTrailLayerId: 'trail-dirt',
    gravelTrailLayerId: 'trail-gravel',
    grassTrailLayerId: 'trail-grass',
  }),
  terrainMaterialLayers
);
const routeLayerIds = [
  'road-dirt',
  'road-gravel',
  'road-stone',
  'road-mud',
  'trail-dirt',
  'trail-gravel',
  'trail-grass',
] as const satisfies readonly TerrainMaterialLayerId[];
const generatorCache = new Map<
  string,
  ReturnType<typeof createWorldGenerator>
>();
const terrainSignalSamplerCache = new Map<
  string,
  ReturnType<typeof createOverworldTerrainSignalSampler>
>();

export function normalizeTerrainChunkDebugOptions(
  value: Partial<TerrainChunkDebugOptions> | null | undefined
): TerrainChunkDebugOptions {
  return {
    seed: normalizeSeed(value?.seed),
    chunkX: Math.round(
      value?.chunkX ?? DEFAULT_TERRAIN_CHUNK_DEBUG_OPTIONS.chunkX
    ),
    chunkY: Math.round(
      value?.chunkY ?? DEFAULT_TERRAIN_CHUNK_DEBUG_OPTIONS.chunkY
    ),
    lodStepMultiplier: normalizeLodStepMultiplier(value?.lodStepMultiplier),
    includeDiagonals: value?.includeDiagonals === true,
  };
}

export function createTerrainChunkDebugSnapshot(
  rawOptions?: Partial<TerrainChunkDebugOptions> | null
): TerrainChunkDebugSnapshot {
  const options = normalizeTerrainChunkDebugOptions(rawOptions);
  const generator = getWorldGenerator(options.seed);
  const terrainSignals = getTerrainSignalSampler(options.seed);
  const currentBounds = getTerrainChunkHeightSampleBounds(
    options.chunkX,
    options.chunkY
  );
  const eastBounds = getTerrainChunkHeightSampleBounds(
    options.chunkX + 1,
    options.chunkY
  );
  const southBounds = getTerrainChunkHeightSampleBounds(
    options.chunkX,
    options.chunkY + 1
  );
  const currentGrid = createPreviewChunkGrid(
    generator,
    terrainSignals,
    options.seed,
    currentBounds
  );
  const eastGrid = createPreviewChunkGrid(
    generator,
    terrainSignals,
    options.seed,
    eastBounds
  );
  const southGrid = createPreviewChunkGrid(
    generator,
    terrainSignals,
    options.seed,
    southBounds
  );
  const currentHeightField = createPreviewHeightField(generator, currentBounds);
  const eastHeightField = createPreviewHeightField(generator, eastBounds);
  const southHeightField = createPreviewHeightField(generator, southBounds);
  const geometryPlan = createTerrainSplatHeightGeometryPlan({
    grid: currentGrid,
    heightField: currentHeightField,
    lodStepMultiplier: options.lodStepMultiplier,
  });
  const wireframe = createTerrainChunkWireframeDebugView({
    geometryPlan,
    includeDiagonals: options.includeDiagonals,
  });
  const gridDebug = createTerrainSplatViewerDebugModel(currentGrid, {
    mode: 'dominant-layer',
    catalog: terrainMaterialLayers,
    routeLayerIds,
  });
  const chunkCells = gridDebug.view.cells.map((cell) => ({
    column: cell.column,
    row: cell.row,
    colorHex: cell.colorHex,
    dominantLayerId: cell.dominantLayerId,
    dominantWeightPercent: `${Math.round(cell.dominantWeight * 100)}%`,
    activeLayerIds: cell.activeLayerIds,
  }));
  const seamSummaries: TerrainChunkDebugSeamSummary[] = [
    createSeamSummary({
      edge: 'east',
      grid: currentGrid,
      adjacentGrid: eastGrid,
      heightField: currentHeightField,
      adjacentHeightField: eastHeightField,
    }),
    createSeamSummary({
      edge: 'south',
      grid: currentGrid,
      adjacentGrid: southGrid,
      heightField: currentHeightField,
      adjacentHeightField: southHeightField,
    }),
  ];
  const heights = [...currentHeightField.heights];

  return {
    options,
    chunkBounds: getTerrainChunkCellBounds(options.chunkX, options.chunkY),
    sampleBounds: currentBounds,
    sampleGridSizeLabel: `${currentGrid.width}x${currentGrid.height}`,
    activeLayerIds: gridDebug.view.activeLayerIds,
    dominantLayerId: resolveDominantLayerId(chunkCells),
    cellCount: chunkCells.length,
    chunkCells,
    heightRange: {
      min: Math.min(...heights),
      max: Math.max(...heights),
    },
    wireframe,
    seamSummaries,
    geometry: {
      vertexCount: geometryPlan.vertexCount,
      triangleCount: geometryPlan.triangleCount,
      lodStepMultiplier: geometryPlan.lodStepMultiplier,
    },
  };
}

export function buildTerrainChunkDebugMarkup(
  snapshot: TerrainChunkDebugSnapshot = createTerrainChunkDebugSnapshot()
): string {
  const lodSelected = (lod: 1 | 2 | 4) =>
    snapshot.options.lodStepMultiplier === lod ? ' selected' : '';
  const chunkGridMarkup = snapshot.chunkCells
    .map(
      (cell) => `
        <div
          class="terrain-chunk-debug-grid-cell"
          style="background:${cell.colorHex}"
          title="(${cell.column}, ${cell.row}) ${escapeHtml(cell.dominantLayerId ?? 'none')} ${escapeHtml(cell.dominantWeightPercent)}"
        >
          <span>${escapeHtml(cell.dominantLayerId ?? 'none')}</span>
        </div>
      `
    )
    .join('');
  const seamMarkup = snapshot.seamSummaries
    .map(
      (seam) => `
        <article class="terrain-chunk-debug-card">
          <h3>${seam.edge === 'east' ? 'East Seam' : 'South Seam'}</h3>
          <dl class="terrain-chunk-debug-metrics">
            <div><dt>Status</dt><dd>${seam.matchesExactly ? 'Exact match' : 'Mismatch detected'}</dd></div>
            <div><dt>Mismatches</dt><dd>${seam.mismatchCount}</dd></div>
            <div><dt>Seam Samples</dt><dd>${seam.seamLength}</dd></div>
            <div><dt>Max Height Delta</dt><dd>${formatNumber(seam.heightMaxDelta)}</dd></div>
            <div><dt>Neighbor Dominant</dt><dd>${escapeHtml(seam.dominantNeighborLayerId ?? 'none')}</dd></div>
          </dl>
          ${
            seam.mismatchPreview.length > 0
              ? `<ul class="terrain-chunk-debug-list">
                  ${seam.mismatchPreview
                    .map(
                      (mismatch) =>
                        `<li>${escapeHtml(mismatch.code)} ${escapeHtml(mismatch.layerId ?? 'none')} (${escapeHtml(mismatch.primaryWeight)} vs ${escapeHtml(mismatch.adjacentWeight)})</li>`
                    )
                    .join('')}
                </ul>`
              : '<p class="terrain-chunk-debug-note">All compared seam samples resolve the same active layers and weights.</p>'
          }
        </article>
      `
    )
    .join('');

  return `
    <main class="terrain-chunk-debug-shell">
      <section class="terrain-chunk-debug-hero">
        <p class="terrain-chunk-debug-kicker">bworlds</p>
        <h1>Terrain Chunk Debug</h1>
        <p class="terrain-chunk-debug-lede">
          Inspect one logical terrain chunk using the shared splat grid, height field, seam analyzer, and wireframe planner before the full live chunk renderer lands.
        </p>
        <p><a href="/debug/">Back to /debug</a></p>
      </section>
      <form id="terrain-chunk-debug-form" class="terrain-chunk-debug-form">
        <label>
          <span>Seed</span>
          <input name="seed" type="text" value="${escapeAttribute(snapshot.options.seed)}" />
        </label>
        <label>
          <span>Chunk X</span>
          <input name="chunkX" type="number" step="1" value="${snapshot.options.chunkX}" />
        </label>
        <label>
          <span>Chunk Y</span>
          <input name="chunkY" type="number" step="1" value="${snapshot.options.chunkY}" />
        </label>
        <label>
          <span>Geometry LOD Step</span>
          <select name="lodStepMultiplier">
            <option value="1"${lodSelected(1)}>1x</option>
            <option value="2"${lodSelected(2)}>2x</option>
            <option value="4"${lodSelected(4)}>4x</option>
          </select>
        </label>
        <label class="terrain-chunk-debug-checkbox">
          <input name="includeDiagonals" type="checkbox"${
            snapshot.options.includeDiagonals ? ' checked' : ''
          } />
          <span>Show triangle diagonals</span>
        </label>
        <button type="submit">Rebuild Chunk</button>
      </form>
      <section class="terrain-chunk-debug-grid-layout">
        <article class="terrain-chunk-debug-card">
          <h2>Chunk Overview</h2>
          <dl class="terrain-chunk-debug-metrics">
            <div><dt>Chunk Cells</dt><dd>${snapshot.chunkBounds.minX}..${snapshot.chunkBounds.maxX}, ${snapshot.chunkBounds.minY}..${snapshot.chunkBounds.maxY}</dd></div>
            <div><dt>Sample Bounds</dt><dd>${snapshot.sampleBounds.minX}..${snapshot.sampleBounds.maxX}, ${snapshot.sampleBounds.minY}..${snapshot.sampleBounds.maxY}</dd></div>
            <div><dt>Splat Grid</dt><dd>${snapshot.sampleGridSizeLabel}</dd></div>
            <div><dt>Vertices</dt><dd>${snapshot.geometry.vertexCount}</dd></div>
            <div><dt>Triangles</dt><dd>${snapshot.geometry.triangleCount}</dd></div>
            <div><dt>Wireframe Segments</dt><dd>${snapshot.wireframe.segmentCount}</dd></div>
            <div><dt>Border Segments</dt><dd>${snapshot.wireframe.borderSegmentCount}</dd></div>
            <div><dt>Height Range</dt><dd>${formatNumber(snapshot.heightRange.min)}..${formatNumber(snapshot.heightRange.max)}</dd></div>
            <div><dt>Dominant Layer</dt><dd>${escapeHtml(snapshot.dominantLayerId ?? 'none')}</dd></div>
          </dl>
          <p class="terrain-chunk-debug-note">
            Active layers: ${escapeHtml(snapshot.activeLayerIds.join(', ') || 'none')}
          </p>
        </article>
        <article class="terrain-chunk-debug-card">
          <h2>Dominant Splat Grid</h2>
          <div class="terrain-chunk-debug-grid" style="grid-template-columns: repeat(${snapshot.sampleBounds.maxX - snapshot.sampleBounds.minX + 1}, minmax(0, 1fr));">
            ${chunkGridMarkup}
          </div>
        </article>
      </section>
      <section class="terrain-chunk-debug-grid-layout">
        <article class="terrain-chunk-debug-card terrain-chunk-debug-wireframe-card">
          <h2>Wireframe View</h2>
          ${buildWireframeSvg(snapshot)}
          <p class="terrain-chunk-debug-note">
            Border edges use a stronger stroke. This view is derived directly from the shared height geometry plan, not a live Three.js mesh.
          </p>
        </article>
        <section class="terrain-chunk-debug-seams" aria-label="Chunk seam analysis">
          <h2>Seam Analysis</h2>
          ${seamMarkup}
        </section>
      </section>
    </main>
  `;
}

function createPreviewChunkGrid(
  generator: ReturnType<typeof createWorldGenerator>,
  terrainSignals: ReturnType<typeof createOverworldTerrainSignalSampler>,
  seed: string,
  bounds: TerrainChunkHeightSampleBounds
): TerrainSplatSampleGrid {
  return createTerrainSplatSampleGrid({
    seed,
    bounds,
    kindCatalog: terrainKindCatalog,
    fallbackKind: 'plains',
    fallbackLayerId: 'grass-a',
    blendWidth: 1,
    resolveTile: ({ x, y }) => ({
      kind: generator.samplePreviewSurfaceKind(x, y),
      signals: {
        ...terrainSignals(x, y),
        season: 'summer',
      },
    }),
  });
}

function createPreviewHeightField(
  generator: ReturnType<typeof createWorldGenerator>,
  bounds: TerrainChunkHeightSampleBounds
) {
  return createTerrainHeightField({
    bounds,
    resolveHeight: ({ x, y }) => generator.samplePreviewSurfaceHeight(x, y),
  });
}

function createSeamSummary(params: {
  edge: 'east' | 'south';
  grid: TerrainSplatSampleGrid;
  adjacentGrid: TerrainSplatSampleGrid;
  heightField: ReturnType<typeof createPreviewHeightField>;
  adjacentHeightField: ReturnType<typeof createPreviewHeightField>;
}): TerrainChunkDebugSeamSummary {
  const seamAnalysis = analyzeTerrainSplatChunkSeam({
    primaryGrid: params.grid,
    adjacentGrid: params.adjacentGrid,
    edge: params.edge === 'east' ? 'east-west' : 'south-north',
  });
  return {
    edge: params.edge,
    mismatchCount: seamAnalysis.mismatchCount,
    matchesExactly: seamAnalysis.matchesExactly,
    seamLength: seamAnalysis.seamLength,
    heightMaxDelta: resolveSeamHeightMaxDelta(
      params.edge,
      params.heightField,
      params.adjacentHeightField
    ),
    dominantNeighborLayerId: resolveDominantGridLayerId(params.adjacentGrid),
    mismatchPreview: seamAnalysis.mismatches.slice(0, 6).map((mismatch) => ({
      code: mismatch.code,
      layerId: mismatch.layerId,
      primaryWeight: formatNullableWeight(mismatch.primaryWeight),
      adjacentWeight: formatNullableWeight(mismatch.adjacentWeight),
    })),
  };
}

function resolveSeamHeightMaxDelta(
  edge: 'east' | 'south',
  primary: ReturnType<typeof createPreviewHeightField>,
  adjacent: ReturnType<typeof createPreviewHeightField>
): number {
  const deltas: number[] = [];
  if (edge === 'east') {
    for (let row = 0; row < primary.height; row += 1) {
      const primaryIndex = row * primary.width + (primary.width - 1);
      const adjacentIndex = row * adjacent.width;
      deltas.push(
        Math.abs(
          (primary.heights[primaryIndex] ?? 0) -
            (adjacent.heights[adjacentIndex] ?? 0)
        )
      );
    }
  } else {
    const primaryStart = (primary.height - 1) * primary.width;
    for (let column = 0; column < primary.width; column += 1) {
      deltas.push(
        Math.abs(
          (primary.heights[primaryStart + column] ?? 0) -
            (adjacent.heights[column] ?? 0)
        )
      );
    }
  }
  return Math.max(0, ...deltas);
}

function resolveDominantGridLayerId(
  grid: TerrainSplatSampleGrid
): string | null {
  const counts = new Map<string, number>();
  for (const sample of grid.samples) {
    const layerId = sample.entries[0]?.layerId;
    if (!layerId) {
      continue;
    }
    counts.set(layerId, (counts.get(layerId) ?? 0) + 1);
  }
  let dominantLayerId: string | null = null;
  let dominantCount = -1;
  for (const [layerId, count] of counts) {
    if (
      count > dominantCount ||
      (count === dominantCount &&
        layerId.localeCompare(dominantLayerId ?? '') < 0)
    ) {
      dominantLayerId = layerId;
      dominantCount = count;
    }
  }
  return dominantLayerId;
}

function resolveDominantLayerId(
  cells: readonly TerrainChunkDebugCell[]
): string | null {
  const counts = new Map<string, number>();
  for (const cell of cells) {
    if (!cell.dominantLayerId) {
      continue;
    }
    counts.set(
      cell.dominantLayerId,
      (counts.get(cell.dominantLayerId) ?? 0) + 1
    );
  }
  let dominant: string | null = null;
  let dominantCount = -1;
  for (const [layerId, count] of counts) {
    if (
      count > dominantCount ||
      (count === dominantCount && layerId.localeCompare(dominant ?? '') < 0)
    ) {
      dominant = layerId;
      dominantCount = count;
    }
  }
  return dominant;
}

function buildWireframeSvg(snapshot: TerrainChunkDebugSnapshot): string {
  const width = 420;
  const height = 420;
  const padding = 18;
  const spanX = snapshot.sampleBounds.maxX - snapshot.sampleBounds.minX || 1;
  const spanY = snapshot.sampleBounds.maxY - snapshot.sampleBounds.minY || 1;
  const renderWidth = width - padding * 2;
  const renderHeight = height - padding * 2;
  const lines = snapshot.wireframe.segments
    .map((segment) => {
      const x1 =
        padding +
        ((segment.start.x - snapshot.sampleBounds.minX) / spanX) * renderWidth;
      const y1 =
        padding +
        ((segment.start.z - snapshot.sampleBounds.minY) / spanY) * renderHeight;
      const x2 =
        padding +
        ((segment.end.x - snapshot.sampleBounds.minX) / spanX) * renderWidth;
      const y2 =
        padding +
        ((segment.end.z - snapshot.sampleBounds.minY) / spanY) * renderHeight;
      return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${
        segment.border ? '#f4d35e' : '#89b4fa'
      }" stroke-width="${segment.border ? 2 : 1}" opacity="${
        segment.kind === 'diagonal' ? 0.48 : 0.88
      }" />`;
    })
    .join('');

  return `
    <svg
      class="terrain-chunk-debug-wireframe"
      viewBox="0 0 ${width} ${height}"
      role="img"
      aria-label="Top-down terrain chunk wireframe"
    >
      <rect x="0" y="0" width="${width}" height="${height}" rx="12" ry="12" fill="#101828" />
      ${lines}
    </svg>
  `;
}

function getWorldGenerator(seed: string) {
  const cached = generatorCache.get(seed);
  if (cached) {
    return cached;
  }
  const generator = createWorldGenerator({
    seed,
    plugins: pluginRegistry,
  });
  generatorCache.set(seed, generator);
  return generator;
}

function getTerrainSignalSampler(seed: string) {
  const cached = terrainSignalSamplerCache.get(seed);
  if (cached) {
    return cached;
  }
  const sampler = createOverworldTerrainSignalSampler(
    resolveHashSeedInput(seed)
  );
  terrainSignalSamplerCache.set(seed, sampler);
  return sampler;
}

function normalizeSeed(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0
    ? trimmed
    : DEFAULT_TERRAIN_CHUNK_DEBUG_OPTIONS.seed;
}

function normalizeLodStepMultiplier(
  value: number | undefined
): TerrainChunkDebugOptions['lodStepMultiplier'] {
  return value === 2 || value === 4 ? value : 1;
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : '0.000';
}

function formatNullableWeight(value: number | null): string {
  return value === null ? 'none' : formatNumber(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("'", '&#39;');
}

export function resolveTerrainChunkDebugLayerTint(
  layerId: TerrainMaterialLayerId | null
): string {
  return (
    (layerId ? terrainMaterialLayers.byId.get(layerId)?.defaultTint : null) ??
    '#6b7280'
  );
}

export function listTerrainChunkDebugLayers(): readonly TerrainMaterialLayerCatalogEntry[] {
  return terrainMaterialLayers.entries;
}
