import { createBoundedCache } from '@bworlds/cache-support';
import { getDaylightCycleState } from '@bworlds/core';
import {
  appendHashSeedLabel,
  appendHashSeedPart,
  createHashSeed,
  hash2D,
  hash2DWithSeed,
  registerHashLabel,
} from '@bworlds/core/hash';
import {
  getDefaultQuestRegistry,
  type QuestOffer,
  type QuestPlayerProfile,
} from '@bworlds/quest-support';

export type TownLevel = 1 | 2 | 3 | 4;
export type TownBuildingRole = 'residential' | 'professional';
export type TownNpcLifeStage = 'child' | 'adult' | 'elder';
export type TownProfessionStatus = 'working' | 'retired';

export type TownProfile = {
  level: TownLevel;
  residentialBuildings: number;
  professionalBuildings: number;
  buildingCount: number;
  population: number;
};

export type TownBuildingPlot = {
  x: number;
  y: number;
  role: TownBuildingRole;
};

export type TownProfessionFamily =
  | 'inn'
  | 'smithy'
  | 'market'
  | 'temple'
  | 'workshop'
  | 'stable'
  | 'school'
  | 'town-hall';

export type TownBuilding = TownBuildingPlot & {
  id: string;
  professionFamily?: TownProfessionFamily;
  residentNpcIds: string[];
  workerNpcIds: string[];
};

export type TownNpcParent = {
  id: string;
  name: string;
  resident: boolean;
};

export type TownNpc = {
  id: string;
  name: string;
  age: number;
  lifeStage: TownNpcLifeStage;
  residenceBuildingId: string;
  mother: TownNpcParent;
  father: TownNpcParent;
  professionStatus: TownProfessionStatus;
  profession?: string;
  workplaceBuildingId?: string;
  workplaceProfessionFamily?: TownProfessionFamily;
};

export type TownNpcRoutineState =
  'home' | 'commuting-to-work' | 'working' | 'commuting-home';

export type TownNpcPlacement = {
  npcId: string;
  name: string;
  x: number;
  y: number;
  state: TownNpcRoutineState;
};

export type TownServiceKind =
  'trade' | 'training' | 'revival' | 'healing' | 'quests';

export type TownServiceOffer = {
  kind: TownServiceKind;
  label: string;
  description: string;
};

export type TownBuildingServiceState = {
  buildingId: string;
  presentNpcNames: string[];
  availableServices: TownServiceOffer[];
  availableQuestOffers: QuestOffer[];
};

export type TownNpcQuestState = {
  npcId: string;
  name: string;
  x: number;
  y: number;
  state: TownNpcRoutineState;
  offers: QuestOffer[];
};

type TownStructure = Omit<TownProfile, 'population'>;
type NameStyle = 'feminine' | 'masculine';
type TownNpcDraft = Omit<TownNpc, 'mother' | 'father'> & {
  mother?: TownNpcParent;
  father?: TownNpcParent;
};

type TownProfessionTemplate = {
  family: TownProfessionFamily;
  buildingLabel: string;
  professions: string[];
};

const BUILDING_ROW_Y = 5;
const SLOT_X_ORDER = [0, -2, 2, -4, 4, -6, 6, -8, 8] as const;
const SLOT_ORDER: ReadonlyArray<{ x: number; y: number }> = [
  ...SLOT_X_ORDER.flatMap((x) => [
    { x, y: -BUILDING_ROW_Y },
    { x, y: BUILDING_ROW_Y },
  ]),
];
const TOWN_STRUCTURE_CACHE_LIMIT = 256;
const TOWN_TIME_CACHE_LIMIT = 768;
const TOWN_PROFILE_CACHE_LIMIT = 256;
const TOWN_LEVEL_SEED = registerHashLabel('town-level');
const TOWN_RESIDENTIAL_SEED = registerHashLabel('town-residential');
const TOWN_PROFESSIONAL_SEED = registerHashLabel('town-professional');
const TOWN_RESIDENCE_LABEL = registerHashLabel('town-residence');
const TOWN_HOUSEHOLD_SIZE_LABEL = registerHashLabel('town-household-size');
const TOWN_PROFESSION_FAMILY_LABEL = registerHashLabel(
  'town-profession-family'
);
const TOWN_HOUSEHOLD_SURNAME_LABEL = registerHashLabel(
  'town-household-surname'
);
const TOWN_ADULT_ONE_AGE_LABEL = registerHashLabel('town-adult-one-age');
const TOWN_ADULT_TWO_AGE_LABEL = registerHashLabel('town-adult-two-age');
const TOWN_ADULT_ONE_NAME_LABEL = registerHashLabel('town-adult-one-name');
const TOWN_ADULT_TWO_NAME_LABEL = registerHashLabel('town-adult-two-name');
const TOWN_HOUSEHOLD_MEMBER_LABEL = registerHashLabel('town-household-member');
const TOWN_MEMBER_TYPE_LABEL = registerHashLabel('type');
const TOWN_MEMBER_STYLE_LABEL = registerHashLabel('style');
const TOWN_MEMBER_AGE_LABEL = registerHashLabel('age');
const TOWN_MEMBER_NAME_LABEL = registerHashLabel('name');
const TOWN_PARENT_SURNAME_LABEL = registerHashLabel('town-parent-surname');
const TOWN_MOTHER_LABEL = registerHashLabel('mother');
const TOWN_FATHER_LABEL = registerHashLabel('father');

