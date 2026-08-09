import type {
  RenderBudget,
  RenderBudgetDetailLevel,
} from '@bworlds/plugin-api';

import { getWeatherVisibilityRadiusCap } from './weather-visibility-budget.ts';

export type RenderBudgetState = {
  currentFrameMs: number;
  smoothedFrameMs: number;
  recentFrameMs: number[];
  drawCalls: number;
  visibilityRadius: number;
  weatherVisibility: number;
  weatherVisibilityRadiusCap: number;
  targetFps: 60 | 30;
  averageFps: number;
  worstRecentFrameMs: number;
  severeFrameStreak: number;
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
  drawCalls: {
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
  drawCalls: 0,
  visibilityRadius: DEFAULT_VISIBILITY_RADIUS,
  weatherVisibility: 1,
  weatherVisibilityRadiusCap: DEFAULT_VISIBILITY_RADIUS,
  targetFps: 60,
  averageFps: 60,
  worstRecentFrameMs: 16.67,
  severeFrameStreak: 0,
};

const FRAME_SMOOTHING = 0.14;
const RECENT_FRAME_WINDOW_SIZE = 60;
const LOW_FPS_FRAME_MS = 1000 / 42;
const CRITICAL_FPS_FRAME_MS = 1000 / 28;
const RECOVERED_FPS_FRAME_MS = 1000 / 54;
const SEVERE_FPS_FRAME_MS = 1000 / 24;
const SEVERE_FRAME_STREAK_THRESHOLD = 10;
const SEVERE_FRAME_STREAK_RECOVERY_STEP = 2;
const SOFT_DRAW_CALL_LIMIT = 900;
const HARD_DRAW_CALL_LIMIT = 1200;

function resetRenderBudgetStateInPlace(state: RenderBudgetState): RenderBudgetState {
  state.currentFrameMs = 16.67;
  state.smoothedFrameMs = 16.67;
  state.recentFrameMs.length = 1;
  state.recentFrameMs[0] = 16.67;
  state.drawCalls = 0;
  state.visibilityRadius = DEFAULT_VISIBILITY_RADIUS;
  state.weatherVisibility = 1;
  state.weatherVisibilityRadiusCap = DEFAULT_VISIBILITY_RADIUS;
  state.targetFps = 60;
  state.averageFps = 60;
  state.worstRecentFrameMs = 16.67;
  state.severeFrameStreak = 0;
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
  }: {
    deltaMs: number;
    active3d: boolean;
    weatherVisibility?: number;
    drawCalls?: number;
  }
): RenderBudgetState {
  if (!active3d) {
    return resetRenderBudgetStateInPlace(state);
  }

  const clampedDeltaMs = Math.min(Math.max(deltaMs, 8), 100);
  const smoothedFrameMs =
    state.smoothedFrameMs +
    (clampedDeltaMs - state.smoothedFrameMs) * FRAME_SMOOTHING;
  const recentFrameMs = appendRecentFrameMsInPlace(state.recentFrameMs, clampedDeltaMs);
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
      : Math.max(0, state.severeFrameStreak - SEVERE_FRAME_STREAK_RECOVERY_STEP);
  const normalizedWeatherVisibility = clamp(
    weatherVisibility ?? state.weatherVisibility,
    0,
    1
  );
  const normalizedDrawCalls = Math.max(0, Math.floor(drawCalls ?? state.drawCalls));
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

  state.currentFrameMs = clampedDeltaMs;
  state.smoothedFrameMs = smoothedFrameMs;
  state.drawCalls = normalizedDrawCalls;
  state.visibilityRadius = Math.min(visibilityRadius, weatherVisibilityRadiusCap);
  state.weatherVisibility = normalizedWeatherVisibility;
  state.weatherVisibilityRadiusCap = weatherVisibilityRadiusCap;
  state.targetFps = targetFps;
  state.averageFps = averageFps;
  state.worstRecentFrameMs = worstRecentFrameMs;
  state.severeFrameStreak = severeFrameStreak;
  return state;
}

export function advanceRenderBudgetState(
  state: RenderBudgetState,
  {
    deltaMs,
    active3d,
    weatherVisibility,
    drawCalls,
  }: {
    deltaMs: number;
    active3d: boolean;
    weatherVisibility?: number;
    drawCalls?: number;
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
    drawCalls: {
      soft: SOFT_DRAW_CALL_LIMIT,
      hard: HARD_DRAW_CALL_LIMIT,
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
  state: Pick<
    RenderBudgetState,
    'visibilityRadius' | 'targetFps' | 'smoothedFrameMs' | 'severeFrameStreak'
  >
): RenderQualityLevel {
  if (
    state.severeFrameStreak >= SEVERE_FRAME_STREAK_THRESHOLD
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
    | 'severeFrameStreak'
    | 'drawCalls'
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
  if (state.severeFrameStreak >= SEVERE_FRAME_STREAK_THRESHOLD) {
    limiters.push('Optional effects minimized after sustained frame stalls');
  }
  if (state.drawCalls >= HARD_DRAW_CALL_LIMIT) {
    limiters.push('Scene draw calls exceeded the hard cap');
  } else if (state.drawCalls >= SOFT_DRAW_CALL_LIMIT) {
    limiters.push('Scene draw calls exceeded the soft cap');
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
      smoothedFrameMs: state.smoothedFrameMs ?? DEFAULT_RENDER_BUDGET_STATE.smoothedFrameMs,
      severeFrameStreak:
        state.severeFrameStreak ?? DEFAULT_RENDER_BUDGET_STATE.severeFrameStreak,
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
      smoothedFrameMs: state.smoothedFrameMs ?? DEFAULT_RENDER_BUDGET_STATE.smoothedFrameMs,
      severeFrameStreak:
        state.severeFrameStreak ?? DEFAULT_RENDER_BUDGET_STATE.severeFrameStreak,
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
