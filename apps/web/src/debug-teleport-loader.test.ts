import { beforeEach, describe, expect, it, vi } from 'vitest';

const listTileTeleportOptions = vi.fn((definitions: unknown) => definitions);
const findRandomTileDestination = vi.fn((_kind: unknown, options: unknown) => ({
  options,
  x: 4,
  y: -2,
}));

vi.mock('./debug-teleport.ts', () => ({
  listTileTeleportOptions,
  findRandomTileDestination,
}));

describe('debug teleport loader', () => {
  beforeEach(async () => {
    vi.resetModules();
    listTileTeleportOptions.mockClear();
    findRandomTileDestination.mockClear();
  });

  it('loads the debug teleport module once and reuses the cached promise', async () => {
    const { loadDebugTeleportModule } =
      await import('./debug-teleport-loader.ts');

    const first = loadDebugTeleportModule();
    const second = loadDebugTeleportModule();

    expect(second).toBe(first);
    await expect(first).resolves.toEqual(
      expect.objectContaining({
        findRandomTileDestination,
        listTileTeleportOptions,
      })
    );
  });

  it('proxies listTileTeleportOptions through the lazy-loaded module', async () => {
    const { listTileTeleportOptionsLazy } =
      await import('./debug-teleport-loader.ts');
    const definitions: Array<[string, { name?: string; walkable?: boolean }]> =
      [['forest', { name: 'Forest', walkable: true }]];

    await expect(listTileTeleportOptionsLazy(definitions)).resolves.toBe(
      definitions
    );
    expect(listTileTeleportOptions).toHaveBeenCalledWith(definitions);
  });

  it('proxies findRandomTileDestination through the lazy-loaded module', async () => {
    const { findRandomTileDestinationLazy } =
      await import('./debug-teleport-loader.ts');
    const options = {
      sampleOverworld: vi.fn(),
      canLandAt: vi.fn(),
    };

    await expect(
      findRandomTileDestinationLazy('forest', options)
    ).resolves.toEqual({
      options,
      x: 4,
      y: -2,
    });
    expect(findRandomTileDestination).toHaveBeenCalledWith('forest', options);
  });
});
