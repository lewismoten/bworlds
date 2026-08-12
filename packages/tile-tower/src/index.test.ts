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

  it('keeps repeated tower builds on one host within the shared material budget', () => {
    const plugin = createTowerTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'tower');
    const three = createFakeThree() as never;
    const repeatedModels: BaseNode[] = [];

    for (const [tileX, tileY] of [
      [8, -3],
      [10, -1],
      [12, 1],
      [14, 3],
    ]) {
      const model = tile?.create3DModel?.({
        tile: { kind: 'tower' },
        three,
        state: {} as never,
        tileX,
        tileY,
      }) as BaseNode | undefined;
      if (model) {
        repeatedModels.push(model);
      }
    }

    const sharedMaterials = new Set<object>();
    repeatedModels.forEach((model) => {
      collectMeshMaterials(model).forEach((material) => {
        sharedMaterials.add(material);
      });
    });

    expect(repeatedModels).toHaveLength(4);
    expect(sharedMaterials.size).toBeLessThanOrEqual(4);
  });

  it('builds the full-detail tower progressively before returning the final model', () => {
    const plugin = createTowerTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'tower');
    const build = tile?.create3DModelProgressive?.({
      tile: { kind: 'tower' },
      three: createFakeThree() as never,
      state: {} as never,
      tileX: 8,
      tileY: -3,
      detailLevel: 'full',
    });

    expect(build).toBeDefined();
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 1,
        totalSteps: 3,
        label: 'base',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 2,
        totalSteps: 3,
        label: 'crown',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 3,
        totalSteps: 3,
        label: 'entry-lantern',
      },
    });

    const completed = build?.next();
    expect(completed?.done).toBe(true);
    expect(
      ((completed?.value as { children?: unknown[] } | undefined)?.children
        ?.length ?? 0) > 0
    ).toBe(true);
  });

  it('keeps the synchronous tower build aligned with the progressive final model', () => {
    const plugin = createTowerTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'tower');
    const three = createFakeThree() as never;
    const syncModel = tile?.create3DModel?.({
      tile: { kind: 'tower' },
      three,
      state: {} as never,
      tileX: 8,
      tileY: -3,
    }) as GroupNode | undefined;
    const progressiveBuild = tile?.create3DModelProgressive?.({
      tile: { kind: 'tower' },
      three,
      state: {} as never,
      tileX: 8,
      tileY: -3,
    });
    let progressiveModel: GroupNode | undefined;

    while (true) {
      const next = progressiveBuild?.next();
      if (next?.done) {
        progressiveModel = next.value as GroupNode | undefined;
        break;
      }
    }

    expect(createModelSignature(progressiveModel)).toEqual(
      createModelSignature(syncModel)
    );
  });

  it('uses the full-detail tower base mesh as the root instead of a wrapper group', () => {
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
    }) as Mesh | null | undefined;

    expect(full).toBeInstanceOf(Mesh);
    expect(full?.position).toMatchObject({ x: 8, y: 0.11, z: -3 });
    expect(full?.children).toHaveLength(6);
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

    expect(low?.children).toHaveLength(2);
    expect(full?.children?.length ?? 0).toBeGreaterThan(
      low?.children?.length ?? 0
    );
  });

  it('uses the low-detail tower base mesh as the root instead of a wrapper group', () => {
    const plugin = createTowerTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'tower');
    const three = createFakeThree() as never;

    const low = tile?.create3DModel?.({
      tile: { kind: 'tower' },
      three,
      state: {} as never,
      tileX: 8,
      tileY: -3,
      detailLevel: 'low',
    }) as Mesh | null | undefined;

    expect(low).toBeInstanceOf(Mesh);
    expect(low?.position).toMatchObject({ x: 8, y: 0.11, z: -3 });
    expect(low?.children).toHaveLength(2);
  });
});

class BaseNode {
  children: unknown[] = [];
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
  visible = true;
  userData?: Record<string, unknown>;
  add(child: unknown) {
    this.children.push(child);
  }
  traverse(visit: (child: unknown) => void) {
    visit(this);
    this.children.forEach((child) => {
      if (
        typeof child === 'object' &&
        child !== null &&
        'traverse' in child &&
        typeof child.traverse === 'function'
      ) {
        child.traverse(visit);
      } else {
        visit(child);
      }
    });
  }
}

class Group extends BaseNode {}

class Mesh extends BaseNode {
  constructor(
    public geometry: unknown,
    public material: unknown
  ) {
    super();
  }
}

class PointLight extends BaseNode {
  userData: Record<string, unknown> = {};
  constructor(
    public color: unknown,
    public intensity: unknown,
    public distance: unknown,
    public decay: unknown
  ) {
    super();
  }
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

function createFakeThree() {
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

type GroupNode = InstanceType<typeof Group>;

function createModelSignature(model: BaseNode | undefined) {
  const signature: Array<Record<string, unknown>> = [];
  model?.traverse((node) => {
    if (typeof node !== 'object' || node === null) {
      return;
    }

    const typedNode = node as {
      constructor: { name: string };
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      visible?: boolean;
      children?: unknown[];
      userData?: Record<string, unknown>;
      material?: { options?: unknown } | Array<{ options?: unknown }>;
    };

    signature.push({
      type: typedNode.constructor.name,
      x: typedNode.position?.x,
      y: typedNode.position?.y,
      z: typedNode.position?.z,
      rotationX: typedNode.rotation?.x,
      rotationY: typedNode.rotation?.y,
      rotationZ: typedNode.rotation?.z,
      visible: typedNode.visible,
      childCount: typedNode.children?.length ?? 0,
      material:
        node instanceof Mesh
          ? Array.isArray(typedNode.material)
            ? typedNode.material.map((material) => material.options)
            : typedNode.material?.options
          : undefined,
      light:
        node instanceof PointLight
          ? {
              visible: typedNode.visible,
            }
          : undefined,
      userData: typedNode.userData,
    });
  });
  return signature;
}

function collectMeshMaterials(root: BaseNode | undefined): Set<object> {
  const materials = new Set<object>();
  root?.traverse((node) => {
    if (!(node instanceof Mesh)) {
      return;
    }
    const material = node.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => {
        if (entry && typeof entry === 'object') {
          materials.add(entry);
        }
      });
      return;
    }
    if (material && typeof material === 'object') {
      materials.add(material);
    }
  });
  return materials;
}
