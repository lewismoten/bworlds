import { describe, expect, it } from 'vitest';
import {
  buildDebugMarkup,
  formatPerformanceTierLabel,
  getDebugSignature,
  getTargetFrameMs,
  normalizeWorldSeed,
  resolvePerformanceTier,
} from './debug-panel.ts';

describe('debug panel', () => {
  it('normalizes world seeds with a fallback', () => {
    expect(normalizeWorldSeed('  alpha  ', 'fallback')).toBe('alpha');
    expect(normalizeWorldSeed('   ', 'fallback')).toBe('fallback');
    expect(normalizeWorldSeed(undefined, 'fallback')).toBe('fallback');
  });

  it('builds stable signatures and markup for debug snapshots', () => {
    const snapshot = {
      fps: 58.2,
      frameMs: 17.2,
      targetFps: 60 as const,
      performanceTier: 'healthy' as const,
      playerLevel: 4,
      visibilityRadius: 18,
      drawCalls: 42,
      triangles: 2048,
      visibleTileCount: 112,
      pendingTileCount: 6,
      object3dCount: 318,
      meshCount: 180,
      materialCount: 24,
      geometryCount: 61,
      textureCount: 7,
      programCount: 12,
      latitude: 32.1234,
      longitude: -81.5678,
      gridX: 14,
      gridY: -9,
      worldSeed: 'alpha',
      heapUsedMb: 48.4,
      heapLimitMb: 128,
    };

    expect(getDebugSignature(snapshot)).toBe(getDebugSignature({ ...snapshot }));
    expect(buildDebugMarkup(snapshot)).toContain('GPU Draws');
    expect(buildDebugMarkup(snapshot)).toContain('Frame Target');
    expect(buildDebugMarkup(snapshot)).toContain('Perf Tier');
    expect(buildDebugMarkup(snapshot)).toContain('Level');
    expect(buildDebugMarkup(snapshot)).toContain('Materials');
    expect(buildDebugMarkup(snapshot)).toContain('Programs');
    expect(buildDebugMarkup(snapshot)).toContain('alpha');
  });

  it('derives frame budgets and performance tiers from frame time', () => {
    expect(getTargetFrameMs(60)).toBeCloseTo(16.6667, 3);
    expect(getTargetFrameMs(30)).toBeCloseTo(33.3333, 3);
    expect(resolvePerformanceTier(16.7)).toBe('healthy');
    expect(resolvePerformanceTier(24)).toBe('reduced');
    expect(resolvePerformanceTier(40)).toBe('critical');
    expect(formatPerformanceTierLabel('healthy')).toBe('Healthy');
    expect(formatPerformanceTierLabel('reduced')).toBe('Reduced');
    expect(formatPerformanceTierLabel('critical')).toBe('Critical');
  });
});
