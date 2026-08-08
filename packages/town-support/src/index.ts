import { getDaylightCycleState, hash2D } from '@bworlds/core';

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
  | 'home'
  | 'commuting-to-work'
  | 'working'
  | 'commuting-home';

export type TownNpcPlacement = {
  npcId: string;
  name: string;
  x: number;
  y: number;
  state: TownNpcRoutineState;
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

const buildingCache = new Map<string, TownBuilding[]>();
const npcCache = new Map<string, TownNpc[]>();
const placementCache = new Map<string, TownNpcPlacement[]>();
const townProfileCache = new Map<string, TownProfile>();

function getTownCacheKey(tileX: number, tileY: number): string {
  return `${tileX}:${tileY}`;
}

function pickFromList<T>(
  list: readonly T[],
  key: string,
  tileX: number,
  tileY: number
): T {
  const index = Math.floor(hash2D(key, tileX, tileY) * list.length) % list.length;
  return list[index] as T;
}

function getTownStructure(tileX: number, tileY: number): TownStructure {
  const level = (1 + Math.floor(hash2D('town-level', tileX, tileY) * 4)) as TownLevel;
  const residentialBuildings =
    2 + level * 2 + Math.floor(hash2D('town-residential', tileX, tileY) * 2);
  const professionalBuildings =
    1 + level + Math.floor(hash2D('town-professional', tileX, tileY) * 2);
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

function getHouseholdSize(tileX: number, tileY: number, plotX: number, plotY: number): number {
  return (
    3 + Math.floor(hash2D(`town-household-size:${plotX}:${plotY}`, tileX, tileY) * 3)
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
    `town-profession-family:${plotX}:${plotY}`,
    tileX,
    tileY
  );
}

function createParentIdentity(
  npcId: string,
  label: 'mother' | 'father',
  style: NameStyle,
  surname: string,
  tileX: number,
  tileY: number
): TownNpcParent {
  const firstName = getFirstName(`${npcId}:${label}`, style, tileX, tileY);
  return {
    id: `${npcId}:${label}`,
    name: `${firstName} ${surname}`,
    resident: false,
  };
}

function getFirstName(
  key: string,
  style: NameStyle,
  tileX: number,
  tileY: number
): string {
  return style === 'feminine'
    ? pickFromList(FEMININE_FIRST_NAMES, key, tileX, tileY)
    : pickFromList(MASCULINE_FIRST_NAMES, key, tileX, tileY);
}

function getLastName(key: string, tileX: number, tileY: number): string {
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
  const householdSize = getHouseholdSize(tileX, tileY, residence.x, residence.y);
  const surname = getLastName(
    `town-household-surname:${residence.x}:${residence.y}`,
    tileX,
    tileY
  );
  const adultOneAge =
    24 + Math.floor(hash2D(`town-adult-one-age:${residence.id}`, tileX, tileY) * 20);
  const adultTwoAge =
    22 + Math.floor(hash2D(`town-adult-two-age:${residence.id}`, tileX, tileY) * 22);

  const adults: TownNpcDraft[] = [
    {
      id: createNpcId(tileX, tileY, residence.id, 0),
      name: `${getFirstName(
        `town-adult-one-name:${residence.id}`,
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
        `town-adult-two-name:${residence.id}`,
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
    const seedKey = `town-household-member:${residence.id}:${index}`;
    const memberTypeRoll = hash2D(`${seedKey}:type`, tileX, tileY);
    let age = 0;
    let lifeStage: TownNpcLifeStage = 'child';
    let style: NameStyle =
      hash2D(`${seedKey}:style`, tileX, tileY) < 0.5 ? 'feminine' : 'masculine';

    if (memberTypeRoll < 0.6) {
      age = 1 + Math.floor(hash2D(`${seedKey}:age`, tileX, tileY) * 17);
      lifeStage = 'child';
    } else if (memberTypeRoll < 0.88) {
      age = 18 + Math.floor(hash2D(`${seedKey}:age`, tileX, tileY) * 40);
      lifeStage = 'adult';
    } else {
      age = 65 + Math.floor(hash2D(`${seedKey}:age`, tileX, tileY) * 24);
      lifeStage = 'elder';
    }

    members.push({
      id: createNpcId(tileX, tileY, residence.id, index),
      name: `${getFirstName(`${seedKey}:name`, style, tileX, tileY)} ${surname}`,
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
          tileX,
          tileY
        ),
        father: createParentIdentity(
          npc.id,
          'father',
          'masculine',
          surname,
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
          tileX,
          tileY
        ),
        father: createParentIdentity(
          npc.id,
          'father',
          'masculine',
          surname,
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

function assignNpcJobs(tileX: number, tileY: number, npcs: TownNpcDraft[], buildings: TownBuilding[]) {
  const professionalBuildings = buildings.filter(
    (building): building is TownBuilding & { professionFamily: TownProfessionFamily } =>
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
    const workplace = professionalBuildings[index % professionalBuildings.length];
    const template = PROFESSIONS.find(
      (entry) => entry.family === workplace.professionFamily
    );
    if (!template) {
      continue;
    }
    npc.profession =
      template.professions[index % template.professions.length] ?? template.professions[0];
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

export function getTownBuildingPlots(tileX: number, tileY: number): TownBuildingPlot[] {
  const profile = getTownStructure(tileX, tileY);
  const plots = SLOT_ORDER.slice(0, profile.buildingCount);
  return plots.map((slot, index) => ({
    ...slot,
    role: index < profile.professionalBuildings ? 'professional' : 'residential',
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
  const residences = buildings.filter((building) => building.role === 'residential');
  const npcDrafts = residences.flatMap((residence) => {
    const members = createHouseholdNpcs(tileX, tileY, residence);
    residence.residentNpcIds.push(...members.map((npc) => npc.id));
    return members;
  });

  assignNpcJobs(tileX, tileY, npcDrafts, buildings);

  const npcs = npcDrafts.map((npc) => ({
    ...npc,
    mother:
      npc.mother ??
      createParentIdentity(
        npc.id,
        'mother',
        'feminine',
        getLastName(`town-parent-surname:${npc.id}`, tileX, tileY),
        tileX,
        tileY
      ),
    father:
      npc.father ??
      createParentIdentity(
        npc.id,
        'father',
        'masculine',
        getLastName(`town-parent-surname:${npc.id}`, tileX, tileY),
        tileX,
        tileY
      ),
  }));

  for (const building of getTownBuildings(tileX, tileY)) {
    const resolved = buildings.find((candidate) => candidate.id === building.id);
    if (!resolved) {
      continue;
    }
    building.residentNpcIds.splice(0, building.residentNpcIds.length, ...resolved.residentNpcIds);
    building.workerNpcIds.splice(0, building.workerNpcIds.length, ...resolved.workerNpcIds);
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
    const commuteToWorkStart = Math.max(0, workStartMinute - commuteDurationMinutes);
    const commuteHomeEnd = Math.min(24 * 60, workEndMinute + commuteDurationMinutes);
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
        (minuteOfDay - commuteToWorkStart) / Math.max(1, commuteDurationMinutes);
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

export function getTownBuildingLabel(
  professionFamily: TownProfessionFamily | undefined,
  role: TownBuildingRole
): string {
  if (role === 'residential') {
    return 'home';
  }
  return (
    PROFESSIONS.find((entry) => entry.family === professionFamily)?.buildingLabel ??
    'workplace'
  );
}
