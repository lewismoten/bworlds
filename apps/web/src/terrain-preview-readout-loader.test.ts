import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveTerrainPreviewReadout = vi.fn(() => ({
  biomeId: 'forest',
  dominantLayerId: 'grass-a',
}));
const resolveTerrainPreviewHeight = vi.fn(() => 0.42);

vi.mock('./terrain-preview-readout.ts', () => ({
  resolveTerrainPreviewHeight,
  resolveTerrainPreviewReadout,
}));

describe('terrain preview readout loader', () => {
  beforeEach(async () => {
    vi.resetModules();
    resolveTerrainPreviewReadout.mockClear();
  });

  it('loads the terrain preview readout module once and reuses the cached promise', async () => {
    const { loadTerrainPreviewReadoutModule } =
      await import('./terrain-preview-readout-loader.ts');

    const first = loadTerrainPreviewReadoutModule();
    const second = loadTerrainPreviewReadoutModule();

    expect(second).toBe(first);
    await expect(first).resolves.toEqual(
      expect.objectContaining({
        resolveTerrainPreviewHeight,
        resolveTerrainPreviewReadout,
      })
    );
  });
});