const PROFESSIONS: readonly TownProfessionTemplate[] = [
  {
    family: 'inn',
    buildingLabel: 'inn',
    professions: ['innkeeper', 'cook', 'server'],
  },
  {
    family: 'smithy',
    buildingLabel: 'smithy',
    professions: ['blacksmith', 'armorer', 'smith apprentice'],
  },
  {
    family: 'market',
    buildingLabel: 'market stall',
    professions: ['merchant', 'grocer', 'trader'],
  },
  {
    family: 'temple',
    buildingLabel: 'temple',
    professions: ['priest', 'healer', 'acolyte'],
  },
  {
    family: 'workshop',
    buildingLabel: 'workshop',
    professions: ['carpenter', 'mason', 'craftsperson'],
  },
  {
    family: 'stable',
    buildingLabel: 'stable',
    professions: ['stablehand', 'farrier', 'teamster'],
  },
  {
    family: 'school',
    buildingLabel: 'schoolhouse',
    professions: ['teacher', 'scribe', 'tutor'],
  },
  {
    family: 'town-hall',
    buildingLabel: 'town hall',
    professions: ['clerk', 'warden', 'steward'],
  },
];

const FEMININE_FIRST_NAMES = [
  'Ada',
  'Bryn',
  'Cora',
  'Della',
  'Elise',
  'Faye',
  'Greta',
  'Hazel',
  'Iris',
  'June',
  'Kira',
  'Lena',
  'Maren',
  'Nora',
  'Opal',
  'Petra',
];

const MASCULINE_FIRST_NAMES = [
  'Alden',
  'Bram',
  'Corin',
  'Dorian',
  'Emmett',
  'Finn',
  'Gareth',
  'Holden',
  'Ilan',
  'Jonah',
  'Kellan',
  'Luca',
  'Milo',
  'Nolan',
  'Orin',
  'Perrin',
];

const LAST_NAMES = [
  'Ashdown',
  'Briar',
  'Casker',
  'Dunley',
  'Eastmill',
  'Fenwick',
  'Gallow',
  'Harrow',
  'Irongate',
  'Juniper',
  'Kestrel',
  'Larkspur',
  'Morrow',
  'Norwood',
  'Oakley',
  'Pine',
];

const buildingCache = createBoundedCache<string, TownBuilding[]>(
  TOWN_STRUCTURE_CACHE_LIMIT
);
const npcCache = createBoundedCache<string, TownNpc[]>(
  TOWN_STRUCTURE_CACHE_LIMIT
);
const placementCache = createBoundedCache<string, TownNpcPlacement[]>(
  TOWN_TIME_CACHE_LIMIT
);
const serviceStateCache = createBoundedCache<string, TownBuildingServiceState>(
  TOWN_TIME_CACHE_LIMIT
);
const questStateCache = createBoundedCache<string, TownNpcQuestState[]>(
  TOWN_TIME_CACHE_LIMIT
);
const townProfileCache = createBoundedCache<string, TownProfile>(
  TOWN_PROFILE_CACHE_LIMIT
);

