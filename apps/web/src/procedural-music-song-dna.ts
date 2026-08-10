import {
  createProceduralInstrumentBank,
  type MusicEncounterMode,
  type MusicUpdateOptions,
} from './procedural-music.ts';
import { resolveMusicTheme } from './procedural-music-rich-theme.ts';
import {
  resolveFactionInteractionMotif,
  resolveMusicFactionMotifs,
} from './procedural-music-faction-motif.ts';
import {
  resolveProceduralChordProgression,
  resolveProceduralLeadContour,
  resolveProceduralLeadMotif,
} from './procedural-music-harmony.ts';
import { resolveProceduralMusicLocationMemory } from './procedural-music-location-memory.ts';
import { resolveProceduralMusicBlueprint } from './procedural-music-blueprint.ts';
import { resolveImportantMusicNpcMotifs } from './procedural-music-npc-motif.ts';

export type ProceduralSongDna = {
  identityId: string;
  sourceIdentityId: string;
  themeId: ReturnType<typeof resolveMusicTheme>['id'];
  biomeLabel: string;
  regionLabel: string;
  rootHz: number;
  rootMidiNote: number;
  locationIdentityId: string;
  recognitionLabel: string;
  modeLabel: string;
  tempoBandLabel: string;
  meterLabel: '4/4';
  variantLabel: 'standard' | 'historical' | 'ruined';
  progression: readonly number[];
  leadMotif: readonly number[];
  sharedMotif: readonly number[];
  locationRecognitionMotif: readonly number[];
  leadContour: readonly string[];
  blueprintId: ReturnType<typeof resolveProceduralMusicBlueprint>['id'];
  blueprintLabel: string;
  factionMotifs: Array<{
    factionId: string;
    factionName: string;
    sourceProfessionFamily: string;
    motifDegreeOffsets: readonly number[];
  }>;
  factionInteractionMotif: readonly number[];
  importantNpcMotifs: Array<{
    npcId: string;
    npcName: string;
    professionLabel: string;
    motifDegreeOffsets: readonly number[];
  }>;
  instrumentation: Record<'lead' | 'harmony' | 'bass' | 'percussion', string>;
  encounterMode: MusicEncounterMode;
};

export function createProceduralSongDna(
  options: Pick<
    MusicUpdateOptions,
    'tileKind' | 'contextType' | 'clusterX' | 'clusterY' | 'encounterMode'
  >
): ProceduralSongDna {
  const clusterX = options.clusterX ?? 0;
  const clusterY = options.clusterY ?? 0;
  const theme = resolveMusicTheme(
    options.tileKind,
    options.contextType,
    undefined,
    clusterX,
    clusterY
  );
  const blueprint = resolveProceduralMusicBlueprint(options);
  const instrumentBank = createProceduralInstrumentBank(
    theme,
    clusterX,
    clusterY
  );
  const progression = [
    ...resolveProceduralChordProgression(theme, clusterX, clusterY),
  ];
  const locationMemory = resolveProceduralMusicLocationMemory(options);
  const leadMotif = [
    ...resolveProceduralLeadMotif(theme, clusterX, clusterY).degreeOffsets,
  ];
  const leadContour = resolveProceduralLeadContour(
    theme,
    clusterX,
    clusterY
  ).map((step) => `${step.stage}:${step.degreeOffset}`);
  const factionMotifs = resolveMusicFactionMotifs(options);
  const factionInteractionMotif = resolveFactionInteractionMotif(options);
  const importantNpcMotifs = resolveImportantMusicNpcMotifs(options);
  const variantLabel = resolveSongDnaVariantLabel(
    options.tileKind,
    options.contextType
  );
  const sourceIdentityId = [
    theme.id,
    options.contextType ?? 'overworld',
    clusterX,
    clusterY,
  ].join(':');

  return {
    identityId: sourceIdentityId,
    sourceIdentityId,
    themeId: theme.id,
    biomeLabel: theme.vocabulary.biomeLabel,
    regionLabel: theme.vocabulary.regionLabel,
    rootHz: theme.rootHz,
    rootMidiNote: theme.rootMidiNote,
    locationIdentityId: locationMemory.locationIdentityId,
    recognitionLabel: locationMemory.recognitionLabel,
    modeLabel: formatVariantModeLabel(theme.vocabulary.modeLabel, variantLabel),
    tempoBandLabel: formatVariantTempoLabel(
      theme.vocabulary.tempoBandLabel,
      variantLabel
    ),
    meterLabel: '4/4',
    variantLabel,
    progression,
    leadMotif,
    sharedMotif: [...theme.motif.sharedDegreeOffsets],
    locationRecognitionMotif: [...locationMemory.recognitionDegreeOffsets],
    leadContour,
    blueprintId: blueprint.id,
    blueprintLabel: blueprint.label,
    factionMotifs,
    factionInteractionMotif,
    importantNpcMotifs,
    instrumentation: {
      lead: instrumentBank.instruments.lead.family,
      harmony: instrumentBank.instruments.harmony.family,
      bass: instrumentBank.instruments.bass.family,
      percussion: instrumentBank.instruments.percussion.family,
    },
    encounterMode: options.encounterMode ?? 'ambient',
  };
}

function resolveSongDnaVariantLabel(
  tileKind: MusicUpdateOptions['tileKind'],
  contextType: MusicUpdateOptions['contextType']
): ProceduralSongDna['variantLabel'] {
  if (
    tileKind === 'ruins' ||
    tileKind === 'quarry' ||
    contextType === 'dungeon'
  ) {
    return 'ruined';
  }
  if (
    tileKind === 'tower' ||
    tileKind === 'stronghold' ||
    tileKind === 'observatory' ||
    tileKind === 'lighthouse'
  ) {
    return 'historical';
  }
  return 'standard';
}

function formatVariantModeLabel(
  modeLabel: string,
  variantLabel: ProceduralSongDna['variantLabel']
): string {
  if (variantLabel === 'ruined') {
    return `${modeLabel} (weathered)`;
  }
  if (variantLabel === 'historical') {
    return `${modeLabel} (ancestral)`;
  }
  return modeLabel;
}

function formatVariantTempoLabel(
  tempoBandLabel: string,
  variantLabel: ProceduralSongDna['variantLabel']
): string {
  if (variantLabel === 'ruined') {
    return `eroded ${tempoBandLabel}`;
  }
  if (variantLabel === 'historical') {
    return `ceremonial ${tempoBandLabel}`;
  }
  return tempoBandLabel;
}
