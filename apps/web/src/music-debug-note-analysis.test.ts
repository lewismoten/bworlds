import { describe, expect, it } from 'vitest';
import {
  analyzeMusicDebugPitches,
  resolveMusicDebugAccidentalBudget,
} from './music-debug-note-analysis.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

describe('music debug note analysis', () => {
  it('classifies in-mode notes, chromatic approaches, and unexplained chromatic notes by role', () => {
    const notes: ProceduralMusicNote[] = [
      createNote('lead', 196),
      createNote('lead', 207.65),
      createNote('lead', 220),
      createNote('bass', 98),
      createNote('bass', 116.54),
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
        midiNote: 55,
        scaleDegree: 1,
        inMode: true,
        accidentalReason: 'in-mode',
      })
    );
    expect(validation.notePitchDiagnostics[1]).toEqual(
      expect.objectContaining({
        role: 'lead',
        inMode: false,
        accidentalReason: 'chromatic-approach',
      })
    );
    expect(validation.notePitchDiagnostics[4]).toEqual(
      expect.objectContaining({
        role: 'bass',
        inMode: false,
        accidentalReason: 'unexplained-chromatic',
      })
    );
    expect(validation.accidentalNoteCount).toBe(2);
    expect(validation.accidentalsByRole.lead).toBe(1);
    expect(validation.accidentalsByRole.bass).toBe(1);
    expect(validation.outOfModeNotesByRole.lead).toBe(1);
    expect(validation.outOfModeNotesByRole.bass).toBe(1);
    expect(validation.unexplainedAccidentalCount).toBe(1);
    expect(validation.isValidForMidiExport).toBe(true);
  });

  it('uses a stricter accidental budget for ambient plains exports', () => {
    expect(
      resolveMusicDebugAccidentalBudget({
        encounterMode: 'ambient',
        themeId: 'frontier-plains',
      })
    ).toEqual({
      maxExplainedAccidentals: 4,
      maxUnexplainedAccidentals: 4,
    });
    expect(
      resolveMusicDebugAccidentalBudget({
        encounterMode: 'battle',
        themeId: 'frontier-plains',
      })
    ).toEqual({
      maxExplainedAccidentals: 12,
      maxUnexplainedAccidentals: 12,
    });
  });
});

function createNote(
  role: ProceduralMusicNote['role'],
  frequency: number
): ProceduralMusicNote {
  return {
    themeId: 'frontier-plains',
    instrumentId: `${role}-test`,
    role,
    startMs: 0,
    durationMs: 400,
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
