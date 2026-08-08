import { describe, expect, it } from 'vitest';
import {
  advanceRenderBudgetState,
  DEFAULT_RENDER_BUDGET_STATE,
  DEFAULT_VISIBILITY_RADIUS,
  getPendingWorldBuildBudget,
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
  });

  it('recovers the full radius and 60 fps target after healthy frames or when leaving 3d', () => {
    let state: RenderBudgetState = {
      smoothedFrameMs: 38,
      visibilityRadius: MIN_VISIBILITY_RADIUS,
      targetFps: 30,
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
});
