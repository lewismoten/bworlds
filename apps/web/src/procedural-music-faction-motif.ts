import {
  appendHashSeedLabel,
  appendHashSeedPart,
  hash2DWithSeed,
  registerHashLabel,
} from '@bworlds/core/hash';
import {
  getTownNpcs,
  type TownNpc,
  type TownProfessionFamily,
} from '@bworlds/town-support';
import type { ProceduralThemeMotif } from './procedural-music-theme-motif.ts';

export type ProceduralMusicFactionMotif = {
  factionId: string;
  factionName: string;
  sourceProfessionFamily: TownProfessionFamily;
  motifDegreeOffsets: readonly number[];
};

const FACTION_MOTIF_IDENTITY_SEED = registerHashLabel(
  'music-faction-motif-identity'
);
const FACTION_MOTIF_PATTERN_SEED = registerHashLabel(
  'music-faction-motif-pattern'
);
const FACTION_IMPORTANCE_SEED = registerHashLabel('music-faction-importance');
const FACTION_MOTIF_PATTERNS = [
  [0, 2, 4, 2],
  [0, 1, 3, 1],
  [0, 3, 2, 4],
  [0, 2, 1, 0, 3],
  [0, 1, 4, 2, 3, 1],
] as const;
const FACTION_FAMILY_ORDER: readonly TownProfessionFamily[] = [
  'town-hall',
  'market',
  'temple',
];

export function resolveMusicFactionMotifs(options: {
  tileKind?: string;
  contextType?: string;
  clusterX?: number;
  clusterY?: number;
}): ProceduralMusicFactionMotif[] {
  if (!supportsFactionMotifs(options.contextType, options.tileKind)) {
    return [];
  }

  const townX = options.clusterX ?? 0;
  const townY = options.clusterY ?? 0;
  const factions = collectFactionSources(townX, townY).slice(0, 2);

  return factions.map((entry) => ({
    factionId: entry.family,
    factionName: resolveFactionName(entry.family),
    sourceProfessionFamily: entry.family,
    motifDegreeOffsets: resolveFactionMotifPattern(entry.family, townX, townY),
  }));
}

export function resolveFactionInteractionMotif(
  options: Parameters<typeof resolveMusicFactionMotifs>[0]
): readonly number[] {
  const motifs = resolveMusicFactionMotifs(options);
  if (motifs.length === 0) {
    return [];
  }
  if (motifs.length === 1) {
    return motifs[0]!.motifDegreeOffsets;
  }

  const first = motifs[0]!.motifDegreeOffsets;
  const second = motifs[1]!.motifDegreeOffsets;
  const interaction: number[] = [];
  const length = Math.max(first.length, second.length);

  for (let index = 0; index < length; index += 1) {
    interaction.push(
      index % 2 === 0
        ? (first[index % first.length] ?? 0)
        : (second[index % second.length] ?? 0)
    );
  }

  return interaction;
}

export function blendThemeMotifWithFactionInteraction(
  motif: ProceduralThemeMotif,
  options: Parameters<typeof resolveMusicFactionMotifs>[0]
): ProceduralThemeMotif {
  const interaction = resolveFactionInteractionMotif(options);
  if (interaction.length === 0) {
    return motif;
  }

  const base = motif.adaptedDegreeOffsets;
  const blended: number[] = [];
  const length = Math.max(base.length, interaction.length);

  for (let index = 0; index < length; index += 1) {
    const baseDegree = base[index % base.length] ?? 0;
    const interactionDegree =
      interaction[index % interaction.length] ?? baseDegree;
    blended.push(index % 3 === 2 ? interactionDegree : baseDegree);
  }

  return {
    ...motif,
    adaptedDegreeOffsets: blended,
  };
}

function supportsFactionMotifs(
  contextType?: string,
  tileKind?: string
): boolean {
  return (
    contextType === 'town' ||
    contextType === 'building' ||
    tileKind === 'town' ||
    tileKind === 'floor'
  );
}

function collectFactionSources(
  townX: number,
  townY: number
): Array<{ family: TownProfessionFamily; count: number }> {
  const counts = new Map<TownProfessionFamily, number>();
  const npcs = getTownNpcs(townX, townY);

  for (const npc of npcs) {
    const family = npc.workplaceProfessionFamily;
    if (family !== 'town-hall' && family !== 'market' && family !== 'temple') {
      continue;
    }
    counts.set(family, (counts.get(family) ?? 0) + 1);
  }

  return FACTION_FAMILY_ORDER.map((family) => ({
    family,
    count: counts.get(family) ?? 0,
  }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) =>
      compareFactionSources(left, right, townX, townY, npcs)
    );
}

function compareFactionSources(
  left: { family: TownProfessionFamily; count: number },
  right: { family: TownProfessionFamily; count: number },
  townX: number,
  townY: number,
  npcs: readonly TownNpc[]
): number {
  const scoreDifference =
    scoreFactionImportance(right.family, right.count, townX, townY, npcs) -
    scoreFactionImportance(left.family, left.count, townX, townY, npcs);
  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  return (
    FACTION_FAMILY_ORDER.indexOf(left.family) -
    FACTION_FAMILY_ORDER.indexOf(right.family)
  );
}

function scoreFactionImportance(
  family: TownProfessionFamily,
  count: number,
  townX: number,
  townY: number,
  npcs: readonly TownNpc[]
): number {
  const workingCount = npcs.filter(
    (npc) =>
      npc.workplaceProfessionFamily === family &&
      npc.professionStatus === 'working'
  ).length;
  const civicWeight = family === 'town-hall' ? 3 : family === 'temple' ? 2 : 1;

  return (
    count * 8 +
    workingCount * 3 +
    civicWeight +
    hash2DWithSeed(
      appendHashSeedPart(FACTION_IMPORTANCE_SEED, family.length),
      townX,
      townY
    )
  );
}

function resolveFactionName(family: TownProfessionFamily): string {
  switch (family) {
    case 'town-hall':
      return 'the town council';
    case 'temple':
      return 'the lantern shrine';
    case 'market':
      return 'the merchants guild';
    default:
      return family;
  }
}

function resolveFactionMotifPattern(
  family: TownProfessionFamily,
  townX: number,
  townY: number
): readonly number[] {
  const identitySeed = appendHashSeedPart(
    appendHashSeedLabel(FACTION_MOTIF_IDENTITY_SEED, family.length),
    resolveFactionName(family).length
  );
  const patternSeed = appendHashSeedLabel(
    identitySeed,
    FACTION_MOTIF_PATTERN_SEED
  );
  const patternIndex = Math.floor(
    hash2DWithSeed(patternSeed, townX, townY) * FACTION_MOTIF_PATTERNS.length
  );
  const pattern =
    FACTION_MOTIF_PATTERNS[patternIndex] ?? FACTION_MOTIF_PATTERNS[0];
  const accentOffset = family === 'town-hall' ? 2 : family === 'temple' ? 1 : 0;

  return pattern.map((degree, index) =>
    index % 2 === 1 ? degree + accentOffset : degree
  );
}
