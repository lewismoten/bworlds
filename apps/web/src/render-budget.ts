import type {
  RenderBudget,
  RenderBudgetDetailLevel,
} from '@bworlds/plugin-api';

import {
  DEFAULT_VISIBILITY_RADIUS,
  MIN_VISIBILITY_RADIUS,
  REDUCED_VISIBILITY_RADIUS,
} from './render-visibility-radius.ts';
export {
  DEFAULT_VISIBILITY_RADIUS,
  MIN_VISIBILITY_RADIUS,
  REDUCED_VISIBILITY_RADIUS,
} from './render-visibility-radius.ts';
import { getWeatherVisibilityRadiusCap } from './weather-visibility-budget.ts';

export type RenderBudgetState = {
  currentFrameMs: number;
  smoothedFrameMs: number;
  recentFrameMs: number[];
  drawCalls: number;
  maxChunkDrawCalls: number;
  maxChunkObjectCount: number;
  maxChunkMeshes: number;
  maxChunkTriangleCount: number;
  totalLightCount: number;
  totalShadowLightCount: number;
  materialCount: number;
  textureCount: number;
  visibleObjectCount: number;
  estimatedGpuMemoryBytes: number;
  visibleTriangleCount: number;
  visibleVertexCount: number;
  visibleMeshCount: number;
  visibilityRadius: number;
  weatherVisibility: number;
  weatherVisibilityRadiusCap: number;
  targetFps: 60 | 30;
  averageFps: number;
  worstRecentFrameMs: number;
  severeFrameStreak: number;
  recoveryFrameStreak: number;
};

export type PendingWorldBuildBudget = {
  pendingBuildBudgetMs: number;
  maxPendingBuildTiles: number;
};

export type FrameGenerationBudget = {
  generationBudgetMs: number;
};

export type RenderBudgetCaps = {
  frameMs: {
    soft: number;
    hard: number;
  };
  visibilityRadius: {
    full: number;
    reduced: number;
    minimum: number;
  };
  pendingBuildBudgetMs: {
    soft: number;
    minimum: number;
    maximum: number;
  };
  pendingBuildTiles: {
    soft: number;
    hard: number;
  };
  drawCalls: {
    soft: number;
    hard: number;
  };
  chunkDrawCalls: {
    soft: number;
    hard: number;
  };
  chunkObjects: {
    soft: number;
    hard: number;
  };
  chunkMeshes: {
    soft: number;
    hard: number;
  };
  chunkTriangles: {
    soft: number;
    hard: number;
  };
  lights: {
    soft: number;
    hard: number;
  };
  shadowLights: {
    soft: number;
    hard: number;
  };
  textures: {
    soft: number;
    hard: number;
  };
  estimatedGpuMemoryBytes: {
    soft: number;
    hard: number;
  };
  materials: {
    soft: number;
    hard: number;
  };
  visibleObjects: {
    soft: number;
    hard: number;
  };
  visibleTriangles: {
    soft: number;
    hard: number;
  };
  visibleVertices: {
    soft: number;
    hard: number;
  };
  visibleMeshes: {
    soft: number;
    hard: number;
  };
};

export type RenderQualityLevel = 'full' | 'reduced' | 'minimal';

export const DEFAULT_RENDER_BUDGET_STATE: RenderBudgetState = {
  currentFrameMs: 16.67,
  smoothedFrameMs: 16.67,
  recentFrameMs: [16.67],
  drawCalls: 0,
  maxChunkDrawCalls: 0,
  maxChunkObjectCount: 0,
  maxChunkMeshes: 0,
  maxChunkTriangleCount: 0,
  totalLightCount: 0,
  totalShadowLightCount: 0,
  materialCount: 0,
  textureCount: 0,
  visibleObjectCount: 0,
  estimatedGpuMemoryBytes: 0,
  visibleTriangleCount: 0,
  visibleVertexCount: 0,
  visibleMeshCount: 0,
  visibilityRadius: DEFAULT_VISIBILITY_RADIUS,
  weatherVisibility: 1,
  weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
  targetFps: 60,
  averageFps: 60,
  worstRecentFrameMs: 16.67,
  severeFrameStreak: 0,
  recoveryFrameStreak: 0,
};

