import { describe, expect, it } from 'vitest';
import { DEFAULT_DAY_LENGTH_MS } from '@bworlds/core';
import {
  getTownBuildingPlots,
  getTownBuildings,
  getTownNpcPlacements,
  getTownNpcs,
  getTownProfile,
} from './index.ts';

function getStartHourForFamily(family: string | undefined): number {
  switch (family) {
    case 'inn':
      return 6;
    case 'market':
      return 7;
    case 'temple':
      return 6;
    case 'stable':
      return 5;
    case 'school':
      return 8;
    case 'town-hall':
      return 9;
    case 'smithy':
    case 'workshop':
    default:
      return 8;
  }
}

describe('town support', () => {
  it('derives deterministic town levels, population, and building counts', () => {
    const profile = getTownProfile(3, 7);

    expect(profile).toEqual(getTownProfile(3, 7));
    expect(profile.level).toBeGreaterThanOrEqual(1);
    expect(profile.level).toBeLessThanOrEqual(4);
    expect(profile.population).toBeGreaterThan(profile.buildingCount);
  });

  it('returns a building mix that matches the shared town profile counts', () => {
    const profile = getTownProfile(3, 7);
    const plots = getTownBuildingPlots(3, 7);

    expect(plots).toHaveLength(profile.buildingCount);
    expect(
      plots.filter((plot) => plot.role === 'professional')
    ).toHaveLength(profile.professionalBuildings);
    expect(
      plots.filter((plot) => plot.role === 'residential')
    ).toHaveLength(profile.residentialBuildings);
  });

  it('generates deterministic town npc rosters with homes, names, parents, and ages', () => {
    const npcs = getTownNpcs(3, 7);
    const buildings = getTownBuildings(3, 7);
    const residences = new Set(
      buildings
        .filter((building) => building.role === 'residential')
        .map((building) => building.id)
    );

    expect(npcs).toEqual(getTownNpcs(3, 7));
    expect(npcs).toHaveLength(getTownProfile(3, 7).population);
    expect(
      npcs.every(
        (npc) =>
          npc.name.length > 0 &&
          npc.age >= 1 &&
          residences.has(npc.residenceBuildingId) &&
          npc.mother.name.length > 0 &&
          npc.father.name.length > 0
      )
    ).toBe(true);
  });

  it('assigns working adults to matching town workplaces while elders retire', () => {
    const npcs = getTownNpcs(3, 7);
    const buildings = new Map(
      getTownBuildings(3, 7).map((building) => [building.id, building])
    );

    const workingAdults = npcs.filter(
      (npc) => npc.lifeStage === 'adult' && npc.age >= 18 && npc.age < 65
    );
    const elders = npcs.filter((npc) => npc.lifeStage === 'elder');

    expect(workingAdults.length).toBeGreaterThan(0);
    expect(
      workingAdults.every((npc) => {
        const workplace = npc.workplaceBuildingId
          ? buildings.get(npc.workplaceBuildingId)
          : null;
        return (
          typeof npc.profession === 'string' &&
          npc.profession.length > 0 &&
          npc.professionStatus === 'working' &&
          workplace?.role === 'professional' &&
          workplace.professionFamily === npc.workplaceProfessionFamily
        );
      })
    ).toBe(true);
    expect(
      elders.every(
        (npc) =>
          npc.professionStatus === 'retired' &&
          npc.profession == null &&
          npc.workplaceBuildingId == null
      )
    ).toBe(true);
  });

  it('places working adults at home, on commute routes, and at workplaces by time of day', () => {
    const npcs = getTownNpcs(3, 7);
    const worker = npcs.find(
      (npc) =>
        npc.professionStatus === 'working' &&
        typeof npc.workplaceBuildingId === 'string'
    );
    const buildings = new Map(
      getTownBuildings(3, 7).map((building) => [building.id, building])
    );

    if (!worker || !worker.workplaceBuildingId) {
      throw new Error('Expected a working adult in the deterministic town roster.');
    }

    const home = buildings.get(worker.residenceBuildingId);
    const workplace = buildings.get(worker.workplaceBuildingId);

    if (!home || !workplace) {
      throw new Error('Expected home and workplace building records.');
    }

    const midnight = getTownNpcPlacements(3, 7, 0).find(
      (placement) => placement.npcId === worker.id
    );
    const morningCommute = getTownNpcPlacements(
      3,
      7,
      DEFAULT_DAY_LENGTH_MS *
        ((getStartHourForFamily(worker.workplaceProfessionFamily) - 0.5) / 24)
    ).find((placement) => placement.npcId === worker.id);
    const midday = getTownNpcPlacements(
      3,
      7,
      DEFAULT_DAY_LENGTH_MS * 0.5
    ).find((placement) => placement.npcId === worker.id);

    expect(midnight).toMatchObject({
      x: home.x,
      y: home.y,
      state: 'home',
    });
    expect(morningCommute?.state).toBe('commuting-to-work');
    expect(
      morningCommute?.x === home.x &&
        morningCommute?.y === home.y
    ).toBe(false);
    expect(
      morningCommute?.x === workplace.x &&
        morningCommute?.y === workplace.y
    ).toBe(false);
    expect(midday).toMatchObject({
      x: workplace.x,
      y: workplace.y,
      state: 'working',
    });
  });

  it('scales building counts upward for at least some higher-level towns', () => {
    const signatures = new Set(
      [
        [1, 1],
        [12, -4],
        [25, 9],
        [48, -16],
        [120, -80],
      ].map(([x, y]) => {
        const profile = getTownProfile(x, y);
        return `${profile.level}:${profile.buildingCount}:${profile.population}`;
      })
    );

    expect(signatures.size).toBeGreaterThan(1);
  });
});
