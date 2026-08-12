import { resolveHashSeedInput } from '@bworlds/core/hash';
import { createOverworldTerrainSignalSampler } from '@bworlds/overworld-support';
import type { Kind, OverworldSignals } from '@bworlds/plugin-api';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
  resolveTerrainKindSplatSample,
  type TerrainMaterialLayerCatalogEntry,
  type TerrainMaterialLayerId,
} from '@bworlds/terrain-splat-support';

export type TerrainPreviewReadout = {
  biomeId: string;
  dominantLayerId: TerrainMaterialLayerId | null;
};

const terrainSignalSamplerCache = new Map<
  string,
  ReturnType<typeof createOverworldTerrainSignalSampler>
>();

export const TERRAIN_PREVIEW_LAYER_CATALOG = createTerrainMaterialLayerCatalog([
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

export const TERRAIN_PREVIEW_KIND_CATALOG = createTerrainKindSplatCatalog(
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
  TERRAIN_PREVIEW_LAYER_CATALOG
);

export const TERRAIN_PREVIEW_ROUTE_LAYER_IDS = [
  'road-dirt',
  'road-gravel',
  'road-stone',
  'road-mud',
  'trail-dirt',
  'trail-gravel',
  'trail-grass',
] as const satisfies readonly TerrainMaterialLayerId[];

export function resolveTerrainPreviewReadout(params: {
  seed: string;
  x: number;
  y: number;
  kind: Kind;
}): TerrainPreviewReadout {
  const signals = getTerrainPreviewSignalSampler(params.seed)(
    params.x,
    params.y
  );
  return resolveTerrainPreviewReadoutFromSignals({
    x: params.x,
    y: params.y,
    seed: params.seed,
    kind: params.kind,
    signals,
  });
}

export function resolveTerrainPreviewReadoutFromSignals(params: {
  seed: string;
  x: number;
  y: number;
  kind: Kind;
  signals: OverworldSignals;
}): TerrainPreviewReadout {
  const biomeId = resolveTerrainPreviewBiomeId(params.kind, params.signals);
  const sample = resolveTerrainKindSplatSample(
    {
      seed: params.seed,
      x: params.x,
      y: params.y,
      kind: params.kind,
      signals: {
        ...params.signals,
        biome: biomeId,
        season: 'summer',
      },
    },
    TERRAIN_PREVIEW_KIND_CATALOG,
    {
      fallbackKind: 'plains',
      fallbackLayerId: 'grass-a',
    }
  );

  return {
    biomeId,
    dominantLayerId: sample.entries[0]?.layerId ?? null,
  };
}

export function resolveTerrainPreviewBiomeId(
  kind: Kind,
  signals: OverworldSignals
): string {
  switch (kind) {
    case 'ocean':
      return 'marine-ocean';
    case 'river':
      return 'freshwater-river';
    case 'shore':
    case 'sand':
    case 'dock':
    case 'ship':
      return 'shore';
    case 'forest':
      return signals.moisture >= 0.72 || signals.riverSignal >= 0.55
        ? 'wetland'
        : 'forest';
    case 'swamp':
      return 'swamp';
    case 'mountain':
    case 'quarry':
      return signals.elevation >= 0.82 ? 'alpine' : 'mountain';
    case 'cave':
    case 'cave-wall':
    case 'cave-floor':
    case 'cave-mushrooms':
    case 'cave-entrance':
    case 'dungeon':
      return 'cave';
    case 'town':
    case 'station':
    case 'building':
      return 'settlement';
    case 'ice':
    case 'snow':
      return 'snowfield';
    default:
      return resolveNaturalTerrainPreviewBiomeId(signals);
  }
}

export function getTerrainPreviewSignalSampler(seed: string) {
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

export function resolveTerrainPreviewLayerEntry(
  layerId: TerrainMaterialLayerId | null
): TerrainMaterialLayerCatalogEntry | null {
  return layerId
    ? (TERRAIN_PREVIEW_LAYER_CATALOG.byId.get(layerId) ?? null)
    : null;
}

function resolveNaturalTerrainPreviewBiomeId(
  signals: OverworldSignals
): string {
  if (signals.moisture <= 0.18 && signals.continent >= 0.48) {
    return 'desert';
  }
  if (signals.moisture >= 0.76 && signals.elevation <= 0.58) {
    return 'wetland';
  }
  if (signals.elevation >= 0.82) {
    return 'alpine';
  }
  if (signals.elevation >= 0.74) {
    return 'mountain';
  }
  return 'plains';
}
