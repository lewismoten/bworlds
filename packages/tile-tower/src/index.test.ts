import { describe, expect, it } from 'vitest';
import { createTowerTilePlugin } from './index.ts';

describe('tile tower', () => {
  it('creates an enterable anchored tower point of interest', () => {
    const plugin = createTowerTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'tower');

    const classified = tile?.classifyOverworldTile?.({
      seed: 'spec',
      x: 8,
      y: -3,
      nearLand: true,
      tile: { kind: 'plains' },
      poiAnchors: [{ x: 8, y: -3, type: 'tower', name: 'Old Watchtower' }],
    } as never);

    expect(classified).toEqual(
      expect.objectContaining({
        kind: 'tower',
        poi: expect.objectContaining({
          type: 'tower',
          name: 'Old Watchtower',
        }),
      })
    );
  });

  it('reuses shared tower materials across repeated builds on the same host', () => {
    const plugin = createTowerTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'tower');
    const three = createFakeThree() as never;

    const first = tile?.create3DModel?.({
      tile: { kind: 'tower' },
      three,
      state: {} as never,
      tileX: 8,
      tileY: -3,
    }) as { children?: Array<{ material: unknown }> } | null | undefined;
    const second = tile?.create3DModel?.({
      tile: { kind: 'tower' },
      three,
      state: {} as never,
      tileX: 10,
      tileY: -1,
    }) as { children?: Array<{ material: unknown }> } | null | undefined;

    expect(first?.children[0]?.material).toBe(second?.children[0]?.material);
    expect(first?.children[2]?.material).toBe(second?.children[2]?.material);
    expect(first?.children[5]?.material).toBe(second?.children[5]?.material);
  });

  it('builds a simplified low-detail tower without the doorway and lantern rig', () => {
    const plugin = createTowerTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'tower');
    const three = createFakeThree() as never;

    const full = tile?.create3DModel?.({
      tile: { kind: 'tower' },
      three,
      state: {} as never,
      tileX: 8,
      tileY: -3,
      detailLevel: 'full',
    }) as { children?: unknown[] } | null | undefined;
    const low = tile?.create3DModel?.({
      tile: { kind: 'tower' },
      three,
      state: {} as never,
      tileX: 8,
      tileY: -3,
      detailLevel: 'low',
    }) as { children?: unknown[] } | null | undefined;

    expect(low?.children).toHaveLength(3);
    expect(full?.children?.length ?? 0).toBeGreaterThan(
      low?.children?.length ?? 0
    );
  });
});

function createFakeThree() {
  class Group {
    children: unknown[] = [];
    add(child: unknown) {
      this.children.push(child);
    }
  }
  class Mesh {
    position = {
      set() {
        return undefined;
      },
    };
    constructor(
      public geometry: unknown,
      public material: unknown
    ) {}
  }
  class PointLight {
    position = {
      set() {
        return undefined;
      },
    };
    visible = true;
    userData: Record<string, unknown> = {};
    constructor(
      public color: unknown,
      public intensity: unknown,
      public distance: unknown,
      public decay: unknown
    ) {}
  }
  class MeshBasicMaterial {
    constructor(public options: unknown) {}
  }
  class MeshStandardMaterial {
    constructor(public options: unknown) {}
  }
  class CylinderGeometry {
    constructor(...args: unknown[]) {
      void args;
    }
  }
  class ConeGeometry {
    constructor(...args: unknown[]) {
      void args;
    }
  }
  class BoxGeometry {
    constructor(...args: unknown[]) {
      void args;
    }
  }
  class SphereGeometry {
    constructor(...args: unknown[]) {
      void args;
    }
  }

  return {
    Group,
    Mesh,
    PointLight,
    MeshBasicMaterial,
    MeshStandardMaterial,
    CylinderGeometry,
    ConeGeometry,
    BoxGeometry,
    SphereGeometry,
  };
}
