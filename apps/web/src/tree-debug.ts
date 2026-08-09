import {
  getForestTreeAgeProfiles,
  getForestTreeBranchProfiles,
  getForestTreeCanopyProfiles,
  getForestTreeDamageProfiles,
  getForestTreeDecorations,
  getForestTreeFamilies,
  getForestTreeFruitProfiles,
  getForestTreeGenerator,
  getForestTreeHistoricalProfiles,
  getForestTreeHollows,
  getForestTreeInhabitants,
  getForestTreeSpeciesPreview,
  getForestTreeSpeciesIds,
  getForestTreeTrunkProfiles,
  getForestWindExposureProfile,
  getForestTerrainSlopeProfile,
} from '@bworlds/tile-forest';
import { resolveTreeSeason } from '@bworlds/tree-support';
import { randomizeDebugCoordinatePair } from './debug-seed.ts';

export type TreeDebugDetailLevel = 'full' | 'low';
export type TreeDebugConsumer = 'render-3d' | 'render-2d' | 'gameplay';
export type TreeDebugSpeciesMode = 'tile' | 'oak' | 'birch' | 'pine';

export type TreeDebugOptions = {
  tileX: number;
  tileY: number;
  yearProgress: number;
  detailLevel: TreeDebugDetailLevel;
  consumer: TreeDebugConsumer;
  speciesMode: TreeDebugSpeciesMode;
};

export type TreeDebugSnapshot = {
  options: TreeDebugOptions;
  season: string;
  capabilityEntries: Array<{
    name: string;
    value: string;
  }>;
  familyEntries: Array<{
    familyId: string;
    speciesIds: string[];
  }>;
  tileSummary: {
    slopeStrength: number;
    windStrength: number;
    decorationCount: number;
    inhabitantCount: number;
    hollowCount: number;
    previewSpeciesCount: number;
  };
  trees: Array<{
    index: number;
    speciesId: string;
    form: string;
    lifeStage: string;
    ageYears: number;
    branchCount: number;
    foliageCount: number;
    trunkHeight: number;
    radius: number;
    leanMagnitude: number;
    curveMagnitude: number;
    barkMarkCount: number;
    fruitKind: string;
    fruitCount: number;
    fruitMature: boolean;
    landmark: boolean;
    title: string;
    record: string;
    hollowCount: number;
    decorationKinds: string[];
    inhabitantKinds: string[];
    previewMarkup: string;
  }>;
};

export const DEFAULT_TREE_DEBUG_OPTIONS: TreeDebugOptions = {
  tileX: 8,
  tileY: 6,
  yearProgress: 0.25,
  detailLevel: 'full',
  consumer: 'render-3d',
  speciesMode: 'tile',
};

export function normalizeTreeDebugOptions(
  value: Partial<TreeDebugOptions> | null | undefined
): TreeDebugOptions {
  return {
    tileX: Math.round(value?.tileX ?? DEFAULT_TREE_DEBUG_OPTIONS.tileX),
    tileY: Math.round(value?.tileY ?? DEFAULT_TREE_DEBUG_OPTIONS.tileY),
    yearProgress: clampProgress(
      value?.yearProgress ?? DEFAULT_TREE_DEBUG_OPTIONS.yearProgress
    ),
    detailLevel: normalizeTreeDebugDetailLevel(value?.detailLevel),
    consumer: normalizeTreeDebugConsumer(value?.consumer),
    speciesMode: normalizeTreeDebugSpeciesMode(value?.speciesMode),
  };
}

