import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_RENDER_BUDGET_STATE } from './render-budget.ts';
import { createFrameLoopRunner } from './frame-loop-runner.ts';

describe('frame loop runner', () => {
  it('updates render budgets, advances movement when needed, and renders the frame', () => {
    const renderBudgetState = {
      ...DEFAULT_RENDER_BUDGET_STATE,
      recentFrameMs: [...DEFAULT_RENDER_BUDGET_STATE.recentFrameMs],
    };
    const updateMovement = vi.fn();
    const render = vi.fn(() => 'rendered');
    const keys = new Set<string>(['w']);
    const runFrame = createFrameLoopRunner({
      renderBudgetState,
      getDrawCalls: () => 456,
      getMaxChunkDrawCalls: () => 96,
      getMaxChunkMeshes: () => 72,
      getMaterialCount: () => 28,
      getTextureCount: () => 24,
      getVisibleObjectCount: () => 260,
      getVisibleMeshCount: () => 180,
      getWeatherVisibility: () => 0.7,
      is3dViewActive: () => true,
      isTimeFrozen: () => false,
      keys,
      isJumping: () => false,
      updateMovement,
      render,
    });

    expect(runFrame(27)).toBe('rendered');
    expect(updateMovement).toHaveBeenCalledWith(27);
    expect(render).toHaveBeenCalledTimes(1);
    expect(renderBudgetState.currentFrameMs).toBe(27);
    expect(renderBudgetState.drawCalls).toBe(456);
    expect(renderBudgetState.maxChunkDrawCalls).toBe(96);
    expect(renderBudgetState.maxChunkMeshes).toBe(72);
    expect(renderBudgetState.materialCount).toBe(28);
    expect(renderBudgetState.textureCount).toBe(24);
    expect(renderBudgetState.visibleObjectCount).toBe(260);
    expect(renderBudgetState.visibleMeshCount).toBe(180);
    expect(renderBudgetState.weatherVisibility).toBe(0.7);
    expect(renderBudgetState.smoothedFrameMs).toBeGreaterThan(
      DEFAULT_RENDER_BUDGET_STATE.smoothedFrameMs
    );
  });

  it('skips movement updates when time is frozen and no active simulation input remains', () => {
    const renderBudgetState = {
      ...DEFAULT_RENDER_BUDGET_STATE,
      recentFrameMs: [...DEFAULT_RENDER_BUDGET_STATE.recentFrameMs],
    };
    const updateMovement = vi.fn();
    const render = vi.fn(() => undefined);
    const runFrame = createFrameLoopRunner({
      renderBudgetState,
      getDrawCalls: () => 0,
      getMaxChunkDrawCalls: () => 0,
      getMaxChunkMeshes: () => 0,
      getMaterialCount: () => 0,
      getTextureCount: () => 0,
      getVisibleObjectCount: () => 0,
      getVisibleMeshCount: () => 0,
      getWeatherVisibility: () => 1,
      is3dViewActive: () => false,
      isTimeFrozen: () => true,
      keys: new Set<string>(),
      isJumping: () => false,
      updateMovement,
      render,
    });

    runFrame(16.67);

    expect(updateMovement).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledTimes(1);
    expect(renderBudgetState.targetFps).toBe(60);
    expect(renderBudgetState.visibilityRadius).toBe(DEFAULT_RENDER_BUDGET_STATE.visibilityRadius);
  });
});
