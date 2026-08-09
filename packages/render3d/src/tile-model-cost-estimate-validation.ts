import type { Model3DResourceCostEstimate } from '@bworlds/plugin-api';

export const TILE_MODEL_COST_ESTIMATE_METRICS = [
  'object3dCount',
  'groupCount',
  'meshCount',
  'drawCallCount',
  'instancedMeshCount',
  'pointsCount',
  'lineObjectCount',
  'spriteCount',
  'geometryCount',
  'materialCount',
  'textureCount',
  'lightCount',
  'shadowLightCount',
  'animationMixerCount',
  'vertexCount',
  'triangleCount',
] as const satisfies ReadonlyArray<keyof Model3DResourceCostEstimate>;

export type TileModelCostEstimateMetric =
  (typeof TILE_MODEL_COST_ESTIMATE_METRICS)[number];

export type TileModelCostEstimateLimits = Record<TileModelCostEstimateMetric, number>;

export type TileModelCostEstimateBudgetViolation = {
  metric: TileModelCostEstimateMetric;
  actual: number;
  limit: number;
};

export function getTileModelCostEstimateBudgetViolations(
  estimate: Model3DResourceCostEstimate,
  limits: TileModelCostEstimateLimits
): TileModelCostEstimateBudgetViolation[] {
  const violations: TileModelCostEstimateBudgetViolation[] = [];

  for (const metric of TILE_MODEL_COST_ESTIMATE_METRICS) {
    const actual = estimate[metric];
    if (typeof actual !== 'number' || !Number.isFinite(actual)) {
      continue;
    }
    const limit = limits[metric];
    if (actual > limit) {
      violations.push({ metric, actual, limit });
    }
  }

  return violations;
}

export function summarizeTileModelCostEstimateBudgetViolations(
  violations: TileModelCostEstimateBudgetViolation[]
): string {
  return violations
    .map((violation) => `estimated ${violation.metric} ${violation.actual}>${violation.limit}`)
    .join(', ');
}