function getTownCacheKey(tileX: number, tileY: number): string {
  return `${tileX}:${tileY}`;
}

function createTownPlotSeed(
  seedLabel: number,
  plotX: number,
  plotY: number
): number {
  return appendHashSeedPart(appendHashSeedPart(seedLabel, plotX), plotY);
}

function createTownResidenceSeed(
  tileX: number,
  tileY: number,
  plotX: number,
  plotY: number
): number {
  return appendHashSeedPart(
    appendHashSeedPart(
      appendHashSeedPart(
        appendHashSeedPart(TOWN_RESIDENCE_LABEL, tileX),
        tileY
      ),
      plotX
    ),
    plotY
  );
}

function createTownIndexSeed(
  seedLabel: number,
  tileX: number,
  tileY: number,
  index: number
): number {
  return appendHashSeedPart(
    appendHashSeedPart(appendHashSeedPart(seedLabel, tileX), tileY),
    index
  );
}

function pickFromList<T>(
  list: readonly T[],
  key: number,
  tileX: number,
  tileY: number
): T {
  const hash = hash2DWithSeed(createHashSeed(key), tileX, tileY);
  const index = Math.floor(hash * list.length) % list.length;
  return list[index] as T;
}

function getTownStructure(tileX: number, tileY: number): TownStructure {
  const level = (1 +
    Math.floor(hash2D(TOWN_LEVEL_SEED, tileX, tileY) * 4)) as TownLevel;
  const residentialBuildings =
    2 + level * 2 + Math.floor(hash2D(TOWN_RESIDENTIAL_SEED, tileX, tileY) * 2);
  const professionalBuildings =
    1 + level + Math.floor(hash2D(TOWN_PROFESSIONAL_SEED, tileX, tileY) * 2);
  const buildingCount = Math.min(
    SLOT_ORDER.length,
    residentialBuildings + professionalBuildings
  );

  return {
    level,
    residentialBuildings,
    professionalBuildings,
    buildingCount,
  };
}

function getHouseholdSize(
  tileX: number,
  tileY: number,
  plotX: number,
  plotY: number
): number {
  return (
    3 +
    Math.floor(
      hash2DWithSeed(
        createTownPlotSeed(TOWN_HOUSEHOLD_SIZE_LABEL, plotX, plotY),
        tileX,
        tileY
      ) * 3
    )
  );
}

function getBuildingProfessionTemplate(
  tileX: number,
  tileY: number,
  plotX: number,
  plotY: number
): TownProfessionTemplate {
  return pickFromList(
    PROFESSIONS,
    createTownPlotSeed(TOWN_PROFESSION_FAMILY_LABEL, plotX, plotY),
    tileX,
    tileY
  );
}

function createParentIdentity(
  npcId: string,
  label: 'mother' | 'father',
  style: NameStyle,
  surname: string,
  seedHash: number,
  tileX: number,
  tileY: number
): TownNpcParent {
  const firstName = getFirstName(
    appendHashSeedLabel(
      seedHash,
      label === 'mother' ? TOWN_MOTHER_LABEL : TOWN_FATHER_LABEL
    ),
    style,
    tileX,
    tileY
  );
  return {
    id: `${npcId}:${label}`,
    name: `${firstName} ${surname}`,
    resident: false,
  };
}

function getFirstName(
  key: number,
  style: NameStyle,
  tileX: number,
  tileY: number
): string {
  return style === 'feminine'
    ? pickFromList(FEMININE_FIRST_NAMES, key, tileX, tileY)
    : pickFromList(MASCULINE_FIRST_NAMES, key, tileX, tileY);
}

function getLastName(key: number, tileX: number, tileY: number): string {
  return pickFromList(LAST_NAMES, key, tileX, tileY);
}

function createNpcId(
  townX: number,
  townY: number,
  residenceBuildingId: string,
  slotIndex: number
): string {
  return `${residenceBuildingId}:npc:${townX}:${townY}:${slotIndex}`;
}

