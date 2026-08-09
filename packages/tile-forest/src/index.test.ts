import { describe, expect, it, vi } from 'vitest';

vi.mock('@bworlds/three-support', () => ({
  createPaintedCanvasTexture() {
    return { colorSpace: '', needsUpdate: false };
  },
}));

import {
  getForestBeaverDamage,
  getForestBeaverPopulation,
  createForestTilePlugin,
  getForestBirds,
  getForestBushes,
  getForestFireflyDescriptors,
  getForestTreeFamilies,
  getForestTreeCanopyProfiles,
  getForestTreeDecorations,
  getForestTreeGenerator,
  getForestTreeInhabitants,
  getForestTreeAgeProfiles,
  getForestTreeBranchProfiles,
  getForestTreeDamageProfiles,
  getForestTreeFruitProfiles,
  getForestTreeHistoricalProfiles,
  getForestTreeTrunkProfiles,
  getForestCarvings,
  getForestFloorDetails,
  getForestLandmark,
  getForestMeadows,
  getForestOwls,
  getForestSpiders,
  getForestTrail,
  getForestTreeForms,
  getForestTreeHollows,
  getForestTreeSpeciesIds,
  getForestWebs,
} from './index.ts';

class FakeGeometry {
  attributes: Record<string, unknown> = {};
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
  setAttribute(name: string, attribute: unknown) {
    this.attributes[name] = attribute;
    return this;
  }
}