const FRAME_SMOOTHING = 0.14;
const RECENT_FRAME_WINDOW_SIZE = 60;
const LOW_FPS_FRAME_MS = 1000 / 42;
const CRITICAL_FPS_FRAME_MS = 1000 / 28;
const RECOVERED_FPS_FRAME_MS = 1000 / 54;
const FULL_QUALITY_RECOVERY_FRAME_STREAK_THRESHOLD = 8;
const SEVERE_FPS_FRAME_MS = 1000 / 24;
const SEVERE_FRAME_STREAK_THRESHOLD = 10;
const SEVERE_FRAME_STREAK_RECOVERY_STEP = 2;
const SOFT_DRAW_CALL_LIMIT = 900;
const HARD_DRAW_CALL_LIMIT = 1200;
const SOFT_CHUNK_DRAW_CALL_LIMIT = 160;
const HARD_CHUNK_DRAW_CALL_LIMIT = 240;
const SOFT_CHUNK_OBJECT_LIMIT = 140;
const HARD_CHUNK_OBJECT_LIMIT = 220;
const SOFT_CHUNK_MESH_LIMIT = 96;
const HARD_CHUNK_MESH_LIMIT = 144;
const SOFT_CHUNK_TRIANGLE_LIMIT = 24_000;
const HARD_CHUNK_TRIANGLE_LIMIT = 36_000;
const SOFT_LIGHT_LIMIT = 14;
const HARD_LIGHT_LIMIT = 20;
const SOFT_SHADOW_LIGHT_LIMIT = 2;
const HARD_SHADOW_LIGHT_LIMIT = 3;
const SOFT_TEXTURE_LIMIT = 48;
const HARD_TEXTURE_LIMIT = 72;
const SOFT_ESTIMATED_GPU_MEMORY_BYTES = 96 * 1024 * 1024;
const HARD_ESTIMATED_GPU_MEMORY_BYTES = 144 * 1024 * 1024;
const SOFT_MATERIAL_LIMIT = 32;
const HARD_MATERIAL_LIMIT = 48;
const SOFT_VISIBLE_OBJECT_LIMIT = 1200;
const HARD_VISIBLE_OBJECT_LIMIT = 1800;
const SOFT_VISIBLE_TRIANGLE_LIMIT = 70_000;
const HARD_VISIBLE_TRIANGLE_LIMIT = 110_000;
const SOFT_VISIBLE_VERTEX_LIMIT = 120_000;
const HARD_VISIBLE_VERTEX_LIMIT = 180_000;
const SOFT_VISIBLE_MESH_LIMIT = 640;
const HARD_VISIBLE_MESH_LIMIT = 960;

function resetRenderBudgetStateInPlace(
  state: RenderBudgetState
): RenderBudgetState {
  state.currentFrameMs = 16.67;
  state.smoothedFrameMs = 16.67;
  state.recentFrameMs.length = 1;
  state.recentFrameMs[0] = 16.67;
  state.drawCalls = 0;
  state.maxChunkDrawCalls = 0;
  state.maxChunkObjectCount = 0;
  state.maxChunkMeshes = 0;
  state.maxChunkTriangleCount = 0;
  state.totalLightCount = 0;
  state.totalShadowLightCount = 0;
  state.materialCount = 0;
  state.textureCount = 0;
  state.visibleObjectCount = 0;
  state.estimatedGpuMemoryBytes = 0;
  state.visibleTriangleCount = 0;
  state.visibleVertexCount = 0;
  state.visibleMeshCount = 0;
  state.visibilityRadius = DEFAULT_VISIBILITY_RADIUS;
  state.weatherVisibility = 1;
  state.weatherVisibilityRadiusCap = DEFAULT_VISIBILITY_RADIUS;
  state.targetFps = 60;
  state.averageFps = 60;
  state.worstRecentFrameMs = 16.67;
  state.severeFrameStreak = 0;
  state.recoveryFrameStreak = 0;
  return state;
}

function appendRecentFrameMsInPlace(
  recentFrameMs: number[],
  nextFrameMs: number
): number[] {
  if (recentFrameMs.length >= RECENT_FRAME_WINDOW_SIZE) {
    recentFrameMs.copyWithin(0, 1);
    recentFrameMs[RECENT_FRAME_WINDOW_SIZE - 1] = nextFrameMs;
    return recentFrameMs;
  }

  recentFrameMs.push(nextFrameMs);
  return recentFrameMs;
}

