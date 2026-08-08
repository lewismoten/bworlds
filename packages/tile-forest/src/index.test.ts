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
  getForestCarvings,
  getForestFloorDetails,
  getForestLandmark,
  getForestMeadows,
  getForestOwls,
  getForestTreeHollows,
} from './index.ts';

class FakeGeometry {
  constructor(..._args: number[]) {}
}

class FakeMaterial {
  emissiveIntensity?: number;
  constructor(public options: Record<string, unknown> = {}) {
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

const fakeThree = {
  Group: FakeGroup,
  Mesh: FakeMesh,
  PointLight: FakePointLight,
  MeshStandardMaterial: FakeMaterial,
  CanvasTexture: class {
    colorSpace = '';
    needsUpdate = false;
  },
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
      lowModel.children.every((tree) => tree.children.length <= 2)
    ).toBe(true);
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

    const fireflyLights: FakePointLight[] = [];
    const fireflyGlows: FakeMesh[] = [];
    model.traverse((node) => {
      if (node instanceof FakePointLight && node.userData?.forestFireflyLight) {
        fireflyLights.push(node);
      }
      if (node instanceof FakeMesh && node.userData?.poiNightLightEmitter) {
        fireflyGlows.push(node);
      }
    });

    expect(fireflyLights.length).toBeGreaterThan(0);
    expect(fireflyGlows.length).toBeGreaterThan(0);

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

    expect(fireflyLights.every((light) => light.intensity <= 0.01)).toBe(true);
    expect(fireflyLights.every((light) => light.visible === false)).toBe(true);
    expect(
      fireflyGlows.every(
        (mesh) => ((mesh.material as FakeMaterial)?.emissiveIntensity ?? 0) <= 0.01
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

    expect(fireflyLights.some((light) => light.intensity > 0.05)).toBe(true);
    expect(fireflyLights.some((light) => light.visible === true)).toBe(true);
    expect(
      fireflyGlows.some(
        (mesh) => ((mesh.material as FakeMaterial)?.emissiveIntensity ?? 0) > 0.1
      )
    ).toBe(true);
  });
});
