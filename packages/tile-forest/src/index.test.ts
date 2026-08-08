import { describe, expect, it, vi } from 'vitest';

vi.mock('@bworlds/three-support', () => ({
  createPaintedCanvasTexture() {
    return { colorSpace: '', needsUpdate: false };
  },
}));

import {
  createForestTilePlugin,
  getForestBirds,
  getForestBushes,
  getForestFireflyDescriptors,
  getForestTreeBranchProfiles,
  getForestCarvings,
  getForestFloorDetails,
  getForestLandmark,
  getForestMeadows,
  getForestOwls,
  getForestTrail,
  getForestTreeForms,
  getForestTreeHollows,
} from './index.ts';

class FakeGeometry {
  attributes: Record<string, unknown> = {};
  constructor(..._args: number[]) {}
  setAttribute(name: string, attribute: unknown) {
    this.attributes[name] = attribute;
    return this;
  }
}

class FakeMaterial {
  opacity?: number;
  emissiveIntensity?: number;
  constructor(public options: Record<string, unknown> = {}) {
    if (typeof options.opacity === 'number') {
      this.opacity = options.opacity;
    }
    if (typeof options.emissiveIntensity === 'number') {
      this.emissiveIntensity = options.emissiveIntensity;
    }
  }
}

class FakeNode {
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
  scale = {
    x: 1,
    y: 1,
    z: 1,
    set: (x: number, y: number, z: number) => {
      this.scale.x = x;
      this.scale.y = y;
      this.scale.z = z;
      return this.scale;
    },
    setScalar: (value: number) => {
      this.scale.x = value;
      this.scale.y = value;
      this.scale.z = value;
      return this.scale;
    },
  };
  userData?: Record<string, unknown>;
  visible = true;
  children: FakeNode[] = [];
  add(...children: FakeNode[]) {
    this.children.push(...children);
    return this;
  }
  traverse(visit: (child: FakeNode) => void) {
    visit(this);
    this.children.forEach((child) => child.traverse(visit));
  }
}

class FakeGroup extends FakeNode {}
class FakeMesh extends FakeNode {
  constructor(
    public geometry?: object,
    public material?: FakeMaterial | FakeMaterial[]
  ) {
    super();
  }
}
class FakePointLight extends FakeNode {
  constructor(
    public color?: string,
    public intensity = 0,
    public distance?: number,
    public decay?: number
  ) {
    super();
  }
}
class FakeFloat32BufferAttribute {
  array: number[];
  needsUpdate = false;
  constructor(values: ArrayLike<number> | number[], public itemSize: number) {
    this.array = Array.from(values);
  }
}
class FakePoints extends FakeNode {
  constructor(
    public geometry?: FakeGeometry,
    public material?: FakeMaterial | FakeMaterial[]
  ) {
    super();
  }
}

const fakeThree = {
  BufferGeometry: FakeGeometry,
  Group: FakeGroup,
  Mesh: FakeMesh,
  Points: FakePoints,
  PointLight: FakePointLight,
  MeshStandardMaterial: FakeMaterial,
  PointsMaterial: FakeMaterial,
  CanvasTexture: class {
    colorSpace = '';
    needsUpdate = false;
  },
  Float32BufferAttribute: FakeFloat32BufferAttribute,
  CylinderGeometry: FakeGeometry,
  SphereGeometry: FakeGeometry,
} as const;