class FakeMaterial {
  opacity?: number;
  emissiveIntensity?: number;
  uniforms?: Record<string, { value: unknown }>;
  constructor(public options: Record<string, unknown> = {}) {
    if (typeof options.opacity === 'number') {
      this.opacity = options.opacity;
    }
    if (typeof options.emissiveIntensity === 'number') {
      this.emissiveIntensity = options.emissiveIntensity;
    }
    if (options.uniforms && typeof options.uniforms === 'object') {
      this.uniforms = options.uniforms as Record<string, { value: unknown }>;
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
class FakeMatrix4 {
  scale = { x: 1, y: 1, z: 1 };
  position = { x: 0, y: 0, z: 0 };
  makeScale(x: number, y: number, z: number) {
    this.scale = { x, y, z };
    return this;
  }
  setPosition(x: number, y: number, z: number) {
    this.position = { x, y, z };
    return this;
  }
}
class FakeFloat32BufferAttribute {
  array: number[];
  needsUpdate = false;
  constructor(values: ArrayLike<number> | number[], public itemSize: number) {
    this.array = Array.from(values);
  }
}
class FakeInstancedMesh extends FakeNode {
  matrices: FakeMatrix4[] = [];
  constructor(
    public geometry?: object,
    public material?: FakeMaterial | FakeMaterial[],
    public count = 0
  ) {
    super();
  }
  setMatrixAt(index: number, matrix: FakeMatrix4) {
    this.matrices[index] = matrix;
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
  InstancedMesh: FakeInstancedMesh,
  Matrix4: FakeMatrix4,
  Mesh: FakeMesh,
  Points: FakePoints,
  PointLight: FakePointLight,
  MeshStandardMaterial: FakeMaterial,
  PointsMaterial: FakeMaterial,
  ShaderMaterial: FakeMaterial,
  CanvasTexture: class {
    colorSpace = '';
    needsUpdate = false;
  },
  Float32BufferAttribute: FakeFloat32BufferAttribute,
  CylinderGeometry: FakeGeometry,
  SphereGeometry: FakeGeometry,
  AdditiveBlending: 'additive',
} as const;

function createForestTestState(
  playerX = 0,
  playerY = 0,
  tiles: Record<string, { kind: string }> = {}
) {
  return {
    player: { x: playerX, y: playerY, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile(x = playerX, y = playerY) {
      return tiles[`${x}:${y}`] ?? { kind: 'forest' };
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
}

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

  it('generates deterministic forest carvings across romantic, symbolic, clue, and historical motifs', () => {
    const sampleTiles: Array<{
      x: number;
      y: number;
      carvings: ReturnType<typeof getForestCarvings>;
    }> = [];

    for (let tileY = 0; tileY < 32; tileY += 1) {
      for (let tileX = 0; tileX < 32; tileX += 1) {
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
          (carving) =>
            carving.motif === 'initials' &&
            carving.text === 'LM+FG' &&
            carving.height > 0.2 &&
            carving.scale > 0.015
        )
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.some(
          (carving) => carving.motif === 'heart' && carving.text === 'LM*FG'
        )
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.some(
          (carving) =>
            carving.motif === 'date' &&
            /^(18\d{2}|19\d{2})$/.test(carving.text)
        )
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.some(
          (carving) => carving.motif === 'traveler-mark' && carving.text === 'X'
        )
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.some(
          (carving) =>
            carving.motif === 'arrow' &&
            (carving.text === '>' || carving.text === '<')
        )
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.some(
          (carving) => carving.motif === 'symbol' && carving.text === 'O'
        )
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.some(
          (carving) => carving.motif === 'religious' && carving.text === '+'
        )
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.some(
          (carving) => carving.motif === 'guild' && carving.text === 'G+'
        )
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.some(
          (carving) => carving.motif === 'warning' && carving.text === '!'
        )
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.some(
          (carving) =>
            carving.motif === 'quest-hint' &&
            ['N2', 'E3', 'S4', 'W1'].includes(carving.text)
        )
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.some(
          (carving) =>
            carving.motif === 'treasure-map-clue' &&
            ['X2', 'X4', '>3', '<5'].includes(carving.text)
        )
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.some(
          (carving) =>
            carving.motif === 'historical-inscription' &&
            ['OLD', 'MOSS', '1891'].includes(carving.text)
        )
      )
    ).toBe(true);
    expect(
      sampleTiles.every(({ carvings }) =>
        carvings.every(
          (carving) =>
            carving.age >= 0 &&
            carving.age <= 1 &&
            carving.barkCoverage >= 0 &&
            carving.barkCoverage <= 1
        )
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.some((carving) => carving.age >= 0.8)
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.some((carving) => carving.barkCoverage >= 0.45)
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.some(
          (carving) =>
            carving.motif === 'quest-hint' &&
            carving.preserved &&
            carving.barkCoverage <= 0.38
        )
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ carvings }) =>
        carvings.some(
          (carving) =>
            carving.motif === 'treasure-map-clue' &&
            carving.preserved &&
            carving.barkCoverage <= 0.38
        )
      )
    ).toBe(true);

    const first = sampleTiles[0];
    expect(getForestCarvings(first.x, first.y)).toEqual(first.carvings);
  });

  it('offers deterministic inspect actions for forest carvings', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 32 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 32; tileX += 1) {
        if (getForestCarvings(tileX, tileY).length > 0) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();
    const action = tile?.createWorldAction?.({
      seed: 'spec',
      x: targetTile!.x,
      y: targetTile!.y,
      tile: { kind: 'forest' },
      state: createForestTestState(targetTile!.x, targetTile!.y),
    });

    expect(action).toEqual(
      expect.objectContaining({
        type: 'inspect',
        label: 'tree carvings',
        note: expect.any(String),
      })
    );
    if (!action || typeof action !== 'object' || !('note' in action)) {
      throw new Error('expected a forest carving inspect action');
    }
    expect(action.note).toMatch(/carv|mark|initials|date|arrow|heart/i);

    let preservedTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 32 && !preservedTile; tileY += 1) {
      for (let tileX = 0; tileX < 32; tileX += 1) {
        if (
          getForestCarvings(tileX, tileY).some(
            (carving) => carving.preserved && carving.motif === 'quest-hint'
          )
        ) {
          preservedTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(preservedTile).not.toBeNull();
    const preservedAction = tile?.createWorldAction?.({
      seed: 'spec',
      x: preservedTile!.x,
      y: preservedTile!.y,
      tile: { kind: 'forest' },
      state: createForestTestState(preservedTile!.x, preservedTile!.y),
    });
    if (
      !preservedAction ||
      typeof preservedAction !== 'object' ||
      !('note' in preservedAction)
    ) {
      throw new Error('expected a preserved forest carving inspect action');
    }
    expect(preservedAction.note).toMatch(/trail sign|hidden route/i);
    expect(
      tile?.createWorldAction?.({
        seed: 'spec',
        x: targetTile!.x,
        y: targetTile!.y,
        tile: { kind: 'forest' },
        state: createForestTestState(targetTile!.x, targetTile!.y),
      })
    ).toEqual(action);
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

  it('exposes shared tree generator capabilities without generating tree descriptors', () => {
    const generator = getForestTreeGenerator();

    expect(generator.supports('branches')).toBe(true);
    expect(generator.supports('foliage')).toBe(true);
    expect(generator.supports('branches', { consumer: 'gameplay' })).toBe(false);
    expect(generator.supports('foliage', { consumer: 'gameplay' })).toBe(false);
    expect(generator.supports('hollows', { detailLevel: 'full' })).toBe(true);
    expect(generator.supports('hollows', { detailLevel: 'low' })).toBe(false);
    expect(generator.supports('hollows', { consumer: 'render-2d' })).toBe(false);
    expect(generator.supports('carvings', { consumer: 'render-2d' })).toBe(false);
    expect(generator.supports('carvings', { consumer: 'gameplay' })).toBe(true);
    expect(generator.getCapability('lod')).toEqual({ levels: 2 });
    expect(generator.getCapability('wind')).toEqual({
      trunk: false,
      branches: true,
      leaves: true,
    });
    expect(generator.supports('fruit')).toBe(true);
    expect(generator.getCapabilityOrFallback('attachments', { consumer: 'gameplay' })).toBe(
      false
    );
    expect(generator.getCapabilityOrFallback('wind', { consumer: 'gameplay' })).toEqual({
      trunk: false,
      branches: true,
      leaves: true,
    });
  });

  it('organizes forest trees into families and inheriting species', () => {
    const families = getForestTreeFamilies();

    expect(families.map((family) => family.familyId)).toEqual([
      'broadleaf',
      'conifer',
    ]);
    expect(families[0].listSpecies().map((species) => species.speciesId)).toEqual([
      'oak',
      'birch',
    ]);
    expect(families[1].listSpecies().map((species) => species.speciesId)).toEqual([
      'pine',
    ]);

    const oak = families[0].getSpecies('oak');
    const birch = families[0].getSpecies('birch');
    const pine = families[1].getSpecies('pine');

    expect(oak?.supports('seasonalLeaves')).toBe(true);
    expect(oak?.supports('flowers')).toBe(false);
    expect(oak?.supports('hollows')).toBe(true);
    expect(oak?.supports('fruit')).toBe(true);
    expect(birch?.supports('flowers', { season: 'spring' })).toBe(true);
    expect(birch?.supports('flowers', { season: 'autumn' })).toBe(false);
    expect(birch?.supports('fruit', { season: 'summer' })).toBe(true);
    expect(birch?.supports('hollows')).toBe(false);
    expect(pine?.supports('seasonalLeaves')).toBe(false);
    expect(pine?.supports('flowers')).toBe(false);
    expect(pine?.supports('fruit')).toBe(true);
  });

  it('lets forest family capabilities differ by seasonal tree state', () => {
    const broadleafFamily = getForestTreeFamilies().find(
      (family) => family.familyId === 'broadleaf'
    );
    const coniferFamily = getForestTreeFamilies().find(
      (family) => family.familyId === 'conifer'
    );

    expect(broadleafFamily).toBeDefined();
    expect(coniferFamily).toBeDefined();
    expect(broadleafFamily?.supports('foliage', { season: 'summer' })).toBe(true);
    expect(broadleafFamily?.supports('foliage', { season: 'winter' })).toBe(false);
    expect(coniferFamily?.supports('foliage', { season: 'winter' })).toBe(true);
    expect(
      broadleafFamily?.supports('foliage', { yearProgress: 0.95 })
    ).toBe(false);
  });

  it('keeps forest species selection deterministic across tiles', () => {
    const speciesByTile: Array<{
      x: number;
      y: number;
      species: ReturnType<typeof getForestTreeSpeciesIds>;
    }> = [];

    for (let tileY = 0; tileY < 24; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const species = getForestTreeSpeciesIds(tileX, tileY);
        if (species.length > 0) {
          speciesByTile.push({ x: tileX, y: tileY, species });
        }
      }
    }

    expect(speciesByTile.length).toBeGreaterThan(0);
    expect(
      speciesByTile.some(({ species }) => species.includes('oak'))
    ).toBe(true);
    expect(
      speciesByTile.some(({ species }) => species.includes('birch'))
    ).toBe(true);
    expect(
      speciesByTile.some(({ species }) => species.includes('pine'))
    ).toBe(true);

    const first = speciesByTile[0];
    expect(getForestTreeSpeciesIds(first.x, first.y)).toEqual(first.species);
  });

  it('separates deterministic tree placement from species-specific appearance', () => {
    const broadleafFamily = getForestTreeFamilies().find(
      (family) => family.familyId === 'broadleaf'
    );

    expect(broadleafFamily).toBeDefined();

    const oak = broadleafFamily!.generateSpecies('oak', {
      tileX: 12,
      tileY: 8,
      treeIndex: 1,
      loneTree: false,
      groveCenter: { x: 0.04, y: -0.03 },
      variety: 0,
      form: 'broadleaf',
    });
    const birch = broadleafFamily!.generateSpecies('birch', {
      tileX: 12,
      tileY: 8,
      treeIndex: 1,
      loneTree: false,
      groveCenter: { x: 0.04, y: -0.03 },
      variety: 1,
      form: 'broadleaf',
    });

    expect(oak.x).toBe(birch.x);
    expect(oak.y).toBe(birch.y);
    expect(oak.structure?.branches).toEqual(oak.branches);
    expect(oak.canopy?.foliage).toEqual(oak.foliage);
    expect(oak.collision?.radius).toBeLessThan(oak.radius);
    expect(oak.collision?.height).toBe(oak.trunkHeight);
    expect(oak.speciesId).toBe('oak');
    expect(birch.speciesId).toBe('birch');
    expect(oak.trunkHeight).not.toBe(birch.trunkHeight);
    expect(oak.branches).not.toEqual(birch.branches);
    expect(oak.foliage).not.toEqual(birch.foliage);
  });

  it('separates forest structural profiles from canopy profiles', () => {
    const branchTiles: Array<{
      x: number;
      y: number;
      branches: ReturnType<typeof getForestTreeBranchProfiles>;
      canopies: ReturnType<typeof getForestTreeCanopyProfiles>;
    }> = [];

    for (let tileY = 0; tileY < 24; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const branches = getForestTreeBranchProfiles(tileX, tileY);
        const canopies = getForestTreeCanopyProfiles(tileX, tileY);
        if (branches.length > 0 && branches.length === canopies.length) {
          branchTiles.push({ x: tileX, y: tileY, branches, canopies });
        }
      }
    }

    expect(branchTiles.length).toBeGreaterThan(0);

    const first = branchTiles[0]!;
    expect(first.branches.map((entry) => entry.form)).toEqual(
      first.canopies.map((entry) => entry.form)
    );
    expect(
      first.branches.some((entry) => entry.branches.length > 0)
    ).toBe(true);
    expect(
      first.canopies.some((entry) => entry.foliage.length > 0)
    ).toBe(true);
    expect(getForestTreeBranchProfiles(first.x, first.y)).toEqual(first.branches);
    expect(getForestTreeCanopyProfiles(first.x, first.y)).toEqual(first.canopies);
  });

  it('generates variable trunk heights for forest trees', () => {
    const trunkTiles: Array<{
      x: number;
      y: number;
      trunks: ReturnType<typeof getForestTreeTrunkProfiles>;
    }> = [];

    for (let tileY = 0; tileY < 32; tileY += 1) {
      for (let tileX = 0; tileX < 32; tileX += 1) {
        const trunks = getForestTreeTrunkProfiles(tileX, tileY);
        if (trunks.length > 0) {
          trunkTiles.push({ x: tileX, y: tileY, trunks });
        }
      }
    }

    expect(trunkTiles.length).toBeGreaterThan(0);

    const allTrunks = trunkTiles.flatMap(({ trunks }) => trunks);
    const broadleafTrunks = allTrunks.filter((trunk) => trunk.form === 'broadleaf');
    const pineTrunks = allTrunks.filter((trunk) => trunk.form === 'pine');

    expect(broadleafTrunks.length).toBeGreaterThan(0);
    expect(pineTrunks.length).toBeGreaterThan(0);

    const broadleafHeights = new Set(
      broadleafTrunks.map((trunk) => trunk.trunkHeight.toFixed(3))
    );
    const pineHeights = new Set(pineTrunks.map((trunk) => trunk.trunkHeight.toFixed(3)));
    const broadleafRadii = new Set(broadleafTrunks.map((trunk) => trunk.radius.toFixed(3)));
    const pineRadii = new Set(pineTrunks.map((trunk) => trunk.radius.toFixed(3)));
    const broadleafTaperRatios = new Set(
      broadleafTrunks.map((trunk) => (trunk.trunkTopRadius / trunk.radius).toFixed(3))
    );
    const pineTaperRatios = new Set(
      pineTrunks.map((trunk) => (trunk.trunkTopRadius / trunk.radius).toFixed(3))
    );
    const broadleafCurves = new Set(
      broadleafTrunks.map(
        (trunk) =>
          `${trunk.trunkCurveX.toFixed(3)}:${trunk.trunkCurveZ.toFixed(3)}`
      )
    );
    const pineCurves = new Set(
      pineTrunks.map(
        (trunk) => `${trunk.trunkCurveX.toFixed(3)}:${trunk.trunkCurveZ.toFixed(3)}`
      )
    );
    const broadleafLeans = new Set(
      broadleafTrunks.map(
        (trunk) => `${trunk.trunkLeanX.toFixed(3)}:${trunk.trunkLeanZ.toFixed(3)}`
      )
    );
    const pineLeans = new Set(
      pineTrunks.map(
        (trunk) => `${trunk.trunkLeanX.toFixed(3)}:${trunk.trunkLeanZ.toFixed(3)}`
      )
    );

    expect(broadleafHeights.size).toBeGreaterThan(1);
    expect(pineHeights.size).toBeGreaterThan(1);
    expect(broadleafRadii.size).toBeGreaterThan(1);
    expect(pineRadii.size).toBeGreaterThan(1);
    expect(broadleafTaperRatios.size).toBeGreaterThan(1);
    expect(pineTaperRatios.size).toBeGreaterThan(1);
    expect(broadleafCurves.size).toBeGreaterThan(1);
    expect(pineCurves.size).toBeGreaterThan(1);
    expect(broadleafLeans.size).toBeGreaterThan(1);
    expect(pineLeans.size).toBeGreaterThan(1);
    expect(broadleafTrunks.every((trunk) => trunk.trunkTopRadius < trunk.radius)).toBe(true);
    expect(pineTrunks.every((trunk) => trunk.trunkTopRadius < trunk.radius)).toBe(true);
    expect(
      broadleafTrunks.some(
        (trunk) => Math.abs(trunk.trunkCurveX) + Math.abs(trunk.trunkCurveZ) > 0.015
      )
    ).toBe(true);
    expect(
      pineTrunks.some(
        (trunk) => Math.abs(trunk.trunkCurveX) + Math.abs(trunk.trunkCurveZ) > 0.01
      )
    ).toBe(true);
    expect(
      broadleafTrunks.some(
        (trunk) => Math.abs(trunk.trunkLeanX) + Math.abs(trunk.trunkLeanZ) > 0.01
      )
    ).toBe(true);
    expect(
      pineTrunks.some(
        (trunk) => Math.abs(trunk.trunkLeanX) + Math.abs(trunk.trunkLeanZ) > 0.012
      )
    ).toBe(true);
    expect(
      broadleafTrunks.some((trunk) => trunk.speciesId === 'oak' && trunk.radius > 0.1)
    ).toBe(true);
    expect(
      broadleafTrunks.some((trunk) => trunk.speciesId === 'birch' && trunk.radius < 0.09)
    ).toBe(true);
    expect(
      pineTrunks.some((trunk) => trunk.trunkTopRadius / trunk.radius < 0.5)
    ).toBe(true);
    expect(
      broadleafTrunks.some((trunk) => trunk.trunkTopRadius / trunk.radius > 0.6)
    ).toBe(true);

    const first = trunkTiles[0]!;
    expect(getForestTreeTrunkProfiles(first.x, first.y)).toEqual(first.trunks);
  });

  it('separates forest decorations and inhabitants from the core tree scene', () => {
    const sampleTiles: Array<{
      x: number;
      y: number;
      decorations: ReturnType<typeof getForestTreeDecorations>;
      inhabitants: ReturnType<typeof getForestTreeInhabitants>;
    }> = [];

    for (let tileY = 0; tileY < 32; tileY += 1) {
      for (let tileX = 0; tileX < 32; tileX += 1) {
        const decorations = getForestTreeDecorations(tileX, tileY);
        const inhabitants = getForestTreeInhabitants(tileX, tileY);
        if (decorations.length > 0 || inhabitants.length > 0) {
          sampleTiles.push({ x: tileX, y: tileY, decorations, inhabitants });
        }
      }
    }

    expect(sampleTiles.length).toBeGreaterThan(0);
    expect(
      sampleTiles.some(({ decorations }) =>
        decorations.some((decoration) => decoration.kind === 'hollow')
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ decorations }) =>
        decorations.some((decoration) => decoration.kind === 'carving')
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ inhabitants }) =>
        inhabitants.some((inhabitant) => inhabitant.kind === 'bird')
      )
    ).toBe(true);

    const first = sampleTiles[0]!;
    expect(getForestTreeDecorations(first.x, first.y)).toEqual(first.decorations);
    expect(getForestTreeInhabitants(first.x, first.y)).toEqual(first.inhabitants);
  });

