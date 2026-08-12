import type {
  Create3DModelContext,
  Create3DModelProgress,
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

function getTileModelCostEstimateLimits(
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

export type ProgressiveTileModelBuildState = {
  generator: Generator<Create3DModelProgress, unknown, void>;
  lastProgress: Create3DModelProgress | null;
};

function isProgressiveTileModelGenerator(
  value: unknown
): value is Generator<Create3DModelProgress, unknown, void> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'next' in value &&
    typeof (value as { next?: unknown }).next === 'function'
  );
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
    | Pick<
        TilePlugin,
        'estimate3DModelCost' | 'create3DModel' | 'create3DModelProgressive'
      >
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
  progressiveBuild: ProgressiveTileModelBuildState | null;
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
  let pluginModel: unknown = null;
  let progressiveBuild: ProgressiveTileModelBuildState | null = null;
  if (!(estimateValidation && !estimateValidation.accepted)) {
    if (tilePlugin?.create3DModelProgressive) {
      const progressiveGenerator =
        tilePlugin.create3DModelProgressive(renderContext);
      if (isProgressiveTileModelGenerator(progressiveGenerator)) {
        progressiveBuild = {
          generator: progressiveGenerator,
          lastProgress: null,
        };
      } else {
        pluginModel = tilePlugin?.create3DModel?.(renderContext) ?? null;
      }
    } else {
      pluginModel = tilePlugin?.create3DModel?.(renderContext);
    }
  }
  return {
    estimatedCost,
    estimateValidation,
    pluginBuildStartMs,
    pluginBuildDurationMs: performance.now() - pluginBuildStartMs,
    pluginModel,
    progressiveBuild,
  };
}

export function resumeProgressiveTileModelBuild(
  build: ProgressiveTileModelBuildState,
  maxSteps = 1
): {
  done: boolean;
  model: unknown;
  progress: Create3DModelProgress | null;
  stepsProcessed: number;
} {
  const stepLimit = Math.max(1, Math.floor(maxSteps));
  let stepsProcessed = 0;

  while (stepsProcessed < stepLimit) {
    const next = build.generator.next();
    stepsProcessed += 1;
    if (next.done) {
      return {
        done: true,
        model: next.value,
        progress: build.lastProgress,
        stepsProcessed,
      };
    }
    build.lastProgress = next.value as Create3DModelProgress;
  }

  return {
    done: false,
    model: null,
    progress: build.lastProgress,
    stepsProcessed,
  };
}

export function resumeProgressiveTileModelBuildWithinBudget(
  build: ProgressiveTileModelBuildState,
  options: {
    flushStartMs: number;
    pendingBuildBudgetMs: number;
    maxSteps?: number;
    minimumSteps?: number;
    getCurrentMs?: () => number;
  }
): {
  done: boolean;
  model: unknown;
  progress: Create3DModelProgress | null;
  stepsProcessed: number;
} {
  const stepLimit = Math.max(1, Math.floor(options.maxSteps ?? 1));
  const minimumSteps = Math.max(
    0,
    Math.min(stepLimit, Math.floor(options.minimumSteps ?? 1))
  );
  const getCurrentMs = options.getCurrentMs ?? (() => performance.now());
  let stepsProcessed = 0;

  while (stepsProcessed < stepLimit) {
    if (
      stepsProcessed >= minimumSteps &&
      getCurrentMs() - options.flushStartMs >= options.pendingBuildBudgetMs
    ) {
      break;
    }

    const resumed = resumeProgressiveTileModelBuild(build);
    stepsProcessed += resumed.stepsProcessed;
    if (resumed.done) {
      return {
        ...resumed,
        stepsProcessed,
      };
    }
  }

  return {
    done: false,
    model: null,
    progress: build.lastProgress,
    stepsProcessed,
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
