import { describe, expect, it, vi } from 'vitest';
import { getRenderParticleEmitterMetadata } from '@bworlds/plugin-api';

vi.mock('@bworlds/three-support', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@bworlds/three-support')>();
  return {
    ...actual,
    createPaintedCanvasTexture() {
      return { colorSpace: '', needsUpdate: false };
    },
  };
});

import {
  createForestTilePlugin,
  getForestBirds,
  getForestBushes,
  getForestCarvings,
  getForestFireflyDescriptors,
  getForestMeadows,
  getForestOwls,
  getForestSpiders,
  getForestTreeHollows,
  getForestWebs,
} from './index.ts';
import {
  FakeFloat32BufferAttribute,
  FakeGroup,
  FakeInstancedMesh,
  FakeMaterial,
  FakePointLight,
  FakePoints,
  createForestTestState,
  fakeThree,
} from './testing/forest-test-support.ts';

describe('tile forest close detail wildlife', () => {
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
    expect(nearSpiderInstances.every((instance) => instance.count > 0)).toBe(
      true
    );
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
      (
        fireflyPoints[0]?.geometry?.attributes.position as
          FakeFloat32BufferAttribute | undefined
      )?.array.length
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

    expect(fireflyPoints.every((points) => points.visible === false)).toBe(
      true
    );
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
      (fireflyPoints[0]?.material as FakeMaterial | undefined)?.uniforms
        ?.uTimeMs?.value
    ).toBe(1200);
    expect(
      (fireflyPoints[0]?.material as FakeMaterial | undefined)?.uniforms
        ?.uActivation?.value
    ).toBe(1);
    expect(
      (
        fireflyPoints[0]?.geometry?.attributes.position as
          FakeFloat32BufferAttribute | undefined
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

    expect(fireflyPoints.every((points) => points.visible === false)).toBe(
      true
    );
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
          { particleCount?: number } | undefined
      )?.particleCount ?? 0;
    const positionCount =
      (
        fireflyPoints?.geometry?.attributes.position as
          FakeFloat32BufferAttribute | undefined
      )?.array.length ?? 0;

    expect(fireflyNodes).toHaveLength(1);
    expect(fireflyPoints).toBeInstanceOf(FakePoints);
    expect(particleCount).toBeGreaterThan(0);
    expect(positionCount).toBe(particleCount * 3);
    expect(getRenderParticleEmitterMetadata(fireflyPoints)).toEqual({
      particleCount,
      label: 'fireflies',
    });
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
    expect(
      (firstPoints?.material as FakeMaterial | undefined)?.options
    ).toMatchObject({
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
    expect(
      (firstPoints?.material as FakeMaterial | undefined)?.options.map
    ).toBeUndefined();
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
          FakeFloat32BufferAttribute | undefined
      )?.array.length ?? 0;
    const midCount =
      (
        midPoints?.geometry?.attributes.position as
          FakeFloat32BufferAttribute | undefined
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

    const [leadFirefly] = getForestFireflyDescriptors(
      humidTile!.x,
      humidTile!.y
    );
    expect(leadFirefly).toBeDefined();
    expect(leadFirefly?.habitatKind).not.toBe('tree');
  });
});