  it('generates deterministic age profiles that influence forest tree stages', () => {
    const ageTiles: Array<{
      x: number;
      y: number;
      ages: ReturnType<typeof getForestTreeAgeProfiles>;
    }> = [];

    for (let tileY = 0; tileY < 48; tileY += 1) {
      for (let tileX = 0; tileX < 48; tileX += 1) {
        const ages = getForestTreeAgeProfiles(tileX, tileY);
        if (ages.length > 0) {
          ageTiles.push({ x: tileX, y: tileY, ages });
        }
      }
    }

    expect(ageTiles.length).toBeGreaterThan(0);
    expect(
      ageTiles.some(({ ages }) => ages.some((entry) => entry.lifeStage === 'sapling'))
    ).toBe(true);
    expect(
      ageTiles.some(({ ages }) => ages.some((entry) => entry.lifeStage === 'mature'))
    ).toBe(true);
    expect(
      ageTiles.some(({ ages }) => ages.some((entry) => entry.lifeStage === 'ancient'))
    ).toBe(true);
    expect(
      ageTiles.every(({ ages }) => ages.every((entry) => entry.ageYears >= 0))
    ).toBe(true);

    const first = ageTiles[0]!;
    expect(getForestTreeAgeProfiles(first.x, first.y)).toEqual(first.ages);
  });

  it('uses tree age to simplify younger trees and enlarge older ones', () => {
    const samples: Array<{
      age: ReturnType<typeof getForestTreeAgeProfiles>[number];
      branches: ReturnType<typeof getForestTreeBranchProfiles>[number];
      canopy: ReturnType<typeof getForestTreeCanopyProfiles>[number];
    }> = [];

    for (let tileY = 0; tileY < 64; tileY += 1) {
      for (let tileX = 0; tileX < 64; tileX += 1) {
        const ages = getForestTreeAgeProfiles(tileX, tileY);
        const branches = getForestTreeBranchProfiles(tileX, tileY);
        const canopies = getForestTreeCanopyProfiles(tileX, tileY);
        for (let index = 0; index < ages.length; index += 1) {
          const age = ages[index];
          const branch = branches[index];
          const canopy = canopies[index];
          if (age && branch && canopy) {
            samples.push({ age, branches: branch, canopy });
          }
        }
      }
    }

    const sapling = samples.find((sample) => sample.age.lifeStage === 'sapling');
    const ancient = samples.find((sample) => sample.age.lifeStage === 'ancient');

    expect(sapling).toBeDefined();
    expect(ancient).toBeDefined();
    expect(sapling!.branches.branches.length).toBeLessThanOrEqual(
      ancient!.branches.branches.length
    );
    expect(sapling!.canopy.foliage.length).toBeLessThanOrEqual(
      ancient!.canopy.foliage.length
    );
  });

  it('makes hollows more likely in older forest trees than in saplings', () => {
    const ageByTile = new Map<string, ReturnType<typeof getForestTreeAgeProfiles>>();
    const hollowsByTile = new Map<string, ReturnType<typeof getForestTreeHollows>>();

    for (let tileY = 0; tileY < 64; tileY += 1) {
      for (let tileX = 0; tileX < 64; tileX += 1) {
        const key = `${tileX}:${tileY}`;
        ageByTile.set(key, getForestTreeAgeProfiles(tileX, tileY));
        hollowsByTile.set(key, getForestTreeHollows(tileX, tileY));
      }
    }

    const saplingTiles = [...ageByTile.entries()].filter(([, ages]) =>
      ages.some((entry) => entry.lifeStage === 'sapling')
    );
    const ancientTiles = [...ageByTile.entries()].filter(([, ages]) =>
      ages.some((entry) => entry.lifeStage === 'ancient')
    );

    expect(saplingTiles.length).toBeGreaterThan(0);
    expect(ancientTiles.length).toBeGreaterThan(0);

    const saplingHollows = saplingTiles.reduce(
      (sum, [key]) => sum + (hollowsByTile.get(key)?.length ?? 0),
      0
    );
    const ancientHollows = ancientTiles.reduce(
      (sum, [key]) => sum + (hollowsByTile.get(key)?.length ?? 0),
      0
    );

    expect(ancientHollows).toBeGreaterThan(saplingHollows);
  });

  it('makes ancient forest trees more irregular than mature ones', () => {
    const samples: Array<{
      age: ReturnType<typeof getForestTreeAgeProfiles>[number];
      branches: ReturnType<typeof getForestTreeBranchProfiles>[number];
      canopy: ReturnType<typeof getForestTreeCanopyProfiles>[number];
    }> = [];

    for (let tileY = 0; tileY < 64; tileY += 1) {
      for (let tileX = 0; tileX < 64; tileX += 1) {
        const ages = getForestTreeAgeProfiles(tileX, tileY);
        const branches = getForestTreeBranchProfiles(tileX, tileY);
        const canopies = getForestTreeCanopyProfiles(tileX, tileY);
        for (let index = 0; index < ages.length; index += 1) {
          const age = ages[index];
          const branch = branches[index];
          const canopy = canopies[index];
          if (age && branch && canopy) {
            samples.push({ age, branches: branch, canopy });
          }
        }
      }
    }

    const scoreIrregularity = (sample: (typeof samples)[number]) => {
      const branchOffset = sample.branches.branches.reduce(
        (sum, branch) => sum + Math.abs(branch.x) + Math.abs(branch.z),
        0
      );
      const branchPitchVariation = sample.branches.branches.reduce(
        (sum, branch) => sum + Math.abs(branch.pitch - 0.9),
        0
      );
      const foliageOffset = sample.canopy.foliage.reduce(
        (sum, foliage) => sum + Math.abs(foliage.x) + Math.abs(foliage.z),
        0
      );
      return (
        branchOffset / Math.max(1, sample.branches.branches.length) +
        branchPitchVariation / Math.max(1, sample.branches.branches.length) +
        foliageOffset / Math.max(1, sample.canopy.foliage.length)
      );
    };

    const matureScores = samples
      .filter((sample) => sample.age.lifeStage === 'mature')
      .map(scoreIrregularity);
    const ancientScores = samples
      .filter((sample) => sample.age.lifeStage === 'ancient')
      .map(scoreIrregularity);

    expect(matureScores.length).toBeGreaterThan(0);
    expect(ancientScores.length).toBeGreaterThan(0);

    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;

    expect(average(ancientScores)).toBeGreaterThan(average(matureScores));
  });

  it('gives older forest trees more dead branches', () => {
    const samples: Array<{
      age: ReturnType<typeof getForestTreeAgeProfiles>[number];
      branches: ReturnType<typeof getForestTreeBranchProfiles>[number];
    }> = [];

    for (let tileY = 0; tileY < 64; tileY += 1) {
      for (let tileX = 0; tileX < 64; tileX += 1) {
        const ages = getForestTreeAgeProfiles(tileX, tileY);
        const branches = getForestTreeBranchProfiles(tileX, tileY);
        for (let index = 0; index < ages.length; index += 1) {
          const age = ages[index];
          const branch = branches[index];
          if (age && branch) {
            samples.push({ age, branches: branch });
          }
        }
      }
    }

    const countDeadBranches = (sample: (typeof samples)[number]) =>
      sample.branches.branches.filter((branch) => branch.dead).length;
    const matureCounts = samples
      .filter((sample) => sample.age.lifeStage === 'mature')
      .map(countDeadBranches);
    const ancientCounts = samples
      .filter((sample) => sample.age.lifeStage === 'ancient')
      .map(countDeadBranches);

    expect(matureCounts.length).toBeGreaterThan(0);
    expect(ancientCounts.length).toBeGreaterThan(0);

    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;

    expect(average(ancientCounts)).toBeGreaterThan(average(matureCounts));
  });

  it('increases bark damage with age in forest trees', () => {
    const matureScores: number[] = [];
    const ancientScores: number[] = [];

    for (
      let tileY = 0;
      tileY < 64 && (matureScores.length < 24 || ancientScores.length < 24);
      tileY += 1
    ) {
      for (
        let tileX = 0;
        tileX < 64 && (matureScores.length < 24 || ancientScores.length < 24);
        tileX += 1
      ) {
        const ages = getForestTreeAgeProfiles(tileX, tileY);
        const damages = getForestTreeDamageProfiles(tileX, tileY);
        for (let index = 0; index < ages.length; index += 1) {
          const age = ages[index];
          const damage = damages[index];
          if (age && damage) {
            const score = damage.barkMarks.reduce(
              (sum, mark) => sum + mark.severity + mark.scale,
              0
            );
            if (age.lifeStage === 'mature' && matureScores.length < 24) {
              matureScores.push(score);
            }
            if (age.lifeStage === 'ancient' && ancientScores.length < 24) {
              ancientScores.push(score);
            }
          }
        }
      }
    }

    expect(matureScores.length).toBeGreaterThan(0);
    expect(ancientScores.length).toBeGreaterThan(0);

    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;

    expect(average(ancientScores)).toBeGreaterThan(average(matureScores));
    expect(ancientScores.some((score) => score > 0)).toBe(true);
  });

  it('increases branch loss with age in forest trees', () => {
    const matureScores: number[] = [];
    const ancientScores: number[] = [];

    for (
      let tileY = 0;
      tileY < 64 && (matureScores.length < 24 || ancientScores.length < 24);
      tileY += 1
    ) {
      for (
        let tileX = 0;
        tileX < 64 && (matureScores.length < 24 || ancientScores.length < 24);
        tileX += 1
      ) {
        const ages = getForestTreeAgeProfiles(tileX, tileY);
        const branches = getForestTreeBranchProfiles(tileX, tileY);
        for (let index = 0; index < ages.length; index += 1) {
          const age = ages[index];
          const branch = branches[index];
          if (age && branch) {
            const score = branch.branches.reduce(
              (sum, entry) => sum + (entry.loss ?? 0),
              0
            );
            if (age.lifeStage === 'mature' && matureScores.length < 24) {
              matureScores.push(score);
            }
            if (age.lifeStage === 'ancient' && ancientScores.length < 24) {
              ancientScores.push(score);
            }
          }
        }
      }
    }

    expect(matureScores.length).toBeGreaterThan(0);
    expect(ancientScores.length).toBeGreaterThan(0);

    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;

    expect(average(ancientScores)).toBeGreaterThan(average(matureScores));
    expect(ancientScores.some((score) => score >= 0.28)).toBe(true);
  });

