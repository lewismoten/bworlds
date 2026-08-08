import { describe, expect, it } from 'vitest';
import { DEFAULT_DAY_LENGTH_MS } from '@bworlds/core';
import type { CreateMapContext } from '@bworlds/plugin-api';
import {
  getTownBuildingPlots,
  getTownBuildings,
  getTownNpcPlacements,
  getTownNpcs,
  getTownProfile,
} from '@bworlds/town-support';
import {
  createTownMapPlugin,
  hasTownFence,
  isTownApproachPath,
  isTownBuildingPlot,
  isTownConnectorRoad,
  isTownFenceTile,
  isTownFrontageRoad,
  isTownMainRoad,
  resolveTownTile,
} from './index.ts';

const TOWN_ORIGIN = { x: 10, y: -4 };

function createTownMap() {
  const plugin = createTownMapPlugin();
  const map = plugin.createMap?.({
    context: {
      id: 'town:test',
      label: 'Town',
      type: 'town',
      depth: 1,
      origin: TOWN_ORIGIN,
    },
    seed: 'spec',
    plugins: {
      decorateTownTile({ tile }) {
        return tile;
      },
    } as CreateMapContext['plugins'],
  });

  if (!map) {
    throw new Error('Expected town map plugin to create a town map.');
  }

  return map;
}

