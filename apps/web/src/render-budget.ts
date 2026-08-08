export type RenderBudgetState = {
  smoothedFrameMs: number;
  visibilityRadius: number;
  targetFps: 60 | 30;
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