  it('allows ancient forest trees to become historical landmarks', () => {
    const landmarks: Array<{
      age: ReturnType<typeof getForestTreeAgeProfiles>[number];
      historical: ReturnType<typeof getForestTreeHistoricalProfiles>[number];
    }> = [];

    for (let tileY = 0; tileY < 64 && landmarks.length < 8; tileY += 1) {
      for (let tileX = 0; tileX < 64 && landmarks.length < 8; tileX += 1) {
        const ages = getForestTreeAgeProfiles(tileX, tileY);
        const historical = getForestTreeHistoricalProfiles(tileX, tileY);
        for (let index = 0; index < ages.length; index += 1) {
          const age = ages[index];
          const entry = historical[index];
          if (age && entry?.landmark) {
            landmarks.push({ age, historical: entry });
            if (landmarks.length >= 8) {
              break;
            }
          }
        }
      }
    }

    expect(landmarks.length).toBeGreaterThan(0);
    expect(
      landmarks.every((sample) => sample.age.lifeStage === 'ancient')
    ).toBe(true);
    expect(
      landmarks.some(
        (sample) =>
          sample.historical.title.length > 0 &&
          sample.historical.record.length > 0 &&
          sample.historical.prominence >= 0.62
      )
    ).toBe(true);
    expect(
      landmarks.some((sample) => sample.historical.title.trim().split(/\s+/).length >= 3)
    ).toBe(true);
  });

  it('gives especially old historical trees unique procedural names or records', () => {
    const especiallyOld: Array<ReturnType<typeof getForestTreeHistoricalProfiles>[number]> = [];

    for (let tileY = 0; tileY < 96 && especiallyOld.length < 3; tileY += 1) {
      for (let tileX = 0; tileX < 96 && especiallyOld.length < 3; tileX += 1) {
        for (const entry of getForestTreeHistoricalProfiles(tileX, tileY)) {
          if (entry.landmark && entry.prominence >= 0.9) {
            especiallyOld.push(entry);
            if (especiallyOld.length >= 3) {
              break;
            }
          }
        }
      }
    }

    expect(especiallyOld.length).toBeGreaterThan(1);

    const titles = new Set(especiallyOld.map((entry) => entry.title));
    const records = new Set(especiallyOld.map((entry) => entry.record));

    expect(titles.size).toBeGreaterThan(1);
    expect(records.size).toBeGreaterThan(1);
    expect(
      especiallyOld.some(
        (entry) =>
          /\b(18[2-9]\d|19\d{2})\b/.test(entry.record) &&
          entry.record.includes(entry.title)
      )
    ).toBe(true);
  });

  it('adjusts forest fruit production according to tree maturity', () => {
    const samples: Array<{
      age: ReturnType<typeof getForestTreeAgeProfiles>[number];
      fruit: ReturnType<typeof getForestTreeFruitProfiles>[number];
    }> = [];

    for (let tileY = 0; tileY < 64; tileY += 1) {
      for (let tileX = 0; tileX < 64; tileX += 1) {
        const ages = getForestTreeAgeProfiles(tileX, tileY);
        const fruits = getForestTreeFruitProfiles(tileX, tileY);
        for (let index = 0; index < ages.length; index += 1) {
          const age = ages[index];
          const fruit = fruits[index];
          if (age && fruit) {
            samples.push({ age, fruit });
          }
        }
      }
    }

    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;

    const adolescentCounts = samples
      .filter((sample) => sample.age.lifeStage === 'adolescent')
      .map((sample) => sample.fruit.count);
    const matureCounts = samples
      .filter((sample) => sample.age.lifeStage === 'mature')
      .map((sample) => sample.fruit.count);
    const ancientCounts = samples
      .filter((sample) => sample.age.lifeStage === 'ancient')
      .map((sample) => sample.fruit.count);

    expect(adolescentCounts.length).toBeGreaterThan(0);
    expect(matureCounts.length).toBeGreaterThan(0);
    expect(ancientCounts.length).toBeGreaterThan(0);
    expect(average(matureCounts)).toBeGreaterThan(average(adolescentCounts));
    expect(average(ancientCounts)).toBeLessThan(average(matureCounts));
  });

  it('prevents saplings from producing mature forest fruit', () => {
    const samples: Array<{
      age: ReturnType<typeof getForestTreeAgeProfiles>[number];
      fruit: ReturnType<typeof getForestTreeFruitProfiles>[number];
    }> = [];

    for (let tileY = 0; tileY < 64; tileY += 1) {
      for (let tileX = 0; tileX < 64; tileX += 1) {
        const ages = getForestTreeAgeProfiles(tileX, tileY);
        const fruits = getForestTreeFruitProfiles(tileX, tileY);
        for (let index = 0; index < ages.length; index += 1) {
          const age = ages[index];
          const fruit = fruits[index];
          if (age && fruit) {
            samples.push({ age, fruit });
          }
        }
      }
    }

    const saplings = samples.filter((sample) => sample.age.lifeStage === 'sapling');
    const matureTrees = samples.filter((sample) => sample.age.lifeStage === 'mature');

    expect(saplings.length).toBeGreaterThan(0);
    expect(matureTrees.length).toBeGreaterThan(0);
    expect(
      saplings.every((sample) => sample.fruit.count === 0 && sample.fruit.mature === false)
    ).toBe(true);
    expect(
      matureTrees.some((sample) => sample.fruit.count > 0 && sample.fruit.mature)
    ).toBe(true);
  });

