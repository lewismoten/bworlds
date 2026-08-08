import { describe, expect, it } from 'vitest';
import {
  getTownBuildingPlots,
  getTownBuildings,
  getTownNpcs,
  getTownProfile,
} from './index.ts';

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
