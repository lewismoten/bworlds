import { describe, expect, it } from 'vitest';
import { createRailTilePlugin } from './index.ts';

describe('tile rail', () => {
  it('creates a walkable rail tile definition', () => {
    const plugin = createRailTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'rail');

    expect(tile?.definition).toEqual(
      expect.objectContaining({
        name: 'Rail Track',
        walkable: true,
      })
    );
  });

  it('renders sleepers and rails in overworld scenes', () => {
    const plugin = createRailTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'rail');
    const model = tile?.create3DModel?.({
      tile: { kind: 'rail' },
      three: createFakeThree() as never,
      state: {
        getCurrentContext() {
          return { type: 'overworld' };
        },
        getCurrentTile() {
          return { kind: 'rail' };
        },
      } as never,
      tileX: 0,
      tileY: 0,
    }) as { children?: unknown[] } | null | undefined;

    expect(model?.children.length ?? 0).toBeGreaterThanOrEqual(6);
  });
});

function createFakeThree() {
  class Group {
    children: unknown[] = [];
    position = {
      set() {
        return undefined;
      },
    };
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
    rotation = { y: 0 };
    constructor(
      public geometry: unknown,
      public material: unknown
    ) {}
  }
  class MeshBasicMaterial {
    constructor(public options: unknown) {}
  }
  class BoxGeometry {
    constructor(
      public width: number,
      public height: number,
      public depth: number
    ) {}
  }

  return {
    Group,
    Mesh,
    MeshBasicMaterial,
    BoxGeometry,
  };
}
