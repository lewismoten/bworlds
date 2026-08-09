import { describe, expect, it } from 'vitest';

import {
  createPendingWorldBuildState,
  createWorldVisibilitySyncState,
  matchesPendingWorldBuildState,
  matchesWorldVisibilitySyncState,
  updatePendingWorldBuildState,
  updateWorldVisibilitySyncState,
} from './world-visibility-sync-state.ts';

describe('world visibility sync state', () => {
  it('updates and matches world visibility sync state without string keys', () => {
    const state = createWorldVisibilitySyncState();
    const next = {
      contextId: 'overworld',
      centerX: 4,
      centerY: -2,
      facingBucket: 3,
      chunkRadius: 12,
    };

    expect(matchesWorldVisibilitySyncState(state, next)).toBe(false);
    expect(updateWorldVisibilitySyncState(state, next)).toBe(state);
    expect(matchesWorldVisibilitySyncState(state, next)).toBe(true);
  });

  it('updates and matches pending world build state without center-key strings', () => {
    const state = createPendingWorldBuildState();
    const queue = [{ key: '1:0', x: 1, y: 0 }];
    const next = {
      contextId: 'overworld',
      centerX: 4,
      centerY: -2,
      facingBucket: 3,
      queue,
    };

    expect(matchesPendingWorldBuildState(state, next)).toBe(false);
    expect(updatePendingWorldBuildState(state, next)).toBe(state);
    expect(matchesPendingWorldBuildState(state, next)).toBe(true);
    expect(state.queue).toBe(queue);
  });
});
