import { describe, expect, it } from 'vitest';
import { getDefaultQuestPlugins, getDefaultQuestRegistry } from './index.ts';

describe('quest support', () => {
  it('registers individual quest type plugins in the shared registry', () => {
    const plugins = getDefaultQuestPlugins();

    expect(plugins.map((plugin) => plugin.type)).toEqual([
      'delivery',
      'collection',
      'escort',
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
});