export function createTreeDebugSnapshot(
  rawOptions?: Partial<TreeDebugOptions> | null
): TreeDebugSnapshot {
  const options = normalizeTreeDebugOptions(rawOptions);
  const season =
    resolveTreeSeason({ yearProgress: options.yearProgress }) ?? 'summer';
  const generator = getForestTreeGenerator();
  const capabilities = generator.getCapabilities({
    consumer: options.consumer,
    detailLevel: options.detailLevel,
    season,
    yearProgress: options.yearProgress,
  });
  const familyEntries = getForestTreeFamilies().map((family) => ({
    familyId: family.familyId,
    speciesIds: family.listSpecies().map((species) => species.speciesId),
  }));
  const treeSource = resolveTreeDebugTreeSource(options);
  const speciesIds = treeSource.speciesIds;
  const ages = treeSource.ages;
  const branches = treeSource.branches;
  const canopies = treeSource.canopies;
  const trunks = treeSource.trunks;
  const damages = treeSource.damages;
  const fruit = treeSource.fruit;
  const historical = treeSource.historical;
  const hollows = treeSource.hollows;
  const decorations = treeSource.decorations;
  const inhabitants = treeSource.inhabitants;
  const slope = getForestTerrainSlopeProfile(options.tileX, options.tileY);
  const wind = getForestWindExposureProfile(options.tileX, options.tileY);

  return {
    options,
    season,
    capabilityEntries: Object.entries(capabilities).map(([name, value]) => ({
      name,
      value: formatTreeCapabilityValue(value),
    })),
    familyEntries,
    tileSummary: {
      slopeStrength: slope.strength,
      windStrength: wind.strength,
      decorationCount: decorations.length,
      inhabitantCount: inhabitants.length,
      hollowCount: hollows.length,
      previewSpeciesCount: speciesIds.length,
    },
    trees: speciesIds.map((speciesId, index) => {
      const age = ages[index];
      const branchProfile = branches[index];
      const canopyProfile = canopies[index];
      const trunk = trunks[index];
      const damage = damages[index];
      const fruitProfile = fruit[index];
      const historicalProfile = historical[index];
      const treeHollows = getTreeHollowsForIndex(hollows, index);
      const treeDecorations = getTreeDecorationKinds(decorations, index);
      const treeInhabitants = getTreeInhabitantKinds(
        inhabitants,
        hollows,
        index
      );

      return {
        index,
        speciesId,
        form: age?.form ?? branchProfile?.form ?? trunk?.form ?? 'unknown',
        lifeStage: age?.lifeStage ?? 'unknown',
        ageYears: age?.ageYears ?? 0,
        branchCount: branchProfile?.branches.length ?? 0,
        foliageCount: canopyProfile?.foliage.length ?? 0,
        trunkHeight: trunk?.trunkHeight ?? 0,
        radius: trunk?.radius ?? 0,
        leanMagnitude: Math.hypot(
          trunk?.trunkLeanX ?? 0,
          trunk?.trunkLeanZ ?? 0
        ),
        curveMagnitude: Math.hypot(
          trunk?.trunkCurveX ?? 0,
          trunk?.trunkCurveZ ?? 0
        ),
        barkMarkCount: damage?.barkMarks.length ?? 0,
        fruitKind: fruitProfile?.kind ?? '',
        fruitCount: fruitProfile?.count ?? 0,
        fruitMature: fruitProfile?.mature ?? false,
        landmark: historicalProfile?.landmark ?? false,
        title: historicalProfile?.title ?? '',
        record: historicalProfile?.record ?? '',
        hollowCount: treeHollows.length,
        decorationKinds: treeDecorations,
        inhabitantKinds: treeInhabitants,
        previewMarkup: buildTreePreviewMarkup({
          speciesId,
          form: age?.form ?? trunk?.form ?? 'unknown',
          trunk,
          canopyProfile,
          branchProfile,
        }),
      };
    }),
  };
}

export function randomizeTreeDebugSeed(
  rawOptions?: Partial<TreeDebugOptions> | null,
  random = Math.random
): TreeDebugOptions {
  const options = normalizeTreeDebugOptions(rawOptions);
  const randomized = randomizeDebugCoordinatePair(
    {
      x: options.tileX,
      y: options.tileY,
    },
    random
  );

  return {
    ...options,
    tileX: randomized.x,
    tileY: randomized.y,
  };
}

