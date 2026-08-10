import type {
  Create3DModelContext,
  Model3DResourceCostEstimate,
  RenderBudgetDetailLevel,
  TilePlugin,
} from '@bworlds/plugin-api';
import {
  getTileModelCostEstimateBudgetViolations,
  type TileModelCostEstimateBudgetViolation,
  type TileModelCostEstimateLimits,
} from './tile-model-cost-estimate-validation.ts';

type TileModelHardLimitsSubset = Pick<
  Record<string, number>,
  | 'object3dCount'
  | 'groupCount'
  | 'meshCount'
  | 'drawCallCount'
  | 'instancedMeshCount'
  | 'pointsCount'
  | 'lineObjectCount'
  | 'spriteCount'
  | 'geometryCount'
  | 'materialCount'
  | 'textureCount'
  | 'lightCount'
  | 'shadowLightCount'
  | 'animationMixerCount'
  | 'skeletonCount'
  | 'boneCount'
  | 'morphTargetCount'
  | 'attachmentCount'
  | 'collisionShapeCount'
  | 'audioEmitterCount'
  | 'vertexCount'
  | 'triangleCount'
>;

export function getTileModelCostEstimateLimits(
  limits: TileModelHardLimitsSubset
): TileModelCostEstimateLimits {
  return {
    object3dCount: limits.object3dCount,
    groupCount: limits.groupCount,
    meshCount: limits.meshCount,
    drawCallCount: limits.drawCallCount,
    instancedMeshCount: limits.instancedMeshCount,
    pointsCount: limits.pointsCount,
    lineObjectCount: limits.lineObjectCount,
    spriteCount: limits.spriteCount,
    geometryCount: limits.geometryCount,
    materialCount: limits.materialCount,
    textureCount: limits.textureCount,
    lightCount: limits.lightCount,
    shadowLightCount: limits.shadowLightCount,
    animationMixerCount: limits.animationMixerCount,
    skeletonCount: limits.skeletonCount,
    boneCount: limits.boneCount,
    morphTargetCount: limits.morphTargetCount,
    attachmentCount: limits.attachmentCount,
    collisionShapeCount: limits.collisionShapeCount,
    audioEmitterCount: limits.audioEmitterCount,
    vertexCount: limits.vertexCount,
    triangleCount: limits.triangleCount,
  };
}

export function validateTileModelCostEstimateAgainstLimits(
  estimate: Model3DResourceCostEstimate,
  limits: TileModelCostEstimateLimits
): {
  accepted: boolean;
  estimate: Model3DResourceCostEstimate;
  limits: TileModelCostEstimateLimits;
  violations: TileModelCostEstimateBudgetViolation[];
} {
  const violations = getTileModelCostEstimateBudgetViolations(estimate, limits);
  return {
    accepted: violations.length === 0,
    estimate,
    limits,
    violations,
  };
}

export function createTilePluginModelFromCostEstimate(
  tilePlugin:
    | Pick<TilePlugin, 'estimate3DModelCost' | 'create3DModel'>
    | null
    | undefined,
  renderContext: Create3DModelContext,
  limits: TileModelCostEstimateLimits
): {
  estimatedCost: Model3DResourceCostEstimate | null;
  estimateValidation: {
    accepted: boolean;
    estimate: Model3DResourceCostEstimate;
    limits: TileModelCostEstimateLimits;
    violations: TileModelCostEstimateBudgetViolation[];
  } | null;
  pluginBuildStartMs: number;
  pluginBuildDurationMs: number;
  pluginModel: unknown;
} {
  const estimatedCostResult = tilePlugin?.estimate3DModelCost?.(renderContext);
  const estimatedCost: Model3DResourceCostEstimate | null =
    estimatedCostResult && typeof estimatedCostResult === 'object'
      ? estimatedCostResult
      : null;
  const estimateValidation = estimatedCost
    ? validateTileModelCostEstimateAgainstLimits(estimatedCost, limits)
    : null;
  const pluginBuildStartMs = performance.now();
  const pluginModel =
    estimateValidation && !estimateValidation.accepted
      ? null
      : tilePlugin?.create3DModel?.(renderContext);
  return {
    estimatedCost,
    estimateValidation,
    pluginBuildStartMs,
    pluginBuildDurationMs: performance.now() - pluginBuildStartMs,
    pluginModel,
  };
}

export function getTileModelCostEstimateLimitsForDetailLevel(
  detailLevel: RenderBudgetDetailLevel,
  getHardLimits: (
    detailLevel: RenderBudgetDetailLevel
  ) => TileModelHardLimitsSubset
): TileModelCostEstimateLimits {
  return getTileModelCostEstimateLimits(getHardLimits(detailLevel));
}