export function updateRenderBudgetStateInPlace(
  state: RenderBudgetState,
  {
    deltaMs,
    active3d,
    weatherVisibility,
    drawCalls,
    maxChunkDrawCalls,
    maxChunkObjectCount,
    maxChunkMeshes,
    maxChunkTriangleCount,
    totalLightCount,
    totalShadowLightCount,
    materialCount,
    textureCount,
    visibleObjectCount,
    estimatedGpuMemoryBytes,
    visibleTriangleCount,
    visibleVertexCount,
    visibleMeshCount,
  }: {
    deltaMs: number;
    active3d: boolean;
    weatherVisibility?: number;
    drawCalls?: number;
    maxChunkDrawCalls?: number;
    maxChunkObjectCount?: number;
    maxChunkMeshes?: number;
    maxChunkTriangleCount?: number;
    totalLightCount?: number;
    totalShadowLightCount?: number;
    materialCount?: number;
    textureCount?: number;
    visibleObjectCount?: number;
    estimatedGpuMemoryBytes?: number;
    visibleTriangleCount?: number;
    visibleVertexCount?: number;
    visibleMeshCount?: number;
  }
): RenderBudgetState {
  if (!active3d) {
    return resetRenderBudgetStateInPlace(state);
  }

  const clampedDeltaMs = Math.min(Math.max(deltaMs, 8), 100);
  const smoothedFrameMs =
    state.smoothedFrameMs +
    (clampedDeltaMs - state.smoothedFrameMs) * FRAME_SMOOTHING;
  const recentFrameMs = appendRecentFrameMsInPlace(
    state.recentFrameMs,
    clampedDeltaMs
  );
  let totalRecentFrameMs = 0;
  let worstRecentFrameMs = clampedDeltaMs;
  for (let index = 0; index < recentFrameMs.length; index += 1) {
    const frameMs = recentFrameMs[index] as number;
    totalRecentFrameMs += frameMs;
    if (frameMs > worstRecentFrameMs) {
      worstRecentFrameMs = frameMs;
    }
  }
  const averageFrameMs = totalRecentFrameMs / recentFrameMs.length;
  const averageFps = 1000 / Math.max(1, averageFrameMs);
  const severeFrameStreak =
    clampedDeltaMs >= SEVERE_FPS_FRAME_MS
      ? state.severeFrameStreak + 1
      : Math.max(
          0,
          state.severeFrameStreak - SEVERE_FRAME_STREAK_RECOVERY_STEP
        );
  const normalizedWeatherVisibility = clamp(
    weatherVisibility ?? state.weatherVisibility,
    0,
    1
  );
  const normalizedDrawCalls = Math.max(
    0,
    Math.floor(drawCalls ?? state.drawCalls)
  );
  const normalizedMaxChunkDrawCalls = Math.max(
    0,
    Math.floor(maxChunkDrawCalls ?? state.maxChunkDrawCalls)
  );
  const normalizedMaxChunkObjectCount = Math.max(
    0,
    Math.floor(maxChunkObjectCount ?? state.maxChunkObjectCount)
  );
  const normalizedMaxChunkMeshes = Math.max(
    0,
    Math.floor(maxChunkMeshes ?? state.maxChunkMeshes)
  );
  const normalizedMaxChunkTriangleCount = Math.max(
    0,
    Math.floor(maxChunkTriangleCount ?? state.maxChunkTriangleCount)
  );
  const normalizedTotalLightCount = Math.max(
    0,
    Math.floor(totalLightCount ?? state.totalLightCount)
  );
  const normalizedTotalShadowLightCount = Math.max(
    0,
    Math.floor(totalShadowLightCount ?? state.totalShadowLightCount)
  );
  const normalizedTextureCount = Math.max(
    0,
    Math.floor(textureCount ?? state.textureCount)
  );
  const normalizedMaterialCount = Math.max(
    0,
    Math.floor(materialCount ?? state.materialCount)
  );
  const normalizedVisibleMeshCount = Math.max(
    0,
    Math.floor(visibleMeshCount ?? state.visibleMeshCount)
  );
  const normalizedVisibleObjectCount = Math.max(
    0,
    Math.floor(visibleObjectCount ?? state.visibleObjectCount)
  );
  const normalizedEstimatedGpuMemoryBytes = Math.max(
    0,
    Math.floor(estimatedGpuMemoryBytes ?? state.estimatedGpuMemoryBytes)
  );
  const normalizedVisibleVertexCount = Math.max(
    0,
    Math.floor(visibleVertexCount ?? state.visibleVertexCount)
  );
  const normalizedVisibleTriangleCount = Math.max(
    0,
    Math.floor(visibleTriangleCount ?? state.visibleTriangleCount)
  );
  const weatherVisibilityRadiusCap = getWeatherVisibilityRadiusCap(
    normalizedWeatherVisibility
  );

  let visibilityRadius = DEFAULT_VISIBILITY_RADIUS;
  let targetFps = state.targetFps;
  if (smoothedFrameMs >= CRITICAL_FPS_FRAME_MS) {
    visibilityRadius = MIN_VISIBILITY_RADIUS;
    targetFps = 30;
  } else if (smoothedFrameMs >= LOW_FPS_FRAME_MS) {
    visibilityRadius = REDUCED_VISIBILITY_RADIUS;
    targetFps = 30;
  } else if (smoothedFrameMs <= RECOVERED_FPS_FRAME_MS) {
    targetFps = 60;
  } else {
    visibilityRadius = state.visibilityRadius;
  }

  if (normalizedDrawCalls >= HARD_DRAW_CALL_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, MIN_VISIBILITY_RADIUS);
  } else if (normalizedDrawCalls >= SOFT_DRAW_CALL_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, REDUCED_VISIBILITY_RADIUS);
  }
  if (normalizedMaxChunkDrawCalls >= HARD_CHUNK_DRAW_CALL_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, MIN_VISIBILITY_RADIUS);
  } else if (normalizedMaxChunkDrawCalls >= SOFT_CHUNK_DRAW_CALL_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, REDUCED_VISIBILITY_RADIUS);
  }
  if (normalizedMaxChunkObjectCount >= HARD_CHUNK_OBJECT_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, MIN_VISIBILITY_RADIUS);
  } else if (normalizedMaxChunkObjectCount >= SOFT_CHUNK_OBJECT_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, REDUCED_VISIBILITY_RADIUS);
  }
  if (normalizedMaxChunkMeshes >= HARD_CHUNK_MESH_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, MIN_VISIBILITY_RADIUS);
  } else if (normalizedMaxChunkMeshes >= SOFT_CHUNK_MESH_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, REDUCED_VISIBILITY_RADIUS);
  }
  if (normalizedMaxChunkTriangleCount >= HARD_CHUNK_TRIANGLE_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, MIN_VISIBILITY_RADIUS);
  } else if (normalizedMaxChunkTriangleCount >= SOFT_CHUNK_TRIANGLE_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, REDUCED_VISIBILITY_RADIUS);
  }
  if (normalizedTotalLightCount >= HARD_LIGHT_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, MIN_VISIBILITY_RADIUS);
  } else if (normalizedTotalLightCount >= SOFT_LIGHT_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, REDUCED_VISIBILITY_RADIUS);
  }
  if (normalizedTotalShadowLightCount >= HARD_SHADOW_LIGHT_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, MIN_VISIBILITY_RADIUS);
  } else if (normalizedTotalShadowLightCount >= SOFT_SHADOW_LIGHT_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, REDUCED_VISIBILITY_RADIUS);
  }
  if (normalizedTextureCount >= HARD_TEXTURE_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, MIN_VISIBILITY_RADIUS);
  } else if (normalizedTextureCount >= SOFT_TEXTURE_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, REDUCED_VISIBILITY_RADIUS);
  }
  if (normalizedEstimatedGpuMemoryBytes >= HARD_ESTIMATED_GPU_MEMORY_BYTES) {
    visibilityRadius = Math.min(visibilityRadius, MIN_VISIBILITY_RADIUS);
  } else if (
    normalizedEstimatedGpuMemoryBytes >= SOFT_ESTIMATED_GPU_MEMORY_BYTES
  ) {
    visibilityRadius = Math.min(visibilityRadius, REDUCED_VISIBILITY_RADIUS);
  }
  if (normalizedMaterialCount >= HARD_MATERIAL_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, MIN_VISIBILITY_RADIUS);
  } else if (normalizedMaterialCount >= SOFT_MATERIAL_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, REDUCED_VISIBILITY_RADIUS);
  }
  if (normalizedVisibleObjectCount >= HARD_VISIBLE_OBJECT_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, MIN_VISIBILITY_RADIUS);
  } else if (normalizedVisibleObjectCount >= SOFT_VISIBLE_OBJECT_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, REDUCED_VISIBILITY_RADIUS);
  }
  if (normalizedVisibleTriangleCount >= HARD_VISIBLE_TRIANGLE_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, MIN_VISIBILITY_RADIUS);
  } else if (normalizedVisibleTriangleCount >= SOFT_VISIBLE_TRIANGLE_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, REDUCED_VISIBILITY_RADIUS);
  }
  if (normalizedVisibleVertexCount >= HARD_VISIBLE_VERTEX_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, MIN_VISIBILITY_RADIUS);
  } else if (normalizedVisibleVertexCount >= SOFT_VISIBLE_VERTEX_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, REDUCED_VISIBILITY_RADIUS);
  }
  if (normalizedVisibleMeshCount >= HARD_VISIBLE_MESH_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, MIN_VISIBILITY_RADIUS);
  } else if (normalizedVisibleMeshCount >= SOFT_VISIBLE_MESH_LIMIT) {
    visibilityRadius = Math.min(visibilityRadius, REDUCED_VISIBILITY_RADIUS);
  }

  const wantsFullQualityRecovery =
    targetFps === 60 &&
    visibilityRadius === DEFAULT_VISIBILITY_RADIUS &&
    weatherVisibilityRadiusCap >= DEFAULT_VISIBILITY_RADIUS;
  const recoveringFromPerformanceReduction =
    state.targetFps !== 60 ||
    (state.visibilityRadius < DEFAULT_VISIBILITY_RADIUS &&
      state.weatherVisibilityRadiusCap >= DEFAULT_VISIBILITY_RADIUS);
  const recoveryFrameStreak = wantsFullQualityRecovery
    ? recoveringFromPerformanceReduction
      ? state.recoveryFrameStreak + 1
      : FULL_QUALITY_RECOVERY_FRAME_STREAK_THRESHOLD
    : 0;
  if (
    wantsFullQualityRecovery &&
    recoveringFromPerformanceReduction &&
    recoveryFrameStreak < FULL_QUALITY_RECOVERY_FRAME_STREAK_THRESHOLD
  ) {
    targetFps = state.targetFps;
    visibilityRadius = state.visibilityRadius;
  }

  state.currentFrameMs = clampedDeltaMs;
  state.smoothedFrameMs = smoothedFrameMs;
  state.drawCalls = normalizedDrawCalls;
  state.maxChunkDrawCalls = normalizedMaxChunkDrawCalls;
  state.maxChunkObjectCount = normalizedMaxChunkObjectCount;
  state.maxChunkMeshes = normalizedMaxChunkMeshes;
  state.maxChunkTriangleCount = normalizedMaxChunkTriangleCount;
  state.totalLightCount = normalizedTotalLightCount;
  state.totalShadowLightCount = normalizedTotalShadowLightCount;
  state.materialCount = normalizedMaterialCount;
  state.textureCount = normalizedTextureCount;
  state.visibleObjectCount = normalizedVisibleObjectCount;
  state.estimatedGpuMemoryBytes = normalizedEstimatedGpuMemoryBytes;
  state.visibleTriangleCount = normalizedVisibleTriangleCount;
  state.visibleVertexCount = normalizedVisibleVertexCount;
  state.visibleMeshCount = normalizedVisibleMeshCount;
  state.visibilityRadius = Math.min(
    visibilityRadius,
    weatherVisibilityRadiusCap
  );
  state.weatherVisibility = normalizedWeatherVisibility;
  state.weatherVisibilityRadiusCap = weatherVisibilityRadiusCap;
  state.targetFps = targetFps;
  state.averageFps = averageFps;
  state.worstRecentFrameMs = worstRecentFrameMs;
  state.severeFrameStreak = severeFrameStreak;
  state.recoveryFrameStreak = recoveryFrameStreak;
  return state;
}