export function buildTreeDebugMarkup(
  snapshot: TreeDebugSnapshot = createTreeDebugSnapshot()
): string {
  const capabilityMarkup = snapshot.capabilityEntries
    .map(
      (entry) =>
        `<li><strong>${escapeHtml(entry.name)}</strong> ${escapeHtml(entry.value)}</li>`
    )
    .join('');
  const familyMarkup = snapshot.familyEntries
    .map(
      (entry) =>
        `<li><strong>${escapeHtml(entry.familyId)}</strong> ${escapeHtml(
          entry.speciesIds.join(', ')
        )}</li>`
    )
    .join('');
  const treeCards = snapshot.trees
    .map(
      (tree) => `
        <article class="tree-debug-card" id="tree-debug-${tree.index}">
          <div class="tree-debug-preview">${tree.previewMarkup}</div>
          <div class="tree-debug-card-body">
            <div class="tree-debug-badges">
              <span>${escapeHtml(tree.speciesId)}</span>
              <span>${escapeHtml(tree.form)}</span>
              <span>${escapeHtml(tree.lifeStage)}</span>
            </div>
            <h2>Tree ${tree.index + 1}</h2>
            <dl class="tree-debug-tree-stats">
              <div><dt>Age</dt><dd>${tree.ageYears}</dd></div>
              <div><dt>Trunk</dt><dd>${tree.trunkHeight.toFixed(2)}h / ${tree.radius.toFixed(
                2
              )}r</dd></div>
              <div><dt>Branches</dt><dd>${tree.branchCount}</dd></div>
              <div><dt>Foliage</dt><dd>${tree.foliageCount}</dd></div>
              <div><dt>Lean</dt><dd>${tree.leanMagnitude.toFixed(2)}</dd></div>
              <div><dt>Curve</dt><dd>${tree.curveMagnitude.toFixed(2)}</dd></div>
            </dl>
            <p class="tree-debug-meta">
              Hollows ${tree.hollowCount} • Bark marks ${tree.barkMarkCount} •
              Fruit ${escapeHtml(tree.fruitKind || 'none')} (${tree.fruitCount})
            </p>
            <p class="tree-debug-meta">
              Decorations ${escapeHtml(tree.decorationKinds.join(', ') || 'none')}
            </p>
            <p class="tree-debug-meta">
              Inhabitants ${escapeHtml(tree.inhabitantKinds.join(', ') || 'none')}
            </p>
            ${
              tree.landmark
                ? `<p class="tree-debug-landmark"><strong>${escapeHtml(
                    tree.title
                  )}</strong> ${escapeHtml(tree.record)}</p>`
                : ''
            }
          </div>
        </article>
      `
    )
    .join('');

  return `
    <main class="tree-debug-shell">
      <section class="tree-debug-hero">
        <p class="tree-debug-kicker">bworlds</p>
        <h1>Tree Conservatory</h1>
        <p class="tree-debug-lede">
          Generate deterministic forest tree sets for a tile, inspect their ages and structural profiles, and compare season-aware capabilities from the shared tree framework.
        </p>
      </section>
      <section class="tree-debug-layout">
        <form id="tree-debug-form" class="tree-debug-card tree-debug-form">
          <div class="tree-debug-grid">
            <label>
              <span>Tile X</span>
              <input name="tileX" type="number" step="1" value="${snapshot.options.tileX}" />
            </label>
            <label>
              <span>Tile Y</span>
              <input name="tileY" type="number" step="1" value="${snapshot.options.tileY}" />
            </label>
            <label>
              <span>Year Progress</span>
              <input name="yearProgress" type="range" min="0" max="1" step="0.01" value="${snapshot.options.yearProgress}" />
            </label>
            <label>
              <span>Detail</span>
              <select name="detailLevel">
                ${buildTreeSelectOptions(['full', 'low'], snapshot.options.detailLevel)}
              </select>
            </label>
            <label>
              <span>Consumer</span>
              <select name="consumer">
                ${buildTreeSelectOptions(
                  ['render-3d', 'render-2d', 'gameplay'],
                  snapshot.options.consumer
                )}
              </select>
            </label>
            <label>
              <span>Species</span>
              <select name="speciesMode">
                ${buildTreeSelectOptions(
                  ['tile', 'oak', 'birch', 'pine'],
                  snapshot.options.speciesMode
                )}
              </select>
            </label>
          </div>
          <div class="tree-debug-actions">
            <button id="tree-debug-generate" type="submit">Generate</button>
            <button id="tree-debug-randomize" type="button">🎲 Generate</button>
          </div>
        </form>
        <section class="tree-debug-card">
          <div id="tree-debug-summary">${buildTreeDebugSummaryMarkup(snapshot)}</div>
        </section>
      </section>
      <section class="tree-debug-library">
        <article class="tree-debug-card">
          <h2>Generator Capabilities</h2>
          <ul class="tree-debug-list">${capabilityMarkup}</ul>
        </article>
        <article class="tree-debug-card">
          <h2>Families</h2>
          <ul class="tree-debug-list">${familyMarkup}</ul>
        </article>
      </section>
      <section class="tree-debug-tree-grid" aria-label="Generated trees">
        ${treeCards}
      </section>
    </main>
  `;
}

