import { describe, expect, it } from 'vitest';
import {
  createMusicDebugPhraseRepetitionAnalysis,
  formatMusicDebugPhraseRepetitionAnalysis,
} from './music-debug-phrase-repetition.ts';
import type { MusicDebugNotePitchDiagnostic } from './music-debug-note-analysis.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

describe('music debug phrase repetition', () => {
  it('scores exact repeats and near matches across phrase windows', () => {
    const notes = [
      ...createPhraseNotes(0, [1, 3, 5], [0, 200, 400]),
      ...createPhraseNotes(8_000, [1, 3, 5], [0, 200, 400]),
      ...createPhraseNotes(16_000, [3, 5, 7], [0, 200, 400]),
      ...createPhraseNotes(24_000, [1, 2], [0, 500]),
    ];
    const diagnostics = notes.map((note) =>
      createDiagnostic(note, Number(note.instrumentId.split(':').at(-1)))
    );
    const sections = createSections();

    const analysis = createMusicDebugPhraseRepetitionAnalysis({
      notes,
      notePitchDiagnostics: diagnostics,
      sections,
      songDurationMs: 32_000,
    });

    expect(analysis.phraseCount).toBe(4);
    expect(analysis.repeatedPhraseCount).toBeGreaterThanOrEqual(1);
    expect(analysis.similarPhraseCount).toBeGreaterThanOrEqual(2);
    expect(analysis.strongestPair).toEqual({
      sourcePhraseIndex: 0,
      targetPhraseIndex: 1,
      similarityPercentage: 100,
    });
    expect(analysis.phrases[1]?.exactMatchPhraseIndex).toBe(0);
    expect(analysis.phrases[2]?.strongestSimilarPhraseIndex).toBe(0);
    expect(analysis.phrases[2]?.strongestSimilarityPercentage).toBeGreaterThan(
      75
    );
    expect(analysis.phrases[3]?.strongestSimilarityPercentage).toBeLessThan(75);
    expect(formatMusicDebugPhraseRepetitionAnalysis(analysis)).toContain(
      'exact repeats'
    );
  });
});

function createPhraseNotes(
  phraseStartMs: number,
  scaleDegrees: readonly number[],
  offsets: readonly number[]
): ProceduralMusicNote[] {
  return scaleDegrees.map((scaleDegree, index) => ({
    themeId: 'frontier-plains',
    instrumentId: `lead:${scaleDegree}`,
    role: 'lead',
    startMs: phraseStartMs + (offsets[index] ?? 0),
    durationMs: 120,
    frequency: 220 * 2 ** ((scaleDegree - 1) / 12),
    volume: 0.02,
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
    harmonicGain: 0.2,
    pulseRate: 1,
  }));
}

function createDiagnostic(
  note: ProceduralMusicNote,
  scaleDegree: number
): MusicDebugNotePitchDiagnostic {
  return {
    role: note.role,
    noteIndex: 0,
    frequency: note.frequency,
    midiNote: 60 + scaleDegree,
    pitchClass: (((60 + scaleDegree) % 12) + 12) % 12,
    pitchClassLabel: 'C',
    scaleDegree,
    inMode: true,
    accidentalReason: 'in-mode',
    accidentalRuleLabel: 'in-mode',
  };
}

function createSections(): ProceduralMusicSongSection[] {
  return [
    createSection('a', 'Section A', 0, 16_000, 16, 1, 16),
    createSection('b', 'Section B', 16_000, 16_000, 16, 17, 32),
  ];
}

function createSection(
  id: ProceduralMusicSongSection['id'],
  label: string,
  startOffsetMs: number,
  durationMs: number,
  measureCount: number,
  startMeasure: number,
  endMeasure: number
): ProceduralMusicSongSection {
  return {
    id,
    label,
    startOffsetMs,
    durationMs,
    loopEligible: true,
    measureCount,
    startMeasure,
    endMeasure,
    startTick: 0,
    endTick: 0,
  };
}