function createHouseholdNpcs(
  tileX: number,
  tileY: number,
  residence: TownBuilding
): TownNpcDraft[] {
  const residenceSeed = createTownResidenceSeed(
    tileX,
    tileY,
    residence.x,
    residence.y
  );
  const householdSize = getHouseholdSize(
    tileX,
    tileY,
    residence.x,
    residence.y
  );
  const surname = getLastName(
    appendHashSeedLabel(residenceSeed, TOWN_HOUSEHOLD_SURNAME_LABEL),
    tileX,
    tileY
  );
  const adultOneAge =
    24 +
    Math.floor(
      hash2DWithSeed(
        appendHashSeedLabel(residenceSeed, TOWN_ADULT_ONE_AGE_LABEL),
        tileX,
        tileY
      ) * 20
    );
  const adultTwoAge =
    22 +
    Math.floor(
      hash2DWithSeed(
        appendHashSeedLabel(residenceSeed, TOWN_ADULT_TWO_AGE_LABEL),
        tileX,
        tileY
      ) * 22
    );

  const adults: TownNpcDraft[] = [
    {
      id: createNpcId(tileX, tileY, residence.id, 0),
      name: `${getFirstName(
        appendHashSeedLabel(residenceSeed, TOWN_ADULT_ONE_NAME_LABEL),
        'feminine',
        tileX,
        tileY
      )} ${surname}`,
      age: adultOneAge,
      lifeStage: 'adult',
      residenceBuildingId: residence.id,
      professionStatus: 'working',
    },
    {
      id: createNpcId(tileX, tileY, residence.id, 1),
      name: `${getFirstName(
        appendHashSeedLabel(residenceSeed, TOWN_ADULT_TWO_NAME_LABEL),
        'masculine',
        tileX,
        tileY
      )} ${surname}`,
      age: adultTwoAge,
      lifeStage: 'adult',
      residenceBuildingId: residence.id,
      professionStatus: 'working',
    },
  ];

  const members = [...adults];
  for (let index = 2; index < householdSize; index += 1) {
    const memberSeed = appendHashSeedPart(
      appendHashSeedLabel(residenceSeed, TOWN_HOUSEHOLD_MEMBER_LABEL),
      index
    );
    const memberTypeRoll = hash2DWithSeed(
      appendHashSeedLabel(memberSeed, TOWN_MEMBER_TYPE_LABEL),
      tileX,
      tileY
    );
    let age: number;
    let lifeStage: TownNpcLifeStage;
    const style: NameStyle =
      hash2DWithSeed(
        appendHashSeedLabel(memberSeed, TOWN_MEMBER_STYLE_LABEL),
        tileX,
        tileY
      ) < 0.5
        ? 'feminine'
        : 'masculine';

    if (memberTypeRoll < 0.6) {
      age =
        1 +
        Math.floor(
          hash2DWithSeed(
            appendHashSeedLabel(memberSeed, TOWN_MEMBER_AGE_LABEL),
            tileX,
            tileY
          ) * 17
        );
      lifeStage = 'child';
    } else if (memberTypeRoll < 0.88) {
      age =
        18 +
        Math.floor(
          hash2DWithSeed(
            appendHashSeedLabel(memberSeed, TOWN_MEMBER_AGE_LABEL),
            tileX,
            tileY
          ) * 40
        );
      lifeStage = 'adult';
    } else {
      age =
        65 +
        Math.floor(
          hash2DWithSeed(
            appendHashSeedLabel(memberSeed, TOWN_MEMBER_AGE_LABEL),
            tileX,
            tileY
          ) * 24
        );
      lifeStage = 'elder';
    }

    members.push({
      id: createNpcId(tileX, tileY, residence.id, index),
      name: `${getFirstName(
        appendHashSeedLabel(memberSeed, TOWN_MEMBER_NAME_LABEL),
        style,
        tileX,
        tileY
      )} ${surname}`,
      age,
      lifeStage,
      residenceBuildingId: residence.id,
      professionStatus: lifeStage === 'elder' ? 'retired' : 'working',
    });
  }

  const mother: TownNpcParent = {
    id: adults[0].id,
    name: adults[0].name,
    resident: true,
  };
  const father: TownNpcParent = {
    id: adults[1].id,
    name: adults[1].name,
    resident: true,
  };

  return members.map((npc, index) => {
    if (index === 0) {
      return {
        ...npc,
        mother: createParentIdentity(
          npc.id,
          'mother',
          'feminine',
          surname,
          residenceSeed,
          tileX,
          tileY
        ),
        father: createParentIdentity(
          npc.id,
          'father',
          'masculine',
          surname,
          residenceSeed,
          tileX,
          tileY
        ),
      };
    }

    if (index === 1) {
      return {
        ...npc,
        mother: createParentIdentity(
          npc.id,
          'mother',
          'feminine',
          surname,
          residenceSeed,
          tileX,
          tileY
        ),
        father: createParentIdentity(
          npc.id,
          'father',
          'masculine',
          surname,
          residenceSeed,
          tileX,
          tileY
        ),
      };
    }

    return {
      ...npc,
      mother,
      father,
    };
  });
}

