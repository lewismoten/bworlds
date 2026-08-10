import { describe, expect, it } from 'vitest';

import type { MusicDebugNotePitchDiagnostic } from './music-debug-note-analysis.ts';
import {
  createMusicDebugHarmonyChordDetections,
  createMusicDebugSectionLayerActivity,
  createMusicDebugSectionMotifMatches,
} from './music-debug-section-analysis.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

describe('music debug section analysis', () => {
  it('counts transposed motif matches by section', () => {
    const analysis = createMusicDebugSectionMotifMatches({
      notes: TEST_NOTES,
      notePitchDiagnostics: TEST_DIAGNOSTICS,
      sections: TEST_SECTIONS,
      leadMotif: [0, 2, 4, 2],
    });

    expect(analysis).toEqual([
      {
        sectionId: 'intro',
        sectionLabel: 'Intro',
        matchCount: 1,
      },
      {
        sectionId: 'a',
        sectionLabel: 'Section A',
        matchCount: 1,
      },
    ]);
  });

  it('summarizes the most common harmony pitch-class stacks by section', () => {
    const analysis = createMusicDebugHarmonyChordDetections({
      notes: TEST_NOTES,
      notePitchDiagnostics: TEST_DIAGNOSTICS,
      sections: TEST_SECTIONS,
    });

    expect(analysis).toEqual([
      {
        sectionId: 'intro',
        sectionLabel: 'Intro',
        chordLabels: ['G-B-D x1'],
      },
      {
        sectionId: 'a',
        sectionLabel: 'Section A',
        chordLabels: ['C-E-G x1'],
      },
    ]);
  });

  it('reports actual role counts and sounding coverage by section', () => {
    const analysis = createMusicDebugSectionLayerActivity({
      notes: TEST_NOTES,
      sections: TEST_SECTIONS,
    });

    expect(analysis).toEqual([
      {
        sectionId: 'intro',
        sectionLabel: 'Intro',
        roleCounts: {
          bass: 0,
          harmony: 3,
          lead: 4,
          percussion: 0,
        },
        soundingTimePercentageByRole: {
          bass: 0,
          harmony: 6,
          lead: 24,
          percussion: 0,
        },
        averageDurationMsByRole: {
          bass: 0,
          harmony: 240,
          lead: 240,
          percussion: 0,
        },
      },
      {
        sectionId: 'a',
        sectionLabel: 'Section A',
        roleCounts: {
          bass: 0,
          harmony: 3,
          lead: 4,
          percussion: 0,
        },
        soundingTimePercentageByRole: {
          bass: 0,
          harmony: 6,
          lead: 24,
          percussion: 0,
        },
        averageDurationMsByRole: {
          bass: 0,
          harmony: 240,
          lead: 240,
          percussion: 0,
        },
      },
    ]);
  });
});

const TEST_SECTIONS: ProceduralMusicSongSection[] = [
  {
    id: 'intro',
    label: 'Intro',
    startOffsetMs: 0,
    durationMs: 4_000,
    loopEligible: false,
    measureCount: 4,
    startMeasure: 1,
    endMeasure: 4,
    startTick: 0,
    endTick: 7_680,
  },
  {
    id: 'a',
    label: 'Section A',
    startOffsetMs: 4_000,
    durationMs: 4_000,
    loopEligible: true,
    measureCount: 4,
    startMeasure: 5,
    endMeasure: 8,
    startTick: 7_680,
    endTick: 15_360,
  },
];

const TEST_NOTES: ProceduralMusicNote[] = [
  createNote({
    role: 'lead',
    startMs: 0,
    frequency: 196,
  }),
  createNote({
    role: 'lead',
    startMs: 500,
    frequency: 246.94,
  }),
  createNote({
    role: 'lead',
    startMs: 1_000,
    frequency: 293.66,
  }),
  createNote({
    role: 'lead',
    startMs: 1_500,
    frequency: 246.94,
  }),
  createNote({
    role: 'harmony',
    startMs: 0,
    frequency: 196,
  }),
  createNote({
    role: 'harmony',
    startMs: 0,
    frequency: 246.94,
  }),
  createNote({
    role: 'harmony',
    startMs: 0,
    frequency: 293.66,
  }),
  createNote({
    role: 'lead',
    startMs: 4_000,
    frequency: 220,
  }),
  createNote({
    role: 'lead',
    startMs: 4_500,
    frequency: 277.18,
  }),
  createNote({
    role: 'lead',
    startMs: 5_000,
    frequency: 329.63,
  }),
  createNote({
    role: 'lead',
    startMs: 5_500,
    frequency: 277.18,
  }),
  createNote({
    role: 'harmony',
    startMs: 4_000,
    frequency: 261.63,
  }),
  createNote({
    role: 'harmony',
    startMs: 4_000,
    frequency: 329.63,
  }),
  createNote({
    role: 'harmony',
    startMs: 4_000,
    frequency: 392,
  }),
];

