import type {
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
} from './index.ts';
import type { TerrainSplatSampleGrid } from './sample-grid.ts';
import {
  createTerrainSplatDebugView,
  type TerrainSplatDebugView,
  type TerrainSplatDebugViewMode,
} from './debug-view.ts';

export type TerrainSplatViewerDebugModeOption = {
  id: TerrainSplatDebugViewMode;
  label: string;
  requiresCatalog: boolean;
  requiresTargetLayer: boolean;
};

export type TerrainSplatViewerDebugModel = {
  selectedMode: TerrainSplatDebugViewMode;
  modeOptions: readonly TerrainSplatViewerDebugModeOption[];
  availableTargetLayerIds: readonly TerrainMaterialLayerId[];
  selectedTargetLayerId: TerrainMaterialLayerId | null;
  blendEnabled: boolean;
  view: TerrainSplatDebugView;
};

const VIEWER_MODE_OPTIONS: readonly TerrainSplatViewerDebugModeOption[] = [
  {
    id: 'dominant-layer',
    label: 'Dominant Layer',
    requiresCatalog: false,
    requiresTargetLayer: false,
  },
  {
    id: 'active-layer-count',
    label: 'Active Layer Count',
    requiresCatalog: false,
    requiresTargetLayer: false,
  },
  {
    id: 'layer-weight',
    label: 'Layer Weight',
    requiresCatalog: false,
    requiresTargetLayer: true,
  },
  {
    id: 'blend-color',
    label: 'Blend Color',
    requiresCatalog: false,
    requiresTargetLayer: false,
  },
  {
    id: 'layer-index',
    label: 'Layer Index',
    requiresCatalog: true,
    requiresTargetLayer: false,
  },
  {
    id: 'base-color-map',
    label: 'Base Color Map',
    requiresCatalog: true,
    requiresTargetLayer: false,
  },
  {
    id: 'normal-map',
    label: 'Normal Map',
    requiresCatalog: true,
    requiresTargetLayer: false,
  },
  {
    id: 'roughness-map',
    label: 'Roughness Map',
    requiresCatalog: true,
    requiresTargetLayer: false,
  },
];

export function createTerrainSplatViewerDebugModel(
  grid: TerrainSplatSampleGrid,
  options: {
    mode?: TerrainSplatDebugViewMode;
    targetLayerId?: TerrainMaterialLayerId;
    blendEnabled?: boolean;
    catalog?:
      | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
      | {
          byId: ReadonlyMap<
            TerrainMaterialLayerId,
            TerrainMaterialLayerCatalogEntry
          >;
        };
  } = {}
): TerrainSplatViewerDebugModel {
  const catalogById = options.catalog
    ? 'byId' in options.catalog
      ? options.catalog.byId
      : options.catalog
    : null;
  const availableTargetLayerIds = resolveAvailableTargetLayerIds(
    grid,
    catalogById
  );
  const requestedMode = options.mode ?? 'dominant-layer';
  const selectedMode = resolveSelectedMode(requestedMode, catalogById);
  const selectedTargetLayerId =
    selectedMode === 'layer-weight'
      ? resolveTargetLayerId(options.targetLayerId, availableTargetLayerIds)
      : null;
  const blendEnabled = options.blendEnabled !== false;

  return {
    selectedMode,
    modeOptions: VIEWER_MODE_OPTIONS.filter(
      (option) => !option.requiresCatalog || catalogById !== null
    ),
    availableTargetLayerIds,
    selectedTargetLayerId,
    blendEnabled,
    view: createTerrainSplatDebugView(grid, {
      mode: selectedMode,
      targetLayerId: selectedTargetLayerId ?? undefined,
      blendEnabled,
      catalog: catalogById,
    }),
  };
}

function resolveSelectedMode(
  mode: TerrainSplatDebugViewMode,
  catalogById: ReadonlyMap<
    TerrainMaterialLayerId,
    TerrainMaterialLayerCatalogEntry
  > | null
): TerrainSplatDebugViewMode {
  const option = VIEWER_MODE_OPTIONS.find((entry) => entry.id === mode);
  if (!option) {
    return 'dominant-layer';
  }
  if (option.requiresCatalog && catalogById === null) {
    return 'dominant-layer';
  }
  return option.id;
}

function resolveAvailableTargetLayerIds(
  grid: TerrainSplatSampleGrid,
  catalogById: ReadonlyMap<
    TerrainMaterialLayerId,
    TerrainMaterialLayerCatalogEntry
  > | null
): readonly TerrainMaterialLayerId[] {
  const activeLayerIds = new Set<TerrainMaterialLayerId>();
  for (const sample of grid.samples) {
    for (const entry of sample.entries) {
      activeLayerIds.add(entry.layerId);
    }
  }

  const layerIds = [...activeLayerIds];
  if (catalogById === null) {
    return layerIds.sort();
  }
  return layerIds.sort((left, right) => {
    const leftIndex = catalogById.get(left)?.index ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = catalogById.get(right)?.index ?? Number.MAX_SAFE_INTEGER;
    return leftIndex === rightIndex
      ? left.localeCompare(right)
      : leftIndex - rightIndex;
  });
}

function resolveTargetLayerId(
  targetLayerId: TerrainMaterialLayerId | undefined,
  availableTargetLayerIds: readonly TerrainMaterialLayerId[]
): TerrainMaterialLayerId | null {
  if (targetLayerId && availableTargetLayerIds.includes(targetLayerId)) {
    return targetLayerId;
  }
  return availableTargetLayerIds[0] ?? null;
}
