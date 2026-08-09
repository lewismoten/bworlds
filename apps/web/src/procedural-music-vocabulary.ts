import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';
import type { InstrumentFamily } from './music-instrument-timbres.ts';

export type MusicRegionThemeId =
  | 'frontier-plains'
  | 'deep-forest'
  | 'coastal-shore'
  | 'town-square'
  | 'ridge-pass'
  | 'cavern-echo'
  | 'interior-hall';

export type MusicVocabularyDensity =
  'sparse' | 'measured' | 'flowing' | 'driving';

export type MusicVocabularyInstrumentFamilies = Record<
  'lead' | 'harmony' | 'bass' | 'percussion',
  readonly InstrumentFamily[]
>;

export type MusicThemeVocabulary = {
  themeId: MusicRegionThemeId;
  biomeLabel: string;
  regionLabel: string;
  tempoBandLabel: string;
  modeLabel: string;
  melodyRangeLabel: string;
  melodyRangeSemitones: readonly [number, number];
  rhythmDensityLabel: MusicVocabularyDensity;
  preferredIntervals: readonly number[];
  motifLabel: string;
  instrumentFamilies: MusicVocabularyInstrumentFamilies;
};

type MusicRegionalInfluence = {
  regionLabel: string;
  tempoBandLabel: string;
  modeLabel: string;
  rhythmDensityLabel: MusicVocabularyDensity;
  melodyRangeSemitonesDelta: readonly [number, number];
  preferredIntervals: readonly number[];
  motifLabel: string;
  instrumentFamilies?: Partial<MusicVocabularyInstrumentFamilies>;
};

const MUSIC_VOCABULARY_REGION_SEED = registerHashLabel(
  'music-vocabulary-region'
);