export function buildTreeDebugSummaryMarkup(
  snapshot: TreeDebugSnapshot
): string {
  return `
    <div class="tree-debug-summary-grid">
      <div><dt>Season</dt><dd>${escapeHtml(snapshot.season)}</dd></div>
      <div><dt>Trees</dt><dd>${snapshot.trees.length}</dd></div>
      <div><dt>Decorations</dt><dd>${snapshot.tileSummary.decorationCount}</dd></div>
      <div><dt>Inhabitants</dt><dd>${snapshot.tileSummary.inhabitantCount}</dd></div>
      <div><dt>Hollows</dt><dd>${snapshot.tileSummary.hollowCount}</dd></div>
      <div><dt>Preview</dt><dd>${escapeHtml(snapshot.options.speciesMode)} (${snapshot.tileSummary.previewSpeciesCount})</dd></div>
      <div><dt>Slope / Wind</dt><dd>${snapshot.tileSummary.slopeStrength.toFixed(
        2
      )} / ${snapshot.tileSummary.windStrength.toFixed(2)}</dd></div>
    </div>
  `;
}

function resolveTreeDebugTreeSource(options: TreeDebugOptions): {
  speciesIds: string[];
  ages: ReturnType<typeof getForestTreeAgeProfiles>;
  branches: ReturnType<typeof getForestTreeBranchProfiles>;
  canopies: ReturnType<typeof getForestTreeCanopyProfiles>;
  trunks: ReturnType<typeof getForestTreeTrunkProfiles>;
  damages: ReturnType<typeof getForestTreeDamageProfiles>;
  fruit: ReturnType<typeof getForestTreeFruitProfiles>;
  historical: ReturnType<typeof getForestTreeHistoricalProfiles>;
  hollows: ReturnType<typeof getForestTreeHollows>;
  decorations: ReturnType<typeof getForestTreeDecorations>;
  inhabitants: ReturnType<typeof getForestTreeInhabitants>;
} {
  if (options.speciesMode === 'tile') {
    return {
      speciesIds: getForestTreeSpeciesIds(options.tileX, options.tileY),
      ages: getForestTreeAgeProfiles(options.tileX, options.tileY),
      branches: getForestTreeBranchProfiles(options.tileX, options.tileY),
      canopies: getForestTreeCanopyProfiles(options.tileX, options.tileY),
      trunks: getForestTreeTrunkProfiles(options.tileX, options.tileY),
      damages: getForestTreeDamageProfiles(options.tileX, options.tileY),
      fruit: getForestTreeFruitProfiles(options.tileX, options.tileY),
      historical: getForestTreeHistoricalProfiles(options.tileX, options.tileY),
      hollows: getForestTreeHollows(options.tileX, options.tileY),
      decorations: getForestTreeDecorations(options.tileX, options.tileY),
      inhabitants: getForestTreeInhabitants(options.tileX, options.tileY),
    };
  }

  const descriptor = getForestTreeSpeciesPreview(
    options.speciesMode,
    options.tileX,
    options.tileY
  );

  return {
    speciesIds: [descriptor.speciesId],
    ages: [
      {
        form: descriptor.form,
        speciesId: descriptor.speciesId,
        ageYears: descriptor.biological?.ageYears ?? 0,
        lifeStage: descriptor.biological?.lifeStage ?? 'sapling',
      },
    ],
    branches: [
      {
        form: descriptor.form,
        branches: descriptor.structure?.branches ?? descriptor.branches ?? [],
      },
    ],
    canopies: [
      {
        form: descriptor.form,
        foliage: descriptor.canopy?.foliage ?? descriptor.foliage ?? [],
      },
    ],
    trunks: [
      {
        form: descriptor.form,
        speciesId: descriptor.speciesId,
        trunkHeight: descriptor.trunkHeight,
        radius: descriptor.radius,
        trunkTopRadius:
          descriptor.structure?.trunkTopRadius ?? descriptor.radius,
        trunkCurveX: descriptor.structure?.trunkCurveX ?? 0,
        trunkCurveZ: descriptor.structure?.trunkCurveZ ?? 0,
        trunkLeanX: descriptor.structure?.trunkLeanX ?? 0,
        trunkLeanZ: descriptor.structure?.trunkLeanZ ?? 0,
      },
    ],
    damages: [
      {
        form: descriptor.form,
        barkMarks: descriptor.damage?.barkMarks ?? [],
      },
    ],
    fruit: [
      {
        form: descriptor.form,
        speciesId: descriptor.speciesId,
        kind: descriptor.fruit?.kind ?? '',
        count: descriptor.fruit?.count ?? 0,
        ripeness: descriptor.fruit?.ripeness ?? 0,
        mature: descriptor.fruit?.mature ?? false,
      },
    ],
    historical: [
      {
        form: descriptor.form,
        speciesId: descriptor.speciesId,
        landmark: descriptor.historical?.landmark ?? false,
        title: descriptor.historical?.title ?? '',
        record: descriptor.historical?.record ?? '',
        prominence: descriptor.historical?.prominence ?? 0,
      },
    ],
    hollows: [],
    decorations: [],
    inhabitants: [],
  };
}