function assignNpcJobs(
  tileX: number,
  tileY: number,
  npcs: TownNpcDraft[],
  buildings: TownBuilding[]
) {
  const professionalBuildings = buildings.filter(
    (
      building
    ): building is TownBuilding & { professionFamily: TownProfessionFamily } =>
      building.role === 'professional' &&
      typeof building.professionFamily === 'string'
  );
  if (professionalBuildings.length === 0) {
    return;
  }

  const workingAdults = npcs.filter(
    (npc) => npc.lifeStage === 'adult' && npc.age >= 18 && npc.age < 65
  );

  for (const [index, npc] of workingAdults.entries()) {
    const workplace =
      professionalBuildings[index % professionalBuildings.length];
    const template = PROFESSIONS.find(
      (entry) => entry.family === workplace.professionFamily
    );
    if (!template) {
      continue;
    }
    npc.profession =
      template.professions[index % template.professions.length] ??
      template.professions[0];
    npc.workplaceBuildingId = workplace.id;
    npc.workplaceProfessionFamily = template.family;
    workplace.workerNpcIds.push(npc.id);
  }
}

function getWorkWindow(family: TownProfessionFamily | undefined): {
  startHour: number;
  endHour: number;
} {
  switch (family) {
    case 'inn':
      return { startHour: 6, endHour: 22 };
    case 'market':
      return { startHour: 7, endHour: 16 };
    case 'temple':
      return { startHour: 6, endHour: 18 };
    case 'stable':
      return { startHour: 5, endHour: 19 };
    case 'school':
      return { startHour: 8, endHour: 15 };
    case 'town-hall':
      return { startHour: 9, endHour: 17 };
    case 'smithy':
    case 'workshop':
    default:
      return { startHour: 8, endHour: 17 };
  }
}

function getCommuteRoute(home: TownBuilding, workplace: TownBuilding) {
  const homeApproachY = home.y > 0 ? home.y - 1 : home.y + 1;
  const homeFrontageY = home.y > 0 ? home.y - 2 : home.y + 2;
  const workApproachY = workplace.y > 0 ? workplace.y - 1 : workplace.y + 1;
  const workFrontageY = workplace.y > 0 ? workplace.y - 2 : workplace.y + 2;

  return [
    { x: home.x, y: home.y },
    { x: home.x, y: homeApproachY },
    { x: home.x, y: homeFrontageY },
    { x: 0, y: homeFrontageY },
    { x: 0, y: 0 },
    { x: 0, y: workFrontageY },
    { x: workplace.x, y: workFrontageY },
    { x: workplace.x, y: workApproachY },
    { x: workplace.x, y: workplace.y },
  ];
}

function getRouteWaypoint(
  waypoints: Array<{ x: number; y: number }>,
  progress: number
): { x: number; y: number } {
  const maxIndex = waypoints.length - 1;
  const waypointIndex = Math.min(
    maxIndex,
    Math.max(0, Math.floor(progress * maxIndex))
  );
  return waypoints[waypointIndex] ?? waypoints[0] ?? { x: 0, y: 0 };
}

