import {
  appendHashSeedLabel,
  appendHashSeedPart,
  hash2DWithSeed,
  registerHashLabel,
} from '@bworlds/core/hash';
import { getTownNpcs, type TownNpc } from '@bworlds/town-support';
import type { ProceduralThemeMotif } from './procedural-music-theme-motif.ts';

export type ProceduralMusicNpcMotif = {
  npcId: string;
  npcName: string;
  professionLabel: string;
  motifDegreeOffsets: readonly number[];
};

const NPC_MOTIF_IDENTITY_SEED = registerHashLabel('music-npc-motif-identity');
const NPC_MOTIF_PATTERN_SEED = registerHashLabel('music-npc-motif-pattern');
const NPC_IMPORTANCE_SEED = registerHashLabel('music-npc-importance');
const NPC_MOTIF_PATTERNS = [
  [0, 2, 1, 3],
  [0, 1, 3, 1],
  [0, 2, 4, 2],
  [0, 1, 0, 2],
  [0, 3, 2, 1],
  [0, 2, 3, 1, 2, 0],
] as const;

export function resolveImportantMusicNpcMotifs(options: {
  tileKind?: string;
  contextType?: string;
  clusterX?: number;
  clusterY?: number;
}): ProceduralMusicNpcMotif[] {
  if (!supportsNpcMusicMotifs(options.contextType, options.tileKind)) {
    return [];
  }

  const townX = options.clusterX ?? 0;
  const townY = options.clusterY ?? 0;
  const importantNpcs = [...getTownNpcs(townX, townY)]
    .sort((left, right) => compareImportantTownNpcs(left, right, townX, townY))
    .slice(0, 2);

  return importantNpcs.map((npc) => ({
    npcId: npc.id,
    npcName: npc.name,
    professionLabel:
      npc.profession ?? npc.workplaceProfessionFamily ?? npc.lifeStage,
    motifDegreeOffsets: resolveNpcMotifPattern(npc, townX, townY),
  }));
}

export function blendThemeMotifWithImportantNpcMotif(
  motif: ProceduralThemeMotif,
  options: {
    tileKind?: string;
    contextType?: string;
    clusterX?: number;
    clusterY?: number;
  }
): ProceduralThemeMotif {
  const npcMotif =
    resolveImportantMusicNpcMotifs(options)[0]?.motifDegreeOffsets ?? null;
  if (!npcMotif || npcMotif.length === 0) {
    return motif;
  }

  const blended: number[] = [];
  const base = motif.adaptedDegreeOffsets;
  const length = Math.max(base.length, npcMotif.length);

  for (let index = 0; index < length; index += 1) {
    const baseDegree = base[index % base.length] ?? 0;
    const npcDegree = npcMotif[index % npcMotif.length] ?? baseDegree;
    blended.push(index % 2 === 0 ? baseDegree : npcDegree);
  }

  return {
    ...motif,
    adaptedDegreeOffsets: blended,
  };
}

function supportsNpcMusicMotifs(
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

function compareImportantTownNpcs(
  left: TownNpc,
  right: TownNpc,
  townX: number,
  townY: number
): number {
  const scoreDifference =
    scoreTownNpcImportance(right, townX, townY) -
    scoreTownNpcImportance(left, townX, townY);
  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const workplaceComparison = (
    left.workplaceProfessionFamily ?? ''
  ).localeCompare(right.workplaceProfessionFamily ?? '');
  if (workplaceComparison !== 0) {
    return workplaceComparison;
  }

  const professionComparison = (left.profession ?? '').localeCompare(
    right.profession ?? ''
  );
  if (professionComparison !== 0) {
    return professionComparison;
  }

  return left.id.localeCompare(right.id);
}

function scoreTownNpcImportance(
  npc: TownNpc,
  townX: number,
  townY: number
): number {
  let score = 0;
  if (npc.workplaceProfessionFamily) {
    score += 6;
  }
  if (npc.professionStatus === 'working') {
    score += 3;
  }
  if (npc.lifeStage === 'adult') {
    score += 2;
  } else if (npc.lifeStage === 'elder') {
    score += 1;
  }

  return (
    score +
    hash2DWithSeed(
      appendHashSeedPart(NPC_IMPORTANCE_SEED, npc.id.length),
      townX,
      townY
    )
  );
}

function resolveNpcMotifPattern(
  npc: TownNpc,
  townX: number,
  townY: number
): readonly number[] {
  const identitySeed = appendHashSeedPart(
    appendHashSeedLabel(NPC_MOTIF_IDENTITY_SEED, npc.id.length),
    npc.name.length
  );
  const patternSeed = appendHashSeedLabel(identitySeed, NPC_MOTIF_PATTERN_SEED);
  const patternIndex = Math.floor(
    hash2DWithSeed(patternSeed, townX, townY) * NPC_MOTIF_PATTERNS.length
  );
  const pattern = NPC_MOTIF_PATTERNS[patternIndex] ?? NPC_MOTIF_PATTERNS[0];
  const accentOffset =
    npc.workplaceProfessionFamily === 'town-hall' ||
    npc.workplaceProfessionFamily === 'temple'
      ? 1
      : npc.workplaceProfessionFamily === 'stable' ||
          npc.workplaceProfessionFamily === 'smithy'
        ? 2
        : 0;

  return pattern.map((degree, index) =>
    index % 3 === 1 ? degree + accentOffset : degree
  );
}