  it('lets senescent forest trees produce less foliage or fruit than mature ones', () => {
    const matureFoliageCounts: number[] = [];
    const ancientFoliageCounts: number[] = [];
    const matureFruitCounts: number[] = [];
    const ancientFruitCounts: number[] = [];

    for (
      let tileY = 0;
      tileY < 64 &&
      (matureFoliageCounts.length < 24 || ancientFoliageCounts.length < 24);
      tileY += 1
    ) {
      for (
        let tileX = 0;
        tileX < 64 &&
        (matureFoliageCounts.length < 24 || ancientFoliageCounts.length < 24);
        tileX += 1
      ) {
        const ages = getForestTreeAgeProfiles(tileX, tileY);
        const canopies = getForestTreeCanopyProfiles(tileX, tileY);
        const fruits = getForestTreeFruitProfiles(tileX, tileY);
        for (let index = 0; index < ages.length; index += 1) {
          const age = ages[index];
          const canopy = canopies[index];
          const fruit = fruits[index];
          if (!age || !canopy || !fruit) {
            continue;
          }
          if (age.lifeStage === 'mature' && matureFoliageCounts.length < 24) {
            matureFoliageCounts.push(canopy.foliage.length);
            matureFruitCounts.push(fruit.count);
          }
          if (age.lifeStage === 'ancient' && ancientFoliageCounts.length < 24) {
            ancientFoliageCounts.push(canopy.foliage.length);
            ancientFruitCounts.push(fruit.count);
          }
        }
      }
    }

    expect(matureFoliageCounts.length).toBeGreaterThan(0);
    expect(ancientFoliageCounts.length).toBeGreaterThan(0);

    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;

    expect(average(ancientFoliageCounts)).toBeLessThan(average(matureFoliageCounts));
    expect(average(ancientFruitCounts)).toBeLessThan(average(matureFruitCounts));
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

  it('keeps tree branch profiles deterministic after bounded descriptor cache eviction churn', () => {
    let target: { x: number; y: number; profiles: ReturnType<typeof getForestTreeBranchProfiles> } | null =
      null;

    for (let tileY = 0; tileY < 24 && !target; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const profiles = getForestTreeBranchProfiles(tileX, tileY);
        if (profiles.length > 0) {
          target = { x: tileX, y: tileY, profiles };
          break;
        }
      }
    }

    expect(target).not.toBeNull();

    for (let index = 0; index < 800; index += 1) {
      getForestTreeBranchProfiles((index % 80) - 40, Math.floor(index / 80) - 5);
    }

    expect(getForestTreeBranchProfiles(target!.x, target!.y)).toEqual(target!.profiles);
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

  it('generates deterministic spider webs for branches, hollows, and deadwood', () => {
    const sampleTiles: Array<{
      x: number;
      y: number;
      webs: ReturnType<typeof getForestWebs>;
    }> = [];

    for (let tileY = 0; tileY < 24; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const webs = getForestWebs(tileX, tileY);
        if (webs.length > 0) {
          sampleTiles.push({ x: tileX, y: tileY, webs });
        }
      }
    }

    expect(sampleTiles.length).toBeGreaterThan(0);
    expect(
      sampleTiles.some(({ webs }) => webs.some((web) => web.kind === 'branch'))
    ).toBe(true);
    expect(
      sampleTiles.some(({ webs }) => webs.some((web) => web.kind === 'hollow'))
    ).toBe(true);
    expect(
      sampleTiles.some(({ webs }) => webs.some((web) => web.kind === 'deadwood'))
    ).toBe(true);
    expect(
      sampleTiles.some(({ webs }) =>
        webs.filter((web) => web.kind === 'deadwood').length >=
        webs.filter((web) => web.kind === 'hollow').length
      )
    ).toBe(true);

    const first = sampleTiles[0];
    expect(getForestWebs(first.x, first.y)).toEqual(first.webs);
  });

  it('generates deterministic spiders near forest webs', () => {
    const sampleTiles: Array<{
      x: number;
      y: number;
      spiders: ReturnType<typeof getForestSpiders>;
    }> = [];

    for (let tileY = 0; tileY < 24; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const spiders = getForestSpiders(tileX, tileY);
        if (spiders.length > 0) {
          sampleTiles.push({ x: tileX, y: tileY, spiders });
        }
      }
    }

    expect(sampleTiles.length).toBeGreaterThan(0);
    expect(
      sampleTiles.some(({ spiders }) =>
        spiders.some((spider) => spider.webKind === 'branch')
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ spiders }) =>
        spiders.some((spider) => spider.webKind === 'hollow')
      )
    ).toBe(true);
    expect(
      sampleTiles.some(({ spiders }) =>
        spiders.some((spider) => spider.webKind === 'deadwood')
      )
    ).toBe(true);
    expect(
      sampleTiles.every(({ spiders }) =>
        spiders.every(
          (spider) =>
            spider.bodyScale > 0.017 &&
            spider.legSpan > spider.bodyScale &&
            spider.legSpan < 0.05
        )
      )
    ).toBe(true);

    const first = sampleTiles[0];
    expect(getForestSpiders(first.x, first.y)).toEqual(first.spiders);
  });

  it('generates beaver damage only for some forest tiles near active river beaver habitat', () => {
    let targetTile: { x: number; y: number; rivers: Record<string, { kind: string }> } | null =
      null;
    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const rivers = {
          [`${tileX}:${tileY - 1}`]: { kind: 'river' },
          [`${tileX + 1}:${tileY - 1}`]: { kind: 'river' },
          [`${tileX}:${tileY - 2}`]: { kind: 'river' },
        };
        const state = createForestTestState(tileX, tileY, rivers);
        if (
          getForestBeaverPopulation(state as never, tileX, tileY) &&
          getForestBeaverDamage(state as never, tileX, tileY).length > 0
        ) {
          targetTile = { x: tileX, y: tileY, rivers };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const wetState = createForestTestState(
      targetTile!.x,
      targetTile!.y,
      targetTile!.rivers
    );
    const dryState = createForestTestState(targetTile!.x, targetTile!.y);

    const wetDamage = getForestBeaverDamage(wetState as never, targetTile!.x, targetTile!.y);
    const dryDamage = getForestBeaverDamage(dryState as never, targetTile!.x, targetTile!.y);

    expect(wetDamage.length).toBeGreaterThan(0);
    expect(dryDamage).toHaveLength(0);
    expect(
      wetDamage.some(
        (damage) =>
          damage.severity === 'partial' ||
          damage.severity === 'deep' ||
          damage.severity === 'near-felled' ||
          damage.severity === 'felled'
      )
    ).toBe(true);
    expect(
      wetDamage.every(
        (damage) =>
          damage.chewHeight > 0.07 &&
          damage.chewRadiusScale > 0.8 &&
          damage.coneScale > 0.5 &&
          damage.strippedBranchCount >= 1 &&
          Math.abs(damage.leanDirection) === 1
      )
    ).toBe(true);
  });

  it('generates beaver populations only for some river-adjacent forest tiles', () => {
    let activeTile: { x: number; y: number; rivers: Record<string, { kind: string }> } | null =
      null;
    for (let tileY = 0; tileY < 24 && !activeTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const rivers = {
          [`${tileX}:${tileY - 1}`]: { kind: 'river' },
          [`${tileX + 1}:${tileY - 1}`]: { kind: 'river' },
          [`${tileX}:${tileY - 2}`]: { kind: 'river' },
        };
        const state = createForestTestState(tileX, tileY, rivers);
        if (getForestBeaverPopulation(state as never, tileX, tileY)) {
          activeTile = { x: tileX, y: tileY, rivers };
          break;
        }
      }
    }

    expect(activeTile).not.toBeNull();

    const activeState = createForestTestState(
      activeTile!.x,
      activeTile!.y,
      activeTile!.rivers
    );
    const dryState = createForestTestState(activeTile!.x, activeTile!.y);
    const population = getForestBeaverPopulation(
      activeState as never,
      activeTile!.x,
      activeTile!.y
    );

    expect(population).not.toBeNull();
    expect(['lodge-sign', 'resident-pair', 'active-colony']).toContain(
      population?.density
    );
    expect((population?.activity ?? 0)).toBeGreaterThan(0.4);
    expect(
      getForestBeaverPopulation(dryState as never, activeTile!.x, activeTile!.y)
    ).toBeNull();
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
    expect(
      lowModel.children.every((node) => node instanceof FakeInstancedMesh)
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

  it('reuses pine family materials across distant forest regions', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = createForestTestState();
    const pineTiles: Array<{ x: number; y: number }> = [];

    for (let tileY = 0; tileY < 40 && pineTiles.length < 2; tileY += 1) {
      for (let tileX = 0; tileX < 40 && pineTiles.length < 2; tileX += 1) {
        if (getForestTreeForms(tileX, tileY).includes('pine')) {
          pineTiles.push({ x: tileX, y: tileY });
        }
      }
    }

    expect(pineTiles).toHaveLength(2);

    const firstModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: pineTiles[0]!.x,
      tileY: pineTiles[0]!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const secondModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: pineTiles[1]!.x,
      tileY: pineTiles[1]!.y,
      detailLevel: 'full',
    }) as FakeGroup;

    const firstPine = firstModel.children.find(
      (child) => child.userData?.forestTreeForm === 'pine'
    ) as FakeGroup | undefined;
    const secondPine = secondModel.children.find(
      (child) => child.userData?.forestTreeForm === 'pine'
    ) as FakeGroup | undefined;

    const firstTrunk = firstPine?.children.find(
      (child) => child instanceof FakeMesh
    ) as FakeMesh | undefined;
    const secondTrunk = secondPine?.children.find(
      (child) => child instanceof FakeMesh
    ) as FakeMesh | undefined;
    const firstFoliage = firstPine?.children.find(
      (child) => child instanceof FakeMesh && child.userData?.forestTreeFoliage
    ) as FakeMesh | undefined;
    const secondFoliage = secondPine?.children.find(
      (child) => child instanceof FakeMesh && child.userData?.forestTreeFoliage
    ) as FakeMesh | undefined;

    expect(firstTrunk?.material).toBe(secondTrunk?.material);
    expect(firstFoliage?.material).toBe(secondFoliage?.material);
  });

  it('uses tapered full-detail trunk geometry that matches structural trunk width', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = createForestTestState(8, 6);
    const trunks = getForestTreeTrunkProfiles(8, 6);

    expect(trunks.length).toBeGreaterThan(0);

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;

    const firstTree = fullModel.children.find(
      (child) => child instanceof FakeGroup && child.userData?.renderStatKind === 'tree'
    ) as FakeGroup | undefined;
    const lowerTrunkMesh = firstTree?.children.find(
      (child) =>
        child instanceof FakeMesh &&
        child.geometry instanceof FakeGeometry &&
        child.material instanceof FakeMaterial &&
        child.userData?.forestTreeTrunkSegment === 'lower'
    ) as FakeMesh | undefined;
    const upperTrunkMesh = firstTree?.children.find(
      (child) =>
        child instanceof FakeMesh &&
        child.geometry instanceof FakeGeometry &&
        child.material instanceof FakeMaterial &&
        child.userData?.forestTreeTrunkSegment === 'upper'
    ) as FakeMesh | undefined;

    expect(lowerTrunkMesh).toBeDefined();
    expect(upperTrunkMesh).toBeDefined();
    expect(lowerTrunkMesh?.geometry).toBeInstanceOf(FakeGeometry);
    expect(upperTrunkMesh?.geometry).toBeInstanceOf(FakeGeometry);
    expect(lowerTrunkMesh?.scale.x).toBeCloseTo(trunks[0]!.radius / 0.1);
    expect(lowerTrunkMesh?.scale.z).toBeCloseTo(trunks[0]!.radius / 0.1);

    const trunkGeometry = upperTrunkMesh?.geometry as FakeGeometry;
    const resolvedTopRadiusScale =
      trunkGeometry.args[0] * (upperTrunkMesh?.scale.x ?? 0);
    expect(resolvedTopRadiusScale).toBeCloseTo(trunks[0]!.trunkTopRadius, 2);
    expect(trunkGeometry.args[1]).toBeCloseTo(0.1, 5);
    expect(trunkGeometry.args[0]).toBeLessThan(trunkGeometry.args[1]!);
  });

  it('avoids perfectly straight full-detail trunk cylinders by using a segmented trunk profile', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = createForestTestState(8, 6);
    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;

    const firstTree = fullModel.children.find(
      (child) => child instanceof FakeGroup && child.userData?.renderStatKind === 'tree'
    ) as FakeGroup | undefined;
    const lowerTrunkMesh = firstTree?.children.find(
      (child) => child.userData?.forestTreeTrunkSegment === 'lower'
    ) as FakeMesh | undefined;
    const upperTrunkMesh = firstTree?.children.find(
      (child) => child.userData?.forestTreeTrunkSegment === 'upper'
    ) as FakeMesh | undefined;

    expect(lowerTrunkMesh).toBeDefined();
    expect(upperTrunkMesh).toBeDefined();
    expect(firstTree?.children.filter((child) => child.userData?.forestTreeTrunkSegment).length)
      .toBe(2);

    const lowerGeometry = lowerTrunkMesh?.geometry as FakeGeometry;
    const upperGeometry = upperTrunkMesh?.geometry as FakeGeometry;
    expect(lowerGeometry.args[0]).not.toBeCloseTo(upperGeometry.args[1], 5);
    expect(upperTrunkMesh?.scale.x).toBeLessThan(lowerTrunkMesh?.scale.x ?? Infinity);
    expect(upperTrunkMesh?.position.y).toBeGreaterThan(lowerTrunkMesh?.position.y ?? -Infinity);
  });

  it('adds slight curvature to full-detail forest trunks from shared structural state', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = createForestTestState(8, 6);
    const trunks = getForestTreeTrunkProfiles(8, 6);
    const curvedIndex = trunks.findIndex(
      (trunk) => Math.abs(trunk.trunkCurveX) + Math.abs(trunk.trunkCurveZ) > 0.01
    );

    expect(curvedIndex).toBeGreaterThanOrEqual(0);

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;

    const curvedTree = fullModel.children.filter(
      (child) => child instanceof FakeGroup && child.userData?.renderStatKind === 'tree'
    )[curvedIndex] as FakeGroup | undefined;
    const lowerTrunkMesh = curvedTree?.children.find(
      (child) => child.userData?.forestTreeTrunkSegment === 'lower'
    ) as FakeMesh | undefined;
    const upperTrunkMesh = curvedTree?.children.find(
      (child) => child.userData?.forestTreeTrunkSegment === 'upper'
    ) as FakeMesh | undefined;

    expect(lowerTrunkMesh).toBeDefined();
    expect(upperTrunkMesh).toBeDefined();
    expect(Math.abs(upperTrunkMesh?.position.x ?? 0)).toBeGreaterThanOrEqual(
      Math.abs(lowerTrunkMesh?.position.x ?? 0)
    );
    expect(Math.abs(upperTrunkMesh?.position.z ?? 0)).toBeGreaterThanOrEqual(
      Math.abs(lowerTrunkMesh?.position.z ?? 0)
    );
    expect(
      Math.abs(upperTrunkMesh?.position.x ?? 0) + Math.abs(upperTrunkMesh?.position.z ?? 0)
    ).toBeGreaterThan(0.01);
    expect(upperTrunkMesh?.position.x).toBeCloseTo(trunks[curvedIndex]!.trunkCurveX, 3);
    expect(upperTrunkMesh?.position.z).toBeCloseTo(trunks[curvedIndex]!.trunkCurveZ, 3);
  });

  it('adds directional lean to full-detail forest trees from shared structural state', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = createForestTestState(8, 6);
    const trunks = getForestTreeTrunkProfiles(8, 6);
    const leaningIndex = trunks.findIndex(
      (trunk) => Math.abs(trunk.trunkLeanX) + Math.abs(trunk.trunkLeanZ) > 0.01
    );

    expect(leaningIndex).toBeGreaterThanOrEqual(0);

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;

    const leaningTree = fullModel.children.filter(
      (child) => child instanceof FakeGroup && child.userData?.renderStatKind === 'tree'
    )[leaningIndex] as FakeGroup | undefined;

    expect(leaningTree).toBeDefined();
    expect(Math.abs(leaningTree?.rotation.x ?? 0) + Math.abs(leaningTree?.rotation.z ?? 0))
      .toBeGreaterThan(0.005);
    expect(leaningTree?.rotation.x).toBeCloseTo(
      Math.atan2(trunks[leaningIndex]!.trunkLeanZ, trunks[leaningIndex]!.trunkHeight),
      3
    );
    expect(leaningTree?.rotation.z).toBeCloseTo(
      -Math.atan2(trunks[leaningIndex]!.trunkLeanX, trunks[leaningIndex]!.trunkHeight),
      3
    );
  });

  it('instances low-detail tree trunks and canopies instead of creating one group per tree', () => {
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
    const instancedTrunks = lowModel.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.forestTreeLowDetailInstancedPart === 'trunk'
    ) as FakeInstancedMesh[];
    const instancedCanopies = lowModel.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.forestTreeLowDetailInstancedPart === 'canopy'
    ) as FakeInstancedMesh[];

    expect(groupedTrees.length).toBe(0);
    expect(taggedTreeMeshes.length).toBeGreaterThan(0);
    expect(instancedTrunks.length).toBeGreaterThan(0);
    expect(instancedCanopies.length).toBeGreaterThan(0);
    expect(instancedTrunks.every((mesh) => mesh.count > 0)).toBe(true);
    expect(instancedCanopies.every((mesh) => mesh.count > 0)).toBe(true);
    expect(instancedTrunks.some((mesh) => mesh.matrices.length > 0)).toBe(true);
    expect(
      instancedTrunks.some((mesh) => mesh.matrices.some((matrix) => matrix.scale.x < 1))
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

    const fullBushInstances = fullModel.children.filter(
      (node) => node instanceof FakeInstancedMesh && node.userData?.forestBush
    ) as FakeInstancedMesh[];

    let lowBushCount = 0;
    lowModel.traverse((node) => {
      if (node.userData?.forestBush) {
        lowBushCount += 1;
      }
    });

    expect(fullBushInstances.length).toBeGreaterThan(0);
    expect(fullBushInstances.some((mesh) => mesh.count > 0)).toBe(true);
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
    const state = createForestTestState();

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
    state.player.x = targetTile!.x;
    state.player.y = targetTile!.y;

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
    const state = createForestTestState();

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
    state.player.x = targetTile!.x;
    state.player.y = targetTile!.y;

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

  it('renders full-detail forest carvings for textual and symbolic motifs', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = createForestTestState();

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
    state.player.x = targetTile!.x;
    state.player.y = targetTile!.y;

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
    const fullAges: number[] = [];
    const fullBarkCoverage: number[] = [];
    const fullScales: number[] = [];
    fullModel.traverse((node) => {
      const carving = node.userData?.forestCarving;
      if (typeof carving === 'string') {
        fullCarvingCount += 1;
        fullLabels.add(carving);
      }
      if (typeof node.userData?.forestCarvingAge === 'number') {
        fullAges.push(node.userData.forestCarvingAge);
      }
      if (typeof node.userData?.forestCarvingBarkCoverage === 'number') {
        fullBarkCoverage.push(node.userData.forestCarvingBarkCoverage);
      }
      if (typeof node.userData?.forestCarvingAge === 'number' && node.scale?.x) {
        fullScales.push(node.scale.x);
      }
    });

    let lowCarvingCount = 0;
    lowModel.traverse((node) => {
      if (node.userData?.forestCarving) {
        lowCarvingCount += 1;
      }
    });

    expect(fullCarvingCount).toBeGreaterThan(0);
    expect(
      [...fullLabels].some(
        (label) =>
          label === 'LM+FG' ||
          label === 'LM*FG' ||
          label === 'O' ||
          label === '+' ||
          label === 'G+' ||
          label === '!' ||
          label === 'X' ||
          label === '>' ||
          label === '<'
      )
    ).toBe(true);
    expect(lowCarvingCount).toBe(0);
    expect(fullAges.length).toBeGreaterThan(0);
    expect(fullBarkCoverage.length).toBeGreaterThan(0);
    expect(fullScales.every((scale) => scale > 0)).toBe(true);

    let datedTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 18 && !datedTile; tileY += 1) {
      for (let tileX = 0; tileX < 18; tileX += 1) {
        if (
          getForestCarvings(tileX, tileY).some(
            (carving) => carving.motif === 'date'
          )
        ) {
          datedTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(datedTile).not.toBeNull();
    state.player.x = datedTile!.x;
    state.player.y = datedTile!.y;

    const datedModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: datedTile!.x,
      tileY: datedTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;

    let datedRenderCount = 0;
    datedModel.traverse((node) => {
      const carving = node.userData?.forestCarving;
      if (typeof carving === 'string' && /^(18\d{2}|19\d{2})$/.test(carving)) {
        datedRenderCount += 1;
      }
    });

    expect(datedRenderCount).toBeGreaterThan(0);

    let symbolTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 18 && !symbolTile; tileY += 1) {
      for (let tileX = 0; tileX < 18; tileX += 1) {
        if (
          getForestCarvings(tileX, tileY).some(
            (carving) =>
              carving.motif === 'traveler-mark' || carving.motif === 'arrow'
          )
        ) {
          symbolTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(symbolTile).not.toBeNull();
    state.player.x = symbolTile!.x;
    state.player.y = symbolTile!.y;
    const symbolModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: symbolTile!.x,
      tileY: symbolTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;

    const symbolLabels = new Set<string>();
    symbolModel.traverse((node) => {
      const carving = node.userData?.forestCarving;
      if (typeof carving === 'string' && ['X', '>', '<'].includes(carving)) {
        symbolLabels.add(carving);
      }
    });

    expect(symbolLabels.size).toBeGreaterThan(0);

    let extendedSymbolTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 18 && !extendedSymbolTile; tileY += 1) {
      for (let tileX = 0; tileX < 18; tileX += 1) {
        if (
          getForestCarvings(tileX, tileY).some(
            (carving) =>
              carving.motif === 'symbol' ||
              carving.motif === 'religious' ||
              carving.motif === 'guild' ||
              carving.motif === 'warning'
          )
        ) {
          extendedSymbolTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(extendedSymbolTile).not.toBeNull();
    state.player.x = extendedSymbolTile!.x;
    state.player.y = extendedSymbolTile!.y;
    const extendedSymbolModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: extendedSymbolTile!.x,
      tileY: extendedSymbolTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;

    const extendedSymbolLabels = new Set<string>();
    extendedSymbolModel.traverse((node) => {
      const carving = node.userData?.forestCarving;
      if (typeof carving === 'string' && ['O', '+', 'G+', '!'].includes(carving)) {
        extendedSymbolLabels.add(carving);
      }
    });

    expect(extendedSymbolLabels.size).toBeGreaterThan(0);

    let clueTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 32 && !clueTile; tileY += 1) {
      for (let tileX = 0; tileX < 32; tileX += 1) {
        if (
          getForestCarvings(tileX, tileY).some(
            (carving) =>
              carving.motif === 'quest-hint' ||
              carving.motif === 'treasure-map-clue' ||
              carving.motif === 'historical-inscription'
          )
        ) {
          clueTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(clueTile).not.toBeNull();
    state.player.x = clueTile!.x;
    state.player.y = clueTile!.y;
    const clueModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: clueTile!.x,
      tileY: clueTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;

    const clueLabels = new Set<string>();
    clueModel.traverse((node) => {
      const carving = node.userData?.forestCarving;
      if (
        typeof carving === 'string' &&
        ['N2', 'E3', 'S4', 'W1', 'X2', 'X4', '>3', '<5', 'OLD', 'MOSS', '1891'].includes(
          carving
        )
      ) {
        clueLabels.add(carving);
      }
    });

    expect(clueLabels.size).toBeGreaterThan(0);

    let agedTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 32 && !agedTile; tileY += 1) {
      for (let tileX = 0; tileX < 32; tileX += 1) {
        if (
          getForestCarvings(tileX, tileY).some(
            (carving) => carving.age >= 0.8 && carving.barkCoverage >= 0.45
          )
        ) {
          agedTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(agedTile).not.toBeNull();
    state.player.x = agedTile!.x;
    state.player.y = agedTile!.y;
    const agedModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: agedTile!.x,
      tileY: agedTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;

    const agedRenderAges: number[] = [];
    const agedRenderCoverage: number[] = [];
    agedModel.traverse((node) => {
      if (typeof node.userData?.forestCarvingAge === 'number') {
        agedRenderAges.push(node.userData.forestCarvingAge);
      }
      if (typeof node.userData?.forestCarvingBarkCoverage === 'number') {
        agedRenderCoverage.push(node.userData.forestCarvingBarkCoverage);
      }
    });

    expect(agedRenderAges.some((age) => age >= 0.8)).toBe(true);
    expect(agedRenderCoverage.some((coverage) => coverage >= 0.45)).toBe(true);

    let preservedClueTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 32 && !preservedClueTile; tileY += 1) {
      for (let tileX = 0; tileX < 32; tileX += 1) {
        if (
          getForestCarvings(tileX, tileY).some(
            (carving) =>
              carving.preserved &&
              (carving.motif === 'quest-hint' || carving.motif === 'treasure-map-clue')
          )
        ) {
          preservedClueTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(preservedClueTile).not.toBeNull();
    state.player.x = preservedClueTile!.x;
    state.player.y = preservedClueTile!.y;
    const preservedClueModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: preservedClueTile!.x,
      tileY: preservedClueTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;

    const preservedCoverage: number[] = [];
    preservedClueModel.traverse((node) => {
      if (typeof node.userData?.forestCarvingBarkCoverage === 'number') {
        preservedCoverage.push(node.userData.forestCarvingBarkCoverage);
      }
    });

    expect(preservedCoverage.some((coverage) => coverage <= 0.38)).toBe(true);
  });

  it('renders bark damage markers only for full-detail aged forest trees', () => {
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
    for (let tileY = 0; tileY < 48 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 48; tileX += 1) {
        const ages = getForestTreeAgeProfiles(tileX, tileY);
        const damages = getForestTreeDamageProfiles(tileX, tileY);
        if (
          ages.some((age) => age.lifeStage === 'ancient') &&
          damages.some((damage) => damage.barkMarks.length > 0)
        ) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();
    state.player.x = targetTile!.x;
    state.player.y = targetTile!.y;

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

    const fullKinds = new Set<string>();
    const severities: number[] = [];
    fullModel.traverse((node) => {
      if (typeof node.userData?.forestBarkDamageSeverity === 'number') {
        severities.push(node.userData.forestBarkDamageSeverity);
      }
      if (typeof node.userData?.forestBarkDamage === 'string') {
        fullKinds.add(node.userData.forestBarkDamage);
      }
    });

    let lowDamageCount = 0;
    lowModel.traverse((node) => {
      if (typeof node.userData?.forestBarkDamageSeverity === 'number') {
        lowDamageCount += 1;
      }
    });

    expect(severities.length).toBeGreaterThan(0);
    expect(severities.some((severity) => severity >= 0.62)).toBe(true);
    expect(fullKinds.has('crack')).toBe(true);
    expect(lowDamageCount).toBe(0);
  });

  it('renders historical tree landmark markers only in full-detail forest models', () => {
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
    for (let tileY = 0; tileY < 64 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 64; tileX += 1) {
        if (getForestTreeHistoricalProfiles(tileX, tileY).some((entry) => entry.landmark)) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();
    state.player.x = targetTile!.x;
    state.player.y = targetTile!.y;

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

    const fullTitles = new Set<string>();
    const fullRecords = new Set<string>();
    fullModel.traverse((node) => {
      if (typeof node.userData?.forestHistoricalTree === 'string') {
        fullTitles.add(node.userData.forestHistoricalTree);
      }
      if (typeof node.userData?.forestHistoricalTreeRecord === 'string') {
        fullRecords.add(node.userData.forestHistoricalTreeRecord);
      }
    });

    let lowHistoricalCount = 0;
    lowModel.traverse((node) => {
      if (typeof node.userData?.forestHistoricalTree === 'string') {
        lowHistoricalCount += 1;
      }
    });

    expect(fullTitles.size).toBeGreaterThan(0);
    expect(fullRecords.size).toBeGreaterThan(0);
    expect([...fullTitles].some((title) => /Oak|Birch|Pine/.test(title))).toBe(true);
    expect(lowHistoricalCount).toBe(0);
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

  it('instances meadow flower stems and blooms in full-detail forest models', () => {
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
        if (getForestMeadows(tileX, tileY).some((meadow) => meadow.flowers.length > 0)) {
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

    const flowerStems = fullModel.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.forestMeadow === 'flower-stem'
    ) as FakeInstancedMesh[];
    const flowerBlooms = fullModel.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        (child.userData?.forestMeadow === 'white' ||
          child.userData?.forestMeadow === 'yellow')
    ) as FakeInstancedMesh[];

    expect(flowerStems.length).toBeGreaterThan(0);
    expect(flowerBlooms.length).toBeGreaterThan(0);
    expect(flowerStems.some((mesh) => mesh.count > 0)).toBe(true);
    expect(flowerBlooms.some((mesh) => mesh.count > 0)).toBe(true);
  });

  it('renders and animates birds only in full-detail forest models', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = createForestTestState();

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
    state.player.x = targetTile!.x;
    state.player.y = targetTile!.y;

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

    const fullTrailInstances = fullModel.children.filter(
      (node) =>
        node instanceof FakeInstancedMesh &&
        node.userData?.forestTrail === 'breadcrumb'
    ) as FakeInstancedMesh[];

    let lowTrailCount = 0;
    lowModel.traverse((node) => {
      if (node.userData?.forestTrail === 'breadcrumb') {
        lowTrailCount += 1;
      }
    });

    expect(fullTrailInstances.length).toBe(1);
    expect(fullTrailInstances[0]?.count).toBe(
      getForestTrail(targetTile!.x, targetTile!.y)?.breadcrumbs.length
    );
    expect(fullTrailInstances[0]?.count).toBeGreaterThan(0);
    expect(lowTrailCount).toBe(0);
  });

  it('renders spider webs only in nearby full-detail forest models', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        if (getForestWebs(tileX, tileY).length > 0) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const nearState = createForestTestState(targetTile!.x, targetTile!.y);
    const farState = createForestTestState(-100, -100);

    const nearModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: nearState,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const farModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: farState,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: nearState,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'low',
    }) as FakeGroup;

    const nearWebInstances = nearModel.children.filter(
      (node) => node instanceof FakeInstancedMesh && node.userData?.forestWeb
    ) as FakeInstancedMesh[];
    const countTaggedNodes = (model: FakeGroup, key: string) => {
      let count = 0;
      model.traverse((node) => {
        if (node.userData?.[key]) {
          count += 1;
        }
      });
      return count;
    };

    expect(nearWebInstances).toHaveLength(1);
    expect(nearWebInstances[0]?.count).toBeGreaterThan(0);
    expect(countTaggedNodes(farModel, 'forestWeb')).toBe(0);
    expect(countTaggedNodes(lowModel, 'forestWeb')).toBe(0);
  });

  it('renders beaver damage only near river habitat with a nearby beaver population in full-detail close forest models', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    let targetTile: { x: number; y: number; rivers: Record<string, { kind: string }> } | null =
      null;
    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const rivers = {
          [`${tileX}:${tileY - 1}`]: { kind: 'river' },
          [`${tileX + 1}:${tileY - 1}`]: { kind: 'river' },
          [`${tileX}:${tileY - 2}`]: { kind: 'river' },
        };
        const state = createForestTestState(tileX, tileY, rivers);
        if (
          getForestBeaverPopulation(state as never, tileX, tileY) &&
          getForestBeaverDamage(state as never, tileX, tileY).length > 0
        ) {
          targetTile = { x: tileX, y: tileY, rivers };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const wetState = createForestTestState(
      targetTile!.x,
      targetTile!.y,
      targetTile!.rivers
    );
    const dryState = createForestTestState(targetTile!.x, targetTile!.y);
    const farState = createForestTestState(-100, -100, targetTile!.rivers);

    const wetModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: wetState,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const dryModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: dryState,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const farModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: farState,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: wetState,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'low',
    }) as FakeGroup;

    const countTaggedNodes = (model: FakeGroup, key: string) => {
      let count = 0;
      model.traverse((node) => {
        if (node.userData?.[key]) {
          count += 1;
        }
      });
      return count;
    };
    const countTaggedValue = (model: FakeGroup, key: string, value: string) => {
      let count = 0;
      model.traverse((node) => {
        if (node.userData?.[key] === value) {
          count += 1;
        }
      });
      return count;
    };

    expect(countTaggedNodes(wetModel, 'forestBeaverDamage')).toBeGreaterThan(0);
    expect(countTaggedValue(wetModel, 'forestBeaverDamage', 'chew')).toBeGreaterThan(0);
    expect(countTaggedValue(wetModel, 'forestBeaverDamage', 'debris')).toBeGreaterThan(0);
    expect(countTaggedNodes(dryModel, 'forestBeaverDamage')).toBe(0);
    expect(countTaggedNodes(farModel, 'forestBeaverDamage')).toBe(0);
    expect(countTaggedNodes(lowModel, 'forestBeaverDamage')).toBe(0);
  });

  it('renders near-felled beaver-cut trees for some river-adjacent forest tiles', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');

    let targetTile: { x: number; y: number; rivers: Record<string, { kind: string }> } | null =
      null;

    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const rivers = {
          [`${tileX}:${tileY - 1}`]: { kind: 'river' },
          [`${tileX + 1}:${tileY - 1}`]: { kind: 'river' },
          [`${tileX}:${tileY - 2}`]: { kind: 'river' },
        };
        const state = createForestTestState(tileX, tileY, rivers);
        if (
          getForestBeaverDamage(state as never, tileX, tileY).some(
            (damage) => damage.severity === 'near-felled'
          )
        ) {
          targetTile = { x: tileX, y: tileY, rivers };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const state = createForestTestState(
      targetTile!.x,
      targetTile!.y,
      targetTile!.rivers
    );
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;

    let nearFelledCount = 0;
    model.traverse((node) => {
      if (node.userData?.forestBeaverDamage === 'near-felled') {
        nearFelledCount += 1;
      }
    });

    expect(nearFelledCount).toBeGreaterThan(0);
  });

  it('renders felled beaver-cut trees for some river-adjacent forest tiles', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');

    let targetTile: { x: number; y: number; rivers: Record<string, { kind: string }> } | null =
      null;

    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const rivers = {
          [`${tileX}:` + `${tileY - 1}`]: { kind: 'river' },
          [`${tileX + 1}:` + `${tileY - 1}`]: { kind: 'river' },
          [`${tileX}:` + `${tileY - 2}`]: { kind: 'river' },
        };
        const state = createForestTestState(tileX, tileY, rivers);
        if (
          getForestBeaverDamage(state as never, tileX, tileY).some(
            (damage) => damage.severity === 'felled'
          )
        ) {
          targetTile = { x: tileX, y: tileY, rivers };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const state = createForestTestState(
      targetTile!.x,
      targetTile!.y,
      targetTile!.rivers
    );
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;

    let felledCount = 0;
    model.traverse((node) => {
      if (node.userData?.forestBeaverDamage === 'felled') {
        felledCount += 1;
      }
    });

    expect(felledCount).toBeGreaterThan(0);
  });

  it('adds dew or rain glint to forest webs when conditions are damp', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        if (getForestWebs(tileX, tileY).length > 0) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const state = createForestTestState(targetTile!.x, targetTile!.y);
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;

    const webInstances = model.children.filter(
      (node) => node instanceof FakeInstancedMesh && node.userData?.forestWeb
    ) as FakeInstancedMesh[];
    expect(webInstances).toHaveLength(1);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      model,
      timeMs: 0,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {
        weather: {
          current: {
            kind: 'clear',
            label: 'Clear',
            intensity: 0.1,
            windStrength: 0.1,
            precipitation: 0,
            cloudCover: 0.05,
            temperature: 19,
            visibility: 1,
            front: {
              id: 'clear-front',
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

    const dryMaterial = webInstances[0]?.material as FakeMaterial | undefined;
    const dryOpacity = dryMaterial?.opacity ?? 0;
    const dryEmissive = dryMaterial?.emissiveIntensity ?? 0;

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      model,
      timeMs: 0,
      cycle: { daylight: 0.1, twilight: 0.9, night: 0 },
      environment: {
        weather: {
          current: {
            kind: 'heavy-rain',
            label: 'Rain',
            intensity: 0.8,
            windStrength: 0.2,
            precipitation: 0.85,
            cloudCover: 0.95,
            temperature: 14,
            visibility: 0.7,
            front: {
              id: 'rain-front',
              kind: 'cold',
              intensity: 0.8,
              humidityShift: 0.25,
              temperatureShift: -3,
              windDirectionDegrees: 120,
              speed: 0.3,
            },
          },
          forecast: [],
        },
      },
    });

    const wetMaterial = webInstances[0]?.material as FakeMaterial | undefined;
    expect((wetMaterial?.opacity ?? 0)).toBeGreaterThan(dryOpacity);
    expect((wetMaterial?.emissiveIntensity ?? 0)).toBeGreaterThan(dryEmissive);
  });

  it('renders spiders only in nearby full-detail forest models', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        if (getForestSpiders(tileX, tileY).length > 0) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const nearState = createForestTestState(targetTile!.x, targetTile!.y);
    const farState = createForestTestState(-100, -100);

    const nearModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: nearState,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const farModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: farState,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: nearState,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'low',
    }) as FakeGroup;

    const nearSpiderInstances = nearModel.children.filter(
      (node) => node instanceof FakeInstancedMesh && node.userData?.forestSpider
    ) as FakeInstancedMesh[];
    const countTaggedNodes = (model: FakeGroup, key: string) => {
      let count = 0;
      model.traverse((node) => {
        if (node.userData?.[key]) {
          count += 1;
        }
      });
      return count;
    };

    expect(nearSpiderInstances).toHaveLength(2);
    expect(nearSpiderInstances.every((instance) => instance.count > 0)).toBe(true);
    expect(countTaggedNodes(farModel, 'forestSpider')).toBe(0);
    expect(countTaggedNodes(lowModel, 'forestSpider')).toBe(0);
  });

  it('shows fireflies only after dark', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = createForestTestState(8, 6);

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
      cycle: { daylight: 1, twilight: 0, night: 0, yearProgress: 0.5 },
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
      cycle: { daylight: 0, twilight: 0, night: 1, yearProgress: 0.5 },
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
        fireflyPoints[0]?.material as FakeMaterial | undefined
      )?.uniforms?.uTimeMs?.value
    ).toBe(1200);
    expect(
      (
        fireflyPoints[0]?.material as FakeMaterial | undefined
      )?.uniforms?.uActivation?.value
    ).toBe(1);
    expect(
      (
        fireflyPoints[0]?.geometry?.attributes.position as
          | FakeFloat32BufferAttribute
          | undefined
      )?.needsUpdate
    ).not.toBe(true);
  });

  it('keeps fireflies hidden at night outside their warm-season window', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = createForestTestState(8, 6);

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

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      model,
      timeMs: 1200,
      cycle: { daylight: 0, twilight: 0, night: 1, yearProgress: 0.05 },
      environment: {},
    });

    expect(fireflyPoints.every((points) => points.visible === false)).toBe(true);
    expect(
      fireflyPoints.every(
        (points) => ((points.material as FakeMaterial)?.opacity ?? 0) <= 0.01
      )
    ).toBe(true);
  });

  it('renders fireflies as particles only in full-detail forest models', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = createForestTestState(8, 6);

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

    const fullFireflyPoints: FakePoints[] = [];
    fullModel.traverse((node) => {
      if (node instanceof FakePoints && node.userData?.forestFirefly) {
        fullFireflyPoints.push(node);
      }
    });

    let lowFireflyCount = 0;
    lowModel.traverse((node) => {
      if (node.userData?.forestFirefly) {
        lowFireflyCount += 1;
      }
    });

    expect(fullFireflyPoints).toHaveLength(1);
    expect(lowFireflyCount).toBe(0);
    expect(
      fullModel.children.some(
        (node) => node.userData?.forestFirefly && !(node instanceof FakePoints)
      )
    ).toBe(false);
    expect(
      fullModel.children.some(
        (node) => node.userData?.forestFirefly && node instanceof FakePointLight
      )
    ).toBe(false);
  });

  it('packs visible fireflies into a single particle cloud per forest tile', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = createForestTestState(8, 6);

    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;

    const fireflyNodes = model.children.filter(
      (node) => node.userData?.forestFirefly
    );
    const fireflyPoints = fireflyNodes[0] as FakePoints | undefined;
    const particleCount =
      (
        fireflyPoints?.userData?.forestFirefly as
          | { particleCount?: number }
          | undefined
      )?.particleCount ?? 0;
    const positionCount =
      (
        fireflyPoints?.geometry?.attributes.position as
          | FakeFloat32BufferAttribute
          | undefined
      )?.array.length ?? 0;

    expect(fireflyNodes).toHaveLength(1);
    expect(fireflyPoints).toBeInstanceOf(FakePoints);
    expect(particleCount).toBeGreaterThan(0);
    expect(positionCount).toBe(particleCount * 3);
  });

  it('reuses a shared particle material across forest firefly clouds', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = createForestTestState(8, 6);

    const firstModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;
    const secondModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 9,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;

    const firstPoints = firstModel.children.find(
      (node) => node instanceof FakePoints && node.userData?.forestFirefly
    ) as FakePoints | undefined;
    const secondPoints = secondModel.children.find(
      (node) => node instanceof FakePoints && node.userData?.forestFirefly
    ) as FakePoints | undefined;

    expect(firstPoints).toBeDefined();
    expect(secondPoints).toBeDefined();
    expect(firstPoints?.material).toBe(secondPoints?.material);
    expect((firstPoints?.material as FakeMaterial | undefined)?.options).toMatchObject({
      uniforms: expect.objectContaining({
        uTimeMs: expect.objectContaining({ value: expect.any(Number) }),
        uActivation: expect.objectContaining({ value: expect.any(Number) }),
        uColor: { value: [0.85, 1, 0.54] },
      }),
      vertexShader: expect.stringContaining('fireflyPhase'),
      fragmentShader: expect.stringContaining('gl_PointCoord'),
      blending: 'additive',
      transparent: true,
      depthWrite: false,
    });
    expect((firstPoints?.material as FakeMaterial | undefined)?.options.map).toBeUndefined();
  });

  it('scales firefly particle density down for farther close-detail forest tiles', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const nearState = createForestTestState(8, 6);
    const midState = createForestTestState(6.3, 6);

    const nearModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: nearState,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;
    const midModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: midState,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;

    const nearPoints = nearModel.children.find(
      (node) => node instanceof FakePoints && node.userData?.forestFirefly
    ) as FakePoints | undefined;
    const midPoints = midModel.children.find(
      (node) => node instanceof FakePoints && node.userData?.forestFirefly
    ) as FakePoints | undefined;

    const nearCount =
      (
        nearPoints?.geometry?.attributes.position as
          | FakeFloat32BufferAttribute
          | undefined
      )?.array.length ?? 0;
    const midCount =
      (
        midPoints?.geometry?.attributes.position as
          | FakeFloat32BufferAttribute
          | undefined
      )?.array.length ?? 0;

    expect(nearPoints).toBeDefined();
    expect(midPoints).toBeDefined();
    expect(nearCount).toBeGreaterThan(midCount);
    expect(midCount).toBeGreaterThan(0);
  });

  it('skips close-only wildlife and decorative forest details when the player is far away', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        if (
          getForestTreeHollows(tileX, tileY).length > 0 &&
          getForestOwls(tileX, tileY).length > 0 &&
          getForestCarvings(tileX, tileY).length > 0 &&
          getForestBirds(tileX, tileY).length > 0 &&
          getForestWebs(tileX, tileY).length > 0 &&
          getForestSpiders(tileX, tileY).length > 0
        ) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const farState = createForestTestState(-100, -100);
    const nearState = createForestTestState(targetTile!.x, targetTile!.y);

    const nearModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: nearState,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const farModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: farState,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;

    const countTaggedNodes = (model: FakeGroup, key: string) => {
      let count = 0;
      model.traverse((node) => {
        if (node.userData?.[key]) {
          count += 1;
        }
      });
      return count;
    };

    expect(countTaggedNodes(nearModel, 'forestHollow')).toBeGreaterThan(0);
    expect(countTaggedNodes(nearModel, 'forestOwl')).toBeGreaterThan(0);
    expect(countTaggedNodes(nearModel, 'forestCarving')).toBeGreaterThan(0);
    expect(countTaggedNodes(nearModel, 'forestBird')).toBeGreaterThan(0);
    expect(countTaggedNodes(farModel, 'forestHollow')).toBe(0);
    expect(countTaggedNodes(farModel, 'forestOwl')).toBe(0);
    expect(countTaggedNodes(farModel, 'forestCarving')).toBe(0);
    expect(countTaggedNodes(farModel, 'forestBird')).toBe(0);
    expect(countTaggedNodes(farModel, 'forestWeb')).toBe(0);
    expect(countTaggedNodes(farModel, 'forestSpider')).toBe(0);
    expect(countTaggedNodes(farModel, 'forestFirefly')).toBe(0);
  });

  it('caches deterministic firefly descriptors and keeps their count capped', () => {
    const first = getForestFireflyDescriptors(8, 6);
    const second = getForestFireflyDescriptors(8, 6);

    expect(second).toBe(first);
    expect(first.length).toBeLessThanOrEqual(3);
    expect(
      first.every(
        (descriptor) =>
          descriptor.baseX >= -0.34 &&
          descriptor.baseX <= 0.34 &&
          descriptor.baseZ >= -0.34 &&
          descriptor.baseZ <= 0.34
      )
    ).toBe(true);
  });

  it('clusters fireflies around cached vegetation habitat anchors', () => {
    const descriptors = getForestFireflyDescriptors(8, 6);

    expect(descriptors.length).toBeGreaterThan(0);
    expect(
      descriptors.every((descriptor) => {
        const distance = Math.hypot(
          descriptor.baseX - descriptor.anchorX,
          descriptor.baseZ - descriptor.anchorZ
        );
        return (
          ['tree', 'bush', 'meadow'].includes(descriptor.habitatKind) &&
          distance <= descriptor.anchorRadius + 0.0001
        );
      })
    ).toBe(true);
  });

  it('prefers humid vegetation anchors for the lead firefly when available', () => {
    let humidTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 24 && !humidTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        if (
          (getForestBushes(tileX, tileY).length > 0 ||
            getForestMeadows(tileX, tileY).length > 0) &&
          getForestFireflyDescriptors(tileX, tileY).length > 0
        ) {
          humidTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(humidTile).not.toBeNull();

    const [leadFirefly] = getForestFireflyDescriptors(humidTile!.x, humidTile!.y);
    expect(leadFirefly).toBeDefined();
    expect(leadFirefly?.habitatKind).not.toBe('tree');
  });
});
