import {
  analyzeTerrainSplatChunkSeam,
  createTerrainChunkWireframeDebugView,
  createTerrainHeightField,
  createTerrainSplatHeightGeometryPlan,
  createTerrainSplatSampleGrid,
  createTerrainSplatViewerDebugModel,
  type TerrainSplatHeightGeometryPlan,
  type TerrainChunkWireframeDebugView,
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
import {
  getTerrainPreviewSignalSampler,
  resolveTerrainPreviewParity,
  resolveTerrainPreviewBiomeId,
  TERRAIN_PREVIEW_KIND_CATALOG,
  TERRAIN_PREVIEW_LAYER_CATALOG,
  TERRAIN_PREVIEW_ROUTE_LAYER_IDS,
} from './terrain-preview-readout.ts';

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
  tileKind: string;
  biomeId: string;
  colorHex: string;
  dominantLayerId: string | null;
  dominantWeightPercent: string;
  activeLayerIds: readonly string[];
  parityMatches: boolean;
  parityReason: string;
};

export type TerrainChunkDebugParityMismatch = {
  column: number;
  row: number;
  tileKind: string;
  biomeId: string;
  dominantLayerId: string | null;
  parityReason: string;
};

export type TerrainChunkDebugSeamSummary = {
  edge: 'east' | 'south';
  mismatchCount: number;
  matchesExactly: boolean;
  seamLength: number;
  heightMaxDelta: number;
  normalMaxDelta: number;
  dominantNeighborLayerId: string | null;
  mismatchPreview: readonly {
    code: string;
    layerId: string | null;
    primaryWeight: string;
    adjacentWeight: string;
  }[];
};

