import type { ProceduralMusicSongSection } from './procedural-music-song.ts';
import type { ProceduralSongDna } from './procedural-music-song-dna.ts';

export type MusicDebugLyricLine = {
  startOffsetMs: number;
  text: string;
  sectionId: string;
  sectionLabel: string;
};

export function createMusicDebugLyrics(options: {
  leadFamily: string;
  sections: readonly ProceduralMusicSongSection[];
  songDna: Pick<
    ProceduralSongDna,
    | 'variantLabel'
    | 'encounterMode'
    | 'recognitionLabel'
    | 'regionLabel'
    | 'biomeLabel'
    | 'blueprintId'
  >;
}): MusicDebugLyricLine[] {
  if (options.leadFamily !== 'vocals') {
    return [];
  }

  const subject = resolveLyricSubject(options.songDna);
  const variantWord = resolveVariantWord(options.songDna.variantLabel);
  const encounterWord = resolveEncounterWord(options.songDna.encounterMode);
  const blueprintWord = resolveBlueprintWord(options.songDna.blueprintId);

  return options.sections.map((section, index) => ({
    startOffsetMs: section.startOffsetMs,
    text: resolveLyricLineText({
      sectionId: section.id,
      sectionLabel: section.label,
      subject,
      variantWord,
      encounterWord,
      blueprintWord,
      index,
    }),
    sectionId: section.id,
    sectionLabel: section.label,
  }));
}

function resolveLyricLineText(options: {
  sectionId: string;
  sectionLabel: string;
  subject: string;
  variantWord: string;
  encounterWord: string;
  blueprintWord: string;
  index: number;
}): string {
  switch (options.sectionId) {
    case 'intro':
      return `${options.variantWord} ${options.subject} awaken`;
    case 'a':
      return `${options.encounterWord} ${options.subject} wandering`;
    case 'b':
      return `${options.blueprintWord} ${options.subject} calling`;
    case 'a-prime':
      return `${options.encounterWord} ${options.subject} returning`;
    case 'return':
      return `${options.variantWord} ${options.subject} homeward`;
    case 'outro':
      return `${options.subject} keep glowing`;
    default:
      return `${options.subject} ${resolveFallbackSectionVerb(options.index)} ${sanitizeLyricToken(options.sectionLabel)}`;
  }
}

function resolveLyricSubject(
  songDna: Pick<
    ProceduralSongDna,
    'recognitionLabel' | 'regionLabel' | 'biomeLabel'
  >
): string {
  const tokens = [
    ...extractLyricTokens(songDna.recognitionLabel),
    ...extractLyricTokens(songDna.regionLabel),
    ...extractLyricTokens(songDna.biomeLabel),
  ];
  return tokens[0] ?? 'frontier';
}

function resolveVariantWord(
  variantLabel: ProceduralSongDna['variantLabel']
): string {
  switch (variantLabel) {
    case 'historical':
      return 'remembered';
    case 'ruined':
      return 'weathered';
    case 'standard':
    default:
      return 'restless';
  }
}

function resolveEncounterWord(
  encounterMode: ProceduralSongDna['encounterMode']
): string {
  switch (encounterMode) {
    case 'battle':
      return 'hold';
    case 'boss':
      return 'face';
    case 'ambient':
    default:
      return 'carry';
  }
}

function resolveBlueprintWord(
  blueprintId: ProceduralSongDna['blueprintId']
): string {
  switch (blueprintId) {
    case 'settled-chorus':
      return 'gather';
    case 'echoed-descent':
      return 'echo';
    case 'exploration-cycle':
    default:
      return 'wander';
  }
}

function resolveFallbackSectionVerb(index: number): string {
  return ['shine', 'glow', 'rise', 'rest'][index % 4] ?? 'shine';
}

function extractLyricTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => sanitizeLyricToken(token))
    .filter((token) => token.length >= 3 && token !== 'the' && token !== 'and');
}

function sanitizeLyricToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}
