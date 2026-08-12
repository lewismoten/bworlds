import type {
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
} from './index.ts';
import type { TerrainRouteSurfacePlan } from './route-surface-plan.ts';

export type TerrainRouteOverlayMaterialPlanUniform =
  | 'terrainRouteOverlayBaseColorMap'
  | 'terrainRouteOverlayNormalMap'
  | 'terrainRouteOverlayRoughnessMap'
  | 'terrainRouteOverlayMetalnessMap'
  | 'terrainRouteOverlayAmbientOcclusionMap'
  | 'terrainRouteOverlayTint'
  | 'terrainRouteOverlayTextureScale'
  | 'terrainRouteOverlayRoughness'
  | 'terrainRouteOverlayMetalness'
  | 'terrainRouteOverlayWetness';

export type TerrainRouteOverlayMaterialPlanWarningCode =
  'unique-route-overlay-material';

export type TerrainRouteOverlayMaterialPlanWarning = {
  code: TerrainRouteOverlayMaterialPlanWarningCode;
  message: string;
};

export type TerrainRouteOverlayMaterialPlan = {
  materialKey: string;
  layerId: TerrainMaterialLayerId;
  mapPurposes: readonly string[];
  textureScale: number;
  defaultTint: string;
  defaultRoughness: number;
  defaultMetalness: number;
  globalUniforms: readonly TerrainRouteOverlayMaterialPlanUniform[];
  shaderDefines: readonly string[];
  warnings: readonly TerrainRouteOverlayMaterialPlanWarning[];
};

export type TerrainRouteOverlayMaterialReuseSummary = {
  chunkCount: number;
  uniqueMaterialCount: number;
  reusedChunkCount: number;
  materialReuseCount: number;
  materialKeys: readonly string[];
  warnings: readonly TerrainRouteOverlayMaterialPlanWarning[];
};

export function createTerrainRouteOverlayMaterialPlan(params: {
  surfacePlan: TerrainRouteSurfacePlan;
  catalog:
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        byId: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      };
}): TerrainRouteOverlayMaterialPlan | null {
  if (
    params.surfacePlan.mode !== 'overlay' ||
    params.surfacePlan.layerId === null
  ) {
    return null;
  }

  const catalogById =
    'byId' in params.catalog ? params.catalog.byId : params.catalog;
  const layer = catalogById.get(params.surfacePlan.layerId);

  if (!layer) {
    throw new Error(
      `Terrain route overlay material plan references unknown layer ${JSON.stringify(
        params.surfacePlan.layerId
      )}.`
    );
  }

  const mapPurposes = resolveMapPurposes(layer);
  const shaderDefines = createShaderDefines(mapPurposes);
  return {
    materialKey: createMaterialKey(layer, mapPurposes, shaderDefines),
    layerId: layer.id,
    mapPurposes,
    textureScale: layer.textureScale,
    defaultTint: layer.defaultTint,
    defaultRoughness: layer.defaultRoughness,
    defaultMetalness: layer.defaultMetalness ?? 0,
    globalUniforms: [
      ...resolveTextureUniforms(mapPurposes),
      'terrainRouteOverlayTint',
      'terrainRouteOverlayTextureScale',
      'terrainRouteOverlayRoughness',
      'terrainRouteOverlayMetalness',
      'terrainRouteOverlayWetness',
    ],
    shaderDefines,
    warnings: [],
  };
}

export function summarizeTerrainRouteOverlayMaterialReuse(
  entries: readonly {
    chunkId: string;
    plan: TerrainRouteOverlayMaterialPlan;
  }[]
): TerrainRouteOverlayMaterialReuseSummary {
  const chunkIdsByMaterialKey = new Map<string, string[]>();
  const warnings = new Map<string, TerrainRouteOverlayMaterialPlanWarning>();

  for (const entry of entries) {
    const chunkIds = chunkIdsByMaterialKey.get(entry.plan.materialKey) ?? [];
    chunkIds.push(entry.chunkId);
    chunkIdsByMaterialKey.set(entry.plan.materialKey, chunkIds);
  }

  for (const [materialKey, chunkIds] of chunkIdsByMaterialKey) {
    if (chunkIds.length === 1) {
      const warning = {
        code: 'unique-route-overlay-material',
        message: `Terrain route overlay chunk ${JSON.stringify(
          chunkIds[0]
        )} created one unique route material "${materialKey}".`,
      } satisfies TerrainRouteOverlayMaterialPlanWarning;
      warnings.set(`${warning.code}:${warning.message}`, warning);
    }
  }

  const materialKeys = [...chunkIdsByMaterialKey.keys()].sort();
  const uniqueMaterialCount = materialKeys.length;
  const chunkCount = entries.length;
  return {
    chunkCount,
    uniqueMaterialCount,
    reusedChunkCount: Math.max(0, chunkCount - uniqueMaterialCount),
    materialReuseCount: Math.max(0, chunkCount - uniqueMaterialCount),
    materialKeys,
    warnings: [...warnings.values()],
  };
}

function resolveMapPurposes(
  layer: TerrainMaterialLayerCatalogEntry
): readonly string[] {
  const mapPurposes = ['baseColor', 'normal', 'roughness'];

  if (layer.metalnessTextureId) {
    mapPurposes.push('metalness');
  }
  if (layer.ambientOcclusionTextureId) {
    mapPurposes.push('ambientOcclusion');
  }

  return mapPurposes;
}

function createMaterialKey(
  layer: TerrainMaterialLayerCatalogEntry,
  mapPurposes: readonly string[],
  shaderDefines: readonly string[]
): string {
  return [
    'mode:terrain-route-overlay',
    `layer:${layer.id}`,
    `base:${layer.baseColorTextureId}`,
    `normal:${layer.normalTextureId}`,
    `roughness:${layer.roughnessTextureId}`,
    `metalness:${layer.metalnessTextureId ?? 'none'}`,
    `ambientOcclusion:${layer.ambientOcclusionTextureId ?? 'none'}`,
    `textureScale:${layer.textureScale}`,
    `defaultTint:${layer.defaultTint}`,
    `defaultRoughness:${layer.defaultRoughness}`,
    `defaultMetalness:${layer.defaultMetalness ?? 0}`,
    `maps:${mapPurposes.join(',')}`,
    `defines:${shaderDefines.join(',')}`,
  ].join('|');
}

function createShaderDefines(
  mapPurposes: readonly string[]
): readonly string[] {
  return mapPurposes.map(
    (purpose) => `TERRAIN_ROUTE_${toDefineName(purpose)}_MAP`
  );
}

function resolveTextureUniforms(
  mapPurposes: readonly string[]
): TerrainRouteOverlayMaterialPlanUniform[] {
  const uniforms: TerrainRouteOverlayMaterialPlanUniform[] = [];
  for (const purpose of mapPurposes) {
    switch (purpose) {
      case 'baseColor':
        uniforms.push('terrainRouteOverlayBaseColorMap');
        break;
      case 'normal':
        uniforms.push('terrainRouteOverlayNormalMap');
        break;
      case 'roughness':
        uniforms.push('terrainRouteOverlayRoughnessMap');
        break;
      case 'metalness':
        uniforms.push('terrainRouteOverlayMetalnessMap');
        break;
      case 'ambientOcclusion':
        uniforms.push('terrainRouteOverlayAmbientOcclusionMap');
        break;
    }
  }
  return uniforms;
}

function toDefineName(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toUpperCase();
}
