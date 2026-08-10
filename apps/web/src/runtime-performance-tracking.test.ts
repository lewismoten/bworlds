import { describe, expect, it, vi } from 'vitest';
import {
  buildRuntimePerformanceSnapshot,
  normalizeRuntimePerformanceTrackingPreferences,
  postRuntimePerformanceSnapshot,
} from './runtime-performance-tracking.ts';

describe('runtime performance tracking', () => {
  it('defaults tracking to enabled unless the persisted session opted out', () => {
    expect(normalizeRuntimePerformanceTrackingPreferences(undefined)).toEqual({
      enabled: true,
    });
    expect(
      normalizeRuntimePerformanceTrackingPreferences({
        runtimePerformanceTrackingEnabled: false,
      })
    ).toEqual({
      enabled: false,
    });
  });

  it('builds snapshots with measurable limits and violations', () => {
    const snapshot = buildRuntimePerformanceSnapshot({
      source: 'game',
      trigger: 'startup',
      route: '/',
      worldSeed: 'alpha',
      metrics: {
        initialWorldGenerationMs: 4_500,
        maximumFrameMs: 55,
        drawCalls: 1_300,
      },
    });

    expect(snapshot.violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Initial world generation'),
        expect.stringContaining('Maximum frame time'),
        expect.stringContaining('Draw calls'),
      ])
    );
  });

  it('posts runtime performance snapshots to the vite endpoint when fetch is available', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }) as Response);

    const snapshot = buildRuntimePerformanceSnapshot({
      source: 'music-debug',
      trigger: 'midi-export',
      route: '/debug/music',
    });

    await expect(
      postRuntimePerformanceSnapshot(snapshot, { fetchImpl })
    ).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/runtime-performance-snapshots',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
});
