import { describe, expect, it } from 'vitest';
import {
  advanceRenderBudgetState,
  DEFAULT_RENDER_BUDGET_STATE,
  DEFAULT_VISIBILITY_RADIUS,
  formatRenderQualityLevel,
  getFrameGenerationBudget,
  getPendingWorldBuildBudget,
  getRenderBudgetCaps,
  getRenderQualityLevel,
  getRenderQualityLimiters,
  MIN_VISIBILITY_RADIUS,
  REDUCED_VISIBILITY_RADIUS,
  type RenderBudgetState,
} from './render-budget.ts';

describe('render budget', () => {
  it('keeps the full visibility radius when frame times are healthy', () => {
    let state = DEFAULT_RENDER_BUDGET_STATE;
    for (let index = 0; index < 12; index += 1) {
      state = advanceRenderBudgetState(state, {
        deltaMs: 16.67,
        active3d: true,
      });
    }

    expect(state.visibilityRadius).toBe(DEFAULT_VISIBILITY_RADIUS);
    expect(state.targetFps).toBe(60);
    expect(state.currentFrameMs).toBeCloseTo(16.67, 2);
    expect(state.averageFps).toBeCloseTo(60, 0);
    expect(state.worstRecentFrameMs).toBeCloseTo(16.67, 2);
  });

  it('reduces visibility radius in stages as frame times degrade and lowers the target fps', () => {
    let state = DEFAULT_RENDER_BUDGET_STATE;
    for (let index = 0; index < 18; index += 1) {
      state = advanceRenderBudgetState(state, {
        deltaMs: 27,
        active3d: true,
      });
    }
    expect(state.visibilityRadius).toBe(REDUCED_VISIBILITY_RADIUS);
    expect(state.targetFps).toBe(30);

    for (let index = 0; index < 18; index += 1) {
      state = advanceRenderBudgetState(state, {
        deltaMs: 40,
        active3d: true,
      });
    }
    expect(state.visibilityRadius).toBe(MIN_VISIBILITY_RADIUS);
    expect(state.targetFps).toBe(30);
    expect(state.worstRecentFrameMs).toBe(40);
  });

  it('recovers the full radius and 60 fps target after healthy frames or when leaving 3d', () => {
    let state: RenderBudgetState = {
      currentFrameMs: 38,
      smoothedFrameMs: 38,
      recentFrameMs: [38, 36, 34],
      visibilityRadius: MIN_VISIBILITY_RADIUS,
      targetFps: 30,
      averageFps: 1000 / 36,
      worstRecentFrameMs: 38,
    };

    for (let index = 0; index < 24; index += 1) {
      state = advanceRenderBudgetState(state, {
        deltaMs: 16.67,
        active3d: true,
      });
    }
    expect(state.visibilityRadius).toBe(DEFAULT_VISIBILITY_RADIUS);
    expect(state.targetFps).toBe(60);

    state = advanceRenderBudgetState(state, {
      deltaMs: 16.67,
      active3d: false,
    });
    expect(state.visibilityRadius).toBe(DEFAULT_VISIBILITY_RADIUS);
    expect(state.targetFps).toBe(60);
    expect(state.averageFps).toBe(60);
    expect(state.worstRecentFrameMs).toBeCloseTo(16.67, 2);
  });

  it('tracks a rolling average fps and worst recent frame time over the recent window', () => {
    let state = DEFAULT_RENDER_BUDGET_STATE;

    for (let index = 0; index < 70; index += 1) {
      state = advanceRenderBudgetState(state, {
        deltaMs: index === 5 ? 45 : 20,
        active3d: true,
      });
    }

    expect(state.recentFrameMs).toHaveLength(60);
    expect(state.currentFrameMs).toBe(20);
    expect(state.averageFps).toBeCloseTo(50, 0);
    expect(state.worstRecentFrameMs).toBe(20);
  });

  it('allocates more pending world-build time when frames are healthy and less when under pressure', () => {
    const healthyBudget = getPendingWorldBuildBudget(DEFAULT_RENDER_BUDGET_STATE);
    expect(healthyBudget.pendingBuildBudgetMs).toBeCloseTo(2.7, 1);
    expect(healthyBudget.maxPendingBuildTiles).toBe(8);

    const reducedBudget = getPendingWorldBuildBudget({
      smoothedFrameMs: 26,
      targetFps: 30,
    });
    expect(reducedBudget.pendingBuildBudgetMs).toBe(2.25);
    expect(reducedBudget.maxPendingBuildTiles).toBe(4);

    const criticalBudget = getPendingWorldBuildBudget({
      smoothedFrameMs: 40,
      targetFps: 30,
    });
    expect(criticalBudget.pendingBuildBudgetMs).toBe(0.75);
    expect(criticalBudget.maxPendingBuildTiles).toBe(2);
    expect(criticalBudget.pendingBuildBudgetMs).toBeLessThan(
      reducedBudget.pendingBuildBudgetMs
    );
  });

  it('keeps a shared frame-generation budget above pending builds while tightening under pressure', () => {
    const healthyBudget = getFrameGenerationBudget(DEFAULT_RENDER_BUDGET_STATE);
    const healthyPendingBudget = getPendingWorldBuildBudget(DEFAULT_RENDER_BUDGET_STATE);
    const criticalState = {
      smoothedFrameMs: 40,
      targetFps: 30 as const,
    };
    const criticalBudget = getFrameGenerationBudget(criticalState);
    const criticalPendingBudget = getPendingWorldBuildBudget(criticalState);

    expect(healthyBudget.generationBudgetMs).toBeGreaterThan(
      healthyPendingBudget.pendingBuildBudgetMs
    );
    expect(criticalBudget.generationBudgetMs).toBeGreaterThanOrEqual(
      criticalPendingBudget.pendingBuildBudgetMs
    );
    expect(criticalBudget.generationBudgetMs).toBeLessThan(
      healthyBudget.generationBudgetMs
    );
  });

  it('describes the active soft and hard caps for the current render-budget policy', () => {
    expect(getRenderBudgetCaps({ targetFps: 60 })).toEqual({
      frameMs: {
        soft: 1000 / 42,
        hard: 1000 / 28,
      },
      visibilityRadius: {
        full: DEFAULT_VISIBILITY_RADIUS,
        reduced: REDUCED_VISIBILITY_RADIUS,
        minimum: MIN_VISIBILITY_RADIUS,
      },
      pendingBuildBudgetMs: {
        minimum: 0.75,
        maximum: 3.5,
      },
      pendingBuildTiles: {
        soft: 8,
        hard: 4,
      },
    });

    expect(getRenderBudgetCaps({ targetFps: 30 })).toMatchObject({
      pendingBuildBudgetMs: {
        minimum: 0.75,
        maximum: 2.25,
      },
      pendingBuildTiles: {
        soft: 4,
        hard: 2,
      },
    });
  });

  it('derives a stable render quality label from the current budget state', () => {
    expect(formatRenderQualityLevel(getRenderQualityLevel(DEFAULT_RENDER_BUDGET_STATE))).toBe(
      'Full'
    );
    expect(
      formatRenderQualityLevel(
        getRenderQualityLevel({
          visibilityRadius: REDUCED_VISIBILITY_RADIUS,
          targetFps: 30,
        })
      )
    ).toBe('Reduced');
    expect(
      formatRenderQualityLevel(
        getRenderQualityLevel({
          visibilityRadius: MIN_VISIBILITY_RADIUS,
          targetFps: 30,
        })
      )
    ).toBe('Minimal');
  });

  it('lists the quality limiters that are currently constraining rendering', () => {
    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 16.67,
        visibilityRadius: DEFAULT_VISIBILITY_RADIUS,
        targetFps: 60,
      })
    ).toEqual(['None']);

    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 27,
        visibilityRadius: REDUCED_VISIBILITY_RADIUS,
        targetFps: 30,
      })
    ).toEqual([
      'Target FPS reduced to 30',
      `Visibility radius reduced to ${REDUCED_VISIBILITY_RADIUS}`,
      'High frame pressure',
    ]);

    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 40,
        visibilityRadius: MIN_VISIBILITY_RADIUS,
        targetFps: 30,
      })
    ).toEqual([
      'Target FPS reduced to 30',
      `Visibility radius reduced to ${MIN_VISIBILITY_RADIUS}`,
      'Critical frame pressure',
    ]);
  });
});
