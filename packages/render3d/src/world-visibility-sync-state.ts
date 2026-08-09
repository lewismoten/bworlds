import type { PendingWorldBuildEntry } from './pending-world-build-queue.ts';

export type WorldVisibilitySyncState = {
  contextId: string;
  centerX: number;
  centerY: number;
  facingBucket: number;
  chunkRadius: number;
};

export type PendingWorldBuildState = {
  contextId: string;
  centerX: number;
  centerY: number;
  facingBucket: number;
  queue: PendingWorldBuildEntry[];
};

export function createWorldVisibilitySyncState(): WorldVisibilitySyncState {
  return {
    contextId: '',
    centerX: Number.NaN,
    centerY: Number.NaN,
    facingBucket: -1,
    chunkRadius: -1,
  };
}

export function matchesWorldVisibilitySyncState(
  state: WorldVisibilitySyncState,
  next: WorldVisibilitySyncState
): boolean {
  return (
    state.contextId === next.contextId &&
    state.centerX === next.centerX &&
    state.centerY === next.centerY &&
    state.facingBucket === next.facingBucket &&
    state.chunkRadius === next.chunkRadius
  );
}

export function updateWorldVisibilitySyncState(
  state: WorldVisibilitySyncState,
  next: WorldVisibilitySyncState
): WorldVisibilitySyncState {
  state.contextId = next.contextId;
  state.centerX = next.centerX;
  state.centerY = next.centerY;
  state.facingBucket = next.facingBucket;
  state.chunkRadius = next.chunkRadius;
  return state;
}

export function createPendingWorldBuildState(): PendingWorldBuildState {
  return {
    contextId: '',
    centerX: Number.NaN,
    centerY: Number.NaN,
    facingBucket: -1,
    queue: [],
  };
}

export function matchesPendingWorldBuildState(
  state: PendingWorldBuildState,
  next: Pick<
    PendingWorldBuildState,
    'contextId' | 'centerX' | 'centerY' | 'facingBucket'
  >
): boolean {
  return (
    state.contextId === next.contextId &&
    state.centerX === next.centerX &&
    state.centerY === next.centerY &&
    state.facingBucket === next.facingBucket
  );
}

export function updatePendingWorldBuildState(
  state: PendingWorldBuildState,
  next: PendingWorldBuildState
): PendingWorldBuildState {
  state.contextId = next.contextId;
  state.centerX = next.centerX;
  state.centerY = next.centerY;
  state.facingBucket = next.facingBucket;
  state.queue = next.queue;
  return state;
}
