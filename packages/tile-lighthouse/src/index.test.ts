import {
  DEFAULT_DAY_LENGTH_MS,
  DEFAULT_YEAR_LENGTH_DAYS,
  getDaylightCycleState,
} from '@bworlds/core';
import {
  getRenderBudgetPartMetadata,
  RENDER_BUDGET_PART_PRIORITIES,
} from '@bworlds/plugin-api';
import { describe, expect, it } from 'vitest';
import {
  createLighthouseTilePlugin,
  LIGHTHOUSE_STYLE_CACHE_MAX_ENTRIES,
} from './index.ts';

class FakeGeometry {
  args: number[];

  constructor(...args: number[]) {
    this.args = args;
  }
}

class FakeMaterial {
  opacity?: number;
  emissiveIntensity?: number;
  options: Record<string, unknown>;

  constructor(options: Record<string, unknown> = {}) {
    this.options = options;
    if (typeof options.opacity === 'number') {
      this.opacity = options.opacity;
    }
    if (typeof options.emissiveIntensity === 'number') {
      this.emissiveIntensity = options.emissiveIntensity;
    }
  }
}

class FakeMatrix4 {
  position = { x: 0, y: 0, z: 0 };
  scale = { x: 1, y: 1, z: 1 };

  makeScale(x: number, y: number, z: number) {
    this.scale = { x, y, z };
    return this;
  }

  setPosition(x: number, y: number, z: number) {
    this.position = { x, y, z };
    return this;
  }

  clone() {
    const next = new FakeMatrix4();
    next.position = { ...this.position };
    next.scale = { ...this.scale };
    return next;
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
  castShadow?: boolean;
  receiveShadow?: boolean;

  constructor(
    public geometry?: object,
    public material?: FakeMaterial | FakeMaterial[]
  ) {
    super();
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
    this.matrices[index] = matrix.clone();
  }
}

class FakePointLight extends FakeNode {
  intensity: number;