describe('map town', () => {
  it('lays out an approach path from every building plot to the frontage road', () => {
    const map = createTownMap();
    const buildingTiles: Array<{ x: number; y: number }> = [];

    for (let y = -12; y <= 12; y += 1) {
      for (let x = -12; x <= 12; x += 1) {
        if (map.getTile(x, y).building) {
          buildingTiles.push({ x, y });
        }
      }
    }

    expect(buildingTiles.length).toBeGreaterThan(0);
    expect(
      buildingTiles.every(({ x, y }) => {
        const pathY = y > 0 ? y - 1 : y + 1;
        const frontageY = y > 0 ? y - 2 : y + 2;
        return (
          map.getTile(x, pathY).kind === 'road' &&
          map.getTile(x, frontageY).kind === 'road'
        );
      })
    ).toBe(true);
  });

  it('connects frontage roads back to the central crossroad with side streets', () => {
    const map = createTownMap();

    expect(map.getTile(-8, -3).kind).toBe('road');
    expect(map.getTile(-8, -2).kind).toBe('road');
    expect(map.getTile(-8, -1).kind).toBe('road');
    expect(map.getTile(-8, 0).kind).toBe('road');
    expect(map.getTile(4, 3).kind).toBe('road');
    expect(map.getTile(4, 2).kind).toBe('road');
    expect(map.getTile(4, 1).kind).toBe('road');
    expect(map.getTile(4, 0).kind).toBe('road');
  });

  it('resolves town tile roles through shared layout helpers', () => {
    expect(isTownBuildingPlot(0, 5)).toBe(true);
    expect(isTownApproachPath(0, 4)).toBe(true);
    expect(isTownFrontageRoad(0, 3)).toBe(true);
    expect(isTownConnectorRoad(4, 2)).toBe(true);
    expect(hasTownFence(0, 5)).toBe(false);
    expect(hasTownFence(2, 5)).toBe(true);
    expect(isTownFenceTile(1, 4)).toBe(true);
    expect(isTownFenceTile(2, 4)).toBe(false);
    expect(isTownMainRoad(0, 1)).toBe(true);
    expect(
      resolveTownTile({
        contextId: 'town:test',
        x: 0,
        y: 5,
        localX: 12,
        localY: 17,
        centerX: 12,
        centerY: 12,
        buildingSummaries: new Map(
          getTownBuildings(TOWN_ORIGIN.x, TOWN_ORIGIN.y).map((building) => [
            `${building.x}:${building.y}`,
            building,
          ])
        ),
      })
    ).toMatchObject({
      kind: 'shop',
      building: {
        id: 'town:10:-4:building:0:5',
        role: 'professional',
      },
    });
  });

  it('adds fenced lots with an opening aligned to the building approach path', () => {
    const map = createTownMap();
    const fencedPlot = getTownBuildingPlots(TOWN_ORIGIN.x, TOWN_ORIGIN.y).find((plot) =>
      hasTownFence(plot.x, plot.y)
    );

    if (!fencedPlot) {
      throw new Error('Expected a fenced plot in the deterministic town layout.');
    }

    expect(map.getTile(fencedPlot.x, fencedPlot.y)).toMatchObject({
      kind: 'shop',
      building: { id: `town:${TOWN_ORIGIN.x}:${TOWN_ORIGIN.y}:building:${fencedPlot.x}:${fencedPlot.y}` },
    });
    const pathY = fencedPlot.y > 0 ? fencedPlot.y - 1 : fencedPlot.y + 1;
    const backY = fencedPlot.y > 0 ? fencedPlot.y + 1 : fencedPlot.y - 1;

    expect(map.getTile(fencedPlot.x - 1, pathY).kind).toBe('wall');
    expect(map.getTile(fencedPlot.x + 1, pathY).kind).toBe('wall');
    expect(map.getTile(fencedPlot.x, pathY).kind).toBe('road');
    expect(map.getTile(fencedPlot.x - 1, fencedPlot.y).kind).toBe('wall');
    expect(map.getTile(fencedPlot.x + 1, fencedPlot.y).kind).toBe('wall');
    expect(map.getTile(fencedPlot.x - 1, backY).kind).toBe('wall');
    expect(map.getTile(fencedPlot.x, backY).kind).toBe('wall');
    expect(map.getTile(fencedPlot.x + 1, backY).kind).toBe('wall');
  });

  it('uses the shared town profile for level, population, and building mix', () => {
    const map = createTownMap();
    const profile = getTownProfile(TOWN_ORIGIN.x, TOWN_ORIGIN.y);
    const plots = getTownBuildingPlots(TOWN_ORIGIN.x, TOWN_ORIGIN.y);
    const buildingTiles: Array<{ role?: string }> = [];

    for (let y = -12; y <= 12; y += 1) {
      for (let x = -12; x <= 12; x += 1) {
        const tile = map.getTile(x, y);
        if (tile.building) {
          const building = tile.building as { role?: string };
          buildingTiles.push({ role: building.role });
        }
      }
    }

    expect(buildingTiles).toHaveLength(profile.buildingCount);
    expect(
      buildingTiles.filter((tile) => tile.role === 'professional')
    ).toHaveLength(profile.professionalBuildings);
    expect(
      buildingTiles.filter((tile) => tile.role === 'residential')
    ).toHaveLength(profile.residentialBuildings);
    expect(map.getTile(0, 0).note).toContain(`Level ${profile.level}`);
    expect(map.getTile(0, 0).note).toContain(String(profile.population));
    expect(plots).toHaveLength(profile.buildingCount);
  });

  it('surfaces shared npc rosters on town building tiles', () => {
    const map = createTownMap();
    const buildings = getTownBuildings(TOWN_ORIGIN.x, TOWN_ORIGIN.y);
    const npcs = getTownNpcs(TOWN_ORIGIN.x, TOWN_ORIGIN.y);
    const residence = buildings.find((building) => building.role === 'residential');
    const workplace = buildings.find((building) => building.role === 'professional');

    if (!residence || !workplace) {
      throw new Error('Expected the deterministic town layout to include residences and workplaces.');
    }

    const residenceTile = map.getTile(residence.x, residence.y);
    const workplaceTile = map.getTile(workplace.x, workplace.y);
    const residentName = npcs.find((npc) => npc.id === residence.residentNpcIds[0])?.name;

    expect(residenceTile.building).toMatchObject({
      id: residence.id,
      role: 'residential',
      residents: residence.residentNpcIds,
    });
    expect(workplaceTile.building).toMatchObject({
      id: workplace.id,
      role: 'professional',
      workers: workplace.workerNpcIds,
    });
    expect(residentName).toBeTruthy();
    expect(residenceTile.note).toContain('Residents:');
    expect(workplaceTile.note).toContain('Workers:');
  });

  it('shows commuting town npcs on road tiles and workers at their jobs by time of day', () => {
    const map = createTownMap();
    const middayState = {
      timeMs: DEFAULT_DAY_LENGTH_MS * 0.5,
    } as const;
    const workplace = getTownBuildings(TOWN_ORIGIN.x, TOWN_ORIGIN.y).find(
      (building) => building.role === 'professional'
    );

    if (!workplace) {
      throw new Error('Expected at least one professional building in town.');
    }

    const workingTile = map.getTile(workplace.x, workplace.y, middayState as never);
    expect(
      ((workingTile.building as { present?: string[] } | undefined)?.present?.length ?? 0)
    ).toBeGreaterThan(0);
    expect(workingTile.note).toContain('Present:');

    let commuteSample:
      | { x: number; y: number; name: string; timeMs: number }
      | null = null;
    for (let minute = 0; minute < 24 * 60; minute += 15) {
      const timeMs = DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60));
      const placement = getTownNpcPlacements(
        TOWN_ORIGIN.x,
        TOWN_ORIGIN.y,
        timeMs
      ).find(
        (entry) =>
          (entry.state === 'commuting-to-work' ||
            entry.state === 'commuting-home') &&
          map.getTile(entry.x, entry.y, { timeMs } as never).kind === 'road'
      );
      if (placement) {
        commuteSample = {
          x: placement.x,
          y: placement.y,
          name: placement.name,
          timeMs,
        };
        break;
      }
    }

    if (!commuteSample) {
      throw new Error('Expected at least one commuting npc in the deterministic schedule.');
    }

    const commuteTile = map.getTile(
      commuteSample.x,
      commuteSample.y,
      { timeMs: commuteSample.timeMs } as never
    );

    expect(commuteTile.kind).toBe('road');
    expect(commuteTile.npcs).toContain(commuteSample.name);
    expect(commuteTile.note).toContain('Present:');
  });
});