function buildTreePreviewMarkup(options: {
  speciesId: string;
  form: string;
  trunk?: ReturnType<typeof getForestTreeTrunkProfiles>[number];
  canopyProfile?: ReturnType<typeof getForestTreeCanopyProfiles>[number];
  branchProfile?: ReturnType<typeof getForestTreeBranchProfiles>[number];
}): string {
  const trunk = options.trunk;
  const canopy = options.canopyProfile;
  const branches = options.branchProfile?.branches ?? [];
  const trunkBaseX = 60;
  const trunkBaseY = 132;
  const trunkTopX =
    trunkBaseX + (trunk?.trunkLeanX ?? 0) * 44 + (trunk?.trunkCurveX ?? 0) * 28;
  const trunkTopY = trunkBaseY - Math.max(28, (trunk?.trunkHeight ?? 1) * 46);
  const trunkWidth = Math.max(10, (trunk?.radius ?? 0.18) * 54);
  const foliageMarkup = (canopy?.foliage ?? [])
    .slice(0, 10)
    .map((foliage, index) => {
      const cx = 60 + foliage.x * 52;
      const cy = 120 - foliage.y * 48;
      const rx = Math.max(8, foliage.scaleX * 20);
      const ry = Math.max(8, foliage.scaleY * 18);
      const fill =
        options.form === 'pine'
          ? index % 2 === 0
            ? '#2d6f46'
            : '#24583a'
          : index % 2 === 0
            ? '#4f9a63'
            : '#3f8452';
      return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(
        1
      )}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${fill}" />`;
    })
    .join('');
  const branchMarkup = branches
    .slice(0, 10)
    .map((branch) => {
      const startX = trunkTopX;
      const startY = trunkTopY + 18;
      const endX = startX + Math.cos(branch.roll) * branch.length * 40;
      const endY = startY - Math.sin(branch.pitch) * branch.length * 44;
      return `<line x1="${startX.toFixed(1)}" y1="${startY.toFixed(
        1
      )}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(
        1
      )}" stroke="#6e4d31" stroke-width="2" stroke-linecap="round" />`;
    })
    .join('');

  return `
    <svg viewBox="0 0 120 140" role="img" aria-label="${escapeHtml(
      options.speciesId
    )} tree preview">
      <rect x="0" y="0" width="120" height="140" rx="16" fill="#0d1f17" />
      <rect x="0" y="120" width="120" height="20" fill="#1f3b24" />
      ${foliageMarkup}
      ${branchMarkup}
      <line
        x1="${trunkBaseX}"
        y1="${trunkBaseY}"
        x2="${trunkTopX.toFixed(1)}"
        y2="${trunkTopY.toFixed(1)}"
        stroke="#7a5532"
        stroke-width="${trunkWidth.toFixed(1)}"
        stroke-linecap="round"
      />
    </svg>
  `;
}

