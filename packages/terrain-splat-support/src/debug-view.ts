import type {
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
  TerrainSplatSample,
} from './index.ts';
import type { TerrainSplatSampleGrid } from './sample-grid.ts';
import { getTerrainSplatGridSample } from './sample-grid.ts';

export type TerrainSplatDebugViewMode =
  | 'dominant-layer'
  | 'active-layer-count'
  | 'layer-weight'
  | 'blend-color'
  | 'layer-index'
  | 'base-color-map'
  | 'normal-map'
  | 'roughness-map';

export type TerrainSplatDebugCell = {
  column: number;
  row: number;
  activeLayerIds: readonly TerrainMaterialLayerId[];
  activeLayerCount: number;
  dominantLayerId: TerrainMaterialLayerId | null;
  dominantWeight: number;
  colorHex: string;
  layerIndices: readonly number[];
  textureId: string | null;
  value: number;
};

export type TerrainSplatDebugView = {
  mode: TerrainSplatDebugViewMode;
  cells: readonly TerrainSplatDebugCell[];
  activeLayerIds: readonly TerrainMaterialLayerId[];
  totalActiveLayerCount: number;
  packedMemoryUsageBytes: number;
  targetLayerId: TerrainMaterialLayerId | null;
  blendEnabled: boolean;
};

export function createTerrainSplatDebugView(
  grid: TerrainSplatSampleGrid,
  options: {
    mode: TerrainSplatDebugViewMode;
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
  }
): TerrainSplatDebugView {
  const layerMap = options.catalog
    ? 'byId' in options.catalog
      ? options.catalog.byId
      : options.catalog
    : null;
  const activeLayerIds = new Set<TerrainMaterialLayerId>();
  const cells: TerrainSplatDebugCell[] = [];

  for (let row = 0; row < grid.height; row += 1) {
    for (let column = 0; column < grid.width; column += 1) {
      const sample = getTerrainSplatGridSample(grid, column, row);
      const sortedEntries = [...sample.entries].sort((left, right) =>
        right.weight === left.weight
          ? left.layerId.localeCompare(right.layerId)
          : right.weight - left.weight
      );
      const effectiveEntries =
        options.blendEnabled === false
          ? sortedEntries.slice(0, sortedEntries.length > 0 ? 1 : 0)
          : sortedEntries;
      const activeIds = effectiveEntries.map((entry) => entry.layerId);
      for (const layerId of activeIds) {
        activeLayerIds.add(layerId);
      }
      const dominantEntry = effectiveEntries[0];
      const layerIndices = effectiveEntries
        .map((entry) => layerMap?.get(entry.layerId)?.index)
        .filter((index): index is number => typeof index === 'number');
      const resolved = resolveTerrainSplatDebugCell({
        mode: options.mode,
        sample: {
          entries: effectiveEntries,
        },
        layerMap,
        activeLayerIds: activeIds,
        dominantLayerId: dominantEntry?.layerId ?? null,
        dominantWeight: dominantEntry?.weight ?? 0,
        layerIndices,
        targetLayerId: options.targetLayerId,
      });

      cells.push({
        column,
        row,
        activeLayerIds: activeIds,
        activeLayerCount: activeIds.length,
        dominantLayerId: dominantEntry?.layerId ?? null,
        dominantWeight: dominantEntry?.weight ?? 0,
        colorHex: resolved.colorHex,
        layerIndices,
        textureId: resolved.textureId,
        value: resolved.value,
      });
    }
  }

  return {
    mode: options.mode,
    cells,
    activeLayerIds: [...activeLayerIds].sort(),
    totalActiveLayerCount: activeLayerIds.size,
    packedMemoryUsageBytes: grid.samples.length * 8,
    targetLayerId: options.targetLayerId ?? null,
    blendEnabled: options.blendEnabled !== false,
  };
}