function getTownProfessionServiceOffers(
  family: TownProfessionFamily | undefined
): TownServiceOffer[] {
  switch (family) {
    case 'inn':
      return [
        {
          kind: 'trade',
          label: 'Supplies',
          description:
            'Buy and sell travel goods, meals, and common provisions.',
        },
        {
          kind: 'quests',
          label: 'Rumors',
          description: 'Ask about local troubles, travelers, and odd jobs.',
        },
      ];
    case 'smithy':
      return [
        {
          kind: 'trade',
          label: 'Smithing Goods',
          description: 'Buy and sell forged wares, tools, and equipment.',
        },
        {
          kind: 'training',
          label: 'Weapons Training',
          description: 'Learn combat fundamentals and practical weapon drills.',
        },
      ];
    case 'market':
      return [
        {
          kind: 'trade',
          label: 'Market Trade',
          description: 'Buy and sell produce, goods, and regional specialties.',
        },
        {
          kind: 'quests',
          label: 'Errands',
          description: 'Pick up delivery work and local merchant requests.',
        },
      ];
    case 'temple':
      return [
        {
          kind: 'healing',
          label: 'Healing',
          description: 'Receive care, blessings, and aid for the wounded.',
        },
        {
          kind: 'revival',
          label: 'Revival',
          description: 'Seek sacred rites for those lost in battle.',
        },
        {
          kind: 'quests',
          label: 'Sacred Tasks',
          description: 'Accept pilgrimages, charity work, and holy errands.',
        },
      ];
    case 'workshop':
      return [
        {
          kind: 'trade',
          label: 'Craft Goods',
          description: 'Commission or exchange crafted tools and materials.',
        },
        {
          kind: 'training',
          label: 'Craft Training',
          description: 'Study hands-on techniques from local artisans.',
        },
      ];
    case 'stable':
      return [
        {
          kind: 'trade',
          label: 'Stable Supplies',
          description: 'Arrange tack, feed, and overland travel support.',
        },
        {
          kind: 'quests',
          label: 'Courier Work',
          description: 'Take delivery runs and road-scouting assignments.',
        },
      ];
    case 'school':
      return [
        {
          kind: 'training',
          label: 'Lessons',
          description: 'Train practical skills with the town tutor or scribe.',
        },
        {
          kind: 'quests',
          label: 'Research Tasks',
          description: 'Help gather notes, texts, and field observations.',
        },
      ];
    case 'town-hall':
      return [
        {
          kind: 'quests',
          label: 'Town Contracts',
          description: 'Review work requests, civic duties, and local notices.',
        },
        {
          kind: 'training',
          label: 'Civic Guidance',
          description: 'Learn town rules, routes, and public responsibilities.',
        },
      ];
    default:
      return [];
  }
}

function getQuestProfileKey(profile: QuestPlayerProfile | undefined): string {
  const completed = [...(profile?.completedQuestIds ?? [])].sort().join(',');
  return [profile?.level ?? 1, profile?.profession ?? 'any', completed].join(
    '|'
  );
}

export function getTownBuildingId(
  tileX: number,
  tileY: number,
  plotX: number,
  plotY: number
): string {
  return `town:${tileX}:${tileY}:building:${plotX}:${plotY}`;
}

export function getTownProfile(tileX: number, tileY: number): TownProfile {
  const cacheKey = getTownCacheKey(tileX, tileY);
  const cached = townProfileCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const structure = getTownStructure(tileX, tileY);
  const profile: TownProfile = {
    ...structure,
    population: getTownNpcs(tileX, tileY).length,
  };
  townProfileCache.set(cacheKey, profile);
  return profile;
}

export function getTownBuildingPlots(
  tileX: number,
  tileY: number
): TownBuildingPlot[] {
  const profile = getTownStructure(tileX, tileY);
  const plots = SLOT_ORDER.slice(0, profile.buildingCount);
  return plots.map((slot, index) => ({
    ...slot,
    role:
      index < profile.professionalBuildings ? 'professional' : 'residential',
  }));
}

export function getTownBuildings(tileX: number, tileY: number): TownBuilding[] {
  const cacheKey = getTownCacheKey(tileX, tileY);
  const cached = buildingCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const buildings = getTownBuildingPlots(tileX, tileY).map((plot) => {
    const template =
      plot.role === 'professional'
        ? getBuildingProfessionTemplate(tileX, tileY, plot.x, plot.y)
        : null;
    return {
      ...plot,
      id: getTownBuildingId(tileX, tileY, plot.x, plot.y),
      professionFamily: template?.family,
      residentNpcIds: [],
      workerNpcIds: [],
    };
  });

  buildingCache.set(cacheKey, buildings);
  return buildings;
}

