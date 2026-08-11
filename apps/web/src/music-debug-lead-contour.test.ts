import { describe, expect, it } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugLeadContourAnalysis,
  type MusicDebugLeadContourPoint,
} from './music-debug-lead-contour.ts';
import type { MusicDebugNotePitchDiagnostic } from './music-debug-note-analysis.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

const PLAINS_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'plains',
  contextType: 'overworld',
  clusterX: 0,
  clusterY: 0,
});
const SECTION_A = createSectionA();
const TEMPLATE_ANALYSIS = createMusicDebugLeadContourAnalysis({
  theme: PLAINS_SNAPSHOT.theme,
  clusterX: PLAINS_SNAPSHOT.options.clusterX,
  clusterY: PLAINS_SNAPSHOT.options.clusterY,
  songStartMs: 0,
  sections: [SECTION_A],
  notes: [],
  diagnostics: [],
});
const PLANNED_CLIMAX_STEP_INDEX = TEMPLATE_ANALYSIS.plannedClimaxStepIndex;
const PLANNED_CLIMAX_POINT = TEMPLATE_ANALYSIS.points.find(
  (point) => point.stepIndex === PLANNED_CLIMAX_STEP_INDEX
);
const FINAL_POINT = TEMPLATE_ANALYSIS.points.at(-1);
const OFF_PEAK_POINT = TEMPLATE_ANALYSIS.points
  .filter(
    (point) =>
      point.stepIndex !== PLANNED_CLIMAX_STEP_INDEX &&
      point.songMeasure !== FINAL_POINT?.songMeasure
  )
  .sort(
    (left, right) =>
      Math.abs((right.stepIndex ?? 0) - (PLANNED_CLIMAX_STEP_INDEX ?? 0)) -
      Math.abs((left.stepIndex ?? 0) - (PLANNED_CLIMAX_STEP_INDEX ?? 0))
  )[0];

describe('music debug lead contour', () => {
  it('captures planned versus actual lead contour checkpoints for review', () => {
    const analysis = PLAINS_SNAPSHOT.leadContourAnalysis;

    expect(analysis.points.length).toBeGreaterThan(0);
    expect(
      analysis.points.some((point) => point.actualRelativeSemitones !== null)
    ).toBe(true);
    expect(
      analysis.inRangePointCount +
        analysis.outOfRangePointCount +
        analysis.missingPointCount
    ).toBe(analysis.points.length);
    expect(analysis.outOfRangePointCount).toBeGreaterThanOrEqual(0);
    expect(analysis.points.some((point) => point.stage.length > 0)).toBe(true);
    expect(analysis.actualClimaxStepIndex).not.toBeNull();
    expect(typeof analysis.finalResolvesToTonic).toBe('boolean');
    expect(typeof analysis.matchesPlannedContour).toBe('boolean');
    expect(
      analysis.points.every((point) => point.songMeasure >= point.phraseMeasure)
    ).toBe(true);
  });

  it('reports exact measures and note labels for contour failures', () => {
    expect(OFF_PEAK_POINT).toBeDefined();
    expect(PLANNED_CLIMAX_POINT).toBeDefined();
    expect(FINAL_POINT).toBeDefined();

    const analysis = createMusicDebugLeadContourAnalysis({
      theme: PLAINS_SNAPSHOT.theme,
      clusterX: PLAINS_SNAPSHOT.options.clusterX,
      clusterY: PLAINS_SNAPSHOT.options.clusterY,
      songStartMs: 0,
      sections: [SECTION_A],
      notes: [
        createLeadNote(
          withPointStartMs(
            SECTION_A,
            PLAINS_SNAPSHOT.theme.stepPattern.length,
            OFF_PEAK_POINT!
          ),
          72
        ),
        createLeadNote(
          withPointStartMs(
            SECTION_A,
            PLAINS_SNAPSHOT.theme.stepPattern.length,
            FINAL_POINT!
          ),
          62
        ),
      ],
      diagnostics: [
        createLeadDiagnostic(0, 72, OFF_PEAK_POINT!.plannedMaxSemitones + 5, 5),
        createLeadDiagnostic(1, 62, FINAL_POINT!.plannedTargetSemitones, 2),
      ],
    });

    expect(analysis.matchesPlannedContour).toBe(false);
    expect(analysis.messages).toContain(
      `Lead contour checkpoint at measure ${OFF_PEAK_POINT!.songMeasure} expected ${OFF_PEAK_POINT!.plannedMinSemitones}-${OFF_PEAK_POINT!.plannedMaxSemitones} semitones but observed C5 (${OFF_PEAK_POINT!.plannedMaxSemitones + 5} semitones).`
    );
    expect(
      analysis.messages.some((message) =>
        message.includes(
          `Lead contour climax peaked at measure ${OFF_PEAK_POINT!.songMeasure} on C5 instead of the planned peak near measure ${PLANNED_CLIMAX_POINT!.songMeasure}.`
        )
      )
    ).toBe(true);
    expect(analysis.messages).toContain(
      `Lead contour ending at measure ${FINAL_POINT!.songMeasure} on D4 resolved to scale degree 2 instead of tonic.`
    );
  });
});