export type TerrainChunkDebugVerificationCheck = {
  id: 'seams' | 'parity';
  label: string;
  status: 'pass' | 'attention';
  summary: string;
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
  logicalTileCellCount: number;
  parityMatchCount: number;
  parityMismatchCount: number;
  parityStatus: 'aligned' | 'drift';
  parityMismatchPreview: readonly TerrainChunkDebugParityMismatch[];
  heightRange: {
    min: number;
    max: number;
  };
  verificationStatus: 'passing' | 'attention';
  verificationChecks: readonly TerrainChunkDebugVerificationCheck[];
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
const generatorCache = new Map<
  string,
  ReturnType<typeof createWorldGenerator>
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
  const terrainSignals = getTerrainPreviewSignalSampler(options.seed);
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
    catalog: TERRAIN_PREVIEW_LAYER_CATALOG,
    routeLayerIds: TERRAIN_PREVIEW_ROUTE_LAYER_IDS,
  });
  const chunkCells = gridDebug.view.cells.map((cell) => {
    const tileKind = generator.samplePreviewSurfaceKind(
      currentBounds.minX + cell.column,
      currentBounds.minY + cell.row
    );
    const signalsAtTile = terrainSignals(
      currentBounds.minX + cell.column,
      currentBounds.minY + cell.row
    );
    const biomeId = resolveTerrainPreviewBiomeId(tileKind, signalsAtTile);
    const parity = resolveTerrainPreviewParity({
      kind: tileKind,
      dominantLayerId: cell.dominantLayerId,
    });
    return {
      column: cell.column,
      row: cell.row,
      tileKind,
      biomeId,
      colorHex: cell.colorHex,
      dominantLayerId: cell.dominantLayerId,
      dominantWeightPercent: `${Math.round(cell.dominantWeight * 100)}%`,
      activeLayerIds: cell.activeLayerIds,
      parityMatches: parity.matches,
      parityReason: parity.reason,
    };
  });
  const logicalTileCells = chunkCells.filter(
    (cell) =>
      cell.column < snapshotCellSpan(currentBounds) &&
      cell.row < snapshotCellSpan(currentBounds)
  );
  const parityMismatchPreview = logicalTileCells
    .filter((cell) => !cell.parityMatches)
    .slice(0, 8)
    .map((cell) => ({
      column: cell.column,
      row: cell.row,
      tileKind: cell.tileKind,
      biomeId: cell.biomeId,
      dominantLayerId: cell.dominantLayerId,
      parityReason: cell.parityReason,
    }));
  const seamSummaries: TerrainChunkDebugSeamSummary[] = [
    createSeamSummary({
      edge: 'east',
      grid: currentGrid,
      adjacentGrid: eastGrid,
      heightField: currentHeightField,
      adjacentHeightField: eastHeightField,
      geometryPlan,
      adjacentGeometryPlan: createTerrainSplatHeightGeometryPlan({
        grid: eastGrid,
        heightField: eastHeightField,
        lodStepMultiplier: options.lodStepMultiplier,
      }),
    }),
    createSeamSummary({
      edge: 'south',
      grid: currentGrid,
      adjacentGrid: southGrid,
      heightField: currentHeightField,
      adjacentHeightField: southHeightField,
      geometryPlan,
      adjacentGeometryPlan: createTerrainSplatHeightGeometryPlan({
        grid: southGrid,
        heightField: southHeightField,
        lodStepMultiplier: options.lodStepMultiplier,
      }),
    }),
  ];
  const heights = [...currentHeightField.heights];
  const verificationChecks = resolveVerificationChecks({
    seamSummaries,
    parityMismatchCount: parityMismatchPreview.length,
  });

  return {
    options,
    chunkBounds: getTerrainChunkCellBounds(options.chunkX, options.chunkY),
    sampleBounds: currentBounds,
    sampleGridSizeLabel: `${currentGrid.width}x${currentGrid.height}`,
    activeLayerIds: gridDebug.view.activeLayerIds,
    dominantLayerId: resolveDominantLayerId(chunkCells),
    cellCount: chunkCells.length,
    chunkCells,
    logicalTileCellCount: logicalTileCells.length,
    parityMatchCount: logicalTileCells.filter((cell) => cell.parityMatches)
      .length,
    parityMismatchCount: logicalTileCells.filter((cell) => !cell.parityMatches)
      .length,
    parityStatus: parityMismatchPreview.length === 0 ? 'aligned' : 'drift',
    parityMismatchPreview,
    heightRange: {
      min: Math.min(...heights),
      max: Math.max(...heights),
    },
    verificationStatus: verificationChecks.some(
      (check) => check.status === 'attention'
    )
      ? 'attention'
      : 'passing',
    verificationChecks,
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
          title="(${cell.column}, ${cell.row}) ${escapeHtml(cell.tileKind)} -> ${escapeHtml(cell.dominantLayerId ?? 'none')} ${escapeHtml(cell.dominantWeightPercent)}"
        >
          <span>${escapeHtml(cell.dominantLayerId ?? 'none')}</span>
        </div>
      `
    )
    .join('');
  const logicalTileGridMarkup = snapshot.chunkCells
    .filter(
      (cell) =>
        cell.column <
          snapshot.chunkBounds.maxX - snapshot.chunkBounds.minX + 1 &&
        cell.row < snapshot.chunkBounds.maxY - snapshot.chunkBounds.minY + 1
    )
    .map(
      (cell) => `
        <div
          class="terrain-chunk-debug-grid-cell terrain-chunk-debug-grid-cell-${
            cell.parityMatches ? 'match' : 'mismatch'
          }"
          style="background:${cell.parityMatches ? '#163323' : '#4a1616'}"
          title="(${cell.column}, ${cell.row}) ${escapeHtml(cell.tileKind)} / ${escapeHtml(cell.biomeId)} -> ${escapeHtml(cell.dominantLayerId ?? 'none')} (${escapeHtml(cell.parityReason)})"
        >
          <span>${escapeHtml(cell.tileKind)}</span>
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
            <div><dt>Max Normal Delta</dt><dd>${formatNumber(seam.normalMaxDelta)}</dd></div>
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
  const parityMismatchMarkup =
    snapshot.parityMismatchPreview.length > 0
      ? `<ul class="terrain-chunk-debug-list">
          ${snapshot.parityMismatchPreview
            .map(
              (cell) => `
                <li>(${cell.column}, ${cell.row}) ${escapeHtml(cell.tileKind)} / ${escapeHtml(cell.biomeId)} -> ${escapeHtml(cell.dominantLayerId ?? 'none')} (${escapeHtml(cell.parityReason)})</li>
              `
            )
            .join('')}
        </ul>`
      : '<p class="terrain-chunk-debug-note">All logical tile cells stay broadly compatible with the current shared terrain-preview categories for this chunk.</p>';

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
            <div><dt>Logical Tiles</dt><dd>${snapshot.logicalTileCellCount}</dd></div>
            <div><dt>Verification</dt><dd>${snapshot.verificationStatus === 'passing' ? 'Passing current checks' : 'Needs attention'}</dd></div>
            <div><dt>Parity Status</dt><dd>${snapshot.parityStatus === 'aligned' ? 'Aligned' : 'Drift detected'}</dd></div>
            <div><dt>Parity Matches</dt><dd>${snapshot.parityMatchCount}</dd></div>
            <div><dt>Parity Mismatches</dt><dd>${snapshot.parityMismatchCount}</dd></div>
          </dl>
          <p class="terrain-chunk-debug-note">
            Active layers: ${escapeHtml(snapshot.activeLayerIds.join(', ') || 'none')}
          </p>
        </article>
        <article class="terrain-chunk-debug-card">
          <h2>Verification Summary</h2>
          <dl class="terrain-chunk-debug-metrics">
            ${snapshot.verificationChecks
              .map(
                (check) => `
                  <div><dt>${escapeHtml(check.label)}</dt><dd>${escapeHtml(check.status === 'pass' ? 'Pass' : 'Attention')}</dd></div>
                `
              )
              .join('')}
          </dl>
          <ul class="terrain-chunk-debug-list">
            ${snapshot.verificationChecks
              .map(
                (check) => `
                  <li>${escapeHtml(check.label)}: ${escapeHtml(check.summary)}</li>
                `
              )
              .join('')}
          </ul>
        </article>
        <article class="terrain-chunk-debug-card">
          <h2>Dominant Splat Grid</h2>
          <div class="terrain-chunk-debug-grid" style="grid-template-columns: repeat(${snapshot.sampleBounds.maxX - snapshot.sampleBounds.minX + 1}, minmax(0, 1fr));">
            ${chunkGridMarkup}
          </div>
        </article>
        <article class="terrain-chunk-debug-card">
          <h2>Logical Tile Parity</h2>
          <div class="terrain-chunk-debug-grid" style="grid-template-columns: repeat(${snapshot.chunkBounds.maxX - snapshot.chunkBounds.minX + 1}, minmax(0, 1fr));">
            ${logicalTileGridMarkup}
          </div>
          <p class="terrain-chunk-debug-note">
            Green cells stay broadly compatible with the shared terrain preview category. Red cells show where the logical tile kind and dominant terrain layer drift apart.
          </p>
          ${parityMismatchMarkup}
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
  terrainSignals: ReturnType<typeof getTerrainPreviewSignalSampler>,
  seed: string,
  bounds: TerrainChunkHeightSampleBounds
): TerrainSplatSampleGrid {
  return createTerrainSplatSampleGrid({
    seed,
    bounds,
    kindCatalog: TERRAIN_PREVIEW_KIND_CATALOG,
    fallbackKind: 'plains',
    fallbackLayerId: 'grass-a',
    blendWidth: 1,
    resolveTile: ({ x, y }) => {
      const kind = generator.samplePreviewSurfaceKind(x, y);
      const signalsAtTile = terrainSignals(x, y);
      return {
        kind,
        signals: {
          ...signalsAtTile,
          biome: resolveTerrainPreviewBiomeId(kind, signalsAtTile),
          season: 'summer',
        },
      };
    },
  });
}

