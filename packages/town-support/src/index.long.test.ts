import { DEFAULT_DAY_LENGTH_MS } from '@bworlds/core';
import { describe, expect, it } from 'vitest';
import {
  getTownBuildingServiceState,
  getTownBuildings,
  getTownNpcPlacements,
  getTownNpcQuestStates,
  getTownNpcs,
  getTownProfile,
} from './index.ts';

describe('town support long checks', () => {
  it('keeps deterministic town data stable after many cache evictions', () => {
    const profile = {
      level: 5,
      profession: 'courier',
      completedQuestIds: ['quest:one'],
    };
    const captureBuildings = () =>
      getTownBuildings(3, 7).map((building) => ({
        ...building,
        residentNpcIds: [...building.residentNpcIds],
        workerNpcIds: [...building.workerNpcIds],
      }));

    const baselineNpcs = getTownNpcs(3, 7);
    const baselineBuildings = captureBuildings();
    const baselinePlacements = getTownNpcPlacements(
      3,
      7,
      DEFAULT_DAY_LENGTH_MS * 0.5
    );
    const baselineQuestStates = getTownNpcQuestStates(
      3,
      7,
      DEFAULT_DAY_LENGTH_MS * 0.5,
      profile
    );
    const baselineServices = getTownBuildingServiceState(
      3,
      7,
      baselineBuildings[0]!.id,
      DEFAULT_DAY_LENGTH_MS * 0.5,
      profile
    );
    const baselineProfile = getTownProfile(3, 7);

    for (let index = 0; index < 800; index += 1) {
      const tileX = index % 40;
      const tileY = Math.floor(index / 40) - 15;
      const timeMs = DEFAULT_DAY_LENGTH_MS * ((index % 48) / 48);
      const buildings = getTownBuildings(tileX, tileY);
      getTownNpcs(tileX, tileY);
      getTownNpcPlacements(tileX, tileY, timeMs);
      getTownNpcQuestStates(tileX, tileY, timeMs, {
        level: 1 + (index % 6),
        profession: index % 2 === 0 ? 'guard' : 'scholar',
        completedQuestIds: [`quest:${index % 9}`],
      });
      if (buildings[0]) {
        getTownBuildingServiceState(tileX, tileY, buildings[0].id, timeMs, {
          level: 1 + (index % 6),
          profession: index % 2 === 0 ? 'guard' : 'scholar',
          completedQuestIds: [`quest:${index % 9}`],
        });
      }
      getTownProfile(tileX, tileY);
    }

    expect(getTownNpcs(3, 7)).toEqual(baselineNpcs);
    expect(captureBuildings()).toEqual(baselineBuildings);
    expect(getTownNpcPlacements(3, 7, DEFAULT_DAY_LENGTH_MS * 0.5)).toEqual(
      baselinePlacements
    );
    expect(
      getTownNpcQuestStates(3, 7, DEFAULT_DAY_LENGTH_MS * 0.5, profile)
    ).toEqual(baselineQuestStates);
    expect(
      getTownBuildingServiceState(
        3,
        7,
        baselineBuildings[0]!.id,
        DEFAULT_DAY_LENGTH_MS * 0.5,
        profile
      )
    ).toEqual(baselineServices);
    expect(getTownProfile(3, 7)).toEqual(baselineProfile);
  }, 4000);

  it('keeps household rosters stable after bounded town cache churn', () => {
    const baseline = getTownNpcs(10, -4).map((npc) => ({
      id: npc.id,
      name: npc.name,
      age: npc.age,
      mother: npc.mother.name,
      father: npc.father.name,
      profession: npc.profession,
      workplaceBuildingId: npc.workplaceBuildingId,
    }));

    for (let index = 0; index < 320; index += 1) {
      getTownProfile(index - 160, Math.floor(index / 8) - 20);
      getTownBuildings(index - 160, Math.floor(index / 8) - 20);
      getTownNpcs(index - 160, Math.floor(index / 8) - 20);
    }

    expect(
      getTownNpcs(10, -4).map((npc) => ({
        id: npc.id,
        name: npc.name,
        age: npc.age,
        mother: npc.mother.name,
        father: npc.father.name,
        profession: npc.profession,
        workplaceBuildingId: npc.workplaceBuildingId,
      }))
    ).toEqual(baseline);
  });
});