function buildTreeSelectOptions(
  values: readonly string[],
  selectedValue: string
): string {
  return values
    .map((value) => {
      const selected = value === selectedValue ? ' selected' : '';
      return `<option value="${value}"${selected}>${value}</option>`;
    })
    .join('');
}

function normalizeTreeDebugDetailLevel(
  value: TreeDebugOptions['detailLevel'] | undefined
): TreeDebugDetailLevel {
  return value === 'low' ? 'low' : 'full';
}

function normalizeTreeDebugConsumer(
  value: TreeDebugOptions['consumer'] | undefined
): TreeDebugConsumer {
  if (value === 'render-2d' || value === 'gameplay') {
    return value;
  }
  return 'render-3d';
}

function normalizeTreeDebugSpeciesMode(
  value: TreeDebugOptions['speciesMode'] | undefined
): TreeDebugSpeciesMode {
  if (value === 'oak' || value === 'birch' || value === 'pine') {
    return value;
  }
  return 'tile';
}

function clampProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function getTreeHollowsForIndex(
  hollows: ReturnType<typeof getForestTreeHollows>,
  treeIndex: number
): ReturnType<typeof getForestTreeHollows> {
  return hollows.filter((entry) => entry.treeIndex === treeIndex);
}

function getTreeDecorationKinds(
  decorations: ReturnType<typeof getForestTreeDecorations>,
  treeIndex: number
): string[] {
  const kinds: string[] = [];

  for (const decoration of decorations) {
    if ('treeIndex' in decoration && decoration.treeIndex === treeIndex) {
      kinds.push(decoration.kind);
    }
  }

  return kinds;
}

function getTreeInhabitantKinds(
  inhabitants: ReturnType<typeof getForestTreeInhabitants>,
  hollows: ReturnType<typeof getForestTreeHollows>,
  treeIndex: number
): string[] {
  const kinds: string[] = [];

  for (const inhabitant of inhabitants) {
    if ('hollowIndex' in inhabitant) {
      const hollow = hollows[inhabitant.hollowIndex];
      if (hollow?.treeIndex === treeIndex) {
        kinds.push(inhabitant.kind);
      }
    }
  }

  return kinds;
}

function formatTreeCapabilityValue(value: unknown): string {
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, childValue]) => `${key}:${String(childValue)}`)
      .join(', ');
  }
  return 'unknown';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
