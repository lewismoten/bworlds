import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_ACTIVE_PLAYER_CHARACTERS,
  createPrimaryPlayerCharacterRoster,
  dropOffPlayerCharacter,
  ensurePlayerCharacterRoster,
  parsePlayerCharacterRoster,
  pickUpPlayerCharacter,
  recruitNpcAsPlayerCharacter,
  setActivePlayerCharacters,
  syncPrimaryPlayerCharacter,
} from './player-character-roster.ts';

describe('player character roster', () => {
  it('builds a fallback primary roster for the current player save', () => {
    expect(
      createPrimaryPlayerCharacterRoster({
        player: { x: 1, y: 2, facing: 0.5 },
        stack: [{ id: 'overworld', depth: 0, type: 'overworld' }],
        worldSeed: 'seed-a',
        playerLevel: 4,
        playerProfession: 'guard',
        completedQuestIds: ['tower:1'],
      })
    ).toEqual({
      characters: [
        expect.objectContaining({
          id: 'player',
          name: 'Player',
          availability: 'active',
          playerLevel: 4,
        }),
      ],
      activeCharacterIds: ['player'],
    });
  });

  it('parses persisted multi-character rosters', () => {
    expect(
      parsePlayerCharacterRoster({
        characters: [
          {
            id: 'player',
            name: 'Player',
            player: { x: 0, y: 0, facing: 0 },
            stack: [{ id: 'overworld', depth: 0 }],
            worldSeed: 'seed-a',
            playerLevel: 3,
            completedQuestIds: [],
            availability: 'active',
          },
          {
            id: 'npc:lyra',
            name: 'Lyra',
            player: { x: 4, y: 2, facing: 1 },
            stack: [{ id: 'overworld', depth: 0 }],
            worldSeed: 'seed-a',
            playerLevel: 2,
            completedQuestIds: ['town:trust'],
            availability: 'available',
            recruitedNpcId: 'town:lyra',
          },
        ],
        activeCharacterIds: ['player'],
      })
    ).toEqual(
      expect.objectContaining({
        characters: expect.arrayContaining([
          expect.objectContaining({ id: 'npc:lyra', recruitedNpcId: 'town:lyra' }),
        ]),
        activeCharacterIds: ['player'],
      })
    );
  });

  it('can recruit npcs into the available character roster', () => {
    const roster = createPrimaryPlayerCharacterRoster({
      player: { x: 1, y: 2, facing: 0.5 },
      stack: [{ id: 'overworld', depth: 0 }],
      worldSeed: 'seed-a',
      playerLevel: 4,
    });

    expect(
      recruitNpcAsPlayerCharacter(roster, {
        id: 'npc:lyra',
        name: 'Lyra',
        player: { x: 5, y: 6, facing: 0.25 },
        stack: [{ id: 'overworld', depth: 0 }],
        worldSeed: 'seed-a',
        playerLevel: 3,
        playerProfession: 'scout',
        completedQuestIds: ['quest:lyra'],
        recruitedNpcId: 'town:lyra',
      })
    ).toEqual(
      expect.objectContaining({
        characters: expect.arrayContaining([
          expect.objectContaining({
            id: 'npc:lyra',
            availability: 'available',
            recruitedNpcId: 'town:lyra',
          }),
        ]),
      })
    );
  });

  it('can drop off and later pick up characters without losing their saved slot', () => {
    const roster = {
      characters: [
        {
          id: 'player',
          name: 'Player',
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          worldSeed: 'seed-a',
          playerLevel: 3,
          completedQuestIds: [],
          availability: 'active' as const,
        },
        {
          id: 'npc:lyra',
          name: 'Lyra',
          player: { x: 2, y: 2, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          worldSeed: 'seed-a',
          playerLevel: 2,
          completedQuestIds: [],
          availability: 'active' as const,
        },
      ],
      activeCharacterIds: ['player', 'npc:lyra'],
    };

    const dropped = dropOffPlayerCharacter(roster, 'npc:lyra');
    expect(dropped.activeCharacterIds).toEqual(['player']);
    expect(dropped.characters.find((entry) => entry.id === 'npc:lyra')?.availability).toBe(
      'dropped'
    );

    const pickedUp = pickUpPlayerCharacter(dropped, 'npc:lyra');
    expect(pickedUp.activeCharacterIds).toEqual(['player', 'npc:lyra']);
    expect(
      pickedUp.characters.find((entry) => entry.id === 'npc:lyra')?.availability
    ).toBe('active');
  });

  it('can switch to multiple active characters at once', () => {
    const roster = ensurePlayerCharacterRoster(null, {
      player: { x: 1, y: 1, facing: 0 },
      stack: [{ id: 'overworld', depth: 0 }],
      worldSeed: 'seed-a',
      playerLevel: 2,
    });
    const expanded = recruitNpcAsPlayerCharacter(roster, {
      id: 'npc:lyra',
      name: 'Lyra',
      player: { x: 2, y: 3, facing: 0 },
      stack: [{ id: 'overworld', depth: 0 }],
      worldSeed: 'seed-a',
      recruitedNpcId: 'town:lyra',
    });

    expect(setActivePlayerCharacters(expanded, ['player', 'npc:lyra'])).toEqual(
      expect.objectContaining({
        activeCharacterIds: ['player', 'npc:lyra'],
      })
    );
  });

  it('enforces a configurable active party size while keeping a larger roster', () => {
    const roster = {
      characters: [
        {
          id: 'player',
          name: 'Player',
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          worldSeed: 'seed-a',
          playerLevel: 3,
          completedQuestIds: [],
          availability: 'active' as const,
        },
        {
          id: 'npc:lyra',
          name: 'Lyra',
          player: { x: 2, y: 2, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          worldSeed: 'seed-a',
          playerLevel: 2,
          completedQuestIds: [],
          availability: 'available' as const,
        },
        {
          id: 'npc:orin',
          name: 'Orin',
          player: { x: 3, y: 1, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          worldSeed: 'seed-a',
          playerLevel: 2,
          completedQuestIds: [],
          availability: 'available' as const,
        },
      ],
      activeCharacterIds: ['player'],
    };

    const activated = setActivePlayerCharacters(
      roster,
      ['player', 'npc:lyra', 'npc:orin'],
      { maxActiveCharacterCount: 2 }
    );

    expect(activated.activeCharacterIds).toEqual(['player', 'npc:lyra']);
    expect(activated.characters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'npc:orin', availability: 'available' }),
      ])
    );
    expect(activated.characters).toHaveLength(3);
  });

  it('keeps at least one playable character active when switching or dropping off party members', () => {
    const roster = createPrimaryPlayerCharacterRoster({
      player: { x: 1, y: 2, facing: 0.5 },
      stack: [{ id: 'overworld', depth: 0 }],
      worldSeed: 'seed-a',
      playerLevel: 4,
    });

    expect(setActivePlayerCharacters(roster, [])).toEqual(roster);
    expect(dropOffPlayerCharacter(roster, 'player')).toEqual(roster);
  });

  it('does not pick up more characters than the active party limit allows', () => {
    const roster = {
      characters: [
        {
          id: 'player',
          name: 'Player',
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          worldSeed: 'seed-a',
          playerLevel: 3,
          completedQuestIds: [],
          availability: 'active' as const,
        },
        {
          id: 'npc:lyra',
          name: 'Lyra',
          player: { x: 2, y: 2, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          worldSeed: 'seed-a',
          playerLevel: 2,
          completedQuestIds: [],
          availability: 'active' as const,
        },
        {
          id: 'npc:orin',
          name: 'Orin',
          player: { x: 4, y: 3, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          worldSeed: 'seed-a',
          playerLevel: 1,
          completedQuestIds: [],
          availability: 'dropped' as const,
        },
      ],
      activeCharacterIds: ['player', 'npc:lyra'],
    };

    expect(pickUpPlayerCharacter(roster, 'npc:orin', { maxActiveCharacterCount: 2 })).toEqual(
      roster
    );
    expect(DEFAULT_MAX_ACTIVE_PLAYER_CHARACTERS).toBeGreaterThan(1);
  });

  it('keeps the primary roster entry synced to the current active player state', () => {
    const roster = createPrimaryPlayerCharacterRoster({
      player: { x: 1, y: 1, facing: 0 },
      stack: [{ id: 'overworld', depth: 0 }],
      worldSeed: 'seed-a',
      playerLevel: 2,
    });

    expect(
      syncPrimaryPlayerCharacter(roster, {
        player: { x: 8, y: -3, facing: 1.2 },
        stack: [{ id: 'tower', depth: 1 }],
        worldSeed: 'seed-b',
        playerLevel: 5,
        playerProfession: 'scholar',
        completedQuestIds: ['tower:1'],
      })
    ).toEqual(
      expect.objectContaining({
        characters: [
          expect.objectContaining({
            id: 'player',
            player: { x: 8, y: -3, facing: 1.2 },
            worldSeed: 'seed-b',
            playerLevel: 5,
            playerProfession: 'scholar',
            completedQuestIds: ['tower:1'],
          }),
        ],
      })
    );
  });
});
