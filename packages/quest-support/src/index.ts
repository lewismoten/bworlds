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
    createKillQuestPlugin(),
    createDefenseQuestPlugin(),
    createStealthQuestPlugin(),
    createAssassinationQuestPlugin(),
    createCaptureQuestPlugin(),
    createEscortQuestPlugin(),
    createRescueQuestPlugin(),
    createTrackingQuestPlugin(),
    createExplorationQuestPlugin(),
    createPuzzleQuestPlugin(),
    createTimedQuestPlugin(),
    createSurvivalQuestPlugin(),
    createDiplomacyQuestPlugin(),
    createChoiceQuestPlugin(),
    createFactionQuestPlugin(),
    createChallengeQuestPlugin(),
    createConstructionQuestPlugin(),
    createActivationQuestPlugin(),
    createDestructionQuestPlugin(),
    createRevengeQuestPlugin(),
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

function createKillQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('kill', (context) => {
    if (
      context.playerLevel < 4 ||
      context.playerLevel > 18 ||
      context.npcState !== 'working' ||
      !(
        context.professionFamily === 'town-hall' ||
        context.professionFamily === 'stable' ||
        context.professionFamily === 'market' ||
        context.professionFamily === 'temple'
      )
    ) {
      return null;
    }

    const seasonLabel = getSeasonLabel(context.yearProgress);
    const threat =
      context.professionFamily === 'stable'
        ? seasonLabel === 'Winter'
          ? 'bring down the frost wolves stalking the hitch pens'
          : 'cull the river drakes harrying the trail horses'
        : context.professionFamily === 'temple'
          ? seasonLabel === 'Winter'
            ? 'clear out the graveyard wights before the vigil bells'
            : 'strike down the shrine raiders preying on pilgrims'
          : context.professionFamily === 'market'
            ? seasonLabel === 'Winter'
              ? 'drive off the cellar vermin ruining winter stores'
              : 'eliminate the bandits raiding the outer caravans'
            : seasonLabel === 'Winter'
              ? 'cut down the ice fiends blocking the hill road'
              : 'defeat the raiders gathering near the town watch posts';
    const questId = `${context.townKey}:${context.npcId}:kill:${context.professionFamily}:${seasonLabel}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'guard' || context.playerProfession === 'scout'
        ? ' Your combat patrol experience makes you the right hunter for it.'
        : '';

    return {
      id: questId,
      type: 'kill',
      title: `${seasonLabel} Hunt Order`,
      summary: `${context.npcName} needs someone to ${threat}.${professionHint}`,
      availability: 'work',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createDefenseQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('defense', (context) => {
    if (
      context.playerLevel < 4 ||
      context.playerLevel > 20 ||
      !(
        context.npcState === 'working' ||
        context.npcState === 'commuting-home'
      ) ||
      !(
        context.professionFamily === 'town-hall' ||
        context.professionFamily === 'inn' ||
        context.professionFamily === 'stable' ||
        context.professionFamily === 'temple'
      )
    ) {
      return null;
    }

    const seasonLabel = getSeasonLabel(context.yearProgress);
    const defensePoint =
      context.professionFamily === 'inn'
        ? seasonLabel === 'Winter'
          ? 'hold the roadside inn against freezing-night raiders until dawn relief arrives'
          : 'protect the guest yard from the next bandit rush'
        : context.professionFamily === 'stable'
          ? seasonLabel === 'Winter'
            ? 'defend the animal pens from hungry winter predators'
            : 'guard the hitch lines while repeated beast waves hit the trail gate'
          : context.professionFamily === 'temple'
            ? seasonLabel === 'Winter'
              ? 'keep the lantern shrine safe through a night of restless dead'
              : 'protect the pilgrims gathering during the next raider surge'
            : seasonLabel === 'Winter'
              ? 'stand with the watch and defend the storehouses through the storm alarm'
              : 'help repel repeated attacks on the outer barricades';
    const questId =
      `${context.townKey}:${context.npcId}:defense:${context.professionFamily}:${seasonLabel}:${context.npcState}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'guard' || context.playerProfession === 'healer'
        ? ' Your ability to hold a line under pressure makes you especially valuable.'
        : '';

    return {
      id: questId,
      type: 'defense',
      title: `${seasonLabel} Hold the Line`,
      summary: `${context.npcName} needs someone to ${defensePoint}.${professionHint}`,
      availability: context.npcState === 'working' ? 'work' : 'travel',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createStealthQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('stealth', (context) => {
    if (
      context.playerLevel < 5 ||
      context.playerLevel > 18 ||
      !(
        context.npcState === 'working' ||
        context.npcState === 'commuting-home'
      ) ||
      !(
        context.professionFamily === 'market' ||
        context.professionFamily === 'town-hall' ||
        context.professionFamily === 'temple' ||
        context.professionFamily === 'school'
      )
    ) {
      return null;
    }

    const seasonLabel = getSeasonLabel(context.yearProgress);
    const objective =
      context.professionFamily === 'school'
        ? 'slip into the abandoned observatory annex and recover the lesson charts without disturbing the ward bells'
        : context.professionFamily === 'temple'
          ? 'enter the shuttered shrine crypt quietly and spy on the relic thieves'
          : context.professionFamily === 'market'
            ? 'sneak into the smugglers cache and mark which crates belong to the town merchants'
            : 'move through the watch alleys unseen and sabotage the raiders signal posts';
    const questId =
      `${context.townKey}:${context.npcId}:stealth:${context.professionFamily}:${seasonLabel}:${context.npcState}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'scout' || context.playerProfession === 'scholar'
        ? ' Your quiet footwork should keep the operation from turning into a fight.'
        : '';

    return {
      id: questId,
      type: 'stealth',
      title: `${seasonLabel} Quiet Work`,
      summary: `${context.npcName} needs someone to ${objective}.${professionHint}`,
      availability: context.npcState === 'working' ? 'work' : 'travel',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createAssassinationQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('assassination', (context) => {
    if (
      context.playerLevel < 6 ||
      context.playerLevel > 22 ||
      context.npcState !== 'working' ||
      !(
        context.professionFamily === 'town-hall' ||
        context.professionFamily === 'market' ||
        context.professionFamily === 'stable' ||
        context.professionFamily === 'temple'
      )
    ) {
      return null;
    }

    const seasonLabel = getSeasonLabel(context.yearProgress);
    const target =
      context.professionFamily === 'stable'
        ? 'a rogue handler hiding among the switchback camps'
        : context.professionFamily === 'temple'
          ? 'the cult knife behind the relic robberies'
          : context.professionFamily === 'market'
            ? 'the broker ordering caravan ambushes from the outer road'
            : 'the raider captain coordinating strikes on the town watch';
    const questId =
      `${context.townKey}:${context.npcId}:assassination:${context.professionFamily}:${seasonLabel}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'guard' || context.playerProfession === 'scout'
        ? ' Your pursuit skills make you a credible bounty hunter for the job.'
        : '';

    return {
      id: questId,
      type: 'assassination',
      title: `${seasonLabel} Bounty Mark`,
      summary: `${context.npcName} posts a bounty to locate and eliminate ${target}.${professionHint}`,
      availability: 'work',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createCaptureQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('capture', (context) => {
    if (
      context.playerLevel < 6 ||
      context.playerLevel > 22 ||
      context.npcState !== 'working' ||
      !(
        context.professionFamily === 'town-hall' ||
        context.professionFamily === 'market' ||
        context.professionFamily === 'stable' ||
        context.professionFamily === 'temple'
      )
    ) {
      return null;
    }

    const seasonLabel = getSeasonLabel(context.yearProgress);
    const target =
      context.professionFamily === 'stable'
        ? 'a saboteur who keeps cutting loose the pack animals'
        : context.professionFamily === 'temple'
          ? 'the relic thief orchestrating the shrine break-ins'
          : context.professionFamily === 'market'
            ? 'the fence receiving stolen caravan goods'
            : 'the raider scout feeding routes back to the camp';
    const questId =
      `${context.townKey}:${context.npcId}:capture:${context.professionFamily}:${seasonLabel}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'guard' || context.playerProfession === 'scout'
        ? ' Your control in a live pursuit should help bring them in breathing.'
        : '';

    return {
      id: questId,
      type: 'capture',
      title: `${seasonLabel} Bring Them In`,
      summary: `${context.npcName} needs someone to track down and capture ${target} rather than kill them.${professionHint}`,
      availability: 'work',
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

function createRescueQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('rescue', (context) => {
    if (
      context.playerLevel < 3 ||
      !(
        context.npcState === 'working' ||
        context.npcState === 'commuting-home'
      ) ||
      !(
        context.professionFamily === 'temple' ||
        context.professionFamily === 'stable' ||
        context.professionFamily === 'town-hall'
      )
    ) {
      return null;
    }

    const rescueTarget =
      context.professionFamily === 'temple'
        ? 'bring back a missing pilgrim before the lanterns go cold'
        : context.professionFamily === 'stable'
          ? 'find and return an injured trail mare'
          : 'locate a stranded survey hand and guide them back safely';
    const questId = `${context.townKey}:${context.npcId}:rescue:${context.professionFamily}:${context.npcState}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'guard' || context.playerProfession === 'healer'
        ? ' Your calm rescue work makes you the best choice.'
        : '';

    return {
      id: questId,
      type: 'rescue',
      title: 'Bring Them Home',
      summary: `${context.npcName} needs someone to ${rescueTarget}.${professionHint}`,
      availability: context.npcState === 'working' ? 'work' : 'travel',
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

function createTrackingQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('tracking', (context) => {
    if (
      context.playerLevel < 3 ||
      !(
        context.npcState === 'commuting-to-work' ||
        context.npcState === 'commuting-home' ||
        context.npcState === 'working'
      ) ||
      !(
        context.professionFamily === 'stable' ||
        context.professionFamily === 'market' ||
        context.professionFamily === 'town-hall'
      )
    ) {
      return null;
    }

    const clue =
      context.professionFamily === 'stable'
        ? 'a missing trail horse'
        : context.professionFamily === 'town-hall'
          ? 'a survey courier'
          : 'a delayed caravan runner';
    const questId = `${context.townKey}:${context.npcId}:tracking:${clue.replaceAll(' ', '-')}:${context.npcState}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'guard' || context.playerProfession === 'scout'
        ? ' Your tracking experience makes you the obvious choice.'
        : '';

    return {
      id: questId,
      type: 'tracking',
      title: 'Lost Trail',
      summary: `${context.npcName} needs help following the signs left by ${clue}.${professionHint}`,
      availability:
        context.npcState === 'working' ? 'work' : 'travel',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createExplorationQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('exploration', (context) => {
    if (
      context.playerLevel < 2 ||
      context.playerLevel > 16 ||
      context.npcState !== 'working' ||
      !(
        context.professionFamily === 'inn' ||
        context.professionFamily === 'stable' ||
        context.professionFamily === 'school' ||
        context.professionFamily === 'town-hall'
      )
    ) {
      return null;
    }

    const route =
      context.professionFamily === 'town-hall'
        ? 'survey the boundary stones beyond town'
        : context.professionFamily === 'school'
          ? 'chart the nearby landmarks for the lesson board'
          : context.professionFamily === 'stable'
            ? 'map the ridge trail and outer hitch markers'
            : 'reach the old lookout and mark the safer guest road';
    const questId = `${context.townKey}:${context.npcId}:exploration:${context.professionFamily}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'scout' || context.playerProfession === 'scholar'
        ? ' Your eye for routes and landmarks should make the survey easier.'
        : '';

    return {
      id: questId,
      type: 'exploration',
      title: 'Chart the Way',
      summary: `${context.npcName} asks you to ${route} before the town updates its local maps.${professionHint}`,
      availability: 'work',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createPuzzleQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('puzzle', (context) => {
    if (
      context.playerLevel < 2 ||
      context.playerLevel > 14 ||
      context.npcState !== 'working' ||
      !(
        context.professionFamily === 'school' ||
        context.professionFamily === 'temple' ||
        context.professionFamily === 'workshop' ||
        context.professionFamily === 'town-hall'
      )
    ) {
      return null;
    }

    const challenge =
      context.professionFamily === 'school'
        ? 'decode the classroom cipher board'
        : context.professionFamily === 'temple'
          ? 'align the shrine mirrors in the right order'
          : context.professionFamily === 'workshop'
            ? 'reset a jammed gear puzzle in the yard crane'
            : 'sort out the archive locks on an old civic chest';
    const questId = `${context.townKey}:${context.npcId}:puzzle:${context.professionFamily}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'scholar' || context.playerProfession === 'smith'
        ? ' Your habit of studying patterns should help solve it cleanly.'
        : '';

    return {
      id: questId,
      type: 'puzzle',
      title: 'Locked Pattern',
      summary: `${context.npcName} needs someone to ${challenge}.${professionHint}`,
      availability: 'work',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createTimedQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('timed', (context) => {
    if (
      context.playerLevel > 14 ||
      !(
        context.npcState === 'working' ||
        context.npcState === 'commuting-to-work'
      ) ||
      !(
        context.professionFamily === 'market' ||
        context.professionFamily === 'inn' ||
        context.professionFamily === 'town-hall'
      )
    ) {
      return null;
    }

    const seasonLabel = getSeasonLabel(context.yearProgress);
    const deadline =
      context.dayProgress < 0.5 ? 'before noon' : 'before dusk';
    const objective =
      context.professionFamily === 'town-hall'
        ? 'post a public notice'
        : context.professionFamily === 'inn'
          ? 'deliver a hot meal'
          : 'close a market order';
    const questId = `${context.townKey}:${context.npcId}:timed:${objective.replaceAll(' ', '-')}:${seasonLabel}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'courier' || context.playerProfession === 'merchant'
        ? ' Your quick feet should give you an advantage.'
        : '';

    return {
      id: questId,
      type: 'timed',
      title: `${seasonLabel} Rush Job`,
      summary: `${context.npcName} needs someone to ${objective} ${deadline}.${professionHint}`,
      availability:
        context.npcState === 'working' ? 'work' : 'travel',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createSurvivalQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('survival', (context) => {
    if (
      context.playerLevel < 3 ||
      !(
        context.npcState === 'working' ||
        context.npcState === 'commuting-home'
      ) ||
      !(
        context.professionFamily === 'inn' ||
        context.professionFamily === 'stable' ||
        context.professionFamily === 'temple' ||
        context.professionFamily === 'town-hall'
      )
    ) {
      return null;
    }

    const seasonLabel = getSeasonLabel(context.yearProgress);
    const ordeal =
      context.professionFamily === 'temple'
        ? seasonLabel === 'Winter'
          ? 'carry relief supplies through the cold to the outlying shrine'
          : 'keep a lantern watch until the vulnerable travelers are settled'
        : context.professionFamily === 'stable'
          ? seasonLabel === 'Winter'
            ? 'get stranded pack animals to shelter before the frost deepens'
            : 'guide a weary trail party to safe stables before nightfall'
          : context.professionFamily === 'town-hall'
            ? seasonLabel === 'Winter'
              ? 'hold the roadside shelter through the storm front'
              : 'reach the emergency cache and return with it safely'
            : seasonLabel === 'Winter'
              ? 'keep the wayhouse fire going until dawn'
              : 'escort exhausted guests to shelter and hold out until sunrise';
    const questId = `${context.townKey}:${context.npcId}:survival:${context.professionFamily}:${seasonLabel}:${context.npcState}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'guard' || context.playerProfession === 'healer'
        ? ' Your steady nerves should help everyone make it through.'
        : '';

    return {
      id: questId,
      type: 'survival',
      title: `${seasonLabel} Hardship`,
      summary: `${context.npcName} needs help to ${ordeal}.${professionHint}`,
      availability: context.npcState === 'working' ? 'work' : 'travel',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createActivationQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('activation', (context) => {
    if (
      context.playerLevel < 3 ||
      !(
        context.npcState === 'working' ||
        context.npcState === 'commuting-to-work'
      ) ||
      !(
        context.professionFamily === 'temple' ||
        context.professionFamily === 'town-hall' ||
        context.professionFamily === 'workshop'
      )
    ) {
      return null;
    }

    const system =
      context.professionFamily === 'temple'
        ? 'rekindle the hillside shrine lamps'
        : context.professionFamily === 'workshop'
          ? 'reset the waterwheel lift and yard winch'
          : 'raise the watch lanterns on the town towers';
    const questId = `${context.townKey}:${context.npcId}:activation:${context.professionFamily}:${context.npcState}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'smith' || context.playerProfession === 'healer'
        ? ' Your steady hands should help bring the system online quickly.'
        : '';

    return {
      id: questId,
      type: 'activation',
      title: 'Set It in Motion',
      summary: `${context.npcName} needs someone to ${system} before the next town cycle begins.${professionHint}`,
      availability: context.npcState === 'working' ? 'work' : 'travel',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createDestructionQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('destruction', (context) => {
    if (
      context.playerLevel < 4 ||
      context.npcState !== 'working' ||
      !(
        context.professionFamily === 'market' ||
        context.professionFamily === 'smithy' ||
        context.professionFamily === 'workshop' ||
        context.professionFamily === 'town-hall'
      )
    ) {
      return null;
    }

    const target =
      context.professionFamily === 'town-hall'
        ? 'tear down an unsafe roadside storehouse'
        : context.professionFamily === 'workshop'
          ? 'dismantle a jammed hauling frame'
          : context.professionFamily === 'smithy'
            ? 'break apart a ruined smelter rig'
            : 'destroy spoiled contraband before it reaches the stalls';
    const questId = `${context.townKey}:${context.npcId}:destruction:${context.professionFamily}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'smith' || context.playerProfession === 'guard'
        ? ' Your experience with force and equipment should keep the work controlled.'
        : '';

    return {
      id: questId,
      type: 'destruction',
      title: 'Controlled Demolition',
      summary: `${context.npcName} needs help to ${target}.${professionHint}`,
      availability: 'work',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createRevengeQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('revenge', (context) => {
    if (
      context.playerLevel < 5 ||
      context.npcState !== 'working' ||
      !(
        context.professionFamily === 'market' ||
        context.professionFamily === 'town-hall' ||
        context.professionFamily === 'stable'
      )
    ) {
      return null;
    }

    const prerequisiteId =
      context.professionFamily === 'market'
        ? `${context.townKey}:${context.npcId}:recovery:trade-parcel`
        : context.professionFamily === 'town-hall'
          ? `${context.townKey}:${context.npcId}:recovery:survey-ledger`
          : `${context.townKey}:${context.npcId}:tracking:a missing trail horse:working`;
    if (!context.completedQuestIds.has(prerequisiteId)) {
      return null;
    }

    const questId = `${context.townKey}:${context.npcId}:revenge:${context.professionFamily}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const grievance =
      context.professionFamily === 'town-hall'
        ? 'pursue the saboteur who endangered the town survey crew'
        : context.professionFamily === 'stable'
          ? 'track down the handler who abandoned the missing horse'
          : 'confront the broker who set the theft in motion';
    const professionHint =
      context.playerProfession === 'guard' || context.playerProfession === 'scout'
        ? ' Your sense for pursuit should help settle the score lawfully.'
        : '';

    return {
      id: questId,
      type: 'revenge',
      title: 'Settle the Wrong',
      summary: `${context.npcName} asks you to ${grievance}.${professionHint}`,
      availability: 'work',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createChallengeQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('challenge', (context) => {
    if (
      context.playerLevel < 3 ||
      context.playerLevel > 18 ||
      !(
        context.npcState === 'working' ||
        context.npcState === 'home'
      ) ||
      !(
        context.professionFamily === 'inn' ||
        context.professionFamily === 'school' ||
        context.professionFamily === 'stable' ||
        context.professionFamily === 'temple'
      )
    ) {
      return null;
    }

    const event =
      context.professionFamily === 'stable'
        ? 'win the cart-yard handling trial'
        : context.professionFamily === 'school'
          ? 'complete the town puzzle board faster than the apprentices'
          : context.professionFamily === 'temple'
            ? 'finish the lantern court balance trial'
            : 'take the inns common-room contest';
    const questId = `${context.townKey}:${context.npcId}:challenge:${context.professionFamily}:${context.npcState}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'scout' || context.playerProfession === 'courier'
        ? ' Your speed and control could give you the edge.'
        : '';

    return {
      id: questId,
      type: 'challenge',
      title: 'Open Challenge',
      summary: `${context.npcName} invites you to ${event} and earn local bragging rights.${professionHint}`,
      availability: context.npcState === 'working' ? 'work' : 'home',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createDiplomacyQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('diplomacy', (context) => {
    if (
      context.playerLevel < 4 ||
      !(
        context.npcState === 'working' ||
        context.npcState === 'home'
      ) ||
      !(
        context.professionFamily === 'town-hall' ||
        context.professionFamily === 'temple' ||
        context.professionFamily === 'market'
      )
    ) {
      return null;
    }

    const dispute =
      context.professionFamily === 'town-hall'
        ? 'boundary dispute'
        : context.professionFamily === 'temple'
          ? 'festival grievance'
          : 'trade disagreement';
    const questId = `${context.townKey}:${context.npcId}:diplomacy:${dispute.replaceAll(' ', '-')}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'scholar' ||
      context.playerProfession === 'merchant'
        ? ' Your calm words may keep tempers from flaring.'
        : '';

    return {
      id: questId,
      type: 'diplomacy',
      title: 'Common Ground',
      summary: `${context.npcName} wants help settling a ${dispute} before it turns the town against itself.${professionHint}`,
      availability: context.npcState === 'working' ? 'work' : 'home',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createChoiceQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('choice', (context) => {
    if (
      context.playerLevel < 5 ||
      context.npcState !== 'working' ||
      !(
        context.professionFamily === 'town-hall' ||
        context.professionFamily === 'market' ||
        context.professionFamily === 'temple'
      )
    ) {
      return null;
    }

    const dilemma =
      context.professionFamily === 'town-hall'
        ? 'whether scarce funds should repair roads or store grain'
        : context.professionFamily === 'temple'
          ? 'whether offerings should aid travelers or local families first'
          : 'whether to honor a late caravan or reward the local stallholders';
    const questId = `${context.townKey}:${context.npcId}:choice:${context.professionFamily}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'guard'
        ? ' Your decision may influence town safety.'
        : context.playerProfession === 'merchant'
          ? ' Your decision may influence future trade.'
          : '';

    return {
      id: questId,
      type: 'choice',
      title: 'A Hard Decision',
      summary: `${context.npcName} asks you to weigh ${dilemma}.${professionHint}`,
      availability: 'work',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createFactionQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('faction', (context) => {
    if (
      context.playerLevel < 4 ||
      context.npcState !== 'working' ||
      !(
        context.professionFamily === 'town-hall' ||
        context.professionFamily === 'market' ||
        context.professionFamily === 'temple'
      )
    ) {
      return null;
    }

    const faction =
      context.professionFamily === 'town-hall'
        ? 'the town council'
        : context.professionFamily === 'temple'
          ? 'the lantern shrine'
          : 'the merchants guild';
    const questId = `${context.townKey}:${context.npcId}:faction:${context.professionFamily}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'merchant'
        ? ' Your trade ties could open doors with them.'
        : context.playerProfession === 'scholar'
          ? ' Your reputation for careful records could earn trust.'
          : '';

    return {
      id: questId,
      type: 'faction',
      title: 'Earn Their Trust',
      summary: `${context.npcName} offers work that could improve your standing with ${faction}.${professionHint}`,
      availability: 'work',
      sourceNpcId: context.npcId,
      sourceNpcName: context.npcName,
    };
  });
}

function createConstructionQuestPlugin(): QuestTypePlugin {
  return createQuestTypePlugin('construction', (context) => {
    if (
      context.playerLevel < 3 ||
      !(
        context.npcState === 'working' ||
        context.npcState === 'home'
      ) ||
      !(
        context.professionFamily === 'smithy' ||
        context.professionFamily === 'workshop' ||
        context.professionFamily === 'town-hall'
      )
    ) {
      return null;
    }

    const project =
      context.professionFamily === 'smithy'
        ? 'repair the town forge awning'
        : context.professionFamily === 'town-hall'
          ? 'shore up the square storehouse'
          : 'rebuild a roadside work shed';
    const questId = `${context.townKey}:${context.npcId}:construction:${context.professionFamily}`;
    if (context.completedQuestIds.has(questId)) {
      return null;
    }

    const professionHint =
      context.playerProfession === 'carpenter' ||
      context.playerProfession === 'smith'
        ? ' Your trade skills should speed the work along.'
        : '';

    return {
      id: questId,
      type: 'construction',
      title: 'Repair and Restore',
      summary: `${context.npcName} needs help gathering supplies and labor to ${project}.${professionHint}`,
      availability: context.npcState === 'working' ? 'work' : 'home',
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
