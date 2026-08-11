import { describe, expect, it } from 'vitest';
import { DEFAULT_DAY_LENGTH_MS } from '@bworlds/core';
import { getTownNpcQuestStates } from './index.ts';

const TOWN_SAMPLES: Array<[number, number]> = [
  [3, 7],
  [10, -4],
  [25, 9],
  [48, -16],
  [120, -80],
];
const GRID_TOWN_SAMPLES: Array<[number, number]> = [];
for (let x = -4; x <= 12; x += 1) {
  for (let y = -4; y <= 12; y += 1) {
    GRID_TOWN_SAMPLES.push([x, y]);
  }
}

type QuestStates = ReturnType<typeof getTownNpcQuestStates>;
type QuestOfferType = QuestStates[number]['offers'][number]['type'];
type QuestSearchResult = {
  x: number;
  y: number;
  minute: number;
  states: QuestStates;
};

function hasOffer(states: QuestStates, type: QuestOfferType): boolean {
  return states.some((entry) =>
    entry.offers.some((offer) => offer.type === type)
  );
}

function findQuestStates(
  predicate: (result: QuestSearchResult) => boolean,
  options: Parameters<typeof getTownNpcQuestStates>[3],
  minutes: Iterable<number>,
  coordinates: readonly [number, number][] = TOWN_SAMPLES
): QuestSearchResult | null {
  for (const [x, y] of coordinates) {
    for (const minute of minutes) {
      const states = getTownNpcQuestStates(
        x,
        y,
        DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
        options
      );
      const result = { x, y, minute, states };
      if (predicate(result)) {
        return result;
      }
    }
  }
  return null;
}

function createMinuteRange(start: number, end: number, step = 30): number[] {
  const minutes: number[] = [];
  for (let minute = start; minute <= end; minute += step) {
    minutes.push(minute);
  }
  return minutes;
}