export function advanceRenderBudgetState(
  state: RenderBudgetState,
  {
    deltaMs,
    active3d,
    weatherVisibility,
    drawCalls,
    maxChunkDrawCalls,
    maxChunkObjectCount,
    maxChunkMeshes,
    maxChunkTriangleCount,
    totalLightCount,
    totalShadowLightCount,
    materialCount,
    textureCount,
    visibleObjectCount,
    estimatedGpuMemoryBytes,
    visibleTriangleCount,
    visibleVertexCount,
    visibleMeshCount,
  }: {
    deltaMs: number;
    active3d: boolean;
    weatherVisibility?: number;
    drawCalls?: number;
    maxChunkDrawCalls?: number;
    maxChunkObjectCount?: number;
    maxChunkMeshes?: number;
    maxChunkTriangleCount?: number;
    totalLightCount?: number;
    totalShadowLightCount?: number;
    materialCount?: number;
    textureCount?: number;
    visibleObjectCount?: number;
    estimatedGpuMemoryBytes?: number;
    visibleTriangleCount?: number;
    visibleVertexCount?: number;
    visibleMeshCount?: number;
  }
): RenderBudgetState {
  return updateRenderBudgetStateInPlace(
    {
      ...state,
      recentFrameMs: [...state.recentFrameMs],
    },
    {
      deltaMs,
      active3d,
      weatherVisibility,
      drawCalls,
      maxChunkDrawCalls,
      maxChunkObjectCount,
      maxChunkMeshes,
      maxChunkTriangleCount,
      totalLightCount,
      totalShadowLightCount,
      materialCount,
      textureCount,
      visibleObjectCount,
      estimatedGpuMemoryBytes,
      visibleTriangleCount,
      visibleVertexCount,
      visibleMeshCount,
    }
  );
}

