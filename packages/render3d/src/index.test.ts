import { describe, expect, it } from 'vitest';
import {
  getFacingVisibilityBucket,
  getSkyAuroraSignature,
  getSkyConstellationSignature,
  getSkyEventSignature,
  getSkyMilkyWaySignature,
  getVisibleWorldTileBuildOrder,
  syncDynamicTileNodes,
  shouldRenderWorldTile,
} from './index.ts';

type SkySignatureCycle = Parameters<typeof getSkyConstellationSignature>[0];

describe('render3d visibility helpers', () => {
  it('keeps nearby tiles visible regardless of facing', () => {
    expect(
      shouldRenderWorldTile({
        playerTileX: 0,
        playerTileY: 0,
        tileX: -3,
        tileY: 0,
        facingAngle: 0,
      })
    ).toBe(true);
  });

  it('culls far tiles that are strongly behind the player', () => {
    expect(
      shouldRenderWorldTile({
        playerTileX: 0,
        playerTileY: 0,
        tileX: -12,
        tileY: 0,
        facingAngle: 0,
      })
    ).toBe(false);
    expect(
      shouldRenderWorldTile({
        playerTileX: 0,
        playerTileY: 0,
        tileX: 12,
        tileY: 0,
        facingAngle: 0,
      })
    ).toBe(true);
  });

  it('uses facing buckets so tiny turns do not thrash world sync', () => {
    expect(getFacingVisibilityBucket(0)).toBe(getFacingVisibilityBucket(0.1));
    expect(getFacingVisibilityBucket(0)).not.toBe(
      getFacingVisibilityBucket(Math.PI / 2)
    );
  });

  it('prioritizes nearby and forward-facing tiles in the incremental build order', () => {
    const buildOrder = getVisibleWorldTileBuildOrder({
      playerTileX: 0,
      playerTileY: 0,
      facingAngle: 0,
      chunkRadius: 4,
    });
    const firstKeys = buildOrder.slice(0, 6).map((entry) => entry.key);
    const frontIndex = buildOrder.findIndex((entry) => entry.key === '4:0');
    const rearIndex = buildOrder.findIndex((entry) => entry.key === '-4:0');

    expect(firstKeys).toContain('0:0');
    expect(firstKeys).toContain('1:0');
    expect(frontIndex).toBeGreaterThanOrEqual(0);
    expect(rearIndex).toBeGreaterThan(frontIndex);
  });

  it('uses coarse sky signatures so tiny celestial drift does not rebuild sky layers', () => {
    const baseCycle: SkySignatureCycle = {
      activeConstellationIndex: 1,
      yearProgress: 0.25,
      starsOpacity: 0.5,
      milkyWay: {
        azimuthOffset: 0.8,
        inclination: 1.1,
        width: 0.25,
        opacity: 0.12,
      },
      auroraBands: [
        {
          id: 'aurora-a',
          azimuthCenter: -1.2,
          altitude: 0.3,
          height: 0.4,
          intensity: 0.7,
          wavePhase: 0.2,
          span: 0.6,
          colorA: '#9df2ff',
          colorB: '#7cf7c5',
        },
      ],
      visibleEvents: [
        {
          type: 'meteor-shower',
          name: 'Burst',
          progress: 0.4,
          azimuth: 0.4,
          altitude: 0.5,
          visibility: 0.9,
          intensity: 0.8,
          trailLength: 3.6,
          color: '#ffffff',
          size: 0.2,
        },
      ],
    };
    const nearCycle: SkySignatureCycle = {
      ...baseCycle,
      yearProgress: 0.2501,
      milkyWay: {
        ...baseCycle.milkyWay,
        azimuthOffset: 0.801,
      },
      auroraBands: [
        {
          ...baseCycle.auroraBands[0],
          wavePhase: 0.21,
        },
      ],
      visibleEvents: [
        {
          ...baseCycle.visibleEvents[0],
          azimuth: 0.401,
        },
      ],
    };
    const farCycle: SkySignatureCycle = {
      ...baseCycle,
      yearProgress: 0.31,
      visibleEvents: [
        {
          ...baseCycle.visibleEvents[0],
          azimuth: 0.7,
        },
      ],
    };

    expect(getSkyConstellationSignature(nearCycle)).toBe(
      getSkyConstellationSignature(baseCycle)
    );
    expect(getSkyEventSignature(nearCycle)).toBe(getSkyEventSignature(baseCycle));
    expect(getSkyMilkyWaySignature(nearCycle)).toBe(
      getSkyMilkyWaySignature(baseCycle)
    );
    expect(getSkyAuroraSignature(nearCycle)).toBe(
      getSkyAuroraSignature(baseCycle)
    );
    expect(getSkyConstellationSignature(farCycle)).not.toBe(
      getSkyConstellationSignature(baseCycle)
    );
    expect(getSkyEventSignature(farCycle)).not.toBe(getSkyEventSignature(baseCycle));
  });

  it('syncs dynamic visible tile nodes through tile plugin hooks', () => {
    const calls: Array<{
      tileX: number;
      tileY: number;
      night: number;
      environmentId: string | undefined;
    }> = [];
    syncDynamicTileNodes(
      [
        {
          key: '4:5',
          tile: { kind: 'town' },
          tileX: 4,
          tileY: 5,
          node: {} as never,
          model: { id: 'model-town' },
          sync3DModel({ tileX, tileY, cycle, environment }) {
            calls.push({
              tileX,
              tileY,
              night: cycle.night,
              environmentId: environment.sky?.nightColor,
            });
          },
        },
      ],
      {
        three: {} as never,
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
        cycle: {
          daylight: 0,
          twilight: 0.2,
          night: 0.8,
        },
        environment: {
          sky: {
            nightColor: '#06111f',
          },
        },
      }
    );

    expect(calls).toEqual([
      {
        tileX: 4,
        tileY: 5,
        night: 0.8,
        environmentId: '#06111f',
      },
    ]);
  });
});