describe('town support long-running checks', () => {
  it('surfaces rescue and revenge quest offers from generated town schedules', () => {
    const rescueStates = findQuestStates(
      ({ states }) => hasOffer(states, 'rescue'),
      {
        level: 4,
        profession: 'healer',
      },
      createMinuteRange(0, 23 * 60 + 30)
    );

    const revengeStates = findQuestStates(
      ({ x, y, minute, states }) => {
        const prerequisiteIds = states
          .flatMap((entry) => entry.offers)
          .filter(
            (offer) => offer.type === 'recovery' || offer.type === 'tracking'
          )
          .map((offer) => offer.id);
        if (prerequisiteIds.length === 0) {
          return false;
        }
        return hasOffer(
          getTownNpcQuestStates(
            x,
            y,
            DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
            {
              level: 6,
              profession: 'guard',
              completedQuestIds: prerequisiteIds,
            }
          ),
          'revenge'
        );
      },
      {
        level: 6,
        profession: 'guard',
      },
      createMinuteRange(0, 23 * 60 + 30)
    );

    expect(hasOffer(rescueStates?.states ?? [], 'rescue')).toBe(true);
    expect(revengeStates).not.toBeNull();
  });

  it('surfaces broad guard, healer, and scout quest variants across representative towns', () => {
    const killStates = findQuestStates(
      ({ states }) => hasOffer(states, 'kill'),
      { level: 6, profession: 'guard' },
      createMinuteRange(9 * 60, 16 * 60),
      GRID_TOWN_SAMPLES
    );
    const defenseStates = findQuestStates(
      ({ states }) => hasOffer(states, 'defense'),
      { level: 6, profession: 'healer' },
      createMinuteRange(15 * 60, 23 * 60),
      GRID_TOWN_SAMPLES
    );
    const stealthStates = findQuestStates(
      ({ states }) => hasOffer(states, 'stealth'),
      { level: 7, profession: 'scout' },
      createMinuteRange(14 * 60, 22 * 60),
      GRID_TOWN_SAMPLES
    );

    expect(hasOffer(killStates?.states ?? [], 'kill')).toBe(true);
    expect(hasOffer(defenseStates?.states ?? [], 'defense')).toBe(true);
    expect(hasOffer(stealthStates?.states ?? [], 'stealth')).toBe(true);
  });

  it('surfaces higher-level combat and trust follow-up quests', () => {
    const assassinationStates = findQuestStates(
      ({ states }) => hasOffer(states, 'assassination'),
      { level: 8, profession: 'guard' },
      createMinuteRange(10 * 60, 17 * 60),
      GRID_TOWN_SAMPLES
    );
    const captureStates = findQuestStates(
      ({ states }) => hasOffer(states, 'capture'),
      { level: 8, profession: 'guard' },
      createMinuteRange(10 * 60, 17 * 60),
      GRID_TOWN_SAMPLES
    );

    const companionStates = findQuestStates(
      ({ x, y, minute, states }) => {
        const prerequisiteIds = states
          .flatMap((entry) => entry.offers)
          .filter((offer) =>
            [
              'escort',
              'tracking',
              'rescue',
              'training',
              'puzzle',
              'investigation',
              'challenge',
              'survival',
              'delivery',
              'diplomacy',
            ].includes(offer.type)
          )
          .map((offer) => offer.id);
        if (prerequisiteIds.length === 0) {
          return false;
        }

        return hasOffer(
          getTownNpcQuestStates(
            x,
            y,
            DEFAULT_DAY_LENGTH_MS * (minute / (24 * 60)),
            {
              level: 7,
              profession: 'scholar',
              completedQuestIds: prerequisiteIds,
            }
          ),
          'companion'
        );
      },
      { level: 7, profession: 'scholar' },
      createMinuteRange(0, 23 * 60 + 30)
    );

    expect(hasOffer(assassinationStates?.states ?? [], 'assassination')).toBe(
      true
    );
    expect(hasOffer(captureStates?.states ?? [], 'capture')).toBe(true);
    expect(companionStates).not.toBeNull();
  });

  it('surfaces profession-specific and schedule-sensitive town quest offers', () => {
    const crafting = findQuestStates(
      ({ states }) => hasOffer(states, 'crafting'),
      { level: 5, profession: 'smith' },
      createMinuteRange(0, 23 * 60 + 30)
    );
    const training = findQuestStates(
      ({ states }) => hasOffer(states, 'training'),
      { level: 2, profession: 'scholar' },
      createMinuteRange(0, 23 * 60 + 30)
    );
    const recovery = findQuestStates(
      ({ states }) => hasOffer(states, 'recovery'),
      { level: 5, profession: 'guard' },
      createMinuteRange(0, 23 * 60 + 30)
    );
    const tracking = findQuestStates(
      ({ states }) => hasOffer(states, 'tracking'),
      { level: 4, profession: 'scout' },
      createMinuteRange(0, 23 * 60 + 30)
    );
    const timed = findQuestStates(
      ({ states }) => hasOffer(states, 'timed'),
      { level: 4, profession: 'courier' },
      createMinuteRange(0, 23 * 60 + 30)
    );

    expect(hasOffer(crafting?.states ?? [], 'crafting')).toBe(true);
    expect(hasOffer(training?.states ?? [], 'training')).toBe(true);
    expect(hasOffer(recovery?.states ?? [], 'recovery')).toBe(true);
    expect(hasOffer(tracking?.states ?? [], 'tracking')).toBe(true);
    expect(hasOffer(timed?.states ?? [], 'timed')).toBe(true);
  });

  it('surfaces exploration, puzzle, faction, and outcome-branching quest variants', () => {
    const exploration = findQuestStates(
      ({ states }) => hasOffer(states, 'exploration'),
      { level: 4, profession: 'scout' },
      createMinuteRange(0, 23 * 60 + 30)
    );
    const activation = findQuestStates(
      ({ states }) => hasOffer(states, 'activation'),
      { level: 4, profession: 'healer' },
      createMinuteRange(0, 23 * 60 + 30)
    );
    const puzzle = findQuestStates(
      ({ states }) => hasOffer(states, 'puzzle'),
      { level: 4, profession: 'scholar' },
      createMinuteRange(0, 23 * 60 + 30)
    );
    const survival = findQuestStates(
      ({ states }) => hasOffer(states, 'survival'),
      { level: 5, profession: 'healer' },
      createMinuteRange(0, 23 * 60 + 30)
    );
    const challenge = findQuestStates(
      ({ states }) => hasOffer(states, 'challenge'),
      { level: 4, profession: 'courier' },
      createMinuteRange(0, 23 * 60 + 30)
    );
    const destruction = findQuestStates(
      ({ states }) => hasOffer(states, 'destruction'),
      { level: 5, profession: 'guard' },
      createMinuteRange(0, 23 * 60 + 30)
    );
    const diplomacy = findQuestStates(
      ({ states }) => hasOffer(states, 'diplomacy'),
      { level: 5, profession: 'merchant' },
      createMinuteRange(0, 23 * 60 + 30)
    );
    const choice = findQuestStates(
      ({ states }) => hasOffer(states, 'choice'),
      { level: 6, profession: 'guard' },
      createMinuteRange(0, 23 * 60 + 30)
    );
    const faction = findQuestStates(
      ({ states }) => hasOffer(states, 'faction'),
      { level: 5, profession: 'merchant' },
      createMinuteRange(0, 23 * 60 + 30)
    );
    const construction = findQuestStates(
      ({ states }) => hasOffer(states, 'construction'),
      { level: 4, profession: 'smith' },
      createMinuteRange(0, 23 * 60 + 30)
    );

    expect(hasOffer(exploration?.states ?? [], 'exploration')).toBe(true);
    expect(hasOffer(activation?.states ?? [], 'activation')).toBe(true);
    expect(hasOffer(puzzle?.states ?? [], 'puzzle')).toBe(true);
    expect(hasOffer(survival?.states ?? [], 'survival')).toBe(true);
    expect(hasOffer(challenge?.states ?? [], 'challenge')).toBe(true);
    expect(hasOffer(destruction?.states ?? [], 'destruction')).toBe(true);
    expect(hasOffer(diplomacy?.states ?? [], 'diplomacy')).toBe(true);
    expect(hasOffer(choice?.states ?? [], 'choice')).toBe(true);
    expect(hasOffer(faction?.states ?? [], 'faction')).toBe(true);
    expect(hasOffer(construction?.states ?? [], 'construction')).toBe(true);
  });
});
