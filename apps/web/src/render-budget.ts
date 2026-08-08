export type RenderBudgetState = {
  smoothedFrameMs: number;
  visibilityRadius: number;
  targetFps: 60 | 30;
};

export type PendingWorldBuildBudget = {
  pendingBuildBudgetMs: number;
  maxPendingBuildTiles: number;
};

export const DEFAULT_VISIBILITY_RADIUS = 18;
export const REDUCED_VISIBILITY_RADIUS = 14;
export const MIN_VISIBILITY_RADIUS = 10;

export const DEFAULT_RENDER_BUDGET_STATE: RenderBudgetState = {
  smoothedFrameMs: 16.67,
  visibilityRadius: DEFAULT_VISIBILITY_RADIUS,
  targetFps: 60,
};

const FRAME_SMOOTHING = 0.14;
const LOW_FPS_FRAME_MS = 1000 / 42;
const CRITICAL_FPS_FRAME_MS = 1000 / 28;
const RECOVERED_FPS_FRAME_MS = 1000 / 54;

export function advanceRenderBudgetState(
  state: RenderBudgetState,
  {
    deltaMs,
    active3d,
  }: {
    deltaMs: number;
    active3d: boolean;
  }
): RenderBudgetState {
  if (!active3d) {
    return {
      ...state,
      visibilityRadius: DEFAULT_VISIBILITY_RADIUS,
      targetFps: 60,
    };
  }

  const clampedDeltaMs = Math.min(Math.max(deltaMs, 8), 100);
  const smoothedFrameMs =
    state.smoothedFrameMs +
    (clampedDeltaMs - state.smoothedFrameMs) * FRAME_SMOOTHING;

  let visibilityRadius = state.visibilityRadius;
  let targetFps = state.targetFps;
  if (smoothedFrameMs >= CRITICAL_FPS_FRAME_MS) {
    visibilityRadius = MIN_VISIBILITY_RADIUS;
    targetFps = 30;
  } else if (smoothedFrameMs >= LOW_FPS_FRAME_MS) {
    visibilityRadius = Math.min(visibilityRadius, REDUCED_VISIBILITY_RADIUS);
    targetFps = 30;
  } else if (smoothedFrameMs <= RECOVERED_FPS_FRAME_MS) {
    visibilityRadius = DEFAULT_VISIBILITY_RADIUS;
    targetFps = 60;
  }

  return {
    smoothedFrameMs,
    visibilityRadius,
    targetFps,
  };
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