const BASE_THEME_VOCABULARY: Record<MusicRegionThemeId, MusicThemeVocabulary> =
  {
    'frontier-plains': {
      themeId: 'frontier-plains',
      biomeLabel: 'plains',
      regionLabel: 'open frontier',
      tempoBandLabel: 'wandering mid-tempo',
      modeLabel: 'minor pentatonic with open fifths',
      melodyRangeLabel: 'middle register',
      melodyRangeSemitones: [0, 14],
      rhythmDensityLabel: 'measured',
      preferredIntervals: [2, 3, 5, 7],
      motifLabel: 'open-road call',
      instrumentFamilies: {
        lead: ['vocals', 'lead-guitar', 'trumpet', 'flute'],
        harmony: ['guitar', 'piano', 'strings'],
        bass: ['bass-guitar', 'upright-bass', 'tuba'],
        percussion: ['kick', 'snare', 'shaker', 'hand-percussion'],
      },
    },
    'deep-forest': {
      themeId: 'deep-forest',
      biomeLabel: 'forest',
      regionLabel: 'canopy hush',
      tempoBandLabel: 'slow pulse',
      modeLabel: 'shadowed natural minor',
      melodyRangeLabel: 'low-to-middle register',
      melodyRangeSemitones: [-2, 10],
      rhythmDensityLabel: 'sparse',
      preferredIntervals: [1, 2, 3, 5],
      motifLabel: 'branch-whisper turn',
      instrumentFamilies: {
        lead: ['flute', 'violin', 'vocals', 'synth-lead'],
        harmony: ['strings', 'organ', 'synth-pad'],
        bass: ['upright-bass', 'bass-synth', 'tuba'],
        percussion: ['shaker', 'hand-percussion', 'cymbals'],
      },
    },
    'coastal-shore': {
      themeId: 'coastal-shore',
      biomeLabel: 'shore',
      regionLabel: 'tidal edge',
      tempoBandLabel: 'rolling medium sway',
      modeLabel: 'bright suspended pentatonic',
      melodyRangeLabel: 'middle-to-high register',
      melodyRangeSemitones: [2, 16],
      rhythmDensityLabel: 'flowing',
      preferredIntervals: [2, 4, 5, 7, 9],
      motifLabel: 'wave-rise answer',
      instrumentFamilies: {
        lead: ['flute', 'trumpet', 'vocals', 'synth-lead'],
        harmony: ['strings', 'guitar', 'synth-pad'],
        bass: ['upright-bass', 'bass-guitar', 'bass-synth'],
        percussion: ['shaker', 'cymbals', 'hand-percussion', 'snare'],
      },
    },
    'town-square': {
      themeId: 'town-square',
      biomeLabel: 'town',
      regionLabel: 'market square',
      tempoBandLabel: 'lively walking tempo',
      modeLabel: 'major pentatonic with ceremonial lifts',
      melodyRangeLabel: 'middle register',
      melodyRangeSemitones: [0, 15],
      rhythmDensityLabel: 'driving',
      preferredIntervals: [2, 4, 5, 7],
      motifLabel: 'festival fanfare',
      instrumentFamilies: {
        lead: ['vocals', 'trumpet', 'flute', 'lead-guitar'],
        harmony: ['piano', 'guitar', 'organ'],
        bass: ['bass-guitar', 'upright-bass', 'tuba'],
        percussion: ['kick', 'snare', 'cymbals', 'hand-percussion'],
      },
    },
    'ridge-pass': {
      themeId: 'ridge-pass',
      biomeLabel: 'mountain',
      regionLabel: 'wind-cut ridge',
      tempoBandLabel: 'tense marching pulse',
      modeLabel: 'jagged minor with tritone shade',
      melodyRangeLabel: 'wide upper-middle range',
      melodyRangeSemitones: [1, 17],
      rhythmDensityLabel: 'measured',
      preferredIntervals: [2, 3, 6, 7],
      motifLabel: 'summit warning',
      instrumentFamilies: {
        lead: ['trumpet', 'violin', 'flute', 'synth-lead'],
        harmony: ['strings', 'organ', 'guitar'],
        bass: ['tuba', 'upright-bass', 'bass-synth'],
        percussion: ['snare', 'cymbals', 'kick', 'hand-percussion'],
      },
    },
    'cavern-echo': {
      themeId: 'cavern-echo',
      biomeLabel: 'cave',
      regionLabel: 'echoing hollow',
      tempoBandLabel: 'slow subterranean drift',
      modeLabel: 'dark minor with hollow fifths',
      melodyRangeLabel: 'low register',
      melodyRangeSemitones: [-5, 9],
      rhythmDensityLabel: 'sparse',
      preferredIntervals: [1, 3, 5, 8],
      motifLabel: 'drip-echo descent',
      instrumentFamilies: {
        lead: ['violin', 'flute', 'synth-lead', 'vocals'],
        harmony: ['organ', 'strings', 'synth-pad'],
        bass: ['upright-bass', 'tuba', 'bass-synth'],
        percussion: ['cymbals', 'shaker', 'hand-percussion'],
      },
    },
    'interior-hall': {
      themeId: 'interior-hall',
      biomeLabel: 'interior',
      regionLabel: 'stone hall',
      tempoBandLabel: 'measured chamber tempo',
      modeLabel: 'formal major with leading tone pull',
      melodyRangeLabel: 'middle-to-high register',
      melodyRangeSemitones: [1, 14],
      rhythmDensityLabel: 'measured',
      preferredIntervals: [2, 4, 5, 7, 11],
      motifLabel: 'courtly cadence',
      instrumentFamilies: {
        lead: ['vocals', 'flute', 'violin', 'trumpet'],
        harmony: ['organ', 'piano', 'strings'],
        bass: ['upright-bass', 'bass-guitar', 'tuba'],
        percussion: ['hand-percussion', 'snare', 'cymbals'],
      },
    },
  };

const REGIONAL_INFLUENCES: Record<
  MusicRegionThemeId,
  readonly MusicRegionalInfluence[]