export function getTownNpcs(tileX: number, tileY: number): TownNpc[] {
  const cacheKey = getTownCacheKey(tileX, tileY);
  const cached = npcCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const buildings = getTownBuildings(tileX, tileY).map((building) => ({
    ...building,
    residentNpcIds: [...building.residentNpcIds],
    workerNpcIds: [...building.workerNpcIds],
  }));
  const residences = buildings.filter(
    (building) => building.role === 'residential'
  );
  const npcDrafts = residences.flatMap((residence) => {
    const members = createHouseholdNpcs(tileX, tileY, residence);
    residence.residentNpcIds.push(...members.map((npc) => npc.id));
    return members;
  });

  assignNpcJobs(tileX, tileY, npcDrafts, buildings);

  const npcs = npcDrafts.map((npc, index) => {
    const parentSurnameSeed = createTownIndexSeed(
      TOWN_PARENT_SURNAME_LABEL,
      tileX,
      tileY,
      index
    );
    const parentSurname = getLastName(parentSurnameSeed, tileX, tileY);
    return {
      ...npc,
      mother:
        npc.mother ??
        createParentIdentity(
          npc.id,
          'mother',
          'feminine',
          parentSurname,
          parentSurnameSeed,
          tileX,
          tileY
        ),
      father:
        npc.father ??
        createParentIdentity(
          npc.id,
          'father',
          'masculine',
          parentSurname,
          parentSurnameSeed,
          tileX,
          tileY
        ),
    };
  });

  for (const building of getTownBuildings(tileX, tileY)) {
    const resolved = buildings.find(
      (candidate) => candidate.id === building.id
    );
    if (!resolved) {
      continue;
    }
    building.residentNpcIds.splice(
      0,
      building.residentNpcIds.length,
      ...resolved.residentNpcIds
    );
    building.workerNpcIds.splice(
      0,
      building.workerNpcIds.length,
      ...resolved.workerNpcIds
    );
  }

  npcCache.set(cacheKey, npcs);
  return npcs;
}

export function getTownNpcPlacements(
  tileX: number,
  tileY: number,
  timeMs = 0
): TownNpcPlacement[] {
  const cycle = getDaylightCycleState(timeMs);
  const minuteOfDay = Math.floor(cycle.dayProgress * 24 * 60) % (24 * 60);
  const cacheKey = `${getTownCacheKey(tileX, tileY)}:${minuteOfDay}`;
  const cached = placementCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const npcs = getTownNpcs(tileX, tileY);
  const buildings = new Map(
    getTownBuildings(tileX, tileY).map((building) => [building.id, building])
  );

  const placements = npcs.map((npc) => {
    const home = buildings.get(npc.residenceBuildingId);
    const workplace = npc.workplaceBuildingId
      ? buildings.get(npc.workplaceBuildingId)
      : null;

    if (!home || !workplace || npc.professionStatus !== 'working') {
      return {
        npcId: npc.id,
        name: npc.name,
        x: home?.x ?? 0,
        y: home?.y ?? 0,
        state: 'home' as const,
      };
    }

    const workWindow = getWorkWindow(npc.workplaceProfessionFamily);
    const workStartMinute = workWindow.startHour * 60;
    const workEndMinute = workWindow.endHour * 60;
    const commuteDurationMinutes = 60;
    const commuteToWorkStart = Math.max(
      0,
      workStartMinute - commuteDurationMinutes
    );
    const commuteHomeEnd = Math.min(
      24 * 60,
      workEndMinute + commuteDurationMinutes
    );
    const route = getCommuteRoute(home, workplace);

    if (minuteOfDay < commuteToWorkStart || minuteOfDay >= commuteHomeEnd) {
      return {
        npcId: npc.id,
        name: npc.name,
        x: home.x,
        y: home.y,
        state: 'home' as const,
      };
    }

    if (minuteOfDay < workStartMinute) {
      const progress =
        (minuteOfDay - commuteToWorkStart) /
        Math.max(1, commuteDurationMinutes);
      const point = getRouteWaypoint(route, progress);
      return {
        npcId: npc.id,
        name: npc.name,
        x: point.x,
        y: point.y,
        state: 'commuting-to-work' as const,
      };
    }

    if (minuteOfDay < workEndMinute) {
      return {
        npcId: npc.id,
        name: npc.name,
        x: workplace.x,
        y: workplace.y,
        state: 'working' as const,
      };
    }

    const progress =
      (minuteOfDay - workEndMinute) / Math.max(1, commuteDurationMinutes);
    const point = getRouteWaypoint([...route].reverse(), progress);
    return {
      npcId: npc.id,
      name: npc.name,
      x: point.x,
      y: point.y,
      state: 'commuting-home' as const,
    };
  });

  placementCache.set(cacheKey, placements);
  return placements;
}