  constructor(
    color?: unknown,
    intensity = 0,
    distance?: number,
    decay?: number
  ) {
    super();
    void color;
    void distance;
    void decay;
    this.intensity = intensity;
  }
}

const fakeThree = {
  Group: FakeGroup,
  Mesh: FakeMesh,
  InstancedMesh: FakeInstancedMesh,
  Matrix4: FakeMatrix4,
  PointLight: FakePointLight,
  MeshStandardMaterial: FakeMaterial,
  MeshBasicMaterial: FakeMaterial,
  BoxGeometry: FakeGeometry,
  CylinderGeometry: FakeGeometry,
  ConeGeometry: FakeGeometry,
  PlaneGeometry: FakeGeometry,
  SphereGeometry: FakeGeometry,
  DoubleSide: 'double-side',
} as const;

describe('tile lighthouse', () => {
  it('builds the full-detail lighthouse progressively before returning the final model', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const build = tile?.create3DModelProgressive?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    });

    expect(build).toBeDefined();
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 1,
        totalSteps: 4,
        label: 'tower-shell',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 2,
        totalSteps: 4,
        label: 'lantern-frame',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 3,
        totalSteps: 4,
        label: 'balcony-and-panes',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 4,
        totalSteps: 4,
        label: 'beam-and-beacon',
      },
    });

    const completed = build?.next();
    const model = completed?.value as FakeNode | undefined;
    expect(completed?.done).toBe(true);
    expect(collectBeamMeshes(model)).toHaveLength(3);
    expect(findBeamPivot(model)).toBeDefined();
  });

  it('keeps the synchronous lighthouse build aligned with the progressive final model', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const syncModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const progressiveBuild = tile?.create3DModelProgressive?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    });
    let progressiveModel: FakeNode | undefined;
    while (true) {
      const next = progressiveBuild?.next();
      if (next?.done) {
        progressiveModel = next.value as FakeNode | undefined;
        break;
      }
    }

    expect(collectBeamMeshes(progressiveModel)).toHaveLength(
      collectBeamMeshes(syncModel).length
    );
    expect(
      collectTaggedInstancedMeshes(
        progressiveModel,
        'lighthouseFrameRingInstanced'
      )
    ).toHaveLength(
      collectTaggedInstancedMeshes(syncModel, 'lighthouseFrameRingInstanced')
        .length
    );
    expect(
      collectTaggedInstancedMeshes(
        progressiveModel,
        'lighthousePaneInstanced'
      )
    ).toHaveLength(
      collectTaggedInstancedMeshes(syncModel, 'lighthousePaneInstanced').length
    );
  });

  it('reuses shared tower materials across repeated model builds', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const first = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const second = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 8,
      tileY: 9,
    }) as FakeNode | undefined;

    const sharedCount = countSharedMaterialReferences(first, second);
    const firstChildren = first?.children as FakeMesh[] | undefined;
    const secondChildren = second?.children as FakeMesh[] | undefined;
    const firstBeamPivot = firstChildren?.[5] as FakeGroup | undefined;
    const secondBeamPivot = secondChildren?.[5] as FakeGroup | undefined;
    const firstBeamMeshes = collectBeamMeshes(first);
    const secondBeamMeshes = collectBeamMeshes(second);

    expect(sharedCount).toBeGreaterThanOrEqual(5);
    expect(firstBeamMeshes).toHaveLength(3);
    expect(firstBeamMeshes[0]?.material).toBe(secondBeamMeshes[0]?.material);
    expect(firstChildren?.[0]?.geometry).toBe(secondChildren?.[0]?.geometry);
    expect(
      (firstBeamPivot?.children[0] as FakeMesh | undefined)?.geometry
    ).toBe((secondBeamPivot?.children[0] as FakeMesh | undefined)?.geometry);
    expect(
      (firstBeamMeshes[0]?.material as FakeMaterial | undefined)?.options.color
    ).toBe(
      (secondBeamMeshes[0]?.material as FakeMaterial | undefined)?.options.color
    );
  });

  it('varies lighthouse beam colors across different regions while keeping local styles shared', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const coordinates = [
      { x: 4, y: 5 },
      { x: 40, y: 5 },
      { x: 4, y: 40 },
      { x: 40, y: 40 },
    ];
    const beamColors = new Set<string>();

    coordinates.forEach(({ x, y }) => {
      const model = tile?.create3DModel?.({
        three: fakeThree as never,
        state: {} as never,
        tile: { kind: 'lighthouse' } as never,
        tileX: x,
        tileY: y,
      }) as FakeNode | undefined;
      const beamMeshes = collectBeamMeshes(model);
      const color = (beamMeshes[0]?.material as FakeMaterial | undefined)
        ?.options.color;
      if (typeof color === 'string') {
        beamColors.add(color);
      }
    });

    expect(beamColors.size).toBeGreaterThan(1);
  });

  it('varies lighthouse sweep configuration by region while keeping local settings shared', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const first = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const second = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 8,
      tileY: 9,
    }) as FakeNode | undefined;
    const differentRegions = [
      { x: 4, y: 5 },
      { x: 40, y: 5 },
      { x: 4, y: 40 },
      { x: 40, y: 40 },
    ].map(
      ({ x, y }) =>
        tile?.create3DModel?.({
          three: fakeThree as never,
          state: {} as never,
          tile: { kind: 'lighthouse' } as never,
          tileX: x,
          tileY: y,
        }) as FakeNode | undefined
    );
    const firstPivot = findBeamPivot(first);
    const secondPivot = findBeamPivot(second);
    const signatures = new Set(
      differentRegions
        .map((model) => {
          const pivot = findBeamPivot(model);
          return pivot
            ? `${pivot.userData?.lighthouseBeamRotationDirection}:${pivot.userData?.lighthouseBeamRotationDurationMs}`
            : null;
        })
        .filter((value): value is string => typeof value === 'string')
    );

    expect(firstPivot?.userData?.lighthouseBeamRotationDurationMs).toBe(
      secondPivot?.userData?.lighthouseBeamRotationDurationMs
    );
    expect(firstPivot?.userData?.lighthouseBeamRotationDirection).toBe(
      secondPivot?.userData?.lighthouseBeamRotationDirection
    );
    expect(signatures.size).toBeGreaterThan(1);
  });

  it('recreates lighthouse regional styles deterministically after bounded cache eviction churn', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const baseline = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;

    for (
      let index = 0;
      index < LIGHTHOUSE_STYLE_CACHE_MAX_ENTRIES + 48;
      index += 1
    ) {
      tile?.create3DModel?.({
        three: fakeThree as never,
        state: {} as never,
        tile: { kind: 'lighthouse' } as never,
        tileX: index * 18,
        tileY: 0,
      });
    }

    const resolved = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const baselineBeams = collectBeamMeshes(baseline);
    const resolvedBeams = collectBeamMeshes(resolved);
    const baselinePivot = findBeamPivot(baseline);
    const resolvedPivot = findBeamPivot(resolved);

    expect(
      (resolvedBeams[0]?.material as FakeMaterial | undefined)?.options.color
    ).toBe(
      (baselineBeams[0]?.material as FakeMaterial | undefined)?.options.color
    );
    expect(resolvedPivot?.userData?.lighthouseBeamRotationDurationMs).toBe(
      baselinePivot?.userData?.lighthouseBeamRotationDurationMs
    );
    expect(resolvedPivot?.userData?.lighthouseBeamRotationDirection).toBe(
      baselinePivot?.userData?.lighthouseBeamRotationDirection
    );
  });

  it('reports a cheaper low-detail lighthouse cost estimate before model generation', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');

    const fullEstimate = tile?.estimate3DModelCost?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      detailLevel: 'full',
    });
    const lowEstimate = tile?.estimate3DModelCost?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      detailLevel: 'low',
    });

    expect(fullEstimate).toEqual({
      object3dCount: 22,
      groupCount: 2,
      meshCount: 19,
      geometryCount: 19,
      materialCount: 9,
      lightCount: 1,
      shadowLightCount: 0,
      vertexCount: 720,
      triangleCount: 240,
    });
    expect(lowEstimate).toEqual({
      object3dCount: 7,
      groupCount: 2,
      meshCount: 6,
      geometryCount: 6,
      materialCount: 3,
      lightCount: 0,
      shadowLightCount: 0,
      vertexCount: 144,
      triangleCount: 48,
    });
    expect(
      lowEstimate && fullEstimate ? lowEstimate.meshCount : Infinity
    ).toBeLessThan(
      fullEstimate ? (fullEstimate.meshCount ?? -Infinity) : -Infinity
    );
  });

  it('reports actual lighthouse model cost after generation using the same shared budget shape', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      detailLevel: 'full',
    });

    expect(
      tile?.report3DModelCost?.({
        three: fakeThree as never,
        state: {} as never,
        tile: { kind: 'lighthouse' } as never,
        tileX: 4,
        tileY: 5,
        detailLevel: 'full',
        model,
      })
    ).toEqual({
      object3dCount: 22,
      groupCount: 2,
      meshCount: 19,
      geometryCount: 19,
      materialCount: 9,
      lightCount: 1,
      shadowLightCount: 0,
      vertexCount: 720,
      triangleCount: 240,
    });
  });

  it('builds a tapered emissive beam from the lantern room without beam shadows', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const beamMeshes = collectBeamMeshes(model);

    expect(beamMeshes).toHaveLength(3);
    expect(beamMeshes.map((beam) => beam.rotation.z)).toEqual(
      expect.arrayContaining([Math.PI / 2])
    );
    expect(beamMeshes.map((beam) => beam.position.x)).toEqual(
      expect.arrayContaining([
        expect.closeTo(0.69, 6),
        expect.closeTo(1.81, 6),
        expect.closeTo(3.12, 6),
      ])
    );
    expect(
      beamMeshes.map(
        (beam) => (beam.geometry as FakeGeometry | undefined)?.args[0]
      )
    ).toEqual([0.1, 0.19, 0.32]);
    expect(
      beamMeshes.map(
        (beam) => (beam.geometry as FakeGeometry | undefined)?.args[1]
      )
    ).toEqual([1.1, 1.22, 1.48]);
    beamMeshes.forEach((beam) => {
      expect(beam.castShadow).toBe(false);
      expect(beam.receiveShadow).toBe(false);
      expect((beam.material as FakeMaterial)?.options.emissive).toBe('#ffe9a8');
    });
  });

  it('builds a lantern room with glass, metal framing, and a dedicated lens source', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const glassMeshes = collectTaggedMeshes(model, 'lighthouseGlass');
    const frameMeshes = collectTaggedMeshes(model, 'lighthouseFrame');
    const lensMeshes = collectTaggedMeshes(model, 'lighthouseLens');
    const balconyMeshes = collectTaggedMeshes(model, 'lighthouseBalcony');
    const balconyRailMeshes = collectTaggedMeshes(
      model,
      'lighthouseBalconyRail'
    );
    const wallGlowMeshes = collectTaggedMeshes(model, 'lighthouseWallGlow');
    const frameRingInstances = collectTaggedInstancedMeshes(
      model,
      'lighthouseFrameRingInstanced'
    );
    const framePostInstances = collectTaggedInstancedMeshes(
      model,
      'lighthouseFramePostInstanced'
    );
    const balconyRailPostInstances = collectTaggedInstancedMeshes(
      model,
      'lighthouseBalconyRailPostInstanced'
    );
    const paneInstances = collectTaggedInstancedMeshes(
      model,
      'lighthousePaneInstanced'
    );
    const wallGlowInstances = collectTaggedInstancedMeshes(
      model,
      'lighthouseWallGlowInstanced'
    );

    expect(glassMeshes).toHaveLength(1);
    expect(frameMeshes).toHaveLength(2);
    expect(lensMeshes).toHaveLength(1);
    expect(balconyMeshes).toHaveLength(1);
    expect(balconyRailMeshes).toHaveLength(2);
    expect(wallGlowMeshes).toHaveLength(2);
    expect(frameRingInstances).toHaveLength(1);
    expect(frameRingInstances[0]?.count).toBe(2);
    expect(framePostInstances).toHaveLength(1);
    expect(framePostInstances[0]?.count).toBe(4);
    expect(balconyRailPostInstances).toHaveLength(1);
    expect(balconyRailPostInstances[0]?.count).toBe(4);
    expect(paneInstances).toHaveLength(2);
    expect(paneInstances.map((pane) => pane.count)).toEqual([2, 2]);
    expect(wallGlowInstances).toHaveLength(2);
    expect(wallGlowInstances.map((glow) => glow.count)).toEqual([2, 2]);
    expect(
      (glassMeshes[0]?.material as FakeMaterial | undefined)?.options
        .transparent
    ).toBe(true);
    expect(
      (glassMeshes[0]?.material as FakeMaterial | undefined)?.options.opacity
    ).toBeCloseTo(0.42, 6);
    expect(
      (frameMeshes[0]?.material as FakeMaterial | undefined)?.options.color
    ).toBe('#5d6673');
    expect(
      (lensMeshes[0]?.material as FakeMaterial | undefined)?.options.emissive
    ).toBe('#ffe9a8');
    expect(
      (balconyMeshes[0]?.material as FakeMaterial | undefined)?.options.color
    ).toBe('#8b7358');
    expect(
      (balconyRailMeshes[0]?.material as FakeMaterial | undefined)?.options
        .color
    ).toBe('#5d6673');
    expect(balconyMeshes[0]?.position.y).toBeLessThan(
      glassMeshes[0]?.position.y ?? Infinity
    );
    expect(
      (wallGlowMeshes[0]?.material as FakeMaterial | undefined)?.options
        .emissive
    ).toBe('#f8d7a1');
  });

  it('assigns lower budget priorities to optional decorations than structural lighthouse geometry', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;

    const base = model?.children[0];
    const tower = model?.children[1];
    const glass = collectTaggedMeshes(model, 'lighthouseGlass')[0];
    const balcony = collectTaggedMeshes(model, 'lighthouseBalcony')[0];
    const wallGlow = collectTaggedMeshes(model, 'lighthouseWallGlow')[0];

    expect(getRenderBudgetPartMetadata(base)).toEqual({
      optional: false,
      priority: RENDER_BUDGET_PART_PRIORITIES.essentialStructure,
      label: 'base',
    });
    expect(getRenderBudgetPartMetadata(tower)).toEqual({
      optional: false,
      priority: RENDER_BUDGET_PART_PRIORITIES.essentialStructure,
      label: 'tower',
    });
    expect(getRenderBudgetPartMetadata(glass)).toEqual({
      optional: true,
      priority: RENDER_BUDGET_PART_PRIORITIES.optionalDecoration,
      label: 'lantern-glass',
    });
    expect(getRenderBudgetPartMetadata(balcony)).toEqual({
      optional: true,
      priority: RENDER_BUDGET_PART_PRIORITIES.optionalDecoration,
      label: 'balcony-deck',
    });
    expect(getRenderBudgetPartMetadata(wallGlow)).toEqual({
      optional: true,
      priority: RENDER_BUDGET_PART_PRIORITIES.optionalFeature,
      label: 'wall-glow',
    });
    expect(
      getRenderBudgetPartMetadata(glass)?.priority ?? Infinity
    ).toBeLessThan(getRenderBudgetPartMetadata(base)?.priority ?? -Infinity);
    expect(
      getRenderBudgetPartMetadata(balcony)?.priority ?? Infinity
    ).toBeLessThan(getRenderBudgetPartMetadata(tower)?.priority ?? -Infinity);
  });

  it('builds a simplified low-detail lighthouse silhouette with a cheap rotating beam and no point light', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const full = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      detailLevel: 'full',
    }) as FakeNode | undefined;
    const low = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      detailLevel: 'low',
    }) as FakeNode | undefined;

    const lowBeamMeshes = collectBeamMeshes(low);
    const lowPointLights: FakePointLight[] = [];
    low?.traverse((node) => {
      if (node instanceof FakePointLight) {
        lowPointLights.push(node);
      }
    });

    expect(lowBeamMeshes).toHaveLength(2);
    expect(low?.children.length ?? 0).toBeLessThan(
      full?.children.length ?? Infinity
    );
    expect(collectTaggedMeshes(low, 'lighthouseLens')).toHaveLength(0);
    expect(lowPointLights).toHaveLength(0);
    expect(findBeamPivot(low)).not.toBeNull();
  });

  it('activates the lighthouse beam early in dense fog near daytime', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      detailLevel: 'low',
    }) as FakeNode | undefined;

    const beamNodes = collectBeamMeshes(model);
    expect(beamNodes).toHaveLength(2);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' },
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: { daylight: 1, twilight: 0, night: 0, sunAltitude: 0.18 } as never,
      environment: {
        weather: {
          current: createWeatherCondition({
            kind: 'fog',
            intensity: 0.95,
            visibility: 0.12,
          }),
        },
      },
    });

    expect(beamNodes.some((beam) => beam.visible)).toBe(true);
    expect(
      beamNodes.some(
        (beam) => ((beam.material as FakeMaterial).opacity ?? 0) > 0.02
      )
    ).toBe(true);
  });

  it('keeps clear daytime lighthouse beams effectively suppressed', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;

    const beamNodes = collectBeamMeshes(model);
    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' },
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: { daylight: 1, twilight: 0, night: 0, sunAltitude: 0.52 } as never,
      environment: {
        weather: {
          current: createWeatherCondition({
            kind: 'clouds',
            intensity: 0.05,
            visibility: 1,
          }),
        },
      },
    });

    expect(beamNodes.every((beam) => beam.visible === false)).toBe(true);
    expect(
      beamNodes.every(
        (beam) => ((beam.material as FakeMaterial).opacity ?? 0) <= 0.001
      )
    ).toBe(true);
  });

  it('reduces far beam intensity during heavy storms while fog boosts nearer scattering', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const beamNodes = collectBeamMeshes(model);
    const [nearBeam, , farBeam] = beamNodes;

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' },
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: {
        daylight: 0,
        twilight: 0.2,
        night: 0.8,
        sunAltitude: -0.18,
      } as never,
      environment: {
        weather: {
          current: createWeatherCondition({
            kind: 'fog',
            intensity: 0.92,
            visibility: 0.16,
          }),
        },
      },
    });

    const fogNearOpacity =
      (nearBeam?.material as FakeMaterial | undefined)?.opacity ?? 0;
    const fogFarEmissive =
      (farBeam?.material as FakeMaterial | undefined)?.emissiveIntensity ?? 0;

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' },
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: {
        daylight: 0,
        twilight: 0.2,
        night: 0.8,
        sunAltitude: -0.18,
      } as never,
      environment: {
        weather: {
          current: createWeatherCondition({
            kind: 'heavy-rain',
            intensity: 0.95,
            visibility: 0.18,
          }),
        },
      },
    });

    const stormNearOpacity =
      (nearBeam?.material as FakeMaterial | undefined)?.opacity ?? 0;
    const stormFarEmissive =
      (farBeam?.material as FakeMaterial | undefined)?.emissiveIntensity ?? 0;

    expect(fogNearOpacity).toBeGreaterThan(0.02);
    expect(stormNearOpacity).toBeGreaterThan(0.01);
    expect(stormFarEmissive).toBeLessThan(fogFarEmissive);
  });

  it('sweeps and fades the beam by distance at night', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {
        player: { x: 0, y: 0, facing: 0 },
        getCurrentContext() {
          return { id: 'overworld', type: 'overworld', depth: 0 };
        },
        getCurrentTile() {
          return { kind: 'plains' };
        },
        getTileDefinition() {
          return {
            name: 'Plains',
            color: '#000000',
            miniColor: '#111111',
            walkable: true,
            wallHeight: 0,
          };
        },
      },
      tile: {
        kind: 'lighthouse',
        poi: { type: 'lighthouse', name: 'Beacon' },
      } as never,
      tileX: 4,
      tileY: 5,
    });

    const beamNodes: FakeMesh[] = [];
    let beamPivot: FakeGroup | null = null;
    (model as FakeNode)?.traverse((node) => {
      if (node.userData?.lighthouseBeam) {
        beamNodes.push(node as FakeMesh);
      }
      if (node.userData?.lighthouseBeamPivot) {
        beamPivot = node as FakeGroup;
      }
    });

    expect(beamNodes).toHaveLength(3);
    expect(beamPivot).not.toBeNull();
    const rotationDurationMs =
      typeof beamPivot?.userData?.lighthouseBeamRotationDurationMs === 'number'
        ? beamPivot.userData.lighthouseBeamRotationDurationMs
        : 2100;
    const rotationDirection =
      beamPivot?.userData?.lighthouseBeamRotationDirection === -1 ? -1 : 1;

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {
        player: { x: 0, y: 0, facing: 0 },
        getCurrentContext() {
          return { id: 'overworld', type: 'overworld', depth: 0 };
        },
        getCurrentTile() {
          return { kind: 'plains' };
        },
        getTileDefinition() {
          return {
            name: 'Plains',
            color: '#000000',
            miniColor: '#111111',
            walkable: true,
            wallHeight: 0,
          };
        },
      },
      tile: { kind: 'lighthouse' },
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {},
    });

    beamNodes.forEach((beamNode) => {
      expect(beamNode.visible).toBe(false);
      expect(
        (beamNode.material as FakeMaterial)?.opacity ?? 0
      ).toBeLessThanOrEqual(0.01);
      expect(
        (beamNode.material as FakeMaterial)?.emissiveIntensity ?? 0
      ).toBeLessThanOrEqual(0.01);
    });

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {
        player: { x: 0, y: 0, facing: 0 },
        getCurrentContext() {
          return { id: 'overworld', type: 'overworld', depth: 0 };
        },
        getCurrentTile() {
          return { kind: 'plains' };
        },
        getTileDefinition() {
          return {
            name: 'Plains',
            color: '#000000',
            miniColor: '#111111',
            walkable: true,
            wallHeight: 0,
          };
        },
      },
      tile: { kind: 'lighthouse' },
      tileX: 4,
      tileY: 5,
      model,
      timeMs: rotationDurationMs / 3,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    beamNodes.forEach((beamNode) => {
      expect(beamNode.visible).toBe(true);
    });
    expect(
      (beamNodes[0]?.material as FakeMaterial)?.opacity ?? 0
    ).toBeGreaterThan((beamNodes[1]?.material as FakeMaterial)?.opacity ?? 0);
    expect(
      (beamNodes[1]?.material as FakeMaterial)?.opacity ?? 0
    ).toBeGreaterThan((beamNodes[2]?.material as FakeMaterial)?.opacity ?? 0);
    expect(
      (beamNodes[0]?.material as FakeMaterial)?.emissiveIntensity ?? 0
    ).toBeGreaterThan(
      (beamNodes[2]?.material as FakeMaterial)?.emissiveIntensity ?? 0
    );
    const expectedRotation =
      ((((rotationDurationMs / 3 / rotationDurationMs) *
        Math.PI *
        2 *
        rotationDirection) %
        (Math.PI * 2)) +
        Math.PI * 2) %
      (Math.PI * 2);
    expect(beamPivot?.rotation.y).toBeCloseTo(expectedRotation, 6);
  });

  it('activates from the shared seasonal sunset cycle and stays off after sunrise', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const beamNodes = collectBeamMeshes(model);
    const summerDay = Math.floor(DEFAULT_YEAR_LENGTH_DAYS * 0.25);
    const winterDay = Math.floor(DEFAULT_YEAR_LENGTH_DAYS * 0.75);
    const summerNoon = getDaylightCycleState(
      (summerDay + 0.5) * DEFAULT_DAY_LENGTH_MS,
      {
        dayLengthMs: DEFAULT_DAY_LENGTH_MS,
        yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
      }
    );
    const summerAfterSunset = getCycleOffsetFromBoundary(
      summerDay,
      'sunset',
      0.04
    );
    const summerAfterSunrise = getCycleOffsetFromBoundary(
      summerDay,
      'sunrise',
      0.08
    );
    const winterAfterSunset = getCycleOffsetFromBoundary(
      winterDay,
      'sunset',
      0.08
    );

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: summerNoon,
      environment: {},
    });
    expect(beamNodes.some((beam) => beam.visible)).toBe(false);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: summerAfterSunset,
      environment: {},
    });
    const summerSunsetOpacity =
      (beamNodes[0]?.material as FakeMaterial | undefined)?.opacity ?? 0;
    expect(beamNodes.some((beam) => beam.visible)).toBe(true);
    expect(summerSunsetOpacity).toBeGreaterThan(0);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: summerAfterSunrise,
      environment: {},
    });
    expect(beamNodes.some((beam) => beam.visible)).toBe(false);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: winterAfterSunset,
      environment: {},
    });
    const winterSunsetOpacity =
      (beamNodes[0]?.material as FakeMaterial | undefined)?.opacity ?? 0;
    expect(winterSunsetOpacity).toBeGreaterThan(0);
    expect(summerAfterSunset.sunsetProgress).toBeGreaterThan(
      winterAfterSunset.sunsetProgress
    );
  });

  it('fades the lighthouse beam gradually across the sunset boundary', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const beamNodes = collectBeamMeshes(model);
    const summerDay = Math.floor(DEFAULT_YEAR_LENGTH_DAYS * 0.25);
    const beforeSunset = getCycleOffsetFromBoundary(summerDay, 'sunset', -0.08);
    const atSunset = getCycleOffsetFromBoundary(summerDay, 'sunset', -0.02);
    const afterSunset = getCycleOffsetFromBoundary(summerDay, 'sunset', 0.02);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: beforeSunset,
      environment: {},
    });
    const beforeOpacity =
      (beamNodes[0]?.material as FakeMaterial | undefined)?.opacity ?? 0;

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: atSunset,
      environment: {},
    });
    const atOpacity =
      (beamNodes[0]?.material as FakeMaterial | undefined)?.opacity ?? 0;

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: afterSunset,
      environment: {},
    });
    const afterOpacity =
      (beamNodes[0]?.material as FakeMaterial | undefined)?.opacity ?? 0;

    expect(beforeOpacity).toBeLessThan(atOpacity);
    expect(atOpacity).toBeLessThan(afterOpacity);
    expect(beamNodes.some((beam) => beam.visible)).toBe(true);
  });

  it('keeps the lantern lens glowing at night even when the beam points away', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const lens = collectTaggedMeshes(model, 'lighthouseLens')[0];
    const beamPivot = findBeamPivot(model);
    const rotationDurationMs =
      typeof beamPivot?.userData?.lighthouseBeamRotationDurationMs === 'number'
        ? beamPivot.userData.lighthouseBeamRotationDurationMs
        : 2100;

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: rotationDurationMs * 0.5,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    expect(lens?.visible).toBe(true);
    expect(
      (lens?.material as FakeMaterial | undefined)?.emissiveIntensity ?? 0
    ).toBeGreaterThan(1.5);
    expect(beamPivot?.rotation.y).toBeGreaterThanOrEqual(0);
  });

  it('adds a warm glow to nearby tower surfaces at night', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const wallGlowMeshes = collectTaggedMeshes(model, 'lighthouseWallGlow');

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    expect(wallGlowMeshes).toHaveLength(2);
    wallGlowMeshes.forEach((mesh) => {
      expect(
        (mesh.material as FakeMaterial | undefined)?.emissiveIntensity ?? 0
      ).toBeGreaterThan(0.4);
    });
  });
});