> = {
  'frontier-plains': [
    {
      regionLabel: 'river caravan',
      tempoBandLabel: 'easy rolling tempo',
      modeLabel: 'mixolydian-leaning frontier major',
      rhythmDensityLabel: 'flowing',
      melodyRangeSemitonesDelta: [0, 2],
      preferredIntervals: [2, 4, 5, 7, 9],
      motifLabel: 'wagon-wheel turn',
      instrumentFamilies: {
        lead: ['vocals', 'flute', 'lead-guitar'],
        harmony: ['guitar', 'piano', 'strings'],
      },
    },
    {
      regionLabel: 'ruins fringe',
      tempoBandLabel: 'hesitant walking tempo',
      modeLabel: 'minor pentatonic with ruin-stained seconds',
      rhythmDensityLabel: 'sparse',
      melodyRangeSemitonesDelta: [-1, 0],
      preferredIntervals: [1, 3, 5, 7],
      motifLabel: 'weathered call',
      instrumentFamilies: {
        harmony: ['strings', 'organ', 'guitar'],
        percussion: ['shaker', 'hand-percussion'],
      },
    },
    {
      regionLabel: 'sun-baked grassland',
      tempoBandLabel: 'steady travel tempo',
      modeLabel: 'dry dorian frontier mode',
      rhythmDensityLabel: 'measured',
      melodyRangeSemitonesDelta: [0, 1],
      preferredIntervals: [2, 3, 5, 7],
      motifLabel: 'heat-haze ascent',
    },
  ],
  'deep-forest': [
    {
      regionLabel: 'ancient grove',
      tempoBandLabel: 'ritual slow pulse',
      modeLabel: 'dorian forest chant',
      rhythmDensityLabel: 'sparse',
      melodyRangeSemitonesDelta: [-1, 1],
      preferredIntervals: [2, 3, 5, 8],
      motifLabel: 'owl-call answer',
    },
    {
      regionLabel: 'thicket trail',
      tempoBandLabel: 'quiet walking tempo',
      modeLabel: 'natural minor with narrow turns',
      rhythmDensityLabel: 'measured',
      melodyRangeSemitonesDelta: [0, 0],
      preferredIntervals: [1, 2, 3, 5],
      motifLabel: 'fern-step figure',
    },
    {
      regionLabel: 'moonlit glade',
      tempoBandLabel: 'floating nocturne tempo',
      modeLabel: 'lydian-tinted woodland hush',
      rhythmDensityLabel: 'flowing',
      melodyRangeSemitonesDelta: [1, 2],
      preferredIntervals: [2, 4, 5, 7],
      motifLabel: 'firefly spiral',
      instrumentFamilies: {
        lead: ['flute', 'synth-lead', 'vocals'],
        harmony: ['strings', 'synth-pad', 'organ'],
      },
    },
  ],
  'coastal-shore': [
    {
      regionLabel: 'harbor shoals',
      tempoBandLabel: 'dockside sway',
      modeLabel: 'major pentatonic sea shanty',
      rhythmDensityLabel: 'driving',
      melodyRangeSemitonesDelta: [0, 1],
      preferredIntervals: [2, 4, 5, 7],
      motifLabel: 'mast-call refrain',
    },
    {
      regionLabel: 'open surf',
      tempoBandLabel: 'wide rolling tempo',
      modeLabel: 'suspended coastal mode',
      rhythmDensityLabel: 'flowing',
      melodyRangeSemitonesDelta: [1, 2],
      preferredIntervals: [2, 5, 7, 9],
      motifLabel: 'breaker rise',
    },
    {
      regionLabel: 'storm shelf',
      tempoBandLabel: 'restless gale pulse',
      modeLabel: 'minor surf tension',
      rhythmDensityLabel: 'measured',
      melodyRangeSemitonesDelta: [-1, 1],
      preferredIntervals: [1, 3, 5, 7],
      motifLabel: 'warning buoy',
      instrumentFamilies: {
        harmony: ['organ', 'strings', 'synth-pad'],
        percussion: ['snare', 'cymbals', 'hand-percussion'],
      },
    },
  ],
  'town-square': [
    {
      regionLabel: 'merchant quarter',
      tempoBandLabel: 'brisk market pace',
      modeLabel: 'bright major procession',
      rhythmDensityLabel: 'driving',
      melodyRangeSemitonesDelta: [0, 2],
      preferredIntervals: [2, 4, 5, 7, 9],
      motifLabel: 'coin-clink flourish',
    },
    {
      regionLabel: 'cathedral close',
      tempoBandLabel: 'ceremonial tread',
      modeLabel: 'mixolydian civic hymn',
      rhythmDensityLabel: 'measured',
      melodyRangeSemitonesDelta: [1, 1],
      preferredIntervals: [2, 4, 5, 7, 11],
      motifLabel: 'bell processional',
      instrumentFamilies: {
        harmony: ['organ', 'piano', 'strings'],
        lead: ['trumpet', 'vocals', 'flute'],
      },
    },
    {
      regionLabel: 'back-alley taverns',
      tempoBandLabel: 'stomping dance tempo',
      modeLabel: 'rowdy minor/major mix',
      rhythmDensityLabel: 'driving',
      melodyRangeSemitonesDelta: [-1, 0],
      preferredIntervals: [2, 3, 5, 7],
      motifLabel: 'stagger-step hook',
      instrumentFamilies: {
        lead: ['lead-guitar', 'vocals', 'trumpet'],
        percussion: ['kick', 'snare', 'hand-percussion'],
      },
    },
  ],
  'ridge-pass': [
    {
      regionLabel: 'watchtower heights',
      tempoBandLabel: 'measured signal march',
      modeLabel: 'hard minor with brass calls',
      rhythmDensityLabel: 'measured',
      melodyRangeSemitonesDelta: [0, 2],
      preferredIntervals: [2, 5, 6, 7],
      motifLabel: 'signal-fire ascent',
    },
    {
      regionLabel: 'avalanche cut',
      tempoBandLabel: 'urgent climbing pace',
      modeLabel: 'tritone-shadowed ridge mode',
      rhythmDensityLabel: 'driving',
      melodyRangeSemitonesDelta: [1, 1],
      preferredIntervals: [1, 3, 6, 7],
      motifLabel: 'rockfall warning',
    },
    {
      regionLabel: 'high meadow pass',
      tempoBandLabel: 'thin-air wandering tempo',
      modeLabel: 'dorian ridge light',
      rhythmDensityLabel: 'flowing',
      melodyRangeSemitonesDelta: [0, 1],
      preferredIntervals: [2, 4, 5, 7],
      motifLabel: 'hawk-circle phrase',
    },
  ],
  'cavern-echo': [
    {
      regionLabel: 'flooded chambers',
      tempoBandLabel: 'dripping cavern pulse',
      modeLabel: 'phrygian cavern murmur',
      rhythmDensityLabel: 'sparse',
      melodyRangeSemitonesDelta: [-1, 0],
      preferredIntervals: [1, 3, 5, 8],
      motifLabel: 'water-ripple descent',
    },
    {
      regionLabel: 'buried shrine',
      tempoBandLabel: 'ritual undercroft tempo',
      modeLabel: 'minor chant with ceremonial fifths',
      rhythmDensityLabel: 'measured',
      melodyRangeSemitonesDelta: [0, 1],
      preferredIntervals: [2, 3, 5, 7],
      motifLabel: 'altar echo',
      instrumentFamilies: {
        harmony: ['organ', 'strings', 'synth-pad'],
      },
    },
    {
      regionLabel: 'crystal fault',
      tempoBandLabel: 'glittering subterranean drift',
      modeLabel: 'aeolian with shimmering seconds',
      rhythmDensityLabel: 'flowing',
      melodyRangeSemitonesDelta: [1, 2],
      preferredIntervals: [1, 2, 5, 8],
      motifLabel: 'crystal ring',
      instrumentFamilies: {
        lead: ['flute', 'synth-lead', 'violin'],
      },
    },
  ],
  'interior-hall': [
    {
      regionLabel: "scholar's wing",
      tempoBandLabel: 'measured study tempo',
      modeLabel: 'formal major with bookish turns',
      rhythmDensityLabel: 'measured',
      melodyRangeSemitonesDelta: [0, 1],
      preferredIntervals: [2, 4, 5, 7],
      motifLabel: 'ink-and-candle cadence',
    },
    {
      regionLabel: 'throne gallery',
      tempoBandLabel: 'ceremonial hall tempo',
      modeLabel: 'solemn major procession',
      rhythmDensityLabel: 'flowing',
      melodyRangeSemitonesDelta: [1, 2],
      preferredIntervals: [2, 4, 7, 11],
      motifLabel: 'banner-rise phrase',
      instrumentFamilies: {
        lead: ['trumpet', 'vocals', 'violin'],
        harmony: ['organ', 'strings', 'piano'],
      },
    },
    {
      regionLabel: 'servants corridor',
      tempoBandLabel: 'light bustling tempo',
      modeLabel: 'plain major domestic mode',
      rhythmDensityLabel: 'driving',
      melodyRangeSemitonesDelta: [-1, 0],
      preferredIntervals: [2, 4, 5, 7],
      motifLabel: 'footfall loop',
      instrumentFamilies: {
        harmony: ['piano', 'guitar', 'organ'],
      },
    },
  ],
};