describe('tile forest', () => {
  it('generates deterministic stump and fallen tree floor details', () => {
    const sampleTiles: Array<{
      x: number;
      y: number;
      details: ReturnType<typeof getForestFloorDetails>;
    }> = [];

    for (let tileY = 0; tileY < 18; tileY += 1) {
      for (let tileX = 0; tileX < 18; tileX += 1) {
        const details = getForestFloorDetails(tileX, tileY);
        if (details.length > 0) {
          sampleTiles.push({ x: tileX, y: tileY, details });
        }
      }
    }

    expect(sampleTiles.length).toBeGreaterThan(0);
    expect(
      sampleTiles.some(({ details }) =>
        details.some((detail) => detail.kind === 'stump')
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ details }) =>
        details.some((detail) => detail.kind === 'fallen-tree')
      )
    ).toBe(true);

    const first = sampleTiles[0];
    expect(getForestFloorDetails(first.x, first.y)).toEqual(first.details);
  });

  it('can place extra centered stumps or fallen trees in dense forest interiors', () => {
    const interiorTiles: Array<{
      x: number;
      y: number;
      details: ReturnType<typeof getForestFloorDetails>;
    }> = [];

    for (let tileY = 0; tileY < 32; tileY += 1) {
      for (let tileX = 0; tileX < 32; tileX += 1) {
        const details = getForestFloorDetails(tileX, tileY);
        const hasCenteredDetail = details.some(
          (detail) => Math.abs(detail.x) <= 0.12 && Math.abs(detail.y) <= 0.12
        );
        if (details.length >= 2 && hasCenteredDetail) {
          interiorTiles.push({ x: tileX, y: tileY, details });
        }
      }
    }

    expect(interiorTiles.length).toBeGreaterThan(0);
    expect(
      interiorTiles.some(({ details }) =>
        details.some((detail) => detail.kind === 'stump')
      )
    ).toBe(true);
    expect(
      interiorTiles.some(({ details }) =>
        details.some((detail) => detail.kind === 'fallen-tree')
      )
    ).toBe(true);

    const first = interiorTiles[0];
    expect(getForestFloorDetails(first.x, first.y)).toEqual(first.details);
  });

  it('generates deterministic bushes for some forest tiles', () => {
    const sampleTiles: Array<{
      x: number;
      y: number;
      bushes: ReturnType<typeof getForestBushes>;
    }> = [];

    for (let tileY = 0; tileY < 18; tileY += 1) {
      for (let tileX = 0; tileX < 18; tileX += 1) {
        const bushes = getForestBushes(tileX, tileY);
        if (bushes.length > 0) {
          sampleTiles.push({ x: tileX, y: tileY, bushes });
        }
      }
    }

    expect(sampleTiles.length).toBeGreaterThan(0);
    expect(
      sampleTiles.some(({ bushes }) =>
        bushes.every(
          (bush) => bush.height > 0.1 && bush.width > 0.2 && bush.depth > 0.2
        )
      )
    ).toBe(true);

    const first = sampleTiles[0];
    expect(getForestBushes(first.x, first.y)).toEqual(first.bushes);
  });

  it('generates deterministic tree hollows for some forest tiles', () => {
    const sampleTiles: Array<{
      x: number;
      y: number;
      hollows: ReturnType<typeof getForestTreeHollows>;
    }> = [];

    for (let tileY = 0; tileY < 18; tileY += 1) {
      for (let tileX = 0; tileX < 18; tileX += 1) {
        const hollows = getForestTreeHollows(tileX, tileY);
        if (hollows.length > 0) {
          sampleTiles.push({ x: tileX, y: tileY, hollows });
        }
      }
    }

    expect(sampleTiles.length).toBeGreaterThan(0);
    expect(
      sampleTiles.some(({ hollows }) =>
        hollows.every(
          (hollow) => hollow.height > 0.2 && hollow.scale > 0.1 && hollow.depth > 0.07
        )
      )
    ).toBe(true);

    const first = sampleTiles[0];
    expect(getForestTreeHollows(first.x, first.y)).toEqual(first.hollows);
  });

  it('generates deterministic owls for some hollow trees', () => {
    const sampleTiles: Array<{
      x: number;
      y: number;
      owls: ReturnType<typeof getForestOwls>;
    }> = [];

    for (let tileY = 0; tileY < 18; tileY += 1) {
      for (let tileX = 0; tileX < 18; tileX += 1) {
        const owls = getForestOwls(tileX, tileY);
        if (owls.length > 0) {
          sampleTiles.push({ x: tileX, y: tileY, owls });
        }
      }
    }

    expect(sampleTiles.length).toBeGreaterThan(0);
    expect(
      sampleTiles.some(({ owls }) =>
        owls.every(
          (owl) => owl.bodyScale > 0.07 && owl.eyeSpread > 0.02 && owl.perchOffset > 0
        )
      )
    ).toBe(true);

    const first = sampleTiles[0];
    expect(getForestOwls(first.x, first.y)).toEqual(first.owls);
  });

  it('generates deterministic carved initials for some forest trees', () => {
    const sampleTiles: Array<{
      x: number;
      y: number;
      carvings: ReturnType<typeof getForestCarvings>;
    }> = [];

    for (let tileY = 0; tileY < 18; tileY += 1) {
      for (let tileX = 0; tileX < 18; tileX += 1) {
        const carvings = getForestCarvings(tileX, tileY);
        if (carvings.length > 0) {
          sampleTiles.push({ x: tileX, y: tileY, carvings });
        }
      }
    }

    expect(sampleTiles.length).toBeGreaterThan(0);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.every(
          (carving) => carving.text === 'LM+FG' && carving.height > 0.2 && carving.scale > 0.015
        )
      )
    ).toBe(true);

    const first = sampleTiles[0];
    expect(getForestCarvings(first.x, first.y)).toEqual(first.carvings);
  });

  it('generates deterministic flower meadows for some forest tiles', () => {
    const sampleTiles: Array<{
      x: number;
      y: number;
      meadows: ReturnType<typeof getForestMeadows>;
    }> = [];

    for (let tileY = 0; tileY < 24; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const meadows = getForestMeadows(tileX, tileY);
        if (meadows.length > 0) {
          sampleTiles.push({ x: tileX, y: tileY, meadows });
        }
      }
    }

    expect(sampleTiles.length).toBeGreaterThan(0);
    expect(
      sampleTiles.some(({ meadows }) =>
        meadows.every(
          (meadow) =>
            meadow.radiusX > 0.18 &&
            meadow.radiusY > 0.16 &&
            meadow.flowers.length >= 4
        )
      )
    ).toBe(true);

    const first = sampleTiles[0];
    expect(getForestMeadows(first.x, first.y)).toEqual(first.meadows);
  });

  it('generates deterministic pine tree forms for some forest tiles', () => {
    const sampleTiles: Array<{
      x: number;
      y: number;
      forms: ReturnType<typeof getForestTreeForms>;
    }> = [];

    for (let tileY = 0; tileY < 24; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const forms = getForestTreeForms(tileX, tileY);
        if (forms.includes('pine')) {
          sampleTiles.push({ x: tileX, y: tileY, forms });
        }
      }
    }

    expect(sampleTiles.length).toBeGreaterThan(0);
    expect(
      sampleTiles.some(({ forms }) => forms.includes('pine'))
    ).toBe(true);
    expect(
      sampleTiles.some(({ forms }) => forms.includes('broadleaf'))
    ).toBe(true);

    const first = sampleTiles[0];
    expect(getForestTreeForms(first.x, first.y)).toEqual(first.forms);
  });

  it('generates more tree-like branch profiles for broadleaf and pine forms', () => {
    const branchTiles: Array<{
      x: number;
      y: number;
      profiles: ReturnType<typeof getForestTreeBranchProfiles>;
    }> = [];

    for (let tileY = 0; tileY < 24; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const profiles = getForestTreeBranchProfiles(tileX, tileY);
        const hasBroadleaf = profiles.some((profile) => profile.form === 'broadleaf');
        const hasPine = profiles.some((profile) => profile.form === 'pine');
        if (hasBroadleaf && hasPine) {
          branchTiles.push({ x: tileX, y: tileY, profiles });
        }
      }
    }

    expect(branchTiles.length).toBeGreaterThan(0);

    const broadleaf = branchTiles
      .flatMap(({ profiles }) => profiles)
      .find((profile) => profile.form === 'broadleaf' && profile.branches.length >= 3);
    const pine = branchTiles
      .flatMap(({ profiles }) => profiles)
      .find((profile) => profile.form === 'pine' && profile.branches.length >= 3);

    expect(broadleaf).toBeDefined();
    expect(pine).toBeDefined();

    const broadleafBranches = [...broadleaf!.branches].sort((a, b) => a.y - b.y);
    const pineBranches = [...pine!.branches].sort((a, b) => a.y - b.y);

    expect(broadleafBranches[0].length).toBeGreaterThan(broadleafBranches.at(-1)!.length);
    expect(broadleafBranches[0].pitch).toBeLessThan(broadleafBranches.at(-1)!.pitch);
    expect(pineBranches.length).toBeGreaterThanOrEqual(3);
    expect(pineBranches.every((branch) => branch.pitch >= 1)).toBe(true);

    const first = branchTiles[0];
    expect(getForestTreeBranchProfiles(first.x, first.y)).toEqual(first.profiles);
  });

  it('generates deterministic birds for some forest tiles', () => {
    const sampleTiles: Array<{
      x: number;
      y: number;
      birds: ReturnType<typeof getForestBirds>;
    }> = [];

    for (let tileY = 0; tileY < 24; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const birds = getForestBirds(tileX, tileY);
        if (birds.length > 0) {
          sampleTiles.push({ x: tileX, y: tileY, birds });
        }
      }
    }

    expect(sampleTiles.length).toBeGreaterThan(0);
    expect(
      sampleTiles.some(({ birds }) =>
        birds.every(
          (bird) =>
            bird.height > 1 &&
            bird.radius > 0.1 &&
            bird.speed > 0.0007 &&
            bird.wingScale > 0.04
        )
      )
    ).toBe(true);

    const first = sampleTiles[0];
    expect(getForestBirds(first.x, first.y)).toEqual(first.birds);
  });

  it('generates deterministic breadcrumb trails for some forest tiles', () => {
    const sampleTiles: Array<{
      x: number;
      y: number;
      trail: NonNullable<ReturnType<typeof getForestTrail>>;
    }> = [];

    for (let tileY = 0; tileY < 24; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const trail = getForestTrail(tileX, tileY);
        if (trail) {
          sampleTiles.push({ x: tileX, y: tileY, trail });
        }
      }
    }

    expect(sampleTiles.length).toBeGreaterThan(0);
    expect(
      sampleTiles.some(
        ({ trail }) => trail.halfWidth > 0.08 && trail.start.x !== trail.end.x
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ trail }) => trail.breadcrumbs.length > 0)
    ).toBe(true);

    const first = sampleTiles[0];
    expect(getForestTrail(first.x, first.y)).toEqual(first.trail);
  });

  it('creates a lower-detail distant forest model', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'low',
    }) as FakeGroup;

    expect(lowModel.children.length).toBeLessThan(fullModel.children.length);
    expect(
      lowModel.children.every((node) => node.children.length === 0)
    ).toBe(true);
    expect(
      lowModel.children.every((node) => node.userData?.renderStatKind === 'tree')
    ).toBe(true);
  });

  it('renders pine trees distinctly in full and low detail forest models', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        if (getForestTreeForms(tileX, tileY).includes('pine')) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'low',
    }) as FakeGroup;

    const fullPines = fullModel.children.filter(
      (child) => child.userData?.forestTreeForm === 'pine'
    );
    const lowPines = lowModel.children.filter(
      (child) => child.userData?.forestTreeForm === 'pine'
    );

    expect(fullPines.length).toBeGreaterThan(0);
    expect(lowPines.length).toBeGreaterThan(0);
    expect(
      fullPines.some((tree) => tree.children.length > 3)
    ).toBe(true);
    expect(
      lowPines.every((tree) => tree.children.length === 0)
    ).toBe(true);
  });

  it('flattens low-detail tree meshes instead of creating one group per tree', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'low',
    }) as FakeGroup;

    const groupedTrees = lowModel.children.filter((child) => child instanceof FakeGroup);
    const taggedTreeMeshes = lowModel.children.filter(
      (child) => child.userData?.renderStatKind === 'tree'
    );

    expect(groupedTrees.length).toBe(0);
    expect(taggedTreeMeshes.length).toBeGreaterThan(0);
    expect(taggedTreeMeshes.length % 2).toBe(0);
  });

  it('generates an occasional mushroom or stone ring for large forests', () => {
    const landmarks: Array<{
      x: number;
      y: number;
      landmark: NonNullable<ReturnType<typeof getForestLandmark>>;
    }> = [];

    for (let tileY = 0; tileY < 24; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const landmark = getForestLandmark(tileX, tileY);
        if (landmark) {
          landmarks.push({ x: tileX, y: tileY, landmark });
        }
      }
    }

    expect(landmarks.length).toBeGreaterThan(0);
    expect(
      landmarks.some(({ landmark }) => landmark.kind === 'mushroom-ring')
    ).toBe(true);
    expect(
      landmarks.some(({ landmark }) => landmark.kind === 'stone-ring')
    ).toBe(true);

    const first = landmarks[0];
    expect(getForestLandmark(first.x, first.y)).toEqual(first.landmark);
  });

  it('adds stump and fallen tree geometry only to full-detail forest models', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 18 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 18; tileX += 1) {
        if (getForestFloorDetails(tileX, tileY).length > 0) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'low',
    }) as FakeGroup;

    const fullDetailKinds = new Set<string>();
    fullModel.traverse((node) => {
      const kind = node.userData?.forestFloorDetail;
      if (typeof kind === 'string') {
        fullDetailKinds.add(kind);
      }
    });

    const lowDetailKinds = new Set<string>();
    lowModel.traverse((node) => {
      const kind = node.userData?.forestFloorDetail;
      if (typeof kind === 'string') {
        lowDetailKinds.add(kind);
      }
    });

    expect(fullDetailKinds.size).toBeGreaterThan(0);
    expect(lowDetailKinds.size).toBe(0);
  });

  it('renders forest ring landmarks only in full-detail models', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        if (getForestLandmark(tileX, tileY)) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'low',
    }) as FakeGroup;

    const fullLandmarks = new Set<string>();
    fullModel.traverse((node) => {
      const kind = node.userData?.forestLandmark;
      if (typeof kind === 'string') {
        fullLandmarks.add(kind);
      }
    });

    const lowLandmarks = new Set<string>();
    lowModel.traverse((node) => {
      const kind = node.userData?.forestLandmark;
      if (typeof kind === 'string') {
        lowLandmarks.add(kind);
      }
    });

    expect(fullLandmarks.size).toBeGreaterThan(0);
    expect(lowLandmarks.size).toBe(0);
  });

  it('renders bushes only in full-detail forest models', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 18 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 18; tileX += 1) {
        if (getForestBushes(tileX, tileY).length > 0) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'low',
    }) as FakeGroup;

    let fullBushCount = 0;
    fullModel.traverse((node) => {
      if (node.userData?.forestBush) {
        fullBushCount += 1;
      }
    });

    let lowBushCount = 0;
    lowModel.traverse((node) => {
      if (node.userData?.forestBush) {
        lowBushCount += 1;
      }
    });

    expect(fullBushCount).toBeGreaterThan(0);
    expect(lowBushCount).toBe(0);
  });

  it('adds windy foliage to forest tree canopies and sways them with weather strength', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;

    const foliageMeshes: FakeMesh[] = [];
    model.traverse((node) => {
      if (node instanceof FakeMesh && node.userData?.forestTreeFoliage) {
        foliageMeshes.push(node);
      }
    });

    expect(foliageMeshes.length).toBeGreaterThan(0);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      model,
      timeMs: 1000,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {
        weather: {
          current: {
            kind: 'wind',
            label: 'Wind',
            intensity: 0.1,
            windStrength: 0.1,
            precipitation: 0,
            cloudCover: 0.1,
            temperature: 18,
            visibility: 1,
            front: {
              id: 'calm-front',
              kind: 'warm',
              intensity: 0.1,
              humidityShift: 0,
              temperatureShift: 0,
              windDirectionDegrees: 90,
              speed: 0.1,
            },
          },
          forecast: [],
        },
      },
    });
    const baseRotation =
      typeof foliageMeshes[0]?.userData?.poiWindResponder === 'object' &&
      foliageMeshes[0]?.userData?.poiWindResponder &&
      'baseRotation' in foliageMeshes[0].userData.poiWindResponder
        ? Number(foliageMeshes[0].userData.poiWindResponder.baseRotation)
        : 0;
    const calmRotation = foliageMeshes[0]?.rotation.z ?? 0;

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      model,
      timeMs: 1000,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {
        weather: {
          current: {
            kind: 'wind',
            label: 'Wind',
            intensity: 0.95,
            windStrength: 0.95,
            precipitation: 0,
            cloudCover: 0.2,
            temperature: 18,
            visibility: 1,
            front: {
              id: 'windy-front',
              kind: 'cold',
              intensity: 0.95,
              humidityShift: 0.08,
              temperatureShift: -1,
              windDirectionDegrees: 90,
              speed: 0.95,
            },
          },
          forecast: [],
        },
      },
    });
    const windyRotation = foliageMeshes[0]?.rotation.z ?? 0;

    expect(Math.abs(windyRotation - baseRotation)).toBeGreaterThan(
      Math.abs(calmRotation - baseRotation)
    );
  });

  it('renders tree hollows only in full-detail forest models', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 18 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 18; tileX += 1) {
        if (getForestTreeHollows(tileX, tileY).length > 0) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'low',
    }) as FakeGroup;

    let fullHollowCount = 0;
    fullModel.traverse((node) => {
      if (node.userData?.forestHollow) {
        fullHollowCount += 1;
      }
    });

    let lowHollowCount = 0;
    lowModel.traverse((node) => {
      if (node.userData?.forestHollow) {
        lowHollowCount += 1;
      }
    });

    expect(fullHollowCount).toBeGreaterThan(0);
    expect(lowHollowCount).toBe(0);
  });

  it('renders owls only in full-detail forest models', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 18 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 18; tileX += 1) {
        if (getForestOwls(tileX, tileY).length > 0) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'low',
    }) as FakeGroup;

    let fullOwlCount = 0;
    fullModel.traverse((node) => {
      if (node.userData?.forestOwl) {
        fullOwlCount += 1;
      }
    });

    let lowOwlCount = 0;
    lowModel.traverse((node) => {
      if (node.userData?.forestOwl) {
        lowOwlCount += 1;
      }
    });

    expect(fullOwlCount).toBeGreaterThan(0);
    expect(lowOwlCount).toBe(0);
  });

  it('renders carved initials only in full-detail forest models', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 18 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 18; tileX += 1) {
        if (getForestCarvings(tileX, tileY).length > 0) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'low',
    }) as FakeGroup;

    let fullCarvingCount = 0;
    const fullLabels = new Set<string>();
    fullModel.traverse((node) => {
      const carving = node.userData?.forestCarving;
      if (typeof carving === 'string') {
        fullCarvingCount += 1;
        fullLabels.add(carving);
      }
    });

    let lowCarvingCount = 0;
    lowModel.traverse((node) => {
      if (node.userData?.forestCarving) {
        lowCarvingCount += 1;
      }
    });

    expect(fullCarvingCount).toBeGreaterThan(0);
    expect(fullLabels.has('LM+FG')).toBe(true);
    expect(lowCarvingCount).toBe(0);
  });

  it('renders flower meadows only in full-detail forest models', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        if (getForestMeadows(tileX, tileY).length > 0) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'low',
    }) as FakeGroup;

    let fullMeadowCount = 0;
    fullModel.traverse((node) => {
      if (node.userData?.forestMeadow) {
        fullMeadowCount += 1;
      }
    });

    let lowMeadowCount = 0;
    lowModel.traverse((node) => {
      if (node.userData?.forestMeadow) {
        lowMeadowCount += 1;
      }
    });

    expect(fullMeadowCount).toBeGreaterThan(0);
    expect(lowMeadowCount).toBe(0);
  });

  it('renders and animates birds only in full-detail forest models', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        if (getForestBirds(tileX, tileY).length > 0) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'low',
    }) as FakeGroup;

    const fullBirds: FakeNode[] = [];
    fullModel.traverse((node) => {
      if (node.userData?.forestBird) {
        fullBirds.push(node);
      }
    });

    let lowBirdCount = 0;
    lowModel.traverse((node) => {
      if (node.userData?.forestBird) {
        lowBirdCount += 1;
      }
    });

    expect(fullBirds.length).toBeGreaterThan(0);
    expect(lowBirdCount).toBe(0);

    const firstBird = fullBirds[0];
    const initialX = firstBird.position.x;
    const initialY = firstBird.position.y;
    const initialLeftWing = firstBird.children[0]?.rotation.z;

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      model: fullModel,
      timeMs: 1400,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {},
    });

    expect(firstBird.position.x).not.toBe(initialX);
    expect(firstBird.position.y).not.toBe(initialY);
    expect(firstBird.children[0]?.rotation.z).not.toBe(initialLeftWing);
  });

  it('renders breadcrumb trails only in full-detail forest models', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const trail = getForestTrail(tileX, tileY);
        if (trail && trail.breadcrumbs.length > 0) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'low',
    }) as FakeGroup;

    let fullTrailCount = 0;
    fullModel.traverse((node) => {
      if (node.userData?.forestTrail === 'breadcrumb') {
        fullTrailCount += 1;
      }
    });

    let lowTrailCount = 0;
    lowModel.traverse((node) => {
      if (node.userData?.forestTrail === 'breadcrumb') {
        lowTrailCount += 1;
      }
    });

    expect(fullTrailCount).toBe(
      getForestTrail(targetTile!.x, targetTile!.y)?.breadcrumbs.length
    );
    expect(fullTrailCount).toBeGreaterThan(0);
    expect(lowTrailCount).toBe(0);
  });

  it('shows fireflies only after dark', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;

    const fireflyPoints: FakePoints[] = [];
    model.traverse((node) => {
      if (node instanceof FakePoints && node.userData?.forestFirefly) {
        fireflyPoints.push(node);
      }
    });

    expect(fireflyPoints).toHaveLength(1);
    expect(
      (fireflyPoints[0]?.geometry?.attributes.position as FakeFloat32BufferAttribute | undefined)
        ?.array.length
    ).toBeGreaterThan(0);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      model,
      timeMs: 0,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {},
    });

    expect(fireflyPoints.every((points) => points.visible === false)).toBe(true);
    expect(
      fireflyPoints.every(
        (points) => ((points.material as FakeMaterial)?.opacity ?? 0) <= 0.01
      )
    ).toBe(true);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      model,
      timeMs: 1200,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    expect(fireflyPoints.some((points) => points.visible === true)).toBe(true);
    expect(
      fireflyPoints.some(
        (points) => ((points.material as FakeMaterial)?.opacity ?? 0) > 0.1
      )
    ).toBe(true);
    expect(
      (
        fireflyPoints[0]?.geometry?.attributes.position as
          | FakeFloat32BufferAttribute
          | undefined
      )?.needsUpdate
    ).toBe(true);
  });

  it('caches deterministic firefly descriptors and keeps their count capped', () => {
    const first = getForestFireflyDescriptors(8, 6);
    const second = getForestFireflyDescriptors(8, 6);

    expect(second).toBe(first);
    expect(first.length).toBeLessThanOrEqual(3);
    expect(
      first.every(
        (descriptor) =>
          descriptor.baseX >= -0.28 &&
          descriptor.baseX <= 0.28 &&
          descriptor.baseZ >= -0.28 &&
          descriptor.baseZ <= 0.28
      )
    ).toBe(true);
  });
});
