import { describe, expect, it } from 'vitest';
import {
  advanceRenderBudgetState,
  createRenderBudgetBuilder,
  createRenderBudget,
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
  updateRenderBudgetStateInPlace,
  type RenderBudgetState,
} from './render-budget.ts';
import { getWeatherVisibilityRadiusCap } from './weather-visibility-budget.ts';

describe('render budget', () => {
  it('keeps the full visibility radius when frame times are healthy', () => {
    let state = DEFAULT_RENDER_BUDGET_STATE;
    for (let index = 0; index < 12; index += 1) {
      state = advanceRenderBudgetState(state, {
        deltaMs: 16.67,
        active3d: true,
        weatherVisibility: 1,
      });
    }

    expect(state.visibilityRadius).toBe(DEFAULT_VISIBILITY_RADIUS);
    expect(state.targetFps).toBe(60);
    expect(state.drawCalls).toBe(0);
    expect(state.maxChunkDrawCalls).toBe(0);
    expect(state.maxChunkMeshes).toBe(0);
    expect(state.textureCount).toBe(0);
    expect(state.visibleMeshCount).toBe(0);
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
        weatherVisibility: 1,
      });
    }
    expect(state.visibilityRadius).toBe(REDUCED_VISIBILITY_RADIUS);
    expect(state.targetFps).toBe(30);

    for (let index = 0; index < 18; index += 1) {
      state = advanceRenderBudgetState(state, {
        deltaMs: 40,
        active3d: true,
        weatherVisibility: 1,
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
      severeFrameStreak: 12,
      drawCalls: 0,
      maxChunkDrawCalls: 0,
      maxChunkMeshes: 0,
      textureCount: 0,
      visibleMeshCount: 0,
      weatherVisibility: 1,
      weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
    };

    for (let index = 0; index < 24; index += 1) {
      state = advanceRenderBudgetState(state, {
        deltaMs: 16.67,
        active3d: true,
        weatherVisibility: 1,
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
        weatherVisibility: 1,
      });
    }

    expect(state.recentFrameMs).toHaveLength(60);
    expect(state.currentFrameMs).toBe(20);
    expect(state.averageFps).toBeCloseTo(50, 0);
    expect(state.worstRecentFrameMs).toBe(20);
  });

  it('supports in-place frame-budget updates for the RAF loop without replacing the state object', () => {
    const state: RenderBudgetState = {
      ...DEFAULT_RENDER_BUDGET_STATE,
      recentFrameMs: [...DEFAULT_RENDER_BUDGET_STATE.recentFrameMs],
    };
    const recentFrameMs = state.recentFrameMs;

    expect(
      updateRenderBudgetStateInPlace(state, {
        deltaMs: 27,
        active3d: true,
        weatherVisibility: 0.8,
        drawCalls: 912,
        maxChunkDrawCalls: 184,
        maxChunkMeshes: 88,
        textureCount: 36,
        visibleMeshCount: 420,
      })
    ).toBe(state);
    expect(state.recentFrameMs).toBe(recentFrameMs);
    expect(state.currentFrameMs).toBe(27);
    expect(state.drawCalls).toBe(912);
    expect(state.maxChunkDrawCalls).toBe(184);
    expect(state.maxChunkMeshes).toBe(88);
    expect(state.textureCount).toBe(36);
    expect(state.visibleMeshCount).toBe(420);
    expect(state.weatherVisibility).toBe(0.8);

    for (let index = 0; index < 80; index += 1) {
      updateRenderBudgetStateInPlace(state, {
        deltaMs: 20,
        active3d: true,
        weatherVisibility: 1,
      });
    }

    expect(state.recentFrameMs).toBe(recentFrameMs);
    expect(state.recentFrameMs).toHaveLength(60);
    expect(state.recentFrameMs.at(-1)).toBe(20);
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

  it('caps visibility radius smoothly when weather visibility drops and restores it when skies clear', () => {
    let state = DEFAULT_RENDER_BUDGET_STATE;

    for (let index = 0; index < 12; index += 1) {
      state = advanceRenderBudgetState(state, {
        deltaMs: 16.67,
        active3d: true,
        weatherVisibility: 0.35,
      });
    }

    expect(state.visibilityRadius).toBeCloseTo(
      getWeatherVisibilityRadiusCap(0.35),
      5
    );
    expect(state.visibilityRadius).toBeLessThan(DEFAULT_VISIBILITY_RADIUS);
    expect(state.targetFps).toBe(60);
    expect(state.weatherVisibilityRadiusCap).toBeCloseTo(state.visibilityRadius, 5);

    for (let index = 0; index < 12; index += 1) {
      state = advanceRenderBudgetState(state, {
        deltaMs: 16.67,
        active3d: true,
        weatherVisibility: 1,
      });
    }

    expect(state.visibilityRadius).toBe(DEFAULT_VISIBILITY_RADIUS);
    expect(state.weatherVisibilityRadiusCap).toBe(DEFAULT_VISIBILITY_RADIUS);
  });

  it('combines weather visibility and frame pressure conservatively', () => {
    let state = DEFAULT_RENDER_BUDGET_STATE;

    for (let index = 0; index < 18; index += 1) {
      state = advanceRenderBudgetState(state, {
        deltaMs: 27,
        active3d: true,
        weatherVisibility: 0.75,
      });
    }

    expect(state.visibilityRadius).toBeLessThanOrEqual(REDUCED_VISIBILITY_RADIUS);
    expect(state.visibilityRadius).toBeCloseTo(
      Math.min(
        REDUCED_VISIBILITY_RADIUS,
        getWeatherVisibilityRadiusCap(0.75)
      ),
      5
    );
    expect(state.targetFps).toBe(30);
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
      drawCalls: {
        soft: 900,
        hard: 1200,
      },
      chunkDrawCalls: {
        soft: 160,
        hard: 240,
      },
      chunkMeshes: {
        soft: 96,
        hard: 144,
      },
      textures: {
        soft: 48,
        hard: 72,
      },
      visibleMeshes: {
        soft: 640,
        hard: 960,
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
          smoothedFrameMs: 26,
          severeFrameStreak: 0,
        })
      )
    ).toBe('Reduced');
    expect(
      formatRenderQualityLevel(
        getRenderQualityLevel({
          visibilityRadius: MIN_VISIBILITY_RADIUS,
          targetFps: 30,
          smoothedFrameMs: 40,
          severeFrameStreak: 10,
        })
      )
    ).toBe('Minimal');
  });

  it('minimizes optional effects only after sustained severe frame stalls', () => {
    let state = DEFAULT_RENDER_BUDGET_STATE;

    for (let index = 0; index < 9; index += 1) {
      state = advanceRenderBudgetState(state, {
        deltaMs: 45,
        active3d: true,
        weatherVisibility: 1,
      });
    }

    expect(getRenderQualityLevel(state)).toBe('reduced');
    expect(state.severeFrameStreak).toBe(9);

    state = advanceRenderBudgetState(state, {
      deltaMs: 45,
      active3d: true,
      weatherVisibility: 1,
    });

    expect(getRenderQualityLevel(state)).toBe('minimal');
    expect(state.severeFrameStreak).toBe(10);
  });

  it('lists the quality limiters that are currently constraining rendering', () => {
    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 16.67,
        visibilityRadius: DEFAULT_VISIBILITY_RADIUS,
        weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
        targetFps: 60,
        severeFrameStreak: 0,
        drawCalls: 0,
        maxChunkDrawCalls: 0,
        maxChunkMeshes: 0,
        textureCount: 0,
        visibleMeshCount: 0,
      })
    ).toEqual(['None']);

    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 27,
        visibilityRadius: REDUCED_VISIBILITY_RADIUS,
        weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
        targetFps: 30,
        severeFrameStreak: 0,
        drawCalls: 0,
        maxChunkDrawCalls: 0,
        maxChunkMeshes: 0,
        textureCount: 0,
        visibleMeshCount: 0,
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
        weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
        targetFps: 30,
        severeFrameStreak: 10,
        drawCalls: 0,
        maxChunkDrawCalls: 0,
        maxChunkMeshes: 0,
        textureCount: 0,
        visibleMeshCount: 0,
      })
    ).toEqual([
      'Target FPS reduced to 30',
      `Visibility radius reduced to ${MIN_VISIBILITY_RADIUS}`,
      'Optional effects minimized after sustained frame stalls',
      'Critical frame pressure',
    ]);

    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 16.67,
        visibilityRadius: 12.5,
        weatherVisibilityRadiusCap: 12.5,
        targetFps: 60,
        severeFrameStreak: 0,
        drawCalls: 0,
        maxChunkDrawCalls: 0,
        maxChunkMeshes: 0,
        textureCount: 0,
        visibleMeshCount: 0,
      })
    ).toEqual([
      'Visibility radius reduced to 12.5',
      'Weather visibility reduced draw distance',
    ]);
  });

  it('reduces draw distance when scene draw calls exceed the soft and hard caps', () => {
    let state = DEFAULT_RENDER_BUDGET_STATE;

    state = advanceRenderBudgetState(state, {
      deltaMs: 16.67,
      active3d: true,
      weatherVisibility: 1,
      drawCalls: 950,
      maxChunkDrawCalls: 0,
      maxChunkMeshes: 0,
      textureCount: 0,
      visibleMeshCount: 0,
    });
    expect(state.visibilityRadius).toBe(REDUCED_VISIBILITY_RADIUS);
    expect(getRenderQualityLevel(state)).toBe('reduced');

    state = advanceRenderBudgetState(state, {
      deltaMs: 16.67,
      active3d: true,
      weatherVisibility: 1,
      drawCalls: 1300,
      maxChunkDrawCalls: 0,
      maxChunkMeshes: 0,
      textureCount: 0,
      visibleMeshCount: 0,
    });
    expect(state.visibilityRadius).toBe(MIN_VISIBILITY_RADIUS);
  });

  it('reports scene draw-call pressure in the active limiter list', () => {
    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 16.67,
        visibilityRadius: REDUCED_VISIBILITY_RADIUS,
        weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
        targetFps: 60,
        severeFrameStreak: 0,
        drawCalls: 950,
        maxChunkDrawCalls: 0,
        maxChunkMeshes: 0,
        textureCount: 0,
        visibleMeshCount: 0,
      })
    ).toEqual([
      `Visibility radius reduced to ${REDUCED_VISIBILITY_RADIUS}`,
      'Scene draw calls exceeded the soft cap',
    ]);

    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 16.67,
        visibilityRadius: MIN_VISIBILITY_RADIUS,
        weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
        targetFps: 60,
        severeFrameStreak: 0,
        drawCalls: 1300,
        maxChunkDrawCalls: 0,
        maxChunkMeshes: 0,
        textureCount: 0,
        visibleMeshCount: 0,
      })
    ).toEqual([
      `Visibility radius reduced to ${MIN_VISIBILITY_RADIUS}`,
      'Scene draw calls exceeded the hard cap',
    ]);
  });

  it('reduces draw distance when one visible chunk becomes too expensive', () => {
    let state = DEFAULT_RENDER_BUDGET_STATE;

    state = advanceRenderBudgetState(state, {
      deltaMs: 16.67,
      active3d: true,
      weatherVisibility: 1,
      drawCalls: 200,
      maxChunkDrawCalls: 170,
      maxChunkMeshes: 0,
      textureCount: 0,
      visibleMeshCount: 0,
    });
    expect(state.visibilityRadius).toBe(REDUCED_VISIBILITY_RADIUS);

    state = advanceRenderBudgetState(state, {
      deltaMs: 16.67,
      active3d: true,
      weatherVisibility: 1,
      drawCalls: 200,
      maxChunkDrawCalls: 250,
      maxChunkMeshes: 0,
      textureCount: 0,
      visibleMeshCount: 0,
    });
    expect(state.visibilityRadius).toBe(MIN_VISIBILITY_RADIUS);
  });

  it('reports chunk draw-call pressure in the active limiter list', () => {
    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 16.67,
        visibilityRadius: REDUCED_VISIBILITY_RADIUS,
        weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
        targetFps: 60,
        severeFrameStreak: 0,
        drawCalls: 0,
        maxChunkDrawCalls: 170,
        maxChunkMeshes: 0,
        textureCount: 0,
        visibleMeshCount: 0,
      })
    ).toEqual([
      `Visibility radius reduced to ${REDUCED_VISIBILITY_RADIUS}`,
      'Chunk draw calls exceeded the soft cap',
    ]);

    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 16.67,
        visibilityRadius: MIN_VISIBILITY_RADIUS,
        weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
        targetFps: 60,
        severeFrameStreak: 0,
        drawCalls: 0,
        maxChunkDrawCalls: 250,
        maxChunkMeshes: 0,
        textureCount: 0,
        visibleMeshCount: 0,
      })
    ).toEqual([
      `Visibility radius reduced to ${MIN_VISIBILITY_RADIUS}`,
      'Chunk draw calls exceeded the hard cap',
    ]);
  });

  it('reduces draw distance when one visible chunk contains too many meshes', () => {
    let state = DEFAULT_RENDER_BUDGET_STATE;

    state = advanceRenderBudgetState(state, {
      deltaMs: 16.67,
      active3d: true,
      weatherVisibility: 1,
      drawCalls: 200,
      maxChunkDrawCalls: 0,
      maxChunkMeshes: 100,
      textureCount: 0,
      visibleMeshCount: 0,
    });
    expect(state.visibilityRadius).toBe(REDUCED_VISIBILITY_RADIUS);

    state = advanceRenderBudgetState(state, {
      deltaMs: 16.67,
      active3d: true,
      weatherVisibility: 1,
      drawCalls: 200,
      maxChunkDrawCalls: 0,
      maxChunkMeshes: 150,
      textureCount: 0,
      visibleMeshCount: 0,
    });
    expect(state.visibilityRadius).toBe(MIN_VISIBILITY_RADIUS);
  });

  it('reports chunk mesh pressure in the active limiter list', () => {
    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 16.67,
        visibilityRadius: REDUCED_VISIBILITY_RADIUS,
        weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
        targetFps: 60,
        severeFrameStreak: 0,
        drawCalls: 0,
        maxChunkDrawCalls: 0,
        maxChunkMeshes: 100,
        textureCount: 0,
        visibleMeshCount: 0,
      })
    ).toEqual([
      `Visibility radius reduced to ${REDUCED_VISIBILITY_RADIUS}`,
      'Chunk meshes exceeded the soft cap',
    ]);

    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 16.67,
        visibilityRadius: MIN_VISIBILITY_RADIUS,
        weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
        targetFps: 60,
        severeFrameStreak: 0,
        drawCalls: 0,
        maxChunkDrawCalls: 0,
        maxChunkMeshes: 150,
        textureCount: 0,
        visibleMeshCount: 0,
      })
    ).toEqual([
      `Visibility radius reduced to ${MIN_VISIBILITY_RADIUS}`,
      'Chunk meshes exceeded the hard cap',
    ]);
  });

  it('reduces draw distance when active texture pressure gets too high', () => {
    let state = DEFAULT_RENDER_BUDGET_STATE;

    state = advanceRenderBudgetState(state, {
      deltaMs: 16.67,
      active3d: true,
      weatherVisibility: 1,
      drawCalls: 200,
      maxChunkDrawCalls: 0,
      maxChunkMeshes: 0,
      textureCount: 52,
      visibleMeshCount: 0,
    });
    expect(state.visibilityRadius).toBe(REDUCED_VISIBILITY_RADIUS);

    state = advanceRenderBudgetState(state, {
      deltaMs: 16.67,
      active3d: true,
      weatherVisibility: 1,
      drawCalls: 200,
      maxChunkDrawCalls: 0,
      maxChunkMeshes: 0,
      textureCount: 80,
      visibleMeshCount: 0,
    });
    expect(state.visibilityRadius).toBe(MIN_VISIBILITY_RADIUS);
  });

  it('reports texture pressure in the active limiter list', () => {
    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 16.67,
        visibilityRadius: REDUCED_VISIBILITY_RADIUS,
        weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
        targetFps: 60,
        severeFrameStreak: 0,
        drawCalls: 0,
        maxChunkDrawCalls: 0,
        maxChunkMeshes: 0,
        textureCount: 52,
        visibleMeshCount: 0,
      })
    ).toEqual([
      `Visibility radius reduced to ${REDUCED_VISIBILITY_RADIUS}`,
      'Active textures exceeded the soft cap',
    ]);

    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 16.67,
        visibilityRadius: MIN_VISIBILITY_RADIUS,
        weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
        targetFps: 60,
        severeFrameStreak: 0,
        drawCalls: 0,
        maxChunkDrawCalls: 0,
        maxChunkMeshes: 0,
        textureCount: 80,
        visibleMeshCount: 0,
      })
    ).toEqual([
      `Visibility radius reduced to ${MIN_VISIBILITY_RADIUS}`,
      'Active textures exceeded the hard cap',
    ]);
  });

  it('reduces draw distance when too many meshes are visible at once', () => {
    let state = DEFAULT_RENDER_BUDGET_STATE;

    state = advanceRenderBudgetState(state, {
      deltaMs: 16.67,
      active3d: true,
      weatherVisibility: 1,
      drawCalls: 200,
      maxChunkDrawCalls: 0,
      maxChunkMeshes: 0,
      textureCount: 0,
      visibleMeshCount: 700,
    });
    expect(state.visibilityRadius).toBe(REDUCED_VISIBILITY_RADIUS);

    state = advanceRenderBudgetState(state, {
      deltaMs: 16.67,
      active3d: true,
      weatherVisibility: 1,
      drawCalls: 200,
      maxChunkDrawCalls: 0,
      maxChunkMeshes: 0,
      textureCount: 0,
      visibleMeshCount: 980,
    });
    expect(state.visibilityRadius).toBe(MIN_VISIBILITY_RADIUS);
  });

  it('reports visible mesh pressure in the active limiter list', () => {
    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 16.67,
        visibilityRadius: REDUCED_VISIBILITY_RADIUS,
        weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
        targetFps: 60,
        severeFrameStreak: 0,
        drawCalls: 0,
        maxChunkDrawCalls: 0,
        maxChunkMeshes: 0,
        textureCount: 0,
        visibleMeshCount: 700,
      })
    ).toEqual([
      `Visibility radius reduced to ${REDUCED_VISIBILITY_RADIUS}`,
      'Visible meshes exceeded the soft cap',
    ]);

    expect(
      getRenderQualityLimiters({
        smoothedFrameMs: 16.67,
        visibilityRadius: MIN_VISIBILITY_RADIUS,
        weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
        targetFps: 60,
        severeFrameStreak: 0,
        drawCalls: 0,
        maxChunkDrawCalls: 0,
        maxChunkMeshes: 0,
        textureCount: 0,
        visibleMeshCount: 980,
      })
    ).toEqual([
      `Visibility radius reduced to ${MIN_VISIBILITY_RADIUS}`,
      'Visible meshes exceeded the hard cap',
    ]);
  });

  it('builds a shared plugin-facing render budget from the active policy state', () => {
    expect(
      createRenderBudget(
        {
          currentFrameMs: 20,
          smoothedFrameMs: 24,
          visibilityRadius: REDUCED_VISIBILITY_RADIUS,
          targetFps: 30,
        },
        {
          detailLevel: 'low',
          generationBudgetMs: 2.25,
          remainingGenerationBudgetMs: 1.5,
          pendingBuildBudgetMs: 1.75,
          maxPendingBuildTiles: 3,
        }
      )
    ).toEqual({
      quality: 'reduced',
      detailLevel: 'low',
      targetFps: 30,
      visibilityRadius: REDUCED_VISIBILITY_RADIUS,
      frame: {
        currentMs: 20,
        smoothedMs: 24,
        generationBudgetMs: 2.25,
        remainingGenerationBudgetMs: 1.5,
        limits: {
          soft: 1000 / 42,
          hard: 1000 / 28,
        },
      },
      pendingBuild: {
        budgetMs: 1.75,
        maxTiles: 3,
        tileLimits: {
          soft: 4,
          hard: 2,
        },
      },
    });
  });

  it('reuses the same render budget object and nested sections for active frame updates', () => {
    const buildRenderBudget = createRenderBudgetBuilder();
    const first = buildRenderBudget(
      {
        currentFrameMs: 20,
        smoothedFrameMs: 24,
        visibilityRadius: REDUCED_VISIBILITY_RADIUS,
        targetFps: 30,
      },
      {
        detailLevel: 'low',
        generationBudgetMs: 2.25,
        remainingGenerationBudgetMs: 1.5,
        pendingBuildBudgetMs: 1.75,
        maxPendingBuildTiles: 3,
      }
    );
    const firstFrame = first.frame;
    const firstPendingBuild = first.pendingBuild;
    const second = buildRenderBudget(
      {
        currentFrameMs: 16.67,
        smoothedFrameMs: 18,
        visibilityRadius: DEFAULT_VISIBILITY_RADIUS,
        targetFps: 60,
      },
      {
        generationBudgetMs: 3.25,
        pendingBuildBudgetMs: 2.2,
        maxPendingBuildTiles: 8,
      }
    );

    expect(second).toBe(first);
    expect(second.frame).toBe(firstFrame);
    expect(second.pendingBuild).toBe(firstPendingBuild);
    expect(second).toEqual({
      quality: 'full',
      detailLevel: 'full',
      targetFps: 60,
      visibilityRadius: DEFAULT_VISIBILITY_RADIUS,
      frame: {
        currentMs: 16.67,
        smoothedMs: 18,
        generationBudgetMs: 3.25,
        remainingGenerationBudgetMs: 3.25,
        limits: {
          soft: 1000 / 42,
          hard: 1000 / 28,
        },
      },
      pendingBuild: {
        budgetMs: 2.2,
        maxTiles: 8,
        tileLimits: {
          soft: 8,
          hard: 4,
        },
      },
    });
  });
});
