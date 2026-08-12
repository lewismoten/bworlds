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
  requiresRouteLayers: boolean;
};

export type TerrainSplatViewerDebugModel = {
  selectedMode: TerrainSplatDebugViewMode;
  modeOptions: readonly TerrainSplatViewerDebugModeOption[];
  availableTargetLayerIds: readonly TerrainMaterialLayerId[];
  availableRouteLayerIds: readonly TerrainMaterialLayerId[];
  selectedTargetLayerId: TerrainMaterialLayerId | null;
  blendEnabled: boolean;
  routeLayersOnly: boolean;
  view: TerrainSplatDebugView;
};

const VIEWER_MODE_OPTIONS: readonly TerrainSplatViewerDebugModeOption[] = [
  {
    id: 'dominant-layer',
    label: 'Dominant Layer',
    requiresCatalog: false,
    requiresTargetLayer: false,
    requiresRouteLayers: false,
  },
  {
    id: 'active-layer-count',
    label: 'Active Layer Count',
    requiresCatalog: false,
    requiresTargetLayer: false,
    requiresRouteLayers: false,
  },
  {
    id: 'layer-weight',
    label: 'Layer Weight',
    requiresCatalog: false,
    requiresTargetLayer: true,
    requiresRouteLayers: false,
  },
  {
    id: 'route-layer-weight',
    label: 'Route Layer Weight',
    requiresCatalog: false,
    requiresTargetLayer: false,
    requiresRouteLayers: true,
  },
  {
    id: 'blend-color',
    label: 'Blend Color',
    requiresCatalog: false,
    requiresTargetLayer: false,
    requiresRouteLayers: false,
  },
  {
    id: 'layer-index',
    label: 'Layer Index',
    requiresCatalog: true,
    requiresTargetLayer: false,
    requiresRouteLayers: false,
  },
  {
    id: 'base-color-map',
    label: 'Base Color Map',
    requiresCatalog: true,
    requiresTargetLayer: false,
    requiresRouteLayers: false,
  },
  {
    id: 'normal-map',
    label: 'Normal Map',
    requiresCatalog: true,
    requiresTargetLayer: false,
    requiresRouteLayers: false,
  },
  {
    id: 'roughness-map',
    label: 'Roughness Map',
    requiresCatalog: true,
    requiresTargetLayer: false,
    requiresRouteLayers: false,
  },
];

export function createTerrainSplatViewerDebugModel(
  grid: TerrainSplatSampleGrid,
  options: {
    mode?: TerrainSplatDebugViewMode;
    targetLayerId?: TerrainMaterialLayerId;
    blendEnabled?: boolean;
    routeLayerIds?: readonly TerrainMaterialLayerId[];
    routeLayersOnly?: boolean;
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
  const routeLayerIdSet = new Set(options.routeLayerIds ?? []);
  const routeLayersOnly = options.routeLayersOnly === true;
  const availableRouteLayerIds = resolveAvailableRouteLayerIds(
    grid,
    catalogById,
    routeLayerIdSet
  );
  const availableTargetLayerIds = resolveAvailableTargetLayerIds(
    grid,
    catalogById,
    routeLayersOnly ? new Set(availableRouteLayerIds) : null
  );
  const requestedMode = options.mode ?? 'dominant-layer';
  const selectedMode = resolveSelectedMode(
    requestedMode,
    catalogById,
    availableRouteLayerIds
  );
  const selectedTargetLayerId =
    selectedMode === 'layer-weight'
      ? resolveTargetLayerId(options.targetLayerId, availableTargetLayerIds)
      : null;
  const blendEnabled = options.blendEnabled !== false;

  return {
    selectedMode,
    modeOptions: VIEWER_MODE_OPTIONS.filter(
      (option) =>
        (!option.requiresCatalog || catalogById !== null) &&
        (!option.requiresRouteLayers || availableRouteLayerIds.length > 0)
    ),
    availableTargetLayerIds,
    availableRouteLayerIds,
    selectedTargetLayerId,
    blendEnabled,
    routeLayersOnly,
    view: createTerrainSplatDebugView(grid, {
      mode: selectedMode,
      targetLayerId: selectedTargetLayerId ?? undefined,
      blendEnabled,
      routeLayerIds: availableRouteLayerIds,
      routeLayersOnly,
      catalog: catalogById,
    }),
  };
}

function resolveSelectedMode(
  mode: TerrainSplatDebugViewMode,
  catalogById: ReadonlyMap<
    TerrainMaterialLayerId,
    TerrainMaterialLayerCatalogEntry
  > | null,
  availableRouteLayerIds: readonly TerrainMaterialLayerId[]
): TerrainSplatDebugViewMode {
  const option = VIEWER_MODE_OPTIONS.find((entry) => entry.id === mode);
  if (!option) {
    return 'dominant-layer';
  }
  if (option.requiresCatalog && catalogById === null) {
    return 'dominant-layer';
  }
  if (option.requiresRouteLayers && availableRouteLayerIds.length === 0) {
    return 'dominant-layer';
  }
  return option.id;
}

function resolveAvailableTargetLayerIds(
  grid: TerrainSplatSampleGrid,
  catalogById: ReadonlyMap<
    TerrainMaterialLayerId,
    TerrainMaterialLayerCatalogEntry
  > | null,
  filterLayerIds: ReadonlySet<TerrainMaterialLayerId> | null
): readonly TerrainMaterialLayerId[] {
  const activeLayerIds = new Set<TerrainMaterialLayerId>();
  for (const sample of grid.samples) {
    for (const entry of sample.entries) {
      if (filterLayerIds !== null && !filterLayerIds.has(entry.layerId)) {
        continue;
      }
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

function resolveAvailableRouteLayerIds(
  grid: TerrainSplatSampleGrid,
  catalogById: ReadonlyMap<
    TerrainMaterialLayerId,
    TerrainMaterialLayerCatalogEntry
  > | null,
  routeLayerIds: ReadonlySet<TerrainMaterialLayerId>
): readonly TerrainMaterialLayerId[] {
  if (routeLayerIds.size === 0) {
    return [];
  }
  return resolveAvailableTargetLayerIds(grid, catalogById, routeLayerIds);
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
