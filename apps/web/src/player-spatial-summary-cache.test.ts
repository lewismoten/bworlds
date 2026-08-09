import { describe, expect, it, vi } from 'vitest';

import { createPlayerSpatialSummaryCache } from './player-spatial-summary-cache.ts';

describe('player spatial summary cache', () => {
  it('reuses the resolved summary while player state and context are unchanged', () => {
    const state = {
      player: {
        x: 12.5,
        y: -4.25,
        facing: Math.PI / 2,
      },
      getCurrentContext() {
        return { id: 'overworld' };
      },
    };
    const resolveSummary = vi.fn(() => ({
      context: { id: 'overworld', depth: 0 },
      tile: { kind: 'plains' },
      gps: { latitude: 1, longitude: 2 },
      gridX: 13,
      gridY: -4,
      playerX: state.player.x,
      playerY: state.player.y,
      facing: state.player.facing,
    }));
    const resolveCachedSummary = createPlayerSpatialSummaryCache(resolveSummary);

    const first = resolveCachedSummary(state);
    const second = resolveCachedSummary(state);

    expect(second).toBe(first);
    expect(resolveSummary).toHaveBeenCalledTimes(1);
  });

  it('refreshes when player position or facing changes', () => {
    const state = {
      player: {
        x: 12.5,
        y: -4.25,
        facing: Math.PI / 2,
      },
      getCurrentContext() {
        return { id: 'overworld' };
      },
    };
    const resolveSummary = vi.fn(() => ({
      context: { id: 'overworld', depth: 0 },
      tile: { kind: 'plains' },
      gps: { latitude: 1, longitude: 2 },
      gridX: 13,
      gridY: -4,
      playerX: state.player.x,
      playerY: state.player.y,
      facing: state.player.facing,
    }));
    const resolveCachedSummary = createPlayerSpatialSummaryCache(resolveSummary);

    const first = resolveCachedSummary(state);
    state.player.x += 1;
    const second = resolveCachedSummary(state);
    state.player.facing += 0.25;
    const third = resolveCachedSummary(state);

    expect(second).not.toBe(first);
    expect(third).not.toBe(second);
    expect(resolveSummary).toHaveBeenCalledTimes(3);
  });

  it('refreshes when the current context changes', () => {
    const state = {
      player: {
        x: 12.5,
        y: -4.25,
        facing: Math.PI / 2,
      },
      contextId: 'overworld',
      getCurrentContext() {
        return { id: this.contextId };
      },
    };
    const resolveSummary = vi.fn(() => ({
      context: { id: state.contextId, depth: 0 },
      tile: { kind: 'plains' },
      gps: { latitude: 1, longitude: 2 },
      gridX: 13,
      gridY: -4,
      playerX: state.player.x,
      playerY: state.player.y,
      facing: state.player.facing,
    }));
    const resolveCachedSummary = createPlayerSpatialSummaryCache(resolveSummary);

    const first = resolveCachedSummary(state);
    state.contextId = 'town';
    const second = resolveCachedSummary(state);

    expect(second).not.toBe(first);
    expect(resolveSummary).toHaveBeenCalledTimes(2);
  });
});