function resolveTerrainSplatDebugCell(params: {
  mode: TerrainSplatDebugViewMode;
  sample: TerrainSplatSample;
  layerMap: ReadonlyMap<
    TerrainMaterialLayerId,
    TerrainMaterialLayerCatalogEntry
  > | null;
  activeLayerIds: readonly TerrainMaterialLayerId[];
  dominantLayerId: TerrainMaterialLayerId | null;
  dominantWeight: number;
  layerIndices: readonly number[];
  targetLayerId?: TerrainMaterialLayerId;
}): {
  colorHex: string;
  textureId: string | null;
  value: number;
} {
  switch (params.mode) {
    case 'dominant-layer':
      return {
        colorHex: colorFromLabel(params.dominantLayerId ?? ''),
        textureId: null,
        value: params.dominantWeight,
      };
    case 'active-layer-count': {
      const normalized = clamp01((params.activeLayerIds.length - 1) / 3);
      return {
        colorHex: mixColor('#1f8f55', '#e2b93b', '#d94b3d', normalized),
        textureId: null,
        value: params.activeLayerIds.length,
      };
    }
    case 'layer-weight': {
      const weight = findLayerWeight(params.sample, params.targetLayerId);
      return {
        colorHex: grayscaleColor(weight),
        textureId: null,
        value: weight,
      };
    }
    case 'blend-color': {
      const [first = 0, second = 0, third = 0] = params.sample.entries.map(
        (entry) => entry.weight
      );
      return {
        colorHex: rgbColor(first, second, third),
        textureId: null,
        value: params.sample.entries.length,
      };
    }
    case 'layer-index': {
      const normalized = clamp01((params.layerIndices[0] ?? 0) / 255);
      return {
        colorHex: mixColor('#214479', '#d37f24', '#f0f2f5', normalized),
        textureId: null,
        value: params.layerIndices[0] ?? -1,
      };
    }
    case 'base-color-map':
      return resolveTerrainSplatTextureDebugCell(
        params.layerMap,
        params.dominantLayerId,
        'baseColorTextureId'
      );
    case 'normal-map':
      return resolveTerrainSplatTextureDebugCell(
        params.layerMap,
        params.dominantLayerId,
        'normalTextureId'
      );
    case 'roughness-map':
      return resolveTerrainSplatTextureDebugCell(
        params.layerMap,
        params.dominantLayerId,
        'roughnessTextureId'
      );
  }
}

function resolveTerrainSplatTextureDebugCell(
  layerMap: ReadonlyMap<
    TerrainMaterialLayerId,
    TerrainMaterialLayerCatalogEntry
  > | null,
  dominantLayerId: TerrainMaterialLayerId | null,
  property: 'baseColorTextureId' | 'normalTextureId' | 'roughnessTextureId'
): {
  colorHex: string;
  textureId: string | null;
  value: number;
} {
  const textureId =
    dominantLayerId && layerMap
      ? layerMap.get(dominantLayerId)?.[property]
      : null;
  return {
    colorHex: colorFromLabel(textureId ?? dominantLayerId ?? property),
    textureId: textureId ?? null,
    value: textureId ? 1 : 0,
  };
}

function findLayerWeight(
  sample: TerrainSplatSample,
  layerId: TerrainMaterialLayerId | undefined
): number {
  if (!layerId) {
    return 0;
  }
  return sample.entries.find((entry) => entry.layerId === layerId)?.weight ?? 0;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function grayscaleColor(weight: number): string {
  const channel = Math.round(clamp01(weight) * 255);
  return rgbColor(channel / 255, channel / 255, channel / 255);
}

function rgbColor(red: number, green: number, blue: number): string {
  return formatRgbColor({
    red: Math.round(clamp01(red) * 255),
    green: Math.round(clamp01(green) * 255),
    blue: Math.round(clamp01(blue) * 255),
  });
}

function colorFromLabel(label: string): string {
  let hash = 2166136261;
  for (let index = 0; index < label.length; index += 1) {
    hash ^= label.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return formatRgbColor({
    red: 48 + ((hash >>> 0) & 0x7f),
    green: 48 + ((hash >>> 8) & 0x7f),
    blue: 48 + ((hash >>> 16) & 0x7f),
  });
}

function mixColor(
  lowHex: string,
  midHex: string,
  highHex: string,
  amount: number
): string {
  const normalized = clamp01(amount);
  if (normalized <= 0.5) {
    return blendRgbColors(lowHex, midHex, normalized * 2);
  }
  return blendRgbColors(midHex, highHex, (normalized - 0.5) * 2);
}

function blendRgbColors(
  fromHex: string,
  toHex: string,
  amount: number
): string {
  const from = parseHexColor(fromHex);
  const to = parseHexColor(toHex);
  const mix = clamp01(amount);

  return formatRgbColor({
    red: Math.round(from.red + (to.red - from.red) * mix),
    green: Math.round(from.green + (to.green - from.green) * mix),
    blue: Math.round(from.blue + (to.blue - from.blue) * mix),
  });
}

function parseHexColor(hex: string): {
  red: number;
  green: number;
  blue: number;
} {
  const normalized = hex.trim().replace(/^#/, '');
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function formatRgbColor(rgb: {
  red: number;
  green: number;
  blue: number;
}): string {
  return `#${rgb.red.toString(16).padStart(2, '0')}${rgb.green
    .toString(16)
    .padStart(2, '0')}${rgb.blue.toString(16).padStart(2, '0')}`;
}
