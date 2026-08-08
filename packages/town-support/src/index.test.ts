import { describe, expect, it } from 'vitest';
import { DEFAULT_DAY_LENGTH_MS } from '@bworlds/core';
import {
  getTownBuildingPlots,
  getTownBuildings,
  getTownBuildingServiceState,
  getTownNpcPlacements,
  getTownNpcQuestStates,
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

  it('only exposes building services while the right professionals are present', () => {
    const professionalBuilding = getTownBuildings(3, 7).find(
      (building) => building.role === 'professional'
    );

    if (!professionalBuilding) {
      throw new Error('Expected a professional building in the deterministic town layout.');
    }

    const middayServices = getTownBuildingServiceState(
      3,
      7,
      professionalBuilding.id,
      DEFAULT_DAY_LENGTH_MS * 0.5
    );
    const midnightServices = getTownBuildingServiceState(
      3,
      7,
      professionalBuilding.id,
      0
    );

    expect(middayServices.presentNpcNames.length).toBeGreaterThan(0);
    expect(middayServices.availableServices.length).toBeGreaterThan(0);
    expect(midnightServices.presentNpcNames).toHaveLength(0);
    expect(midnightServices.availableServices).toHaveLength(0);
  });

  it('generates npc quest offers from home, work, and commute states using player progress', () => {
    const daytimeWork = getTownNpcQuestStates(3, 7, DEFAULT_DAY_LENGTH_MS * 0.5, {
      level: 2,
      profession: 'courier',
    });
    const nighttimeHome = getTownNpcQuestStates(3, 7, DEFAULT_DAY_LENGTH_MS * 0.92, {
      level: 1,
    });
    const followUp = getTownNpcQuestStates(3, 7, DEFAULT_DAY_LENGTH_MS * 0.5, {
      level: 6,
      profession: 'scholar',
      completedQuestIds: daytimeWork
        .flatMap((entry) => entry.offers)
        .filter((offer) => offer.type === 'delivery')
        .map((offer) => offer.id),
    });

    expect(
      daytimeWork.some((entry) => entry.offers.some((offer) => offer.type === 'delivery'))
    ).toBe(true);
    expect(
      nighttimeHome.some((entry) => entry.offers.some((offer) => offer.type === 'collection'))
    ).toBe(true);
    expect(
      followUp.some((entry) => entry.offers.some((offer) => offer.type === 'investigation'))
    ).toBe(true);
  });

  it('keeps deterministic town data stable after many cache evictions', () => {
    const profile = { level: 5, profession: 'courier', completedQuestIds: ['quest:one'] };
    const captureBuildings = () =>
      getTownBuildings(3, 7).map((building) => ({
        ...building,
        residentNpcIds: [...building.residentNpcIds],
        workerNpcIds: [...building.workerNpcIds],
      }));

    const baselineNpcs = getTownNpcs(3, 7);
    const baselineBuildings = captureBuildings();
    const baselinePlacements = getTownNpcPlacements(3, 7, DEFAULT_DAY_LENGTH_MS * 0.5);
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

    for (let index = 0; index < 1200; index += 1) {
      const tileX = index % 40;
      const tileY = Math.floor(index / 40) - 15;
      const timeMs = DEFAULT_DAY_LENGTH_MS * ((index % 48) / 48);
      getTownBuildings(tileX, tileY);
      getTownNpcs(tileX, tileY);
      getTownNpcPlacements(tileX, tileY, timeMs);
      getTownNpcQuestStates(tileX, tileY, timeMs, {
        level: 1 + (index % 6),
        profession: index % 2 === 0 ? 'guard' : 'scholar',
        completedQuestIds: [`quest:${index % 9}`],
      });
      const buildings = getTownBuildings(tileX, tileY);
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
  });

  it('surfaces rescue and revenge quest offers from generated town schedules', () => {
    const townSamples: Array<[number, number]> = [
      [3, 7],
      [10, -4],
      [25, 9],
      [48, -16],
      [120, -80],
    ];
    let rescueStates: ReturnType<typeof getTownNpcQuestStates> = [];
    let revengeStates: ReturnType<typeof getTownNpcQuestStates> = [];

    outerRescue: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        rescueStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 4,
            profession: 'healer',
          }
        );
        if (
          rescueStates.some((entry) =>
            entry.offers.some((offer) => offer.type === 'rescue')
          )
        ) {
          break outerRescue;
        }
      }
    }

    outerRevenge: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        const baseStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 6,
            profession: 'guard',
          }
        );
        const prerequisiteIds = baseStates
          .flatMap((entry) => entry.offers)
          .filter((offer) => offer.type === 'recovery' || offer.type === 'tracking')
          .map((offer) => offer.id);
        if (prerequisiteIds.length === 0) {
          continue;
        }
        revengeStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 6,
            profession: 'guard',
            completedQuestIds: prerequisiteIds,
          }
        );
        if (
          revengeStates.some((entry) =>
            entry.offers.some((offer) => offer.type === 'revenge')
          )
        ) {
          break outerRevenge;
        }
      }
    }

    expect(
      rescueStates.some((entry) =>
        entry.offers.some((offer) => offer.type === 'rescue')
      )
    ).toBe(true);
    expect(
      revengeStates.some((entry) =>
        entry.offers.some((offer) => offer.type === 'revenge')
      )
    ).toBe(true);
  });

  it('surfaces kill quest offers from generated town schedules', () => {
    let killStates: ReturnType<typeof getTownNpcQuestStates> = [];

    outerKill: for (let x = -4; x <= 12; x += 1) {
      for (let y = -4; y <= 12; y += 1) {
        for (let minute = 9 * 60; minute <= 16 * 60; minute += 30) {
          killStates = getTownNpcQuestStates(
            x,
            y,
            DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
            {
              level: 6,
              profession: 'guard',
            }
          );
          if (killStates.some((entry) => entry.offers.some((offer) => offer.type === 'kill'))) {
            break outerKill;
          }
        }
      }
    }

    expect(
      killStates.some((entry) => entry.offers.some((offer) => offer.type === 'kill'))
    ).toBe(true);
  });

  it('surfaces defense quest offers from generated town schedules', () => {
    let defenseStates: ReturnType<typeof getTownNpcQuestStates> = [];

    outerDefense: for (let x = -4; x <= 12; x += 1) {
      for (let y = -4; y <= 12; y += 1) {
        for (let minute = 15 * 60; minute <= 23 * 60; minute += 30) {
          defenseStates = getTownNpcQuestStates(
            x,
            y,
            DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
            {
              level: 6,
              profession: 'healer',
            }
          );
          if (
            defenseStates.some((entry) =>
              entry.offers.some((offer) => offer.type === 'defense')
            )
          ) {
            break outerDefense;
          }
        }
      }
    }

    expect(
      defenseStates.some((entry) =>
        entry.offers.some((offer) => offer.type === 'defense')
      )
    ).toBe(true);
  });

  it('surfaces stealth quest offers from generated town schedules', () => {
    let stealthStates: ReturnType<typeof getTownNpcQuestStates> = [];

    outerStealth: for (let x = -4; x <= 12; x += 1) {
      for (let y = -4; y <= 12; y += 1) {
        for (let minute = 14 * 60; minute <= 22 * 60; minute += 30) {
          stealthStates = getTownNpcQuestStates(
            x,
            y,
            DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
            {
              level: 7,
              profession: 'scout',
            }
          );
          if (
            stealthStates.some((entry) =>
              entry.offers.some((offer) => offer.type === 'stealth')
            )
          ) {
            break outerStealth;
          }
        }
      }
    }

    expect(
      stealthStates.some((entry) =>
        entry.offers.some((offer) => offer.type === 'stealth')
      )
    ).toBe(true);
  });

  it('surfaces assassination quest offers from generated town schedules', () => {
    let assassinationStates: ReturnType<typeof getTownNpcQuestStates> = [];

    outerAssassination: for (let x = -4; x <= 12; x += 1) {
      for (let y = -4; y <= 12; y += 1) {
        for (let minute = 10 * 60; minute <= 17 * 60; minute += 30) {
          assassinationStates = getTownNpcQuestStates(
            x,
            y,
            DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
            {
              level: 8,
              profession: 'guard',
            }
          );
          if (
            assassinationStates.some((entry) =>
              entry.offers.some((offer) => offer.type === 'assassination')
            )
          ) {
            break outerAssassination;
          }
        }
      }
    }

    expect(
      assassinationStates.some((entry) =>
        entry.offers.some((offer) => offer.type === 'assassination')
      )
    ).toBe(true);
  });

  it('surfaces capture quest offers from generated town schedules', () => {
    let captureStates: ReturnType<typeof getTownNpcQuestStates> = [];

    outerCapture: for (let x = -4; x <= 12; x += 1) {
      for (let y = -4; y <= 12; y += 1) {
        for (let minute = 10 * 60; minute <= 17 * 60; minute += 30) {
          captureStates = getTownNpcQuestStates(
            x,
            y,
            DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
            {
              level: 8,
              profession: 'guard',
            }
          );
          if (
            captureStates.some((entry) =>
              entry.offers.some((offer) => offer.type === 'capture')
            )
          ) {
            break outerCapture;
          }
        }
      }
    }

    expect(
      captureStates.some((entry) =>
        entry.offers.some((offer) => offer.type === 'capture')
      )
    ).toBe(true);
  });

  it('surfaces companion quest offers after prior quests establish trust with the same npc', () => {
    const townSamples: Array<[number, number]> = [
      [3, 7],
      [10, -4],
      [25, 9],
      [48, -16],
      [120, -80],
    ];
    let companionStates: ReturnType<typeof getTownNpcQuestStates> = [];

    outerCompanion: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        const baseStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 7,
            profession: 'scholar',
          }
        );
        const prerequisiteIds = baseStates
          .flatMap((entry) => entry.offers)
          .filter((offer) =>
            offer.type === 'escort' ||
            offer.type === 'tracking' ||
            offer.type === 'rescue' ||
            offer.type === 'training' ||
            offer.type === 'puzzle' ||
            offer.type === 'investigation' ||
            offer.type === 'challenge' ||
            offer.type === 'survival' ||
            offer.type === 'delivery' ||
            offer.type === 'diplomacy'
          )
          .map((offer) => offer.id);
        if (prerequisiteIds.length === 0) {
          continue;
        }
        companionStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 7,
            profession: 'scholar',
            completedQuestIds: prerequisiteIds,
          }
        );
        if (
          companionStates.some((entry) =>
            entry.offers.some((offer) => offer.type === 'companion')
          )
        ) {
          break outerCompanion;
        }
      }
    }

    expect(
      companionStates.some((entry) =>
        entry.offers.some((offer) => offer.type === 'companion')
      )
    ).toBe(true);
  });

  it('surfaces crafting and training quest offers from matching town professions', () => {
    const crafting = getTownNpcQuestStates(3, 7, DEFAULT_DAY_LENGTH_MS * 0.5, {
      level: 5,
      profession: 'smith',
    });
    const townSamples: Array<[number, number]> = [
      [3, 7],
      [10, -4],
      [25, 9],
      [48, -16],
      [120, -80],
    ];
    let training: ReturnType<typeof getTownNpcQuestStates> = [];
    outer: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        training = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 2,
            profession: 'scholar',
          }
        );
        if (training.some((entry) => entry.offers.some((offer) => offer.type === 'training'))) {
          break outer;
        }
      }
    }

    expect(
      crafting.some((entry) => entry.offers.some((offer) => offer.type === 'crafting'))
    ).toBe(true);
    expect(
      training.some((entry) => entry.offers.some((offer) => offer.type === 'training'))
    ).toBe(true);
  });

  it('surfaces fetch and recovery quest offers from generated town schedules', () => {
    const fetchStates = getTownNpcQuestStates(3, 7, DEFAULT_DAY_LENGTH_MS * 0.88, {
      level: 3,
    });
    const townSamples: Array<[number, number]> = [
      [3, 7],
      [10, -4],
      [25, 9],
      [48, -16],
      [120, -80],
    ];
    let recoveryStates: ReturnType<typeof getTownNpcQuestStates> = [];

    outer: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        recoveryStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 5,
            profession: 'guard',
          }
        );
        if (recoveryStates.some((entry) => entry.offers.some((offer) => offer.type === 'recovery'))) {
          break outer;
        }
      }
    }

    expect(
      fetchStates.some((entry) => entry.offers.some((offer) => offer.type === 'fetch'))
    ).toBe(true);
    expect(
      recoveryStates.some((entry) => entry.offers.some((offer) => offer.type === 'recovery'))
    ).toBe(true);
  });

  it('surfaces tracking and timed quest offers from generated town schedules', () => {
    const townSamples: Array<[number, number]> = [
      [3, 7],
      [10, -4],
      [25, 9],
      [48, -16],
      [120, -80],
    ];
    let trackingStates: ReturnType<typeof getTownNpcQuestStates> = [];
    let timedStates: ReturnType<typeof getTownNpcQuestStates> = [];

    outerTracking: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        trackingStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 4,
            profession: 'scout',
          }
        );
        if (trackingStates.some((entry) => entry.offers.some((offer) => offer.type === 'tracking'))) {
          break outerTracking;
        }
      }
    }

    outerTimed: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        timedStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 4,
            profession: 'courier',
          }
        );
        if (timedStates.some((entry) => entry.offers.some((offer) => offer.type === 'timed'))) {
          break outerTimed;
        }
      }
    }

    expect(
      trackingStates.some((entry) => entry.offers.some((offer) => offer.type === 'tracking'))
    ).toBe(true);
    expect(
      timedStates.some((entry) => entry.offers.some((offer) => offer.type === 'timed'))
    ).toBe(true);
  });

  it('surfaces exploration and activation quest offers from generated town schedules', () => {
    const townSamples: Array<[number, number]> = [
      [3, 7],
      [10, -4],
      [25, 9],
      [48, -16],
      [120, -80],
    ];
    let explorationStates: ReturnType<typeof getTownNpcQuestStates> = [];
    let activationStates: ReturnType<typeof getTownNpcQuestStates> = [];

    outerExploration: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        explorationStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 4,
            profession: 'scout',
          }
        );
        if (
          explorationStates.some((entry) =>
            entry.offers.some((offer) => offer.type === 'exploration')
          )
        ) {
          break outerExploration;
        }
      }
    }

    outerActivation: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        activationStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 4,
            profession: 'healer',
          }
        );
        if (
          activationStates.some((entry) =>
            entry.offers.some((offer) => offer.type === 'activation')
          )
        ) {
          break outerActivation;
        }
      }
    }

    expect(
      explorationStates.some((entry) =>
        entry.offers.some((offer) => offer.type === 'exploration')
      )
    ).toBe(true);
    expect(
      activationStates.some((entry) =>
        entry.offers.some((offer) => offer.type === 'activation')
      )
    ).toBe(true);
  });

  it('surfaces puzzle and survival quest offers from generated town schedules', () => {
    const townSamples: Array<[number, number]> = [
      [3, 7],
      [10, -4],
      [25, 9],
      [48, -16],
      [120, -80],
    ];
    let puzzleStates: ReturnType<typeof getTownNpcQuestStates> = [];
    let survivalStates: ReturnType<typeof getTownNpcQuestStates> = [];

    outerPuzzle: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        puzzleStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 4,
            profession: 'scholar',
          }
        );
        if (
          puzzleStates.some((entry) =>
            entry.offers.some((offer) => offer.type === 'puzzle')
          )
        ) {
          break outerPuzzle;
        }
      }
    }

    outerSurvival: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        survivalStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 5,
            profession: 'healer',
          }
        );
        if (
          survivalStates.some((entry) =>
            entry.offers.some((offer) => offer.type === 'survival')
          )
        ) {
          break outerSurvival;
        }
      }
    }

    expect(
      puzzleStates.some((entry) =>
        entry.offers.some((offer) => offer.type === 'puzzle')
      )
    ).toBe(true);
    expect(
      survivalStates.some((entry) =>
        entry.offers.some((offer) => offer.type === 'survival')
      )
    ).toBe(true);
  });

  it('surfaces challenge and destruction quest offers from generated town schedules', () => {
    const townSamples: Array<[number, number]> = [
      [3, 7],
      [10, -4],
      [25, 9],
      [48, -16],
      [120, -80],
    ];
    let challengeStates: ReturnType<typeof getTownNpcQuestStates> = [];
    let destructionStates: ReturnType<typeof getTownNpcQuestStates> = [];

    outerChallenge: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        challengeStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 4,
            profession: 'courier',
          }
        );
        if (
          challengeStates.some((entry) =>
            entry.offers.some((offer) => offer.type === 'challenge')
          )
        ) {
          break outerChallenge;
        }
      }
    }

    outerDestruction: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        destructionStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 5,
            profession: 'guard',
          }
        );
        if (
          destructionStates.some((entry) =>
            entry.offers.some((offer) => offer.type === 'destruction')
          )
        ) {
          break outerDestruction;
        }
      }
    }

    expect(
      challengeStates.some((entry) =>
        entry.offers.some((offer) => offer.type === 'challenge')
      )
    ).toBe(true);
    expect(
      destructionStates.some((entry) =>
        entry.offers.some((offer) => offer.type === 'destruction')
      )
    ).toBe(true);
  });

  it('surfaces diplomacy and choice quests from generated town schedules', () => {
    const townSamples: Array<[number, number]> = [
      [3, 7],
      [10, -4],
      [25, 9],
      [48, -16],
      [120, -80],
    ];
    let diplomacyStates: ReturnType<typeof getTownNpcQuestStates> = [];
    let choiceStates: ReturnType<typeof getTownNpcQuestStates> = [];

    outerDiplomacy: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        diplomacyStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 5,
            profession: 'merchant',
          }
        );
        if (diplomacyStates.some((entry) => entry.offers.some((offer) => offer.type === 'diplomacy'))) {
          break outerDiplomacy;
        }
      }
    }

    outerChoice: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        choiceStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 6,
            profession: 'guard',
          }
        );
        if (choiceStates.some((entry) => entry.offers.some((offer) => offer.type === 'choice'))) {
          break outerChoice;
        }
      }
    }

    expect(
      diplomacyStates.some((entry) => entry.offers.some((offer) => offer.type === 'diplomacy'))
    ).toBe(true);
    expect(
      choiceStates.some((entry) => entry.offers.some((offer) => offer.type === 'choice'))
    ).toBe(true);
  });

  it('surfaces faction and construction quests from generated town schedules', () => {
    const townSamples: Array<[number, number]> = [
      [3, 7],
      [10, -4],
      [25, 9],
      [48, -16],
      [120, -80],
    ];
    let factionStates: ReturnType<typeof getTownNpcQuestStates> = [];
    let constructionStates: ReturnType<typeof getTownNpcQuestStates> = [];

    outerFaction: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        factionStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 5,
            profession: 'merchant',
          }
        );
        if (factionStates.some((entry) => entry.offers.some((offer) => offer.type === 'faction'))) {
          break outerFaction;
        }
      }
    }

    outerConstruction: for (const [x, y] of townSamples) {
      for (let minute = 0; minute < 24 * 60; minute += 30) {
        constructionStates = getTownNpcQuestStates(
          x,
          y,
          DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
          {
            level: 4,
            profession: 'smith',
          }
        );
        if (constructionStates.some((entry) => entry.offers.some((offer) => offer.type === 'construction'))) {
          break outerConstruction;
        }
      }
    }

    expect(
      factionStates.some((entry) => entry.offers.some((offer) => offer.type === 'faction'))
    ).toBe(true);
    expect(
      constructionStates.some((entry) => entry.offers.some((offer) => offer.type === 'construction'))
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