const TEST_DIAGNOSTICS: MusicDebugNotePitchDiagnostic[] = [
  createDiagnostic({
    role: 'lead',
    midiNote: 55,
    scaleDegree: 1,
  }),
  createDiagnostic({
    role: 'lead',
    midiNote: 59,
    scaleDegree: 3,
  }),
  createDiagnostic({
    role: 'lead',
    midiNote: 62,
    scaleDegree: 5,
  }),
  createDiagnostic({
    role: 'lead',
    midiNote: 59,
    scaleDegree: 3,
  }),
  createDiagnostic({
    role: 'harmony',
    midiNote: 55,
    scaleDegree: 1,
  }),
  createDiagnostic({
    role: 'harmony',
    midiNote: 59,
    scaleDegree: 3,
  }),
  createDiagnostic({
    role: 'harmony',
    midiNote: 62,
    scaleDegree: 5,
  }),
  createDiagnostic({
    role: 'lead',
    midiNote: 57,
    scaleDegree: 2,
  }),
  createDiagnostic({
    role: 'lead',
    midiNote: 61,
    scaleDegree: 4,
  }),
  createDiagnostic({
    role: 'lead',
    midiNote: 64,
    scaleDegree: 6,
  }),
  createDiagnostic({
    role: 'lead',
    midiNote: 61,
    scaleDegree: 4,
  }),
  createDiagnostic({
    role: 'harmony',
    midiNote: 60,
    scaleDegree: 4,
  }),
  createDiagnostic({
    role: 'harmony',
    midiNote: 64,
    scaleDegree: 6,
  }),
  createDiagnostic({
    role: 'harmony',
    midiNote: 67,
    scaleDegree: 1,
  }),
];

function createNote(
  overrides: Partial<ProceduralMusicNote> & Pick<ProceduralMusicNote, 'role'>
): ProceduralMusicNote {
  return {
    themeId: 'deep-forest',
    instrumentId: `${overrides.role}-instrument`,
    role: overrides.role,
    startMs: overrides.startMs ?? 0,
    durationMs: overrides.durationMs ?? 240,
    frequency: overrides.frequency ?? 196,
    volume: overrides.volume ?? 0.6,
    waveform: overrides.waveform ?? 'sine',
    timbre: overrides.timbre ?? 'pure',
    attackMs: overrides.attackMs ?? 12,
    releaseMs: overrides.releaseMs ?? 80,
    detuneCents: overrides.detuneCents ?? 0,
    harmonicGain: overrides.harmonicGain ?? 0.3,
    pulseRate: overrides.pulseRate ?? 0,
    space: overrides.space,
    emitter: overrides.emitter,
    listener: overrides.listener,
  };
}

function createDiagnostic(
  overrides: Partial<MusicDebugNotePitchDiagnostic> &
    Pick<MusicDebugNotePitchDiagnostic, 'role' | 'midiNote' | 'scaleDegree'>
): MusicDebugNotePitchDiagnostic {
  return {
    noteIndex: overrides.noteIndex ?? 0,
    role: overrides.role,
    frequency: overrides.frequency ?? 196,
    midiNote: overrides.midiNote,
    relativeSemitones: overrides.relativeSemitones ?? 0,
    scaleDegree: overrides.scaleDegree,
    scaleDegreeLabel:
      overrides.scaleDegreeLabel ?? `degree ${overrides.scaleDegree ?? 1}`,
    isBlackKey: overrides.isBlackKey ?? false,
    inMode: overrides.inMode ?? true,
    accidentalReason: overrides.accidentalReason ?? 'in-mode',
    accidentalRuleLabel: overrides.accidentalRuleLabel ?? 'In mode',
    accidentalExplanation: overrides.accidentalExplanation ?? null,
  };
}