export function getPendingWorldBuildBudget(
  state: Pick<RenderBudgetState, 'smoothedFrameMs' | 'targetFps'>
): PendingWorldBuildBudget {
  const targetFrameMs = 1000 / state.targetFps;
  const framePressure = clamp(state.smoothedFrameMs / targetFrameMs, 0.5, 1.6);
  const overBudget = framePressure > 1.02;
  const maxBudgetMs = state.targetFps === 60 ? 3.5 : 2.25;
  const pendingBuildBudgetMs = clamp(
    maxBudgetMs - Math.max(0, framePressure - 0.8) * 4,
    0.75,
    maxBudgetMs
  );

  if (state.targetFps === 30) {
    return {
      pendingBuildBudgetMs,
      maxPendingBuildTiles: overBudget ? 2 : 4,
    };
  }

  return {
    pendingBuildBudgetMs,
    maxPendingBuildTiles: overBudget ? 4 : 8,
  };
}

export function getRenderBudgetCaps(
  state: Pick<RenderBudgetState, 'targetFps'>
): RenderBudgetCaps {
  const pendingBuildBudgetCaps = getPendingBuildBudgetCaps(state.targetFps);
  return {
    frameMs: {
      soft: LOW_FPS_FRAME_MS,
      hard: CRITICAL_FPS_FRAME_MS,
    },
    visibilityRadius: {
      full: DEFAULT_VISIBILITY_RADIUS,
      reduced: REDUCED_VISIBILITY_RADIUS,
      minimum: MIN_VISIBILITY_RADIUS,
    },
    pendingBuildBudgetMs: pendingBuildBudgetCaps,
    pendingBuildTiles:
      state.targetFps === 30
        ? {
            soft: 4,
            hard: 2,
          }
        : {
            soft: 8,
            hard: 4,
          },
    drawCalls: {
      soft: SOFT_DRAW_CALL_LIMIT,
      hard: HARD_DRAW_CALL_LIMIT,
    },
    chunkDrawCalls: {
      soft: SOFT_CHUNK_DRAW_CALL_LIMIT,
      hard: HARD_CHUNK_DRAW_CALL_LIMIT,
    },
    chunkObjects: {
      soft: SOFT_CHUNK_OBJECT_LIMIT,
      hard: HARD_CHUNK_OBJECT_LIMIT,
    },
    chunkMeshes: {
      soft: SOFT_CHUNK_MESH_LIMIT,
      hard: HARD_CHUNK_MESH_LIMIT,
    },
    chunkTriangles: {
      soft: SOFT_CHUNK_TRIANGLE_LIMIT,
      hard: HARD_CHUNK_TRIANGLE_LIMIT,
    },
    lights: {
      soft: SOFT_LIGHT_LIMIT,
      hard: HARD_LIGHT_LIMIT,
    },
    shadowLights: {
      soft: SOFT_SHADOW_LIGHT_LIMIT,
      hard: HARD_SHADOW_LIGHT_LIMIT,
    },
    textures: {
      soft: SOFT_TEXTURE_LIMIT,
      hard: HARD_TEXTURE_LIMIT,
    },
    estimatedGpuMemoryBytes: {
      soft: SOFT_ESTIMATED_GPU_MEMORY_BYTES,
      hard: HARD_ESTIMATED_GPU_MEMORY_BYTES,
    },
    materials: {
      soft: SOFT_MATERIAL_LIMIT,
      hard: HARD_MATERIAL_LIMIT,
    },
    visibleObjects: {
      soft: SOFT_VISIBLE_OBJECT_LIMIT,
      hard: HARD_VISIBLE_OBJECT_LIMIT,
    },
    visibleTriangles: {
      soft: SOFT_VISIBLE_TRIANGLE_LIMIT,
      hard: HARD_VISIBLE_TRIANGLE_LIMIT,
    },
    visibleVertices: {
      soft: SOFT_VISIBLE_VERTEX_LIMIT,
      hard: HARD_VISIBLE_VERTEX_LIMIT,
    },
    visibleMeshes: {
      soft: SOFT_VISIBLE_MESH_LIMIT,
      hard: HARD_VISIBLE_MESH_LIMIT,
    },
  };
}

