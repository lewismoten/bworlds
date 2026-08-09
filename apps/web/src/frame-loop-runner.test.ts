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
      getMaxChunkObjects: () => 118,
      getMaxChunkMeshes: () => 72,
      getMaxChunkTriangles: () => 18240,
      getLightCount: () => 9,
      getShadowLightCount: () => 2,
      getMaterialCount: () => 28,
      getTextureCount: () => 24,
      getVisibleObjectCount: () => 260,
      getEstimatedGpuMemoryBytes: () => 18 * 1024 * 1024,
      getVisibleTriangleCount: () => 4810,
      getVisibleVertexCount: () => 14432,
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
    expect(renderBudgetState.maxChunkObjectCount).toBe(118);
    expect(renderBudgetState.maxChunkMeshes).toBe(72);
    expect(renderBudgetState.maxChunkTriangleCount).toBe(18240);
    expect(renderBudgetState.totalLightCount).toBe(9);
    expect(renderBudgetState.totalShadowLightCount).toBe(2);
    expect(renderBudgetState.materialCount).toBe(28);
    expect(renderBudgetState.textureCount).toBe(24);
    expect(renderBudgetState.visibleObjectCount).toBe(260);
    expect(renderBudgetState.estimatedGpuMemoryBytes).toBe(18 * 1024 * 1024);
    expect(renderBudgetState.visibleTriangleCount).toBe(4810);
    expect(renderBudgetState.visibleVertexCount).toBe(14432);
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
      getMaxChunkObjects: () => 0,
      getMaxChunkMeshes: () => 0,
      getMaxChunkTriangles: () => 0,
      getLightCount: () => 0,
      getShadowLightCount: () => 0,
      getMaterialCount: () => 0,
      getTextureCount: () => 0,
      getVisibleObjectCount: () => 0,
      getEstimatedGpuMemoryBytes: () => 0,
      getVisibleTriangleCount: () => 0,
      getVisibleVertexCount: () => 0,
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
