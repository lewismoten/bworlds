import { describe, expect, it } from 'vitest';
import { getDefaultQuestPlugins, getDefaultQuestRegistry } from './index.ts';

describe('quest support', () => {
  it('registers individual quest type plugins in the shared registry', () => {
    const plugins = getDefaultQuestPlugins();

    expect(plugins.map((plugin) => plugin.type)).toEqual([
      'delivery',
      'collection',
      'escort',
      'tracking',
      'timed',
      'diplomacy',
      'choice',
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
    expect(homeOffers.some((offer) => offer.title.includes('Winter'))).toBe(true);
    expect(commuteOffers.some((offer) => offer.type === 'escort')).toBe(true);
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
    expect(schoolOffers.some((offer) => offer.summary.includes('field notes'))).toBe(
      true
    );
    expect(overleveledOffers.some((offer) => offer.type === 'training')).toBe(false);
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
    expect(timed.some((offer) => offer.summary.includes('quick feet'))).toBe(true);
    expect(overleveled.some((offer) => offer.type === 'timed')).toBe(false);
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
    expect(choice.some((offer) => offer.summary.includes('town safety'))).toBe(true);
    expect(underleveled.some((offer) => offer.type === 'choice')).toBe(false);
  });
});