function createLeadNote(
  point: MusicDebugLeadContourPoint,
  midiNote: number
): ProceduralMusicNote {
  return {
    themeId: 'frontier-plains',
    instrumentId: `frontier-plains:lead:test:${point.songMeasure}`,
    role: 'lead',
    startMs: point.actualStartMs ?? 0,
    durationMs: 240,
    frequency: 440 * 2 ** ((midiNote - 69) / 12),
    volume: 0.1,
    waveform: 'triangle',
    timbre: {
      harmonicWaveform: 'sine',
      harmonicRatio: 2,
      filterType: 'lowpass',
      filterCutoffHz: 1800,
      filterQ: 0.8,
    },
    attackMs: 12,
    releaseMs: 140,
    detuneCents: 0,
    harmonicGain: 0.2,
    pulseRate: 1,
  };
}

function createSectionA(): ProceduralMusicSongSection {
  return {
    id: 'a',
    label: 'Section A',
    startOffsetMs: 0,
    durationMs: 8_000,
    loopEligible: true,
    measureCount: 8,
    startMeasure: 1,
    endMeasure: 8,
    startTick: 0,
    endTick: 1_920,
  };
}

function createLeadDiagnostic(
  noteIndex: number,
  midiNote: number,
  relativeSemitones: number,
  scaleDegree: number
): MusicDebugNotePitchDiagnostic {
  return {
    noteIndex,
    role: 'lead',
    frequency: 440 * 2 ** ((midiNote - 69) / 12),
    midiNote,
    relativeSemitones,
    scaleDegree,
    scaleDegreeLabel: `${scaleDegree}`,
    isBlackKey: false,
    inMode: true,
    accidentalReason: 'in-mode',
    accidentalRuleLabel: null,
    accidentalExplanation: null,
  };
}

function withPointStartMs(
  section: ProceduralMusicSongSection,
  themeStepCount: number,
  point: MusicDebugLeadContourPoint
): MusicDebugLeadContourPoint {
  return {
    ...point,
    actualStartMs: resolvePointStartMs(section, themeStepCount, point),
  };
}

function resolvePointStartMs(
  section: ProceduralMusicSongSection,
  themeStepCount: number,
  point: MusicDebugLeadContourPoint
): number {
  const phraseStartMs = section.startOffsetMs;
  const phraseDurationMs = Math.max(1, Math.round(section.durationMs / 2));
  const phraseStepCount = Math.max(1, themeStepCount) * 8;
  const stepDurationMs = phraseDurationMs / phraseStepCount;
  return phraseStartMs + point.stepIndex * stepDurationMs + stepDurationMs / 2;
}
