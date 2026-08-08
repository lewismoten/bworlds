import { describe, expect, it } from 'vitest';
import {
  buildDebugMarkup,
  getDebugSignature,
  normalizeWorldSeed,
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
      playerLevel: 4,
      visibilityRadius: 18,
      drawCalls: 42,
      triangles: 2048,
      visibleTileCount: 112,
      pendingTileCount: 6,
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
    expect(buildDebugMarkup(snapshot)).toContain('Level');
    expect(buildDebugMarkup(snapshot)).toContain('alpha');
  });
});
