import type {
  RenderBudget,
  RenderBudgetDetailLevel,
} from '@bworlds/plugin-api';

import { getWeatherVisibilityRadiusCap } from './weather-visibility-budget.ts';

export type RenderBudgetState = {
  currentFrameMs: number;
  smoothedFrameMs: number;
  recentFrameMs: number[];
  visibilityRadius: number;
  weatherVisibility: number;
  weatherVisibilityRadiusCap: number;
  targetFps: 60 | 30;
  averageFps: number;
  worstRecentFrameMs: number;
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
    minimum: number;
    maximum: number;
  };
  pendingBuildTiles: {
    soft: number;
    hard: number;
  };
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
  weatherVisibility: 1,
  weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
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
    weatherVisibility,
  }: {
    deltaMs: number;
    active3d: boolean;
    weatherVisibility?: number;
  }
): RenderBudgetState {
  if (!active3d) {
    return {
      ...state,
      currentFrameMs: 16.67,
      recentFrameMs: [16.67],
      visibilityRadius: DEFAULT_VISIBILITY_RADIUS,
      weatherVisibility: 1,
      weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
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
  const normalizedWeatherVisibility = clamp(
    weatherVisibility ?? state.weatherVisibility,
    0,
    1
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

  visibilityRadius = Math.min(visibilityRadius, weatherVisibilityRadiusCap);

  return {
    currentFrameMs: clampedDeltaMs,
    smoothedFrameMs,
    recentFrameMs,
    visibilityRadius,
    weatherVisibility: normalizedWeatherVisibility,
    weatherVisibilityRadiusCap,
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

export function getRenderBudgetCaps(
  state: Pick<RenderBudgetState, 'targetFps'>
): RenderBudgetCaps {
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
    pendingBuildBudgetMs: {
      minimum: 0.75,
      maximum: state.targetFps === 60 ? 3.5 : 2.25,
    },
    pendingBuildTiles: state.targetFps === 30
      ? {
          soft: 4,
          hard: 2,
        }
      : {
          soft: 8,
          hard: 4,
        },
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
      pendingBudget.pendingBuildBudgetMs + reserveMs - Math.max(0, framePressure - 1) * 1.5,
      pendingBudget.pendingBuildBudgetMs,
      maximumBudgetMs
    ),
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
  state: Pick<
    RenderBudgetState,
    | 'smoothedFrameMs'
    | 'visibilityRadius'
    | 'weatherVisibilityRadiusCap'
    | 'targetFps'
  >
): string[] {
  const limiters: string[] = [];
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
  if (state.smoothedFrameMs >= CRITICAL_FPS_FRAME_MS) {
    limiters.push('Critical frame pressure');
  } else if (state.smoothedFrameMs >= LOW_FPS_FRAME_MS) {
    limiters.push('High frame pressure');
  }
  return limiters.length > 0 ? limiters : ['None'];
}

export function createRenderBudget(
  state: Pick<RenderBudgetState, 'visibilityRadius' | 'targetFps'> &
    Partial<Pick<RenderBudgetState, 'currentFrameMs' | 'smoothedFrameMs'>>,
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
    quality: getRenderQualityLevel(state),
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