function getPendingBuildBudgetCaps(targetFps: 60 | 30): {
  soft: number;
  minimum: number;
  maximum: number;
} {
  const minimum = 0.75;
  const maximum = targetFps === 60 ? 3.5 : 2.25;
  const soft = getPendingWorldBuildBudget({
    smoothedFrameMs: 1000 / targetFps,
    targetFps,
  }).pendingBuildBudgetMs;
  return {
    soft,
    minimum,
    maximum,
  };
}

export function getFrameGenerationBudget(
  state: Pick<RenderBudgetState, 'smoothedFrameMs' | 'targetFps'>
): FrameGenerationBudget {
  const pendingBudget = getPendingWorldBuildBudget(state);
  const targetFrameMs = 1000 / state.targetFps;
  const framePressure = clamp(state.smoothedFrameMs / targetFrameMs, 0.5, 1.6);
  const maximumBudgetMs = state.targetFps === 60 ? 4.25 : 2.75;
  const reserveMs = state.targetFps === 60 ? 0.6 : 0.4;

  return {
    generationBudgetMs: clamp(
      pendingBudget.pendingBuildBudgetMs +
        reserveMs -
        Math.max(0, framePressure - 1) * 1.5,
      pendingBudget.pendingBuildBudgetMs,
      maximumBudgetMs
    ),
  };
}

export function getRenderQualityLevel(
  state: Pick<
    RenderBudgetState,
    'visibilityRadius' | 'targetFps' | 'smoothedFrameMs' | 'severeFrameStreak'
  >
): RenderQualityLevel {
  if (state.severeFrameStreak >= SEVERE_FRAME_STREAK_THRESHOLD) {
    return 'minimal';
  }
  if (
    state.visibilityRadius < DEFAULT_VISIBILITY_RADIUS ||
    state.targetFps === 30
  ) {
    return 'reduced';
  }
  return 'full';
}

export function formatRenderQualityLevel(level: RenderQualityLevel): string {
  if (level === 'minimal') {
    return 'Minimal';
  }
  if (level === 'reduced') {
    return 'Reduced';
  }
  return 'Full';
}

