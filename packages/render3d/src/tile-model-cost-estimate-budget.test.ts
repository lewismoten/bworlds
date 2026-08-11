import { describe, expect, it } from 'vitest';

import {
  createTilePluginModelFromCostEstimate,
  resumeProgressiveTileModelBuildWithinBudget,
} from './tile-model-cost-estimate-budget.ts';

const LOW_LIMITS = {
  object3dCount: 64,
  groupCount: 16,
  meshCount: 16,
  drawCallCount: 16,
  instancedMeshCount: 8,
  pointsCount: 0,
  lineObjectCount: 0,
  spriteCount: 0,
  geometryCount: 16,
  materialCount: 16,
  textureCount: 16,
  lightCount: 0,
  shadowLightCount: 0,
  animationMixerCount: 0,
  skeletonCount: 0,
  boneCount: 0,
  morphTargetCount: 0,
  attachmentCount: 0,
  collisionShapeCount: 0,
  audioEmitterCount: 0,
  vertexCount: 5_000,
  triangleCount: 3_000,
} as const;

describe('tile model cost estimate budget', () => {
  it('resumes multiple progressive build yields while the current flush budget remains', () => {
    const currentTimesMs = [100.2, 101.5];
    const build = createTilePluginModelFromCostEstimate(
      {
        create3DModelProgressive: function* () {
          yield { completedSteps: 1, totalSteps: 3, label: 'layout' };
          yield { completedSteps: 2, totalSteps: 3, label: 'foliage' };
          return { type: 'Mesh', name: 'done' };
        },
      },
      {
        three: {} as never,
        tile: { kind: 'forest' },
        state: {} as never,
        tileX: 12,
        tileY: 8,
        detailLevel: 'low',
      } as never,
      LOW_LIMITS
    ).progressiveBuild;

    expect(build).not.toBeNull();
    expect(
      resumeProgressiveTileModelBuildWithinBudget(build!, {
        flushStartMs: 100,
        pendingBuildBudgetMs: 1,
        maxSteps: 3,
        minimumSteps: 1,
        getCurrentMs: () => currentTimesMs.shift() ?? 101.5,
      })
    ).toEqual({
      done: false,
      model: null,
      progress: {
        completedSteps: 2,
        totalSteps: 3,
        label: 'foliage',
      },
      stepsProcessed: 2,
    });
  });

  it('keeps one progressive yield guaranteed before the budget cutoff, then finishes on a later flush', () => {
    const build = createTilePluginModelFromCostEstimate(
      {
        create3DModelProgressive: function* () {
          yield { completedSteps: 1, totalSteps: 2, label: 'tower' };
          return { type: 'Mesh', name: 'done' };
        },
      },
      {
        three: {} as never,
        tile: { kind: 'lighthouse' },
        state: {} as never,
        tileX: 4,
        tileY: 9,
        detailLevel: 'full',
      } as never,
      LOW_LIMITS
    ).progressiveBuild;

    expect(build).not.toBeNull();
    expect(
      resumeProgressiveTileModelBuildWithinBudget(build!, {
        flushStartMs: 100,
        pendingBuildBudgetMs: 0,
        maxSteps: 4,
        minimumSteps: 1,
        getCurrentMs: () => 100,
      })
    ).toEqual({
      done: false,
      model: null,
      progress: {
        completedSteps: 1,
        totalSteps: 2,
        label: 'tower',
      },
      stepsProcessed: 1,
    });
    expect(
      resumeProgressiveTileModelBuildWithinBudget(build!, {
        flushStartMs: 120,
        pendingBuildBudgetMs: 1,
        maxSteps: 4,
        minimumSteps: 1,
        getCurrentMs: () => 120,
      })
    ).toEqual({
      done: true,
      model: { type: 'Mesh', name: 'done' },
      progress: {
        completedSteps: 1,
        totalSteps: 2,
        label: 'tower',
      },
      stepsProcessed: 1,
    });
  });
});
