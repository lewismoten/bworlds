import type {
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
} from './index.ts';
import {
  createTerrainTextureArrayPlanSet,
  createTerrainTextureBindingPlanSet,
  type TerrainTextureArrayPlan,
  type TerrainTextureArrayPlanSet,
  type TerrainTextureArrayPurpose,
  type TerrainTextureArraySource,
  type TerrainTextureBindingPlanSet,
} from './texture-array-plan.ts';

export type TerrainTextureArrayRuntimeCapabilities = {
  webgl2Supported: boolean;
  maxTextureSize?: number | null;
  maxArrayTextureLayers?: number | null;
  maxCombinedTextureImageUnits?: number | null;
};

export type TerrainTextureArrayCapabilityAssessment = {
  supportsTextureArrays: boolean;
  reasons: readonly string[];
};

export function assessTerrainTextureArrayCapabilities(
  capabilities: TerrainTextureArrayRuntimeCapabilities,
  planSet: TerrainTextureArrayPlanSet
): TerrainTextureArrayCapabilityAssessment {
  const reasons: string[] = [];

  if (!capabilities.webgl2Supported) {
    reasons.push('WebGL2 is not supported.');
  }

  const maxTextureSize = normalizePositiveFinite(capabilities.maxTextureSize);
  if (maxTextureSize !== null) {
    const oversizedPlans = planSet.plans.filter(
      (plan) => plan.width > maxTextureSize || plan.height > maxTextureSize
    );
    if (oversizedPlans.length > 0) {
      reasons.push(
        `Texture arrays exceed maxTextureSize ${maxTextureSize}: ${oversizedPlans
          .map(
            (plan) =>
              `${formatPurposeLabel(plan.purpose)} ${plan.width}x${plan.height}`
          )
          .join(', ')}.`
      );
    }
  }

  const maxArrayTextureLayers = normalizePositiveFinite(
    capabilities.maxArrayTextureLayers
  );
  if (maxArrayTextureLayers !== null) {
    const deepPlans = planSet.plans.filter(
      (plan) => plan.depth > maxArrayTextureLayers
    );
    if (deepPlans.length > 0) {
      reasons.push(
        `Texture arrays exceed maxArrayTextureLayers ${maxArrayTextureLayers}: ${deepPlans
          .map((plan) => `${formatPurposeLabel(plan.purpose)} depth ${plan.depth}`)
          .join(', ')}.`
      );
    }
  }

  const maxCombinedTextureImageUnits = normalizePositiveFinite(
    capabilities.maxCombinedTextureImageUnits
  );
  if (
    maxCombinedTextureImageUnits !== null &&
    planSet.plans.length > maxCombinedTextureImageUnits
  ) {
    reasons.push(
      `Texture arrays require ${planSet.plans.length} combined texture image units but runtime only reports ${maxCombinedTextureImageUnits}.`
    );
  }

  return {
    supportsTextureArrays: reasons.length === 0,
    reasons,
  };
}

export function createTerrainTextureBindingPlanSetFromCapabilities(params: {
  catalog:
    | readonly TerrainMaterialLayerCatalogEntry[]
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        entries?: readonly TerrainMaterialLayerCatalogEntry[];
        byId?: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      };
  resolveTexture: (textureId: string) => TerrainTextureArraySource | undefined;
  purposes?: readonly TerrainTextureArrayPurpose[];
  activeLayerIds?: readonly TerrainMaterialLayerId[];
  capabilities: TerrainTextureArrayRuntimeCapabilities;
}): TerrainTextureBindingPlanSet {
  const arrayPlanSet = createTerrainTextureArrayPlanSet({
    catalog: params.catalog,
    resolveTexture: params.resolveTexture,
    purposes: params.purposes,
    activeLayerIds: params.activeLayerIds,
  });
  const assessment = assessTerrainTextureArrayCapabilities(
    params.capabilities,
    arrayPlanSet
  );

  if (assessment.supportsTextureArrays) {
    return {
      mode: 'texture-array',
      ...arrayPlanSet,
    };
  }

  const fallbackPlanSet = createTerrainTextureBindingPlanSet({
    catalog: params.catalog,
    resolveTexture: params.resolveTexture,
    purposes: params.purposes,
    activeLayerIds: params.activeLayerIds,
    supportsTextureArrays: false,
  });

  return {
    ...fallbackPlanSet,
    warnings: [
      {
        code: 'texture-array-capability',
        message: `Terrain texture arrays are unavailable for this runtime: ${assessment.reasons.join(' ')}`,
      },
      ...fallbackPlanSet.warnings,
    ],
  };
}

function normalizePositiveFinite(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.floor(value);
}

function formatPurposeLabel(purpose: TerrainTextureArrayPurpose): string {
  switch (purpose) {
    case 'baseColor':
      return 'baseColor';
    case 'normal':
      return 'normal';
    case 'roughness':
      return 'roughness';
    case 'metalness':
      return 'metalness';
    case 'ambientOcclusion':
      return 'ambientOcclusion';
  }
}
