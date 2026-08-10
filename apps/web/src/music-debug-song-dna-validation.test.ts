import { describe, expect, it } from 'vitest';
import { validateMusicDebugSongDna } from './music-debug-song-dna-validation.ts';

describe('music debug SongDNA validation', () => {
  it('accepts a shared root, mode, and instrumentation across tracks', () => {
    const validation = validateMusicDebugSongDna({
      songDna: createSongDna(),
      rootMidiNote: 55,
      modePitchOffsets: [0, 2, 4, 5, 7, 9, 10],
      instrumentBank: createInstrumentBank(),
      roleCounts: { bass: 8, harmony: 12, lead: 10, percussion: 6 },
      outOfModeNotesByRole: { bass: 0, harmony: 1, lead: 1, percussion: 0 },
      dominantPitchClassesByRole: {
        bass: ['G', 'D'],
        harmony: ['B', 'D', 'G'],
        lead: ['D', 'G', 'A'],
        percussion: [],
      },
    });

    expect(validation.isValidForMidiExport).toBe(true);
    expect(validation.messages).toEqual([]);
  });

  it('flags root, instrumentation, and tonal-center drift against shared SongDNA', () => {
    const validation = validateMusicDebugSongDna({
      songDna: {
        ...createSongDna(),
        rootMidiNote: 56,
      },
      rootMidiNote: 55,
      modePitchOffsets: [0, 2, 4, 5, 7, 9, 10],
      instrumentBank: createInstrumentBank(),
      roleCounts: { bass: 8, harmony: 12, lead: 10, percussion: 6 },
      outOfModeNotesByRole: { bass: 5, harmony: 0, lead: 0, percussion: 0 },
      dominantPitchClassesByRole: {
        bass: ['C#'],
        harmony: ['B', 'D', 'G'],
        lead: ['D', 'G', 'A'],
        percussion: [],
      },
    });

    expect(validation.isValidForMidiExport).toBe(false);
    expect(validation.messages).toContain(
      'SongDNA root MIDI 56 does not match shared scale root 55.'
    );
    expect(validation.messages).toContain(
      'SongDNA bass track has more out-of-mode notes than in-mode notes.'
    );
  });
});

function createSongDna() {
  return {
    identityId: 'frontier-plains:overworld:3:-2',
    sourceIdentityId: 'frontier-plains:overworld:3:-2',
    themeId: 'frontier-plains',
    biomeLabel: 'plains',
    regionLabel: 'frontier',
    rootHz: 196,
    rootMidiNote: 55,
    locationIdentityId: 'frontier:3:-2',
    recognitionLabel: 'Frontier Plains',
    modeLabel: 'mixolydian',
    tempoBandLabel: 'easy roaming',
    meterLabel: '4/4' as const,
    variantLabel: 'standard' as const,
    progression: [0, 4, 5, 3],
    leadMotif: [0, 2, 4, 2],
    sharedMotif: [0, 2, 4, 2],
    locationRecognitionMotif: [0, 2, 4, 2],
    leadContour: ['start:0', 'rise:2', 'climax:4', 'resolve:0'],
    blueprintId: 'easy-exploration',
    blueprintLabel: 'Easy Exploration',
    factionMotifs: [],
    factionInteractionMotif: [],
    importantNpcMotifs: [],
    instrumentation: {
      lead: 'flute',
      harmony: 'organ',
      bass: 'tuba',
      percussion: 'shaker',
    },
    encounterMode: 'ambient' as const,
  };
}

function createInstrumentBank() {
  return {
    themeId: 'frontier-plains' as const,
    instruments: {
      lead: { family: 'flute' },
      harmony: { family: 'organ' },
      bass: { family: 'tuba' },
      percussion: { family: 'shaker' },
    },
  };
}
