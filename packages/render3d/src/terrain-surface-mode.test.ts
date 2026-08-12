import { describe, expect, it } from 'vitest';
import {
  resolveTileTerrainSurfaceMode,
  resolveTileTerrainSurfaceSelection,
} from './terrain-surface-mode.ts';

describe('terrain surface mode selection', () => {
  it('switches simple roads to the shared terrain surface path', () => {
    expect(resolveTileTerrainSurfaceMode({ kind: 'road' })).toBe(
      'shared-splat'
    );
    expect(resolveTileTerrainSurfaceSelection({ kind: 'road' })).toEqual(
      expect.objectContaining({
        activeMode: 'shared-splat',
        sharedSplatEligible: true,
      })
    );
  });

  it('keeps bridge and dock structures on mesh rendering because they need real geometry', () => {
    expect(resolveTileTerrainSurfaceSelection({ kind: 'bridge' })).toEqual(
      expect.objectContaining({
        activeMode: 'legacy-mesh',
        sharedSplatEligible: false,
      })
    );
    expect(resolveTileTerrainSurfaceSelection({ kind: 'dock' })).toEqual(
      expect.objectContaining({
        activeMode: 'legacy-mesh',
        sharedSplatEligible: false,
      })
    );
  });

  it('leaves non-route terrain on the legacy mesh path until a shared terrain renderer exists', () => {
    expect(resolveTileTerrainSurfaceSelection({ kind: 'plains' })).toEqual({
      activeMode: 'legacy-mesh',
      sharedSplatEligible: false,
      reason:
        'renderer still uses legacy terrain mesh and shared floor batches',
    });
  });
});
