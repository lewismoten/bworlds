export type RenderBudgetState = {
  currentFrameMs: number;
  smoothedFrameMs: number;
  recentFrameMs: number[];
  visibilityRadius: number;
  targetFps: 60 | 30;
  averageFps: number;
  worstRecentFrameMs: number;
};

export type PendingWorldBuildBudget = {
  pendingBuildBudgetMs: number;
  maxPendingBuildTiles: number;
};

export type RenderQualityLevel = 'full' | 'reduced' | 'minimal';

export const DEFAULT_VISIBILITY_RADIUS = 18;
export const REDUCED_VISIBILITY_RADIUS = 14;
export const MIN_VISIBILITY_RADIUS = 10;

export const DEFAULT_RENDER_BUDGET_STATE: RenderBudgetState = {
  currentFrameMs: 16.67,
  smoothedFrameMs: 16.67,
  recentFrameMs: [16.67],
  visibilityRadius: DEFAULT_VISIBILITY_RADIUS,
  targetFps: 60,
  averageFps: 60,
  worstRecentFrameMs: 16.67,
};

const FRAME_SMOOTHING = 0.14;
const RECENT_FRAME_WINDOW_SIZE = 60;
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
      currentFrameMs: 16.67,
      recentFrameMs: [16.67],
      visibilityRadius: DEFAULT_VISIBILITY_RADIUS,
      targetFps: 60,
      averageFps: 60,
      worstRecentFrameMs: 16.67,
    };
  }

  const clampedDeltaMs = Math.min(Math.max(deltaMs, 8), 100);
  const smoothedFrameMs =
    state.smoothedFrameMs +
    (clampedDeltaMs - state.smoothedFrameMs) * FRAME_SMOOTHING;
  const recentFrameMs = [...state.recentFrameMs, clampedDeltaMs].slice(
    -RECENT_FRAME_WINDOW_SIZE
  );
  const averageFrameMs =
    recentFrameMs.reduce((total, frameMs) => total + frameMs, 0) /
    recentFrameMs.length;
  const averageFps = 1000 / Math.max(1, averageFrameMs);
  const worstRecentFrameMs = recentFrameMs.reduce(
    (worst, frameMs) => Math.max(worst, frameMs),
    clampedDeltaMs
  );

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
    currentFrameMs: clampedDeltaMs,
    smoothedFrameMs,
    recentFrameMs,
    visibilityRadius,
    targetFps,
    averageFps,
    worstRecentFrameMs,
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

export function getRenderQualityLevel(
  state: Pick<RenderBudgetState, 'visibilityRadius' | 'targetFps'>
): RenderQualityLevel {
  if (
    state.visibilityRadius <= MIN_VISIBILITY_RADIUS &&
    state.targetFps === 30
  ) {
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
  state: Pick<RenderBudgetState, 'smoothedFrameMs' | 'visibilityRadius' | 'targetFps'>
): string[] {
  const limiters: string[] = [];
  if (state.targetFps === 30) {
    limiters.push('Target FPS reduced to 30');
  }
  if (state.visibilityRadius < DEFAULT_VISIBILITY_RADIUS) {
    limiters.push(`Visibility radius reduced to ${state.visibilityRadius}`);
  }
  if (state.smoothedFrameMs >= CRITICAL_FPS_FRAME_MS) {
    limiters.push('Critical frame pressure');
  } else if (state.smoothedFrameMs >= LOW_FPS_FRAME_MS) {
    limiters.push('High frame pressure');
  }
  return limiters.length > 0 ? limiters : ['None'];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
