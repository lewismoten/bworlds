import { describe, expect, it, vi } from 'vitest';
import { createWaterTilePlugin, isSingleTileRiverCandidate } from './index.ts';

vi.mock('@bworlds/three-support', () => ({
  createCubicBezierPoints(
    _three: unknown,
    start: unknown,
    controlA: unknown,
    controlB: unknown,
    end: unknown
  ) {
    return [start, controlA, controlB, end];
  },
  createRibbonMesh(
    _three: unknown,
    _points: unknown[],
    _width: number,
    material: unknown
  ) {
    return {
      geometry: { constructor: { name: 'FakeRibbonGeometry' } },
      material,
      children: [],
      position: {
        x: 0,
        y: 0,
        z: 0,
        set() {
          return this;
        },
      },
      rotation: { x: 0, y: 0, z: 0 },
      add() {
        return this;
      },
    };
  },
}));

describe('tile water', () => {
  it('classifies single-tile rivers along a stronger centerline', () => {
    expect(
      isSingleTileRiverCandidate({
        riverSignal: 0.84,
        north: 0.61,
        east: 0.76,
        south: 0.6,
        west: 0.74,
      })
    ).toBe(true);
    expect(
      isSingleTileRiverCandidate({
        riverSignal: 0.75,
        north: 0.74,
        east: 0.77,
        south: 0.73,
        west: 0.76,
      })
    ).toBe(false);
  });

  it('renders deterministic river geometry for the same tile after repeated rebuilds', () => {
    const plugin = createWaterTilePlugin();
    const riverTile = plugin.tiles?.find((tile) => tile.kind === 'river');
    const state = createRiverState();

    const captureSignature = () => {
      const model = riverTile?.create3DModel?.({
        tile: { kind: 'river' } as never,
        three: createFakeThree() as never,
        state: state as never,
        tileX: 0,
        tileY: 0,
      }) as FakeGroup | undefined;

      return (model?.children ?? []).map((child) => ({
        geometry: child.geometry?.constructor.name ?? 'unknown',
        opacity:
          child.material && !Array.isArray(child.material)
            ? child.material.opacity ?? null
            : null,
        color:
          child.material && !Array.isArray(child.material)
            ? child.material.options.color ?? null
            : null,
      }));
    };

    const baseline = captureSignature();

    for (let index = 0; index < 64; index += 1) {
      riverTile?.create3DModel?.({
        tile: { kind: 'river' } as never,
        three: createFakeThree() as never,
        state: state as never,
        tileX: index - 32,
        tileY: Math.floor(index / 8) - 4,
      });
    }

    expect(captureSignature()).toEqual(baseline);
    expect(baseline.length).toBeGreaterThanOrEqual(3);
  });

  it('produces animated ocean overlays only when time is available', () => {
    const plugin = createWaterTilePlugin();
    const oceanTile = plugin.tiles?.find((tile) => tile.kind === 'ocean');
    const overlayContext = createFakeOverlayContext();

    expect(
      oceanTile?.paint2DOverlay?.({
        ...overlayContext,
        timeMs: undefined,
      } as never)
    ).toBe(false);
    expect(
      oceanTile?.paint2DOverlay?.({
        ...overlayContext,
        timeMs: 1000,
      } as never)
    ).toBe(true);
  });
});

class FakeGeometry {
  constructor(..._args: number[]) {}
}

class FakeMaterial {
  opacity?: number;
  constructor(public options: Record<string, unknown> = {}) {
    if (typeof options.opacity === 'number') {
      this.opacity = options.opacity;
    }
  }
}

class FakeVector3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0
  ) {}
}

class FakeNode {
  children: FakeNode[] = [];
  position = {
    x: 0,
    y: 0,
    z: 0,
    set: (x: number, y: number, z: number) => {
      this.position.x = x;
      this.position.y = y;
      this.position.z = z;
      return this.position;
    },
  };
  rotation = { x: 0, y: 0, z: 0 };
  constructor(
    public geometry?: FakeGeometry | null,
    public material?: FakeMaterial | FakeMaterial[] | null
  ) {}
  add(...children: FakeNode[]) {
    this.children.push(...children);
    return this;
  }
}

class FakeGroup extends FakeNode {}

class FakeMesh extends FakeNode {}

function createFakeThree() {
  return {
    Group: FakeGroup,
    Mesh: FakeMesh,
    MeshStandardMaterial: FakeMaterial,
    CircleGeometry: FakeGeometry,
    Vector3: FakeVector3,
    DoubleSide: 'DoubleSide',
  };
}

function createRiverState() {
  const riverTiles = new Set([
    '0:0',
    '0:-1',
    '0:1',
    '-1:0',
    '1:0',
  ]);

  return {
    getCurrentTile(x: number, y: number) {
      return { kind: riverTiles.has(`${x}:${y}`) ? 'river' : 'plains' };
    },
  };
}

function createFakeOverlayContext() {
  const gradient = {
    addColorStop() {
      return undefined;
    },
  };
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    save() {
      return undefined;
    },
    beginPath() {
      return undefined;
    },
    rect() {
      return undefined;
    },
    clip() {
      return undefined;
    },
    createRadialGradient() {
      return gradient;
    },
    fillRect() {
      return undefined;
    },
    moveTo() {
      return undefined;
    },
    quadraticCurveTo() {
      return undefined;
    },
    stroke() {
      return undefined;
    },
    restore() {
      return undefined;
    },
  };

  return {
    context,
    x: 0,
    y: 0,
    size: 16,
    worldX: 4,
    worldY: 9,
    variant: 2,
  };
}