export function getRenderQualityLimiters(
  state: Pick<
    RenderBudgetState,
    | 'smoothedFrameMs'
    | 'visibilityRadius'
    | 'weatherVisibilityRadiusCap'
    | 'targetFps'
    | 'severeFrameStreak'
    | 'drawCalls'
    | 'maxChunkDrawCalls'
    | 'maxChunkMeshes'
    | 'materialCount'
    | 'textureCount'
    | 'visibleObjectCount'
    | 'visibleVertexCount'
    | 'visibleMeshCount'
  > &
    Partial<
      Pick<
        RenderBudgetState,
        | 'maxChunkObjectCount'
        | 'maxChunkTriangleCount'
        | 'totalLightCount'
        | 'totalShadowLightCount'
        | 'visibleTriangleCount'
        | 'estimatedGpuMemoryBytes'
      >
    >
): string[] {
  const limiters: string[] = [];
  const maxChunkObjectCount = Math.max(0, state.maxChunkObjectCount ?? 0);
  const maxChunkTriangleCount = Math.max(0, state.maxChunkTriangleCount ?? 0);
  const totalLightCount = Math.max(0, state.totalLightCount ?? 0);
  const totalShadowLightCount = Math.max(0, state.totalShadowLightCount ?? 0);
  const visibleTriangleCount = Math.max(0, state.visibleTriangleCount ?? 0);
  const estimatedGpuMemoryBytes = Math.max(
    0,
    state.estimatedGpuMemoryBytes ?? 0
  );
  if (state.targetFps === 30) {
    limiters.push('Target FPS reduced to 30');
  }
  if (state.visibilityRadius < DEFAULT_VISIBILITY_RADIUS) {
    limiters.push(`Visibility radius reduced to ${state.visibilityRadius}`);
  }
  if (
    state.weatherVisibilityRadiusCap < DEFAULT_VISIBILITY_RADIUS &&
    state.visibilityRadius <= state.weatherVisibilityRadiusCap + 0.01
  ) {
    limiters.push('Weather visibility reduced draw distance');
  }
  if (state.severeFrameStreak >= SEVERE_FRAME_STREAK_THRESHOLD) {
    limiters.push('Optional effects minimized after sustained frame stalls');
  }
  if (state.drawCalls >= HARD_DRAW_CALL_LIMIT) {
    limiters.push('Scene draw calls exceeded the hard cap');
  } else if (state.drawCalls >= SOFT_DRAW_CALL_LIMIT) {
    limiters.push('Scene draw calls exceeded the soft cap');
  }
  if (state.maxChunkDrawCalls >= HARD_CHUNK_DRAW_CALL_LIMIT) {
    limiters.push('Chunk draw calls exceeded the hard cap');
  } else if (state.maxChunkDrawCalls >= SOFT_CHUNK_DRAW_CALL_LIMIT) {
    limiters.push('Chunk draw calls exceeded the soft cap');
  }
  if (maxChunkObjectCount >= HARD_CHUNK_OBJECT_LIMIT) {
    limiters.push('Chunk objects exceeded the hard cap');
  } else if (maxChunkObjectCount >= SOFT_CHUNK_OBJECT_LIMIT) {
    limiters.push('Chunk objects exceeded the soft cap');
  }
  if (state.maxChunkMeshes >= HARD_CHUNK_MESH_LIMIT) {
    limiters.push('Chunk meshes exceeded the hard cap');
  } else if (state.maxChunkMeshes >= SOFT_CHUNK_MESH_LIMIT) {
    limiters.push('Chunk meshes exceeded the soft cap');
  }
  if (maxChunkTriangleCount >= HARD_CHUNK_TRIANGLE_LIMIT) {
    limiters.push('Chunk triangles exceeded the hard cap');
  } else if (maxChunkTriangleCount >= SOFT_CHUNK_TRIANGLE_LIMIT) {
    limiters.push('Chunk triangles exceeded the soft cap');
  }
  if (totalLightCount >= HARD_LIGHT_LIMIT) {
    limiters.push('Active lights exceeded the hard cap');
  } else if (totalLightCount >= SOFT_LIGHT_LIMIT) {
    limiters.push('Active lights exceeded the soft cap');
  }
  if (totalShadowLightCount >= HARD_SHADOW_LIGHT_LIMIT) {
    limiters.push('Shadow lights exceeded the hard cap');
  } else if (totalShadowLightCount >= SOFT_SHADOW_LIGHT_LIMIT) {
    limiters.push('Shadow lights exceeded the soft cap');
  }
  if (state.textureCount >= HARD_TEXTURE_LIMIT) {
    limiters.push('Active textures exceeded the hard cap');
  } else if (state.textureCount >= SOFT_TEXTURE_LIMIT) {
    limiters.push('Active textures exceeded the soft cap');
  }
  if (estimatedGpuMemoryBytes >= HARD_ESTIMATED_GPU_MEMORY_BYTES) {
    limiters.push('Estimated GPU memory exceeded the hard cap');
  } else if (estimatedGpuMemoryBytes >= SOFT_ESTIMATED_GPU_MEMORY_BYTES) {
    limiters.push('Estimated GPU memory exceeded the soft cap');
  }
  if (state.materialCount >= HARD_MATERIAL_LIMIT) {
    limiters.push('Scene materials exceeded the hard cap');
  } else if (state.materialCount >= SOFT_MATERIAL_LIMIT) {
    limiters.push('Scene materials exceeded the soft cap');
  }
  if (state.visibleObjectCount >= HARD_VISIBLE_OBJECT_LIMIT) {
    limiters.push('Visible objects exceeded the hard cap');
  } else if (state.visibleObjectCount >= SOFT_VISIBLE_OBJECT_LIMIT) {
    limiters.push('Visible objects exceeded the soft cap');
  }
  if (visibleTriangleCount >= HARD_VISIBLE_TRIANGLE_LIMIT) {
    limiters.push('Visible triangles exceeded the hard cap');
  } else if (visibleTriangleCount >= SOFT_VISIBLE_TRIANGLE_LIMIT) {
    limiters.push('Visible triangles exceeded the soft cap');
  }
  if (state.visibleVertexCount >= HARD_VISIBLE_VERTEX_LIMIT) {
    limiters.push('Visible vertices exceeded the hard cap');
  } else if (state.visibleVertexCount >= SOFT_VISIBLE_VERTEX_LIMIT) {
    limiters.push('Visible vertices exceeded the soft cap');
  }
  if (state.visibleMeshCount >= HARD_VISIBLE_MESH_LIMIT) {
    limiters.push('Visible meshes exceeded the hard cap');
  } else if (state.visibleMeshCount >= SOFT_VISIBLE_MESH_LIMIT) {
    limiters.push('Visible meshes exceeded the soft cap');
  }
  if (state.smoothedFrameMs >= CRITICAL_FPS_FRAME_MS) {
    limiters.push('Critical frame pressure');
  } else if (state.smoothedFrameMs >= LOW_FPS_FRAME_MS) {
    limiters.push('High frame pressure');
  }
  return limiters.length > 0 ? limiters : ['None'];
}