export function getTownNpcQuestStates(
  tileX: number,
  tileY: number,
  timeMs = 0,
  profile: QuestPlayerProfile = {}
): TownNpcQuestState[] {
  const cycle = getDaylightCycleState(timeMs);
  const minuteOfDay = Math.floor(cycle.dayProgress * 24 * 60) % (24 * 60);
  const cacheKey = `${getTownCacheKey(tileX, tileY)}:${minuteOfDay}:${getQuestProfileKey(profile)}`;
  const cached = questStateCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const placements = getTownNpcPlacements(tileX, tileY, timeMs);
  const npcs = new Map(getTownNpcs(tileX, tileY).map((npc) => [npc.id, npc]));
  const registry = getDefaultQuestRegistry();
  const completedQuestIds = new Set(profile.completedQuestIds ?? []);
  const playerLevel = Math.max(1, profile.level ?? 1);
  const townKey = `${tileX}:${tileY}`;

  const questStates = placements.map((placement) => {
    const npc = npcs.get(placement.npcId);
    const offers = npc
      ? registry.getOffers({
          npcId: npc.id,
          npcName: npc.name,
          townKey,
          dayProgress: cycle.dayProgress,
          yearProgress: cycle.yearProgress,
          playerLevel,
          playerProfession: profile.profession,
          completedQuestIds,
          npcState: placement.state,
          profession: npc.profession,
          professionFamily: npc.workplaceProfessionFamily,
          residenceBuildingId: npc.residenceBuildingId,
          workplaceBuildingId: npc.workplaceBuildingId,
        })
      : [];

    return {
      npcId: placement.npcId,
      name: placement.name,
      x: placement.x,
      y: placement.y,
      state: placement.state,
      offers,
    };
  });

  questStateCache.set(cacheKey, questStates);
  return questStates;
}

export function getTownBuildingServiceState(
  tileX: number,
  tileY: number,
  buildingId: string,
  timeMs = 0,
  profile: QuestPlayerProfile = {}
): TownBuildingServiceState {
  const cycle = getDaylightCycleState(timeMs);
  const minuteOfDay = Math.floor(cycle.dayProgress * 24 * 60) % (24 * 60);
  const cacheKey = `${getTownCacheKey(tileX, tileY)}:${buildingId}:${minuteOfDay}:${getQuestProfileKey(profile)}`;
  const cached = serviceStateCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const buildings = new Map(
    getTownBuildings(tileX, tileY).map((building) => [building.id, building])
  );
  const building = buildings.get(buildingId);
  if (!building) {
    const emptyState = {
      buildingId,
      presentNpcNames: [],
      availableServices: [],
      availableQuestOffers: [],
    };
    serviceStateCache.set(cacheKey, emptyState);
    return emptyState;
  }

  const placements = getTownNpcPlacements(tileX, tileY, timeMs);
  const questStates = getTownNpcQuestStates(tileX, tileY, timeMs, profile);
  const presentNpcNames = placements
    .filter(
      (placement) => placement.x === building.x && placement.y === building.y
    )
    .map((placement) => placement.name);
  const availableServices =
    building.role === 'professional' && presentNpcNames.length > 0
      ? getTownProfessionServiceOffers(building.professionFamily)
      : [];
  const availableQuestOffers = questStates
    .filter(
      (questState) => questState.x === building.x && questState.y === building.y
    )
    .flatMap((questState) => questState.offers);

  const state = {
    buildingId,
    presentNpcNames,
    availableServices,
    availableQuestOffers,
  };
  serviceStateCache.set(cacheKey, state);
  return state;
}

export function getTownBuildingLabel(
  professionFamily: TownProfessionFamily | undefined,
  role: TownBuildingRole
): string {
  if (role === 'residential') {
    return 'home';
  }
  return (
    PROFESSIONS.find((entry) => entry.family === professionFamily)
      ?.buildingLabel ?? 'workplace'
  );
}
