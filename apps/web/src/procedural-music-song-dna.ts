import {
  createProceduralInstrumentBank,
  resolveMusicTheme,
  type MusicEncounterMode,
  type MusicUpdateOptions,
} from './procedural-music.ts';
import {
  resolveProceduralChordProgression,
  resolveProceduralLeadContour,
  resolveProceduralLeadMotif,
} from './procedural-music-harmony.ts';
import { resolveProceduralMusicBlueprint } from './procedural-music-blueprint.ts';

export type ProceduralSongDna = {
  identityId: string;
  themeId: ReturnType<typeof resolveMusicTheme>['id'];
  biomeLabel: string;
  regionLabel: string;
  rootHz: number;
  modeLabel: string;
  tempoBandLabel: string;
  meterLabel: '4/4';
  progression: readonly number[];
  leadMotif: readonly number[];
  sharedMotif: readonly number[];
  leadContour: readonly string[];
  blueprintId: ReturnType<typeof resolveProceduralMusicBlueprint>['id'];
  blueprintLabel: string;
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
  const leadMotif = [
    ...resolveProceduralLeadMotif(theme, clusterX, clusterY).degreeOffsets,
  ];
  const leadContour = resolveProceduralLeadContour(
    theme,
    clusterX,
    clusterY
  ).map((step) => `${step.stage}:${step.degreeOffset}`);

  return {
    identityId: [
      theme.id,
      options.contextType ?? 'overworld',
      clusterX,
      clusterY,
    ].join(':'),
    themeId: theme.id,
    biomeLabel: theme.vocabulary.biomeLabel,
    regionLabel: theme.vocabulary.regionLabel,
    rootHz: theme.rootHz,
    modeLabel: theme.vocabulary.modeLabel,
    tempoBandLabel: theme.vocabulary.tempoBandLabel,
    meterLabel: '4/4',
    progression,
    leadMotif,
    sharedMotif: [...theme.motif.sharedDegreeOffsets],
    leadContour,
    blueprintId: blueprint.id,
    blueprintLabel: blueprint.label,
    instrumentation: {
      lead: instrumentBank.instruments.lead.family,
      harmony: instrumentBank.instruments.harmony.family,
      bass: instrumentBank.instruments.bass.family,
      percussion: instrumentBank.instruments.percussion.family,
    },
    encounterMode: options.encounterMode ?? 'ambient',
  };
}