export function createRenderBudget(
  state: Pick<RenderBudgetState, 'visibilityRadius' | 'targetFps'> &
    Partial<
      Pick<
        RenderBudgetState,
        'currentFrameMs' | 'smoothedFrameMs' | 'severeFrameStreak'
      >
    >,
  {
    detailLevel = 'full',
    generationBudgetMs,
    remainingGenerationBudgetMs = generationBudgetMs,
    pendingBuildBudgetMs,
    maxPendingBuildTiles,
  }: {
    detailLevel?: RenderBudgetDetailLevel;
    generationBudgetMs?: number;
    remainingGenerationBudgetMs?: number;
    pendingBuildBudgetMs?: number;
    maxPendingBuildTiles?: number;
  } = {}
): RenderBudget {
  const caps = getRenderBudgetCaps(state);
  return {
    quality: getRenderQualityLevel({
      visibilityRadius: state.visibilityRadius,
      targetFps: state.targetFps,
      smoothedFrameMs:
        state.smoothedFrameMs ?? DEFAULT_RENDER_BUDGET_STATE.smoothedFrameMs,
      severeFrameStreak:
        state.severeFrameStreak ??
        DEFAULT_RENDER_BUDGET_STATE.severeFrameStreak,
    }),
    detailLevel,
    targetFps: state.targetFps,
    visibilityRadius: state.visibilityRadius,
    frame: {
      currentMs: state.currentFrameMs,
      smoothedMs: state.smoothedFrameMs,
      generationBudgetMs,
      remainingGenerationBudgetMs,
      limits: caps.frameMs,
    },
    pendingBuild: {
      budgetMs: pendingBuildBudgetMs,
      maxTiles: maxPendingBuildTiles,
      tileLimits: caps.pendingBuildTiles,
    },
  };
}

export function createRenderBudgetBuilder(): (
  state: Pick<RenderBudgetState, 'visibilityRadius' | 'targetFps'> &
    Partial<
      Pick<
        RenderBudgetState,
        'currentFrameMs' | 'smoothedFrameMs' | 'severeFrameStreak'
      >
    >,
  options?: {
    detailLevel?: RenderBudgetDetailLevel;
    generationBudgetMs?: number;
    remainingGenerationBudgetMs?: number;
    pendingBuildBudgetMs?: number;
    maxPendingBuildTiles?: number;
  }
) => RenderBudget {
  const budget: RenderBudget = {
    quality: 'full',
    detailLevel: 'full',
    targetFps: 60,
    visibilityRadius: DEFAULT_VISIBILITY_RADIUS,
    frame: {
      currentMs: DEFAULT_RENDER_BUDGET_STATE.currentFrameMs,
      smoothedMs: DEFAULT_RENDER_BUDGET_STATE.smoothedFrameMs,
      generationBudgetMs: undefined,
      remainingGenerationBudgetMs: undefined,
      limits: {
        soft: 1000 / 42,
        hard: 1000 / 28,
      },
    },
    pendingBuild: {
      budgetMs: undefined,
      maxTiles: undefined,
      tileLimits: {
        soft: 8,
        hard: 4,
      },
    },
  };

  return (state, options = {}) => {
    const {
      detailLevel = 'full',
      generationBudgetMs,
      remainingGenerationBudgetMs = generationBudgetMs,
      pendingBuildBudgetMs,
      maxPendingBuildTiles,
    } = options;
    const caps = getRenderBudgetCaps(state);

    budget.quality = getRenderQualityLevel({
      visibilityRadius: state.visibilityRadius,
      targetFps: state.targetFps,
      smoothedFrameMs:
        state.smoothedFrameMs ?? DEFAULT_RENDER_BUDGET_STATE.smoothedFrameMs,
      severeFrameStreak:
        state.severeFrameStreak ??
        DEFAULT_RENDER_BUDGET_STATE.severeFrameStreak,
    });
    budget.detailLevel = detailLevel;
    budget.targetFps = state.targetFps;
    budget.visibilityRadius = state.visibilityRadius;
    budget.frame.currentMs = state.currentFrameMs;
    budget.frame.smoothedMs = state.smoothedFrameMs;
    budget.frame.generationBudgetMs = generationBudgetMs;
    budget.frame.remainingGenerationBudgetMs = remainingGenerationBudgetMs;
    budget.frame.limits.soft = caps.frameMs.soft;
    budget.frame.limits.hard = caps.frameMs.hard;
    budget.pendingBuild.budgetMs = pendingBuildBudgetMs;
    budget.pendingBuild.maxTiles = maxPendingBuildTiles;
    budget.pendingBuild.tileLimits.soft = caps.pendingBuildTiles.soft;
    budget.pendingBuild.tileLimits.hard = caps.pendingBuildTiles.hard;
    return budget;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