export function resolveMusicThemeVocabulary(
  themeId: MusicRegionThemeId,
  clusterX = 0,
  clusterY = 0
): MusicThemeVocabulary {
  const base = BASE_THEME_VOCABULARY[themeId];
  const influence = resolveRegionalMusicInfluence(themeId, clusterX, clusterY);
  const melodyRangeSemitones = clampMelodyRangeSemitones(
    base.melodyRangeSemitones,
    influence.melodyRangeSemitonesDelta
  );

  return {
    ...base,
    regionLabel: influence.regionLabel,
    tempoBandLabel: influence.tempoBandLabel,
    modeLabel: influence.modeLabel,
    rhythmDensityLabel: influence.rhythmDensityLabel,
    melodyRangeSemitones,
    melodyRangeLabel: formatMelodyRangeLabel(melodyRangeSemitones),
    preferredIntervals: influence.preferredIntervals,
    motifLabel: influence.motifLabel,
    instrumentFamilies: mergeInstrumentFamilies(
      base.instrumentFamilies,
      influence.instrumentFamilies
    ),
  };
}

export function resolveRegionalMusicInfluence(
  themeId: MusicRegionThemeId,
  clusterX = 0,
  clusterY = 0
): MusicRegionalInfluence {
  const regionBucketX = Math.floor(clusterX / 48);
  const regionBucketY = Math.floor(clusterY / 48);
  const influences = REGIONAL_INFLUENCES[themeId];
  const influenceIndex = Math.floor(
    hash2DWithSeed(MUSIC_VOCABULARY_REGION_SEED, regionBucketX, regionBucketY) *
      influences.length
  );

  return influences[influenceIndex] ?? influences[0]!;
}

function mergeInstrumentFamilies(
  base: MusicVocabularyInstrumentFamilies,
  overrides?: Partial<MusicVocabularyInstrumentFamilies>
): MusicVocabularyInstrumentFamilies {
  return {
    lead: overrides?.lead ?? base.lead,
    harmony: overrides?.harmony ?? base.harmony,
    bass: overrides?.bass ?? base.bass,
    percussion: overrides?.percussion ?? base.percussion,
  };
}

function clampMelodyRangeSemitones(
  baseRange: readonly [number, number],
  delta: readonly [number, number]
): readonly [number, number] {
  const min = Math.max(-12, baseRange[0] + delta[0]);
  const max = Math.min(24, Math.max(min + 4, baseRange[1] + delta[1]));
  return [min, max];
}

function formatMelodyRangeLabel(range: readonly [number, number]): string {
  const width = range[1] - range[0];
  if (range[1] <= 10) {
    return 'low register';
  }
  if (range[0] >= 2 && width >= 12) {
    return 'middle-to-high register';
  }
  if (width >= 15) {
    return 'wide middle register';
  }
  return 'middle register';
}
