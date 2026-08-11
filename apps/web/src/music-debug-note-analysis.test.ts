import { describe, expect, it } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  analyzeMusicDebugPitches,
  resolveMusicDebugAccidentalBudget,
} from './music-debug-note-analysis.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import { resolveProceduralScaleDegreeMidiNote } from './procedural-music-scale.ts';

const PLAINS_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'plains',
  contextType: 'overworld',
  clusterX: 0,
  clusterY: 0,
});
const FOREST_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'forest',
  contextType: 'overworld',
  clusterX: 4,
  clusterY: -1,
});
const TOWN_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'town',
  contextType: 'town',
  clusterX: 3,
  clusterY: -2,
});
const CAVE_BOSS_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'cave',
  contextType: 'dungeon',
  encounterMode: 'boss',
  combatIntensity: 0.95,
  clusterX: 2,
  clusterY: 5,
});

describe('music debug note analysis', () => {
  it('classifies named chromatic embellishments and rejects unsupported leaps', () => {
    const notes: ProceduralMusicNote[] = [
      createNote('lead', 207.65),
      createNote('lead', 220),
      createNote('harmony', 196),
      createNote('bass', 98),
      createNote('bass', 103.83),
      createNote('bass', 110),
      createNote('bass', 138.59),
      createTimedNote('harmony', 138.59, 620, 360),
      createTimedNote('lead', 138.59, 640, 320),
      createTimedNote('lead', 155.56, 960, 320),
      createNote('percussion', 180),
    ];

    const validation = analyzeMusicDebugPitches({
      notes,
      rootHz: 196,
      modePitchOffsets: [0, 2, 4, 5, 7, 9, 10],
      encounterMode: 'ambient',
      themeId: 'frontier-plains',
    });

    expect(validation.notePitchDiagnostics[0]).toEqual(
      expect.objectContaining({
        role: 'lead',
        isBlackKey: true,
        inMode: false,
        accidentalReason: 'lower-approach',
        accidentalRuleLabel: 'Lower chromatic approach',
      })
    );
    expect(validation.notePitchDiagnostics[1]).toEqual(
      expect.objectContaining({
        role: 'lead',
        midiNote: 57,
        scaleDegree: 2,
        isBlackKey: false,
        inMode: true,
        accidentalReason: 'in-mode',
        accidentalRuleLabel: 'In mode',
      })
    );
    expect(validation.notePitchDiagnostics[4]).toEqual(
      expect.objectContaining({
        role: 'bass',
        isBlackKey: true,
        inMode: false,
        accidentalReason: 'chromatic-passing',
        accidentalRuleLabel: 'Chromatic passing tone',
      })
    );
    expect(validation.notePitchDiagnostics[6]).toEqual(
      expect.objectContaining({
        role: 'bass',
        isBlackKey: true,
        inMode: false,
        accidentalReason: 'unsupported-chromatic-leap',
        accidentalRuleLabel: 'Unsupported chromatic leap',
      })
    );
    expect(validation.notePitchDiagnostics[8]).toEqual(
      expect.objectContaining({
        role: 'lead',
        isBlackKey: true,
        inMode: false,
        accidentalReason: 'harmonic-color',
        accidentalRuleLabel: 'Harmonic color tone',
      })
    );
    expect(validation.accidentalNoteCount).toBe(6);
    expect(validation.accidentalsByRole.lead).toBe(3);
    expect(validation.accidentalsByRole.bass).toBe(2);
    expect(validation.accidentalsByRole.harmony).toBe(1);
    expect(validation.outOfModeNotesByRole.lead).toBe(3);
    expect(validation.outOfModeNotesByRole.bass).toBe(2);
    expect(validation.outOfModeNotesByRole.harmony).toBe(1);
    expect(validation.accidentalReasonCounts['chromatic-passing']).toBe(1);
    expect(validation.accidentalReasonCounts['harmonic-color']).toBe(2);
    expect(validation.accidentalReasonCounts['lower-approach']).toBe(1);
    expect(
      validation.accidentalReasonCounts['unsupported-chromatic-leap']
    ).toBe(2);
    expect(validation.accidentalReasonCounts['unresolved-chromatic']).toBe(0);
    expect(validation.blackKeyNoteCount).toBe(6);
    expect(validation.blackKeyNotesByRole.lead).toBe(3);
    expect(validation.blackKeyNotesByRole.bass).toBe(2);
    expect(validation.blackKeyNotesByRole.harmony).toBe(1);
    expect(validation.pitchClassCountsByRole.lead['G#']).toBe(1);
    expect(validation.pitchClassCountsByRole.lead.A).toBe(1);
    expect(validation.pitchClassCountsByRole.lead['C#']).toBe(1);
    expect(validation.pitchClassCountsByRole.lead['D#']).toBe(1);
    expect(validation.pitchClassCountsByRole.bass.G).toBe(1);
    expect(validation.pitchClassCountsByRole.bass.A).toBe(1);
    expect(validation.pitchClassCountsByRole.bass['G#']).toBe(1);
    expect(validation.pitchClassCountsByRole.bass['C#']).toBe(1);
    expect(validation.dominantPitchClassesByRole.lead).toEqual([
      'A',
      'C#',
      'D#',
      'G#',
    ]);
    expect(validation.dominantPitchClassesByRole.bass).toEqual([
      'A',
      'C#',
      'G',
      'G#',
    ]);
    expect(validation.unexplainedAccidentalCount).toBe(2);
    expect(validation.isValidForMidiExport).toBe(false);
    expect(validation.messages).toEqual([
      'Found 2 unexplained chromatic notes; MIDI export allows 0.',
    ]);
  });

  it('uses a stricter accidental budget for ambient plains exports', () => {
    expect(
      resolveMusicDebugAccidentalBudget({
        encounterMode: 'ambient',
        themeId: 'frontier-plains',
      })
    ).toEqual({
      maxExplainedAccidentals: 4,
      maxChromaticPassingAccidentals: 2,
      maxUnexplainedAccidentals: 0,
    });
    expect(
      resolveMusicDebugAccidentalBudget({
        encounterMode: 'battle',
        themeId: 'frontier-plains',
      })
    ).toEqual({
      maxExplainedAccidentals: 12,
      maxChromaticPassingAccidentals: 6,
      maxUnexplainedAccidentals: 0,
    });
  });

  it('counts accidentals relative to G Mixolydian instead of treating every black key as chromatic', () => {
    const notes: ProceduralMusicNote[] = [
      createNote('lead', 196),
      createNote('lead', 349.23),
    ];

    const mixolydianValidation = analyzeMusicDebugPitches({
      notes,
      rootHz: 196,
      modePitchOffsets: [0, 2, 4, 5, 7, 9, 10],
      encounterMode: 'ambient',
      themeId: 'frontier-plains',
    });
    const majorValidation = analyzeMusicDebugPitches({
      notes,
      rootHz: 196,
      modePitchOffsets: [0, 2, 4, 5, 7, 9, 11],
      encounterMode: 'ambient',
      themeId: 'frontier-plains',
    });

    expect(mixolydianValidation.blackKeyNoteCount).toBe(0);
    expect(mixolydianValidation.accidentalNoteCount).toBe(0);
    expect(mixolydianValidation.notePitchDiagnostics[1]).toEqual(
      expect.objectContaining({
        role: 'lead',
        isBlackKey: false,
        inMode: true,
        scaleDegree: 7,
        accidentalReason: 'in-mode',
      })
    );
    expect(majorValidation.accidentalNoteCount).toBe(1);
    expect(majorValidation.notePitchDiagnostics[1]).toEqual(
      expect.objectContaining({
        role: 'lead',
        isBlackKey: false,
        inMode: false,
      })
    );
  });

  it('limits chromatic passing tones more tightly in ambient exploration music', () => {
    const notes: ProceduralMusicNote[] = [
      createNote('lead', 196),
      createNote('lead', 207.65),
      createNote('lead', 220),
      createNote('lead', 246.94),
      createNote('lead', 261.63),
      createNote('lead', 293.66),
      createNote('lead', 311.13),
      createNote('lead', 329.63),
      createNote('lead', 349.23),
      createNote('lead', 369.99),
      createNote('lead', 392),
    ];

    const validation = analyzeMusicDebugPitches({
      notes,
      rootHz: 196,
      modePitchOffsets: [0, 2, 4, 5, 7, 9, 10],
      encounterMode: 'ambient',
      themeId: 'frontier-plains',
    });

    expect(validation.accidentalReasonCounts['chromatic-passing']).toBe(3);
    expect(validation.isValidForMidiExport).toBe(false);
    expect(validation.messages).toContain(
      'Found 3 chromatic passing notes; MIDI export allows 2.'
    );
  });

  it('keeps representative generated songs free of unresolved chromatic notes', () => {
    const snapshots = [
      PLAINS_SNAPSHOT,
      FOREST_SNAPSHOT,
      TOWN_SNAPSHOT,
      CAVE_BOSS_SNAPSHOT,
    ];

    expect(
      snapshots.every(
        (snapshot) =>
          snapshot.midiExportValidation.unexplainedAccidentalCount === 0 &&
          snapshot.midiExportValidation.isValidForMidiExport
      )
    ).toBe(true);
  }, 10_000);

  it('keeps degree 1, 3, and 5 on G, B, and D for lead, harmony, and bass tracks', () => {
    const scaleMap = {
      rootMidiNote: 55,
      modePitchOffsets: [0, 2, 4, 5, 7, 9, 10],
    } as const;
    const notes: ProceduralMusicNote[] = [
      createMidiNote(
        'lead',
        resolveProceduralScaleDegreeMidiNote({
          scaleMap,
          degreeIndex: 0,
        })
      ),
      createMidiNote(
        'lead',
        resolveProceduralScaleDegreeMidiNote({
          scaleMap,
          degreeIndex: 2,
        })
      ),
      createMidiNote(
        'lead',
        resolveProceduralScaleDegreeMidiNote({
          scaleMap,
          degreeIndex: 4,
        })
      ),
      createMidiNote('harmony', 55),
      createMidiNote('harmony', 59),
      createMidiNote('harmony', 62),
      createMidiNote('bass', 43),
      createMidiNote('bass', 47),
      createMidiNote('bass', 50),
    ];

    const validation = analyzeMusicDebugPitches({
      notes,
      rootHz: 196,
      modePitchOffsets: scaleMap.modePitchOffsets,
    });

    expect(validation.pitchClassCountsByRole.lead.G).toBe(1);
    expect(validation.pitchClassCountsByRole.lead.B).toBe(1);
    expect(validation.pitchClassCountsByRole.lead.D).toBe(1);
    expect(validation.pitchClassCountsByRole.harmony.G).toBe(1);
    expect(validation.pitchClassCountsByRole.harmony.B).toBe(1);
    expect(validation.pitchClassCountsByRole.harmony.D).toBe(1);
    expect(validation.pitchClassCountsByRole.bass.G).toBe(1);
    expect(validation.pitchClassCountsByRole.bass.B).toBe(1);
    expect(validation.pitchClassCountsByRole.bass.D).toBe(1);
    expect(validation.accidentalNoteCount).toBe(0);
  });
});

function createNote(
  role: ProceduralMusicNote['role'],
  frequency: number
): ProceduralMusicNote {
  return createTimedNote(role, frequency, 0, 400);
}

function createTimedNote(
  role: ProceduralMusicNote['role'],
  frequency: number,
  startMs: number,
  durationMs: number
): ProceduralMusicNote {
  return {
    themeId: 'frontier-plains',
    instrumentId: `${role}-test`,
    role,
    startMs,
    durationMs,
    frequency,
    volume: 0.03,
    waveform: 'sine',
    timbre: {
      harmonicWaveform: 'triangle',
      harmonicRatio: 2,
      filterType: 'lowpass',
      filterCutoffHz: 1200,
      filterQ: 0.8,
    },
    attackMs: 20,
    releaseMs: 80,
    detuneCents: 0,
    harmonicGain: 0.4,
    pulseRate: 0,
  };
}

function createMidiNote(
  role: ProceduralMusicNote['role'],
  midiNote: number
): ProceduralMusicNote {
  return createNote(role, 440 * Math.pow(2, (midiNote - 69) / 12));
}