function countSharedMaterialReferences(
  left: FakeNode | undefined,
  right: FakeNode | undefined
): number {
  const leftMaterials = collectMeshMaterials(left);
  const rightMaterials = collectMeshMaterials(right);
  let sharedCount = 0;

  leftMaterials.forEach((material) => {
    if (rightMaterials.has(material)) {
      sharedCount += 1;
    }
  });

  return sharedCount;
}

function collectMeshMaterials(root: FakeNode | undefined): Set<FakeMaterial> {
  const materials = new Set<FakeMaterial>();
  root?.traverse((node) => {
    if (node instanceof FakeMesh) {
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => materials.add(material));
      } else if (node.material) {
        materials.add(node.material);
      }
    }
  });
  return materials;
}

function collectBeamMeshes(root: FakeNode | undefined): FakeMesh[] {
  const beams: FakeMesh[] = [];
  root?.traverse((node) => {
    if (node.userData?.lighthouseBeam) {
      beams.push(node as FakeMesh);
    }
  });
  return beams;
}

function collectTaggedMeshes(
  root: FakeNode | undefined,
  key: string
): FakeMesh[] {
  const meshes: FakeMesh[] = [];
  root?.traverse((node) => {
    if (node.userData?.[key]) {
      meshes.push(node as FakeMesh);
    }
  });
  return meshes;
}

