import { describe, expect, it, vi } from 'vitest';
import { resolveTerrainSextantReadout } from './terrain-sextant-readout.ts';

describe('terrain sextant readout', () => {
  it('uses the shared terrain preview module when it is available', () => {
    const module = {
      resolveTerrainPreviewHeight: vi.fn(() => 0.42),
      resolveTerrainPreviewReadout: vi.fn(() => ({
        biomeId: 'forest',
        dominantLayerId: 'leaf',
      })),
    } as unknown as typeof import('./terrain-preview-readout.ts');

    const result = resolveTerrainSextantReadout({
      module,
      seed: 'sextant-seed',
      x: 12,
      y: -4,
      kind: 'forest',
      fallbackHeight: 0.17,
    });

    expect(result).toEqual({
      terrainHeight: 0.42,
      terrainPreviewReadout: {
        biomeId: 'forest',
        dominantLayerId: 'leaf',
      },
    });
    expect(module.resolveTerrainPreviewHeight).toHaveBeenCalledWith({
      seed: 'sextant-seed',
      x: 12,
      y: -4,
    });
    expect(module.resolveTerrainPreviewReadout).toHaveBeenCalledWith({
      seed: 'sextant-seed',
      x: 12,
      y: -4,
      kind: 'forest',
    });
  });

  it('falls back to the decorated runtime height until the lazy module loads', () => {
    expect(
      resolveTerrainSextantReadout({
        module: null,
        seed: 'sextant-seed',
        x: 12,
        y: -4,
        kind: 'forest',
        fallbackHeight: 0.17,
      })
    ).toEqual({
      terrainHeight: 0.17,
      terrainPreviewReadout: null,
    });
  });
});