function createPreviewHeightField(
  generator: ReturnType<typeof createWorldGenerator>,
  bounds: TerrainChunkHeightSampleBounds
) {
  return createTerrainHeightField({
    bounds,
    normalSampleRing: 1,
    resolveHeight: ({ x, y }) => generator.sampleTerrainHeight(x, y),
  });
}

function createSeamSummary(params: {
  edge: 'east' | 'south';
  grid: TerrainSplatSampleGrid;
  adjacentGrid: TerrainSplatSampleGrid;
  heightField: ReturnType<typeof createPreviewHeightField>;
  adjacentHeightField: ReturnType<typeof createPreviewHeightField>;
  geometryPlan: TerrainSplatHeightGeometryPlan;
  adjacentGeometryPlan: TerrainSplatHeightGeometryPlan;
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
    normalMaxDelta: resolveSeamNormalMaxDelta(
      params.edge,
      params.geometryPlan,
      params.adjacentGeometryPlan
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

function resolveSeamNormalMaxDelta(
  edge: 'east' | 'south',
  primary: TerrainSplatHeightGeometryPlan,
  adjacent: TerrainSplatHeightGeometryPlan
): number {
  const deltas: number[] = [];

  if (edge === 'east') {
    for (let row = 0; row < primary.height; row += 1) {
      const primaryIndex = row * primary.width + (primary.width - 1);
      const adjacentIndex = row * adjacent.width;
      deltas.push(
        resolveNormalDelta(
          primary.normals,
          primaryIndex,
          adjacent.normals,
          adjacentIndex
        )
      );
    }
  } else {
    const primaryStart = (primary.height - 1) * primary.width;
    for (let column = 0; column < primary.width; column += 1) {
      deltas.push(
        resolveNormalDelta(
          primary.normals,
          primaryStart + column,
          adjacent.normals,
          column
        )
      );
    }
  }

  return Math.max(0, ...deltas);
}

function resolveVerificationChecks(params: {
  seamSummaries: readonly TerrainChunkDebugSeamSummary[];
  parityMismatchCount: number;
}): TerrainChunkDebugVerificationCheck[] {
  const seamMismatchCount = params.seamSummaries.reduce(
    (total, seam) => total + seam.mismatchCount,
    0
  );
  const seamHeightDelta = Math.max(
    0,
    ...params.seamSummaries.map((seam) => seam.heightMaxDelta)
  );
  const seamNormalDelta = Math.max(
    0,
    ...params.seamSummaries.map((seam) => seam.normalMaxDelta)
  );
  const seamsPassing =
    seamMismatchCount === 0 &&
    params.seamSummaries.every((seam) => seam.matchesExactly) &&
    seamNormalDelta <= 0.000001;
  const parityPassing = params.parityMismatchCount === 0;

  return [
    {
      id: 'seams',
      label: 'Chunk Seams',
      status: seamsPassing ? 'pass' : 'attention',
      summary: seamsPassing
        ? 'East and south seam samples match exactly with zero height and normal delta.'
        : `${seamMismatchCount} seam mismatch${
            seamMismatchCount === 1 ? '' : 'es'
          } detected; max sampled height delta ${formatNumber(
            seamHeightDelta
          )}, max normal delta ${formatNumber(seamNormalDelta)}.`,
    },
    {
      id: 'parity',
      label: 'Tile Parity',
      status: parityPassing ? 'pass' : 'attention',
      summary: parityPassing
        ? 'Logical tile categories stay aligned with the current dominant terrain layers.'
        : `${params.parityMismatchCount} logical tile parity mismatch${
            params.parityMismatchCount === 1 ? '' : 'es'
          } need review.`,
    },
  ];
}

function resolveNormalDelta(
  primaryNormals: Float32Array,
  primaryIndex: number,
  adjacentNormals: Float32Array,
  adjacentIndex: number
): number {
  const primaryOffset = primaryIndex * 3;
  const adjacentOffset = adjacentIndex * 3;
  return Math.hypot(
    (primaryNormals[primaryOffset] ?? 0) -
      (adjacentNormals[adjacentOffset] ?? 0),
    (primaryNormals[primaryOffset + 1] ?? 0) -
      (adjacentNormals[adjacentOffset + 1] ?? 0),
    (primaryNormals[primaryOffset + 2] ?? 0) -
      (adjacentNormals[adjacentOffset + 2] ?? 0)
  );
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

function snapshotCellSpan(bounds: TerrainChunkHeightSampleBounds): number {
  return bounds.maxX - bounds.minX;
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
