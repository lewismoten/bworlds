export type QuestNpcState =
  | 'home'
  | 'commuting-to-work'
  | 'working'
  | 'commuting-home';

export type QuestOffer = {
  id: string;
  type: string;
  title: string;
  summary: string;
  availability: 'home' | 'work' | 'travel';
  sourceNpcId: string;
  sourceNpcName: string;
};

export type QuestPlayerProfile = {
  level?: number;
  profession?: string;
  completedQuestIds?: Iterable<string>;
};

export type QuestOfferContext = {
  npcId: string;
  npcName: string;
  townKey: string;
  dayProgress: number;
  yearProgress: number;
  playerLevel: number;
  playerProfession?: string;
  completedQuestIds: ReadonlySet<string>;
  npcState: QuestNpcState;
  profession?: string;
  professionFamily?: string;
  residenceBuildingId?: string;
  workplaceBuildingId?: string;
};

export interface QuestTypePlugin {
  type: string;
  getOffer(context: QuestOfferContext): QuestOffer | null;
}

const questPluginCache = new Map<string, QuestTypePlugin[]>();

export function createQuestTypePlugin(
  type: string,
  getOffer: QuestTypePlugin['getOffer']
): QuestTypePlugin {
  return { type, getOffer };
}

export function createQuestRegistry(plugins: QuestTypePlugin[]) {
  return {
    list() {
      return plugins;
    },
    getOffers(context: QuestOfferContext): QuestOffer[] {
      return plugins.flatMap((plugin) => {
        const offer = plugin.getOffer(context);
        return offer ? [offer] : [];
      });
    },
  };
}

export function getDefaultQuestPlugins(): QuestTypePlugin[] {
  const cacheKey = 'default-town-quests';
  const cached = questPluginCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const plugins = [
    createDeliveryQuestPlugin(),
    createHomeNeedQuestPlugin(),
    createEscortQuestPlugin(),
    createFetchQuestPlugin(),
    createRecoveryQuestPlugin(),
    createCraftingQuestPlugin(),
    createTrainingQuestPlugin(),
    createFollowUpQuestPlugin(),
  ];
  questPluginCache.set(cacheKey, plugins);
  return plugins;
}

export function getDefaultQuestRegistry() {
  return createQuestRegistry(getDefaultQuestPlugins());
}

function createDeliveryQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('delivery', (context) => {
    if (
      context.npcState !== 'working' ||
      !(
        context.professionFamily === 'market' ||
        context.professionFamily === 'stable' ||
        context.professionFamily === 'inn'
      ) ||
      context.dayProgress < 0.25 ||
      context.dayProgress > 0.8 ||
      context.playerLevel > 12
    ) {
      return null;
    }

    const seasonLabel = getSeasonLabel(context.yearProgress);
    const questId = `${context.townKey}:${context.npcId}:delivery:${seasonLabel}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const preferredRole =
      context.playerProfession === 'merchant' ||
      context.playerProfession === 'courier'
        ? 'priority'
        : 'local';

    return {
      id: questId,
      type: 'delivery',
      title:
        preferredRole === 'priority'
          ? `${seasonLabel} Priority Delivery`
          : `${seasonLabel} Delivery Run`,
      summary: `${context.npcName} needs a ${preferredRole} shipment carried before the market roads close for the day.`,
      availability: 'work',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createHomeNeedQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('collection', (context) => {
    if (
      context.npcState !== 'home' ||
      context.dayProgress > 0.25 &&
        context.dayProgress < 0.72
    ) {
      return null;
    }

    const seasonLabel = getSeasonLabel(context.yearProgress);
    const task =
      context.playerProfession === 'healer'
        ? seasonLabel === 'Winter'
          ? 'warming tonics'
          : 'fresh herbs'
        : seasonLabel === 'Winter'
          ? 'dry firewood'
          : seasonLabel === 'Autumn'
            ? 'cellar stores'
            : 'garden bundles';
    const questId = `${context.townKey}:${context.npcId}:home-${task.replaceAll(' ', '-')}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    return {
      id: questId,
      type: 'collection',
      title: `${seasonLabel} Household Need`,
      summary: `${context.npcName} asks for ${task} while they are home for the evening.`,
      availability: 'home',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createEscortQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('escort', (context) => {
    if (
      !(
        context.npcState === 'commuting-to-work' ||
        context.npcState === 'commuting-home'
      ) ||
      context.playerLevel < 3
    ) {
      return null;
    }

    const questId = `${context.townKey}:${context.npcId}:escort:${context.npcState}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const destination =
      context.npcState === 'commuting-to-work' ? 'to work' : 'back home';
    const professionHint =
      context.playerProfession === 'guard' || context.playerProfession === 'scout'
        ? ' Your experience makes you an ideal escort.'
        : '';

    return {
      id: questId,
      type: 'escort',
      title: 'Safe Passage',
      summary: `${context.npcName} wants an escort ${destination} through town traffic.${professionHint}`,
      availability: 'travel',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createFollowUpQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('investigation', (context) => {
    if (
      context.npcState !== 'working' ||
      context.playerLevel < 5 ||
      !context.completedQuestIds.has(
        `${context.townKey}:${context.npcId}:delivery:${getSeasonLabel(context.yearProgress)}`
      )
    ) {
      return null;
    }

    const questId = `${context.townKey}:${context.npcId}:follow-up`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const specialty =
      context.playerProfession === 'scholar'
        ? 'records and patterns'
        : context.playerProfession === 'guard'
          ? 'routes and witnesses'
          : 'clues around town';

    return {
      id: questId,
      type: 'investigation',
      title: 'Missing Ledger Trail',
      summary: `${context.npcName} trusts you to investigate missing ${specialty} after your earlier help.`,
      availability: 'work',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createCraftingQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('crafting', (context) => {
    if (
      context.npcState !== 'working' ||
      !(
        context.professionFamily === 'smithy' ||
        context.professionFamily === 'workshop'
      ) ||
      context.playerLevel < 2 ||
      context.playerLevel > 18
    ) {
      return null;
    }

    const seasonLabel = getSeasonLabel(context.yearProgress);
    const project =
      context.professionFamily === 'smithy'
        ? seasonLabel === 'Winter'
          ? 'cold-weather fittings'
          : 'field tool repairs'
        : seasonLabel === 'Autumn'
          ? 'harvest crates'
          : 'roadside supply frames';
    const questId = `${context.townKey}:${context.npcId}:crafting:${project.replaceAll(' ', '-')}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'smith' ||
      context.playerProfession === 'carpenter'
        ? ' Your trade background makes you especially useful here.'
        : '';

    return {
      id: questId,
      type: 'crafting',
      title: `${seasonLabel} Workshop Order`,
      summary: `${context.npcName} needs help gathering parts and finishing ${project}.${professionHint}`,
      availability: 'work',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createFetchQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('fetch', (context) => {
    if (
      !(
        context.npcState === 'home' ||
        context.npcState === 'working'
      ) ||
      context.playerLevel > 10
    ) {
      return null;
    }

    const family = context.professionFamily;
    if (
      !(
        family === 'temple' ||
        family === 'inn' ||
        family === 'market' ||
        family === 'stable'
      )
    ) {
      return null;
    }

    const seasonLabel = getSeasonLabel(context.yearProgress);
    const requestedItem =
      family === 'temple'
        ? seasonLabel === 'Winter'
          ? 'healing herbs'
          : 'blessing oil'
        : family === 'stable'
          ? 'fresh tack straps'
          : family === 'market'
            ? 'ledger satchel'
            : 'kitchen provisions';
    const questId = `${context.townKey}:${context.npcId}:fetch:${requestedItem.replaceAll(' ', '-')}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    return {
      id: questId,
      type: 'fetch',
      title: `${seasonLabel} Quick Fetch`,
      summary: `${context.npcName} needs ${requestedItem} retrieved and brought back before the day's work slips behind.`,
      availability: context.npcState === 'home' ? 'home' : 'work',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createRecoveryQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('recovery', (context) => {
    if (
      context.npcState !== 'working' ||
      context.playerLevel < 4 ||
      !(
        context.professionFamily === 'market' ||
        context.professionFamily === 'town-hall' ||
        context.professionFamily === 'smithy'
      )
    ) {
      return null;
    }

    const seasonLabel = getSeasonLabel(context.yearProgress);
    const lostAsset =
      context.professionFamily === 'smithy'
        ? 'tool crate'
        : context.professionFamily === 'town-hall'
          ? 'survey ledger'
          : 'trade parcel';
    const questId = `${context.townKey}:${context.npcId}:recovery:${lostAsset.replaceAll(' ', '-')}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'guard' || context.playerProfession === 'scout'
        ? ' Your patrol experience should help track it down.'
        : '';

    return {
      id: questId,
      type: 'recovery',
      title: `${seasonLabel} Lost Property`,
      summary: `${context.npcName} wants a missing ${lostAsset} reclaimed before it causes trouble for the town.${professionHint}`,
      availability: 'work',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createTrainingQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('training', (context) => {
    if (
      context.npcState !== 'working' ||
      !(
        context.professionFamily === 'school' ||
        context.professionFamily === 'town-hall' ||
        context.professionFamily === 'smithy'
      ) ||
      context.playerLevel > 6
    ) {
      return null;
    }

    const topic =
      context.playerProfession === 'guard'
        ? 'route discipline'
        : context.playerProfession === 'scholar'
          ? 'field notes'
          : context.professionFamily === 'smithy'
            ? 'tool handling'
            : 'town basics';
    const questId = `${context.townKey}:${context.npcId}:training:${topic.replaceAll(' ', '-')}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    return {
      id: questId,
      type: 'training',
      title: 'Guided Lesson',
      summary: `${context.npcName} offers a short practical lesson in ${topic} for newer adventurers.`,
      availability: 'work',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function getSeasonLabel(yearProgress: number): 'Spring' | 'Summer' | 'Autumn' | 'Winter' {
  const normalized = ((yearProgress % 1) + 1) % 1;
  if (normalized < 0.25) {
    return 'Spring';
  }
  if (normalized < 0.5) {
    return 'Summer';
  }
  if (normalized < 0.75) {
    return 'Autumn';
  }
  return 'Winter';
}
