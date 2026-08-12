import type { TerrainMaterialLayerId } from './index.ts';
import type {
  TerrainTextureArrayPlanSetWarning,
  TerrainTextureBindingMode,
  TerrainTextureBindingPlanSet,
} from './texture-array-plan.ts';

export type TerrainSplatMaterialPlanUniform =
  | 'terrainSplatBaseColorMap'
  | 'terrainSplatNormalMap'
  | 'terrainSplatRoughnessMap'
  | 'terrainSplatMetalnessMap'
  | 'terrainSplatAmbientOcclusionMap'
  | 'terrainSplatBlendEnabled'
  | 'terrainSplatWetness'
  | 'terrainSplatSnow';

export type TerrainSplatMaterialPlanAttribute = {
  name: 'terrainSplatLayerIndices' | 'terrainSplatLayerWeights';
  itemSize: 4;
  format: 'uint8';
  normalized: boolean;
};

export type TerrainSplatMaterialPlanWarningCode =
  | TerrainTextureArrayPlanSetWarning['code']
  | 'unique-splat-material';

export type TerrainSplatMaterialPlanWarning = {
  code: TerrainSplatMaterialPlanWarningCode;
  message: string;
};

export type TerrainSplatMaterialPlan = {
  materialKey: string;
  bindingMode: TerrainTextureBindingMode;
  layerSlots: readonly {
    layerId: TerrainMaterialLayerId;
    layerIndex: number;
  }[];
  activeLayerIds: readonly TerrainMaterialLayerId[];
  mapPurposes: readonly string[];
  requiredAttributes: readonly TerrainSplatMaterialPlanAttribute[];
  globalUniforms: readonly TerrainSplatMaterialPlanUniform[];
  shaderDefines: readonly string[];
  estimatedTextureBytes: number;
  warnings: readonly TerrainSplatMaterialPlanWarning[];
};

export type TerrainSplatMaterialReuseSummary = {
  chunkCount: number;
  uniqueMaterialCount: number;
  reusedChunkCount: number;
  materialReuseCount: number;
  materialKeys: readonly string[];
  warnings: readonly TerrainSplatMaterialPlanWarning[];
};

const REQUIRED_ATTRIBUTES: readonly TerrainSplatMaterialPlanAttribute[] = [
  {
    name: 'terrainSplatLayerIndices',
    itemSize: 4,
    format: 'uint8',
    normalized: false,
  },
  {
    name: 'terrainSplatLayerWeights',
    itemSize: 4,
    format: 'uint8',
    normalized: true,
  },
];

const GLOBAL_UNIFORMS: readonly TerrainSplatMaterialPlanUniform[] = [
  'terrainSplatBlendEnabled',
  'terrainSplatWetness',
  'terrainSplatSnow',
];

export function createTerrainSplatMaterialPlan(
  bindingPlanSet: TerrainTextureBindingPlanSet
): TerrainSplatMaterialPlan {
  const mapPurposes = bindingPlanSet.plans.map((plan) => plan.purpose).sort();
  const shaderDefines = createShaderDefines(bindingPlanSet.mode, mapPurposes);
  const materialKey = [
    `mode:${bindingPlanSet.mode}`,
    `layers:${bindingPlanSet.layerSlots
      .map((slot) => `${slot.layerIndex}:${slot.layerId}`)
      .join(',')}`,
    `maps:${mapPurposes.join(',')}`,
    `defines:${shaderDefines.join(',')}`,
  ].join('|');

  return {
    materialKey,
    bindingMode: bindingPlanSet.mode,
    layerSlots: bindingPlanSet.layerSlots.map((slot) => ({ ...slot })),
    activeLayerIds: [...bindingPlanSet.activeLayerIds],
    mapPurposes,
    requiredAttributes: REQUIRED_ATTRIBUTES,
    globalUniforms: [
      ...resolveTextureUniforms(mapPurposes),
      ...GLOBAL_UNIFORMS,
    ],
    shaderDefines,
    estimatedTextureBytes: bindingPlanSet.estimatedBytes,
    warnings: bindingPlanSet.warnings.map((warning) => ({ ...warning })),
  };
}

export function summarizeTerrainSplatMaterialReuse(
  entries: readonly {
    chunkId: string;
    plan: TerrainSplatMaterialPlan;
  }[]
): TerrainSplatMaterialReuseSummary {
  const chunkIdsByMaterialKey = new Map<string, string[]>();
  const warnings = new Map<string, TerrainSplatMaterialPlanWarning>();

  for (const entry of entries) {
    const chunkIds = chunkIdsByMaterialKey.get(entry.plan.materialKey) ?? [];
    chunkIds.push(entry.chunkId);
    chunkIdsByMaterialKey.set(entry.plan.materialKey, chunkIds);
    for (const warning of entry.plan.warnings) {
      warnings.set(`${warning.code}:${warning.message}`, warning);
    }
  }

  for (const [materialKey, chunkIds] of chunkIdsByMaterialKey) {
    if (chunkIds.length === 1) {
      const warning = {
        code: 'unique-splat-material',
        message: `Terrain chunk ${JSON.stringify(chunkIds[0])} created one unique splat material "${materialKey}".`,
      } satisfies TerrainSplatMaterialPlanWarning;
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

function createShaderDefines(
  mode: TerrainTextureBindingMode,
  mapPurposes: readonly string[]
): readonly string[] {
  const defines = [
    mode === 'texture-array'
      ? 'TERRAIN_SPLAT_TEXTURE_ARRAYS'
      : 'TERRAIN_SPLAT_PER_LAYER_TEXTURES',
  ];
  for (const purpose of mapPurposes) {
    defines.push(`TERRAIN_SPLAT_${toDefineName(purpose)}_MAP`);
  }
  return defines;
}

function resolveTextureUniforms(
  mapPurposes: readonly string[]
): TerrainSplatMaterialPlanUniform[] {
  const uniforms: TerrainSplatMaterialPlanUniform[] = [];
  for (const purpose of mapPurposes) {
    switch (purpose) {
      case 'baseColor':
        uniforms.push('terrainSplatBaseColorMap');
        break;
      case 'normal':
        uniforms.push('terrainSplatNormalMap');
        break;
      case 'roughness':
        uniforms.push('terrainSplatRoughnessMap');
        break;
      case 'metalness':
        uniforms.push('terrainSplatMetalnessMap');
        break;
      case 'ambientOcclusion':
        uniforms.push('terrainSplatAmbientOcclusionMap');
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