function collectTaggedInstancedMeshes(
  root: FakeNode | undefined,
  key: string
): FakeInstancedMesh[] {
  const meshes: FakeInstancedMesh[] = [];
  root?.traverse((node) => {
    if (node instanceof FakeInstancedMesh && node.userData?.[key]) {
      meshes.push(node);
    }
  });
  return meshes;
}

function findBeamPivot(root: FakeNode | undefined): FakeGroup | undefined {
  let pivot: FakeGroup | undefined;
  root?.traverse((node) => {
    if (node.userData?.lighthouseBeamPivot) {
      pivot = node as FakeGroup;
    }
  });
  return pivot;
}

function getCycleOffsetFromBoundary(
  dayNumber: number,
  boundary: 'sunrise' | 'sunset',
  offsetProgress: number
) {
  const anchor = getDaylightCycleState(dayNumber * DEFAULT_DAY_LENGTH_MS, {
    dayLengthMs: DEFAULT_DAY_LENGTH_MS,
    yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
  });
  const progress =
    boundary === 'sunrise' ? anchor.sunriseProgress : anchor.sunsetProgress;
  return getDaylightCycleState(
    (dayNumber + progress + offsetProgress) * DEFAULT_DAY_LENGTH_MS,
    {
      dayLengthMs: DEFAULT_DAY_LENGTH_MS,
      yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
    }
  );
}

function createWeatherCondition(
  overrides: Partial<{
    kind: string;
    intensity: number;
    visibility: number;
  }> = {}
) {
  const intensity = overrides.intensity ?? 0.5;
  const visibility = overrides.visibility ?? 0.8;
  return {
    kind: (overrides.kind ?? 'clouds') as
      'clouds' | 'wind' | 'fog' | 'light-rain' | 'heavy-rain' | 'snow' | 'hail',
    label: 'Weather',
    intensity,
    cloudCover: intensity,
    windStrength: intensity,
    precipitation: intensity,
    visibility,
    temperature: 54,
    front: {
      id: 'front',
      kind: 'cold' as const,
      intensity,
      humidityShift: 0,
      temperatureShift: 0,
      windDirectionDegrees: 180,
      speed: intensity,
    },
  };
}
