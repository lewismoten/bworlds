import { describe, expect, it } from 'vitest';
import { getDefaultQuestPlugins, getDefaultQuestRegistry } from './index.ts';

describe('quest support', () => {
  it('registers individual quest type plugins in the shared registry', () => {
    const plugins = getDefaultQuestPlugins();

    expect(plugins.map((plugin) => plugin.type)).toEqual([
      'delivery',
      'collection',
      'kill',
      'defense',
      'stealth',
      'assassination',
      'capture',
      'companion',
      'escort',
      'rescue',
      'tracking',
      'exploration',
      'puzzle',
      'timed',
      'survival',
      'diplomacy',
      'choice',
      'faction',
      'challenge',
      'construction',
      'activation',
      'destruction',
      'revenge',
      'fetch',
      'recovery',
      'crafting',
      'training',
      'investigation',
    ]);
    expect(getDefaultQuestRegistry().list()).toHaveLength(plugins.length);
  });

  it('offers daytime delivery work for staffed market-style npcs', () => {
    const offers = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:merchant',
      npcName: 'Maren Fenwick',
      townKey: '3:7',
      dayProgress: 0.5,
      yearProgress: 0.1,
      playerLevel: 2,
      playerProfession: 'courier',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'merchant',
      professionFamily: 'market',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'market',
    });

    expect(offers.some((offer) => offer.type === 'delivery')).toBe(true);
    expect(offers.some((offer) => offer.title.includes('Delivery'))).toBe(true);
  });

  it('offers seasonal home requests and commute escorts in the right situations', () => {
    const homeOffers = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:home',
      npcName: 'Hazel Pine',
      townKey: '3:7',
      dayProgress: 0.92,
      yearProgress: 0.82,
      playerLevel: 1,
      completedQuestIds: new Set<string>(),
      npcState: 'home',
      residenceBuildingId: 'home',
    });
    const commuteOffers = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:escort',
      npcName: 'Corin Oakley',
      townKey: '3:7',
      dayProgress: 0.32,
      yearProgress: 0.2,
      playerLevel: 4,
      playerProfession: 'guard',
      completedQuestIds: new Set<string>(),
      npcState: 'commuting-to-work',
      profession: 'stablehand',
      professionFamily: 'stable',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'stable',
    });

    expect(homeOffers.some((offer) => offer.type === 'collection')).toBe(true);
    expect(homeOffers.some((offer) => offer.title.includes('Winter'))).toBe(
      true
    );
    expect(commuteOffers.some((offer) => offer.type === 'escort')).toBe(true);
  });

  it('offers kill quests for staffed professions that can post local hunt orders', () => {
    const kill = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:warden',
      npcName: 'Della Norwood',
      townKey: '3:7',
      dayProgress: 0.46,
      yearProgress: 0.62,
      playerLevel: 6,
      playerProfession: 'guard',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'warden',
      professionFamily: 'town-hall',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'hall',
    });
    const underleveled = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:warden',
      npcName: 'Della Norwood',
      townKey: '3:7',
      dayProgress: 0.46,
      yearProgress: 0.62,
      playerLevel: 2,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'warden',
      professionFamily: 'town-hall',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'hall',
    });

    expect(kill.some((offer) => offer.type === 'kill')).toBe(true);
    expect(
      kill.some((offer) => offer.summary.includes('combat patrol experience'))
    ).toBe(true);
    expect(underleveled.some((offer) => offer.type === 'kill')).toBe(false);
  });

  it('offers defense quests for staffed professions guarding people and places', () => {
    const defense = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:priest',
      npcName: 'Elise Harrow',
      townKey: '3:7',
      dayProgress: 0.79,
      yearProgress: 0.88,
      playerLevel: 6,
      playerProfession: 'healer',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'priest',
      professionFamily: 'temple',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'temple',
    });
    const underleveled = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:priest',
      npcName: 'Elise Harrow',
      townKey: '3:7',
      dayProgress: 0.79,
      yearProgress: 0.88,
      playerLevel: 2,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'priest',
      professionFamily: 'temple',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'temple',
    });

    expect(defense.some((offer) => offer.type === 'defense')).toBe(true);
    expect(
      defense.some((offer) =>
        offer.summary.includes('hold a line under pressure')
      )
    ).toBe(true);
    expect(underleveled.some((offer) => offer.type === 'defense')).toBe(false);
  });

  it('offers stealth quests for staffed professions that need infiltration or sabotage', () => {
    const stealth = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:teacher',
      npcName: 'Iris Juniper',
      townKey: '3:7',
      dayProgress: 0.72,
      yearProgress: 0.22,
      playerLevel: 7,
      playerProfession: 'scout',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'teacher',
      professionFamily: 'school',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'school',
    });
    const underleveled = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:teacher',
      npcName: 'Iris Juniper',
      townKey: '3:7',
      dayProgress: 0.72,
      yearProgress: 0.22,
      playerLevel: 3,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'teacher',
      professionFamily: 'school',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'school',
    });

    expect(stealth.some((offer) => offer.type === 'stealth')).toBe(true);
    expect(
      stealth.some((offer) => offer.summary.includes('quiet footwork'))
    ).toBe(true);
    expect(underleveled.some((offer) => offer.type === 'stealth')).toBe(false);
  });

  it('offers assassination quests as bounty work for dangerous named targets', () => {
    const assassination = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:warden',
      npcName: 'Della Norwood',
      townKey: '3:7',
      dayProgress: 0.54,
      yearProgress: 0.4,
      playerLevel: 8,
      playerProfession: 'guard',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'warden',
      professionFamily: 'town-hall',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'hall',
    });
    const underleveled = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:warden',
      npcName: 'Della Norwood',
      townKey: '3:7',
      dayProgress: 0.54,
      yearProgress: 0.4,
      playerLevel: 3,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'warden',
      professionFamily: 'town-hall',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'hall',
    });

    expect(assassination.some((offer) => offer.type === 'assassination')).toBe(
      true
    );
    expect(
      assassination.some((offer) =>
        offer.summary.includes('credible bounty hunter')
      )
    ).toBe(true);
    expect(underleveled.some((offer) => offer.type === 'assassination')).toBe(
      false
    );
  });

  it('offers capture quests for nonlethal bounty targets that must be brought back alive', () => {
    const capture = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:warden',
      npcName: 'Della Norwood',
      townKey: '3:7',
      dayProgress: 0.58,
      yearProgress: 0.44,
      playerLevel: 8,
      playerProfession: 'guard',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'warden',
      professionFamily: 'town-hall',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'hall',
    });
    const underleveled = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:warden',
      npcName: 'Della Norwood',
      townKey: '3:7',
      dayProgress: 0.58,
      yearProgress: 0.44,
      playerLevel: 3,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'warden',
      professionFamily: 'town-hall',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'hall',
    });

    expect(capture.some((offer) => offer.type === 'capture')).toBe(true);
    expect(
      capture.some((offer) => offer.summary.includes('bring them in breathing'))
    ).toBe(true);
    expect(underleveled.some((offer) => offer.type === 'capture')).toBe(false);
  });

  it('offers companion quests after the same npc has shared enough prior history', () => {
    const companion = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:teacher',
      npcName: 'Iris Juniper',
      townKey: '3:7',
      dayProgress: 0.76,
      yearProgress: 0.32,
      playerLevel: 7,
      playerProfession: 'scholar',
      completedQuestIds: new Set<string>([
        '3:7:npc:teacher:training:field-notes',
      ]),
      npcState: 'working',
      profession: 'teacher',
      professionFamily: 'school',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'school',
    });
    const locked = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:teacher',
      npcName: 'Iris Juniper',
      townKey: '3:7',
      dayProgress: 0.76,
      yearProgress: 0.32,
      playerLevel: 7,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'teacher',
      professionFamily: 'school',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'school',
    });

    expect(companion.some((offer) => offer.type === 'companion')).toBe(true);
    expect(
      companion.some((offer) =>
        offer.summary.includes('personal part of the story')
      )
    ).toBe(true);
    expect(locked.some((offer) => offer.type === 'companion')).toBe(false);
  });

  it('offers rescue quests for staffed civic, temple, and stable roles', () => {
    const rescue = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:healer',
      npcName: 'Elise Harrow',
      townKey: '3:7',
      dayProgress: 0.73,
      yearProgress: 0.61,
      playerLevel: 4,
      playerProfession: 'healer',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'healer',
      professionFamily: 'temple',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'temple',
    });
    const underleveled = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:healer',
      npcName: 'Elise Harrow',
      townKey: '3:7',
      dayProgress: 0.73,
      yearProgress: 0.61,
      playerLevel: 1,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'healer',
      professionFamily: 'temple',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'temple',
    });

    expect(rescue.some((offer) => offer.type === 'rescue')).toBe(true);
    expect(
      rescue.some((offer) => offer.summary.includes('calm rescue work'))
    ).toBe(true);
    expect(underleveled.some((offer) => offer.type === 'rescue')).toBe(false);
  });

  it('unlocks follow-up investigation quests from prior completions', () => {
    const followUp = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:merchant',
      npcName: 'Maren Fenwick',
      townKey: '3:7',
      dayProgress: 0.5,
      yearProgress: 0.1,
      playerLevel: 6,
      playerProfession: 'scholar',
      completedQuestIds: new Set<string>(['3:7:npc:merchant:delivery:Spring']),
      npcState: 'working',
      profession: 'merchant',
      professionFamily: 'market',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'market',
    });

    expect(followUp.some((offer) => offer.type === 'investigation')).toBe(true);
    expect(
      followUp.some((offer) => offer.summary.includes('records and patterns'))
    ).toBe(true);
  });

  it('offers profession-aware crafting work from staffed workshops and smithies', () => {
    const offers = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:smith',
      npcName: 'Bram Irongate',
      townKey: '3:7',
      dayProgress: 0.52,
      yearProgress: 0.78,
      playerLevel: 5,
      playerProfession: 'smith',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'blacksmith',
      professionFamily: 'smithy',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'forge',
    });

    expect(offers.some((offer) => offer.type === 'crafting')).toBe(true);
    expect(
      offers.some((offer) => offer.summary.includes('trade background'))
    ).toBe(true);
  });

  it('offers guided training quests for newer players at teaching professions', () => {
    const schoolOffers = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:tutor',
      npcName: 'Iris Juniper',
      townKey: '3:7',
      dayProgress: 0.45,
      yearProgress: 0.3,
      playerLevel: 2,
      playerProfession: 'scholar',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'teacher',
      professionFamily: 'school',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'school',
    });
    const overleveledOffers = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:tutor',
      npcName: 'Iris Juniper',
      townKey: '3:7',
      dayProgress: 0.45,
      yearProgress: 0.3,
      playerLevel: 12,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'teacher',
      professionFamily: 'school',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'school',
    });

    expect(schoolOffers.some((offer) => offer.type === 'training')).toBe(true);
    expect(
      schoolOffers.some((offer) => offer.summary.includes('field notes'))
    ).toBe(true);
    expect(overleveledOffers.some((offer) => offer.type === 'training')).toBe(
      false
    );
  });

  it('offers fetch quests for supported staffed or homebound professions', () => {
    const workFetch = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:healer',
      npcName: 'Elise Harrow',
      townKey: '3:7',
      dayProgress: 0.4,
      yearProgress: 0.9,
      playerLevel: 3,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'healer',
      professionFamily: 'temple',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'temple',
    });
    const homeFetch = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:inn',
      npcName: 'June Briar',
      townKey: '3:7',
      dayProgress: 0.88,
      yearProgress: 0.2,
      playerLevel: 3,
      completedQuestIds: new Set<string>(),
      npcState: 'home',
      profession: 'innkeeper',
      professionFamily: 'inn',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'inn',
    });

    expect(workFetch.some((offer) => offer.type === 'fetch')).toBe(true);
    expect(homeFetch.some((offer) => offer.type === 'fetch')).toBe(true);
  });

  it('offers recovery quests for higher-level town work and respects tracking professions', () => {
    const recovery = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:merchant',
      npcName: 'Nora Morrow',
      townKey: '3:7',
      dayProgress: 0.5,
      yearProgress: 0.6,
      playerLevel: 5,
      playerProfession: 'guard',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'merchant',
      professionFamily: 'market',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'market',
    });

    expect(recovery.some((offer) => offer.type === 'recovery')).toBe(true);
    expect(
      recovery.some((offer) => offer.summary.includes('patrol experience'))
    ).toBe(true);
  });

  it('offers tracking quests for professions that can point players toward a trail', () => {
    const tracking = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:stable',
      npcName: 'Corin Oakley',
      townKey: '3:7',
      dayProgress: 0.35,
      yearProgress: 0.55,
      playerLevel: 4,
      playerProfession: 'scout',
      completedQuestIds: new Set<string>(),
      npcState: 'commuting-home',
      profession: 'stablehand',
      professionFamily: 'stable',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'stable',
    });

    expect(tracking.some((offer) => offer.type === 'tracking')).toBe(true);
    expect(
      tracking.some((offer) => offer.summary.includes('tracking experience'))
    ).toBe(true);
  });

  it('offers exploration quests for professions that can issue surveys and route charts', () => {
    const exploration = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:teacher',
      npcName: 'Iris Juniper',
      townKey: '3:7',
      dayProgress: 0.4,
      yearProgress: 0.47,
      playerLevel: 4,
      playerProfession: 'scout',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'teacher',
      professionFamily: 'school',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'school',
    });
    const overleveled = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:teacher',
      npcName: 'Iris Juniper',
      townKey: '3:7',
      dayProgress: 0.4,
      yearProgress: 0.47,
      playerLevel: 20,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'teacher',
      professionFamily: 'school',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'school',
    });

    expect(exploration.some((offer) => offer.type === 'exploration')).toBe(
      true
    );
    expect(
      exploration.some((offer) =>
        offer.summary.includes('routes and landmarks')
      )
    ).toBe(true);
    expect(overleveled.some((offer) => offer.type === 'exploration')).toBe(
      false
    );
  });

  it('offers puzzle quests for pattern-solving professions and civic mechanisms', () => {
    const puzzle = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:teacher',
      npcName: 'Iris Juniper',
      townKey: '3:7',
      dayProgress: 0.44,
      yearProgress: 0.52,
      playerLevel: 4,
      playerProfession: 'scholar',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'teacher',
      professionFamily: 'school',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'school',
    });
    const overleveled = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:teacher',
      npcName: 'Iris Juniper',
      townKey: '3:7',
      dayProgress: 0.44,
      yearProgress: 0.52,
      playerLevel: 18,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'teacher',
      professionFamily: 'school',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'school',
    });

    expect(puzzle.some((offer) => offer.type === 'puzzle')).toBe(true);
    expect(
      puzzle.some((offer) => offer.summary.includes('studying patterns'))
    ).toBe(true);
    expect(overleveled.some((offer) => offer.type === 'puzzle')).toBe(false);
  });

  it('offers timed quests for rush jobs and favors fast-delivery professions', () => {
    const timed = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:merchant',
      npcName: 'Nora Morrow',
      townKey: '3:7',
      dayProgress: 0.42,
      yearProgress: 0.15,
      playerLevel: 4,
      playerProfession: 'courier',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'merchant',
      professionFamily: 'market',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'market',
    });
    const overleveled = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:merchant',
      npcName: 'Nora Morrow',
      townKey: '3:7',
      dayProgress: 0.42,
      yearProgress: 0.15,
      playerLevel: 20,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'merchant',
      professionFamily: 'market',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'market',
    });

    expect(timed.some((offer) => offer.type === 'timed')).toBe(true);
    expect(timed.some((offer) => offer.summary.includes('quick feet'))).toBe(
      true
    );
    expect(overleveled.some((offer) => offer.type === 'timed')).toBe(false);
  });

  it('offers survival quests for sheltered routes and hardship watches', () => {
    const survival = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:innkeeper',
      npcName: 'June Briar',
      townKey: '3:7',
      dayProgress: 0.82,
      yearProgress: 0.88,
      playerLevel: 5,
      playerProfession: 'healer',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'innkeeper',
      professionFamily: 'inn',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'inn',
    });
    const underleveled = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:innkeeper',
      npcName: 'June Briar',
      townKey: '3:7',
      dayProgress: 0.82,
      yearProgress: 0.88,
      playerLevel: 1,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'innkeeper',
      professionFamily: 'inn',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'inn',
    });

    expect(survival.some((offer) => offer.type === 'survival')).toBe(true);
    expect(
      survival.some((offer) => offer.summary.includes('steady nerves'))
    ).toBe(true);
    expect(underleveled.some((offer) => offer.type === 'survival')).toBe(false);
  });

  it('offers activation quests for staffed civic, temple, and workshop systems', () => {
    const activation = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:priest',
      npcName: 'Elise Harrow',
      townKey: '3:7',
      dayProgress: 0.28,
      yearProgress: 0.85,
      playerLevel: 4,
      playerProfession: 'healer',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'priest',
      professionFamily: 'temple',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'temple',
    });
    const underleveled = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:priest',
      npcName: 'Elise Harrow',
      townKey: '3:7',
      dayProgress: 0.28,
      yearProgress: 0.85,
      playerLevel: 1,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'priest',
      professionFamily: 'temple',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'temple',
    });

    expect(activation.some((offer) => offer.type === 'activation')).toBe(true);
    expect(
      activation.some((offer) => offer.summary.includes('steady hands'))
    ).toBe(true);
    expect(underleveled.some((offer) => offer.type === 'activation')).toBe(
      false
    );
  });

  it('offers controlled destruction quests for sanctioned teardown work', () => {
    const destruction = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:mason',
      npcName: 'Petra Dunley',
      townKey: '3:7',
      dayProgress: 0.51,
      yearProgress: 0.63,
      playerLevel: 5,
      playerProfession: 'guard',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'mason',
      professionFamily: 'workshop',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'workshop',
    });
    const underleveled = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:mason',
      npcName: 'Petra Dunley',
      townKey: '3:7',
      dayProgress: 0.51,
      yearProgress: 0.63,
      playerLevel: 2,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'mason',
      professionFamily: 'workshop',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'workshop',
    });

    expect(destruction.some((offer) => offer.type === 'destruction')).toBe(
      true
    );
    expect(
      destruction.some((offer) => offer.summary.includes('force and equipment'))
    ).toBe(true);
    expect(underleveled.some((offer) => offer.type === 'destruction')).toBe(
      false
    );
  });

  it('offers revenge quests after related recovery or tracking work is completed', () => {
    const revenge = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:merchant',
      npcName: 'Nora Morrow',
      townKey: '3:7',
      dayProgress: 0.5,
      yearProgress: 0.37,
      playerLevel: 6,
      playerProfession: 'guard',
      completedQuestIds: new Set<string>([
        '3:7:npc:merchant:recovery:trade-parcel',
      ]),
      npcState: 'working',
      profession: 'merchant',
      professionFamily: 'market',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'market',
    });
    const locked = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:merchant',
      npcName: 'Nora Morrow',
      townKey: '3:7',
      dayProgress: 0.5,
      yearProgress: 0.37,
      playerLevel: 6,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'merchant',
      professionFamily: 'market',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'market',
    });

    expect(revenge.some((offer) => offer.type === 'revenge')).toBe(true);
    expect(
      revenge.some((offer) =>
        offer.summary.includes('settle the score lawfully')
      )
    ).toBe(true);
    expect(locked.some((offer) => offer.type === 'revenge')).toBe(false);
  });

  it('offers challenge quests for local contests and trials', () => {
    const challenge = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:innkeeper',
      npcName: 'June Briar',
      townKey: '3:7',
      dayProgress: 0.9,
      yearProgress: 0.41,
      playerLevel: 4,
      playerProfession: 'courier',
      completedQuestIds: new Set<string>(),
      npcState: 'home',
      profession: 'innkeeper',
      professionFamily: 'inn',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'inn',
    });
    const overleveled = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:innkeeper',
      npcName: 'June Briar',
      townKey: '3:7',
      dayProgress: 0.9,
      yearProgress: 0.41,
      playerLevel: 22,
      completedQuestIds: new Set<string>(),
      npcState: 'home',
      profession: 'innkeeper',
      professionFamily: 'inn',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'inn',
    });

    expect(challenge.some((offer) => offer.type === 'challenge')).toBe(true);
    expect(
      challenge.some((offer) => offer.summary.includes('speed and control'))
    ).toBe(true);
    expect(overleveled.some((offer) => offer.type === 'challenge')).toBe(false);
  });

  it('offers diplomacy quests for civic and social disputes', () => {
    const diplomacy = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:steward',
      npcName: 'Della Norwood',
      townKey: '3:7',
      dayProgress: 0.48,
      yearProgress: 0.58,
      playerLevel: 5,
      playerProfession: 'merchant',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'steward',
      professionFamily: 'town-hall',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'hall',
    });

    expect(diplomacy.some((offer) => offer.type === 'diplomacy')).toBe(true);
    expect(
      diplomacy.some((offer) => offer.summary.includes('calm words'))
    ).toBe(true);
  });

  it('offers choice quests where player judgment changes the outcome', () => {
    const choice = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:clerk',
      npcName: 'Petra Dunley',
      townKey: '3:7',
      dayProgress: 0.5,
      yearProgress: 0.22,
      playerLevel: 6,
      playerProfession: 'guard',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'clerk',
      professionFamily: 'town-hall',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'hall',
    });
    const underleveled = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:clerk',
      npcName: 'Petra Dunley',
      townKey: '3:7',
      dayProgress: 0.5,
      yearProgress: 0.22,
      playerLevel: 2,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'clerk',
      professionFamily: 'town-hall',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'hall',
    });

    expect(choice.some((offer) => offer.type === 'choice')).toBe(true);
    expect(choice.some((offer) => offer.summary.includes('town safety'))).toBe(
      true
    );
    expect(underleveled.some((offer) => offer.type === 'choice')).toBe(false);
  });

  it('offers faction quests for organizations that can grant standing', () => {
    const faction = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:steward',
      npcName: 'Della Norwood',
      townKey: '3:7',
      dayProgress: 0.5,
      yearProgress: 0.34,
      playerLevel: 5,
      playerProfession: 'merchant',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'steward',
      professionFamily: 'town-hall',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'hall',
    });

    expect(faction.some((offer) => offer.type === 'faction')).toBe(true);
    expect(faction.some((offer) => offer.summary.includes('trade ties'))).toBe(
      true
    );
  });

  it('offers construction quests for civic and craft repairs', () => {
    const construction = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:smith',
      npcName: 'Bram Irongate',
      townKey: '3:7',
      dayProgress: 0.46,
      yearProgress: 0.74,
      playerLevel: 4,
      playerProfession: 'smith',
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'blacksmith',
      professionFamily: 'smithy',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'forge',
    });
    const underleveled = getDefaultQuestRegistry().getOffers({
      npcId: 'npc:smith',
      npcName: 'Bram Irongate',
      townKey: '3:7',
      dayProgress: 0.46,
      yearProgress: 0.74,
      playerLevel: 1,
      completedQuestIds: new Set<string>(),
      npcState: 'working',
      profession: 'blacksmith',
      professionFamily: 'smithy',
      residenceBuildingId: 'home',
      workplaceBuildingId: 'forge',
    });

    expect(construction.some((offer) => offer.type === 'construction')).toBe(
      true
    );
    expect(
      construction.some((offer) => offer.summary.includes('trade skills'))
    ).toBe(true);
    expect(underleveled.some((offer) => offer.type === 'construction')).toBe(
      false
    );
  });
});
