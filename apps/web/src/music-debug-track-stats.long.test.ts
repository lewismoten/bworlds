import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugTrackStats,
  formatMusicDebugTrackPitchSummary,
  formatMusicDebugTrackSoundingSummary,
  formatMusicDebugTrackTimingSummary,
} from './music-debug-track-stats.ts';

const DEFAULT_SNAPSHOT = createMusicDebugSnapshot();
const PLAINS_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'plains',
  contextType: 'overworld',
  clusterX: 0,
  clusterY: 0,
});
const TOWN_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'town',
  contextType: 'town',
  clusterX: 3,
  clusterY: -2,
});
const FOREST_TRACK_STATS_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'forest',
  contextType: 'overworld',
  clusterX: 3,
  clusterY: -2,
});
const FOREST_VARIANT_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'forest',
  contextType: 'overworld',
  clusterX: 6,
  clusterY: -4,
});
const SHORE_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'shore',
  contextType: 'overworld',
  clusterX: 8,
  clusterY: -4,
  dayProgress: 0.85,
});
const CAVE_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'cave',
  contextType: 'dungeon',
  clusterX: 7,
  clusterY: 4,
});

describe('music debug track stats', () => {
  it('summarizes per-track ranges, leaps, and out-of-mode counts', () => {
    const snapshot = FOREST_VARIANT_SNAPSHOT;

    const stats = createMusicDebugTrackStats({
      notes: snapshot.notes,
      diagnostics: snapshot.notePitchDiagnostics,
      songDurationMs: snapshot.durationMs,
    });

    expect(stats.bass.noteCount).toBe(snapshot.roleCounts.bass);
    expect(stats.harmony.noteCount).toBe(snapshot.roleCounts.harmony);
    expect(stats.lead.noteCount).toBe(snapshot.roleCounts.lead);
    expect(stats.percussion.noteCount).toBe(snapshot.roleCounts.percussion);
    expect(stats.bass.rangeLabel).toMatch(/^[A-G]#?-?\d-[A-G]#?-?\d$/);
    expect(stats.harmony.rangeLabel).toMatch(/^[A-G]#?-?\d-[A-G]#?-?\d$/);
    expect(stats.lead.rangeLabel).toMatch(/^[A-G]#?-?\d-[A-G]#?-?\d$/);
    expect(stats.percussion.rangeLabel).toBe('percussion');
    expect(stats.lead.maxLeapSemitones).toBeGreaterThanOrEqual(
      stats.lead.averageLeapSemitones
    );
    expect(stats.bass.occupancyPercentage).toBeGreaterThan(0);
    expect(stats.bass.occupancyPercentage).toBeLessThanOrEqual(100);
    expect(stats.harmony.occupancyPercentage).toBeGreaterThan(0);
    expect(stats.harmony.occupancyPercentage).toBeLessThanOrEqual(100);
    expect(stats.harmony.averageDurationMs).toBeGreaterThan(0);
    expect(stats.harmony.averageSilenceMs).toBeGreaterThanOrEqual(0);
    expect(stats.harmony.maxPolyphony).toBeGreaterThanOrEqual(1);
    expect(stats.lead.uniqueVelocityLevelCount).toBeGreaterThan(0);
    expect(stats.lead.minVelocity).not.toBeNull();
    expect(stats.lead.maxVelocity).not.toBeNull();
    expect(stats.lead.averageVelocity).toBeGreaterThan(0);
    expect(stats.bass.outOfModeNoteCount).toBe(
      snapshot.outOfModeNotesByRole.bass
    );
    expect(stats.harmony.outOfModeNoteCount).toBe(
      snapshot.outOfModeNotesByRole.harmony
    );
    expect(stats.lead.outOfModeNoteCount).toBe(
      snapshot.outOfModeNotesByRole.lead
    );
  });

  it('tracks velocity ranges, averages, and distinct levels per role', () => {
    const stats = createMusicDebugTrackStats({
      notes: [
        createVelocityTestNote({
          role: 'lead',
          startMs: 0,
          durationMs: 500,
          frequency: 440,
          velocity: 80,
        }),
        createVelocityTestNote({
          role: 'lead',
          startMs: 700,
          durationMs: 500,
          frequency: 493.88,
          velocity: 92,
        }),
        createVelocityTestNote({
          role: 'lead',
          startMs: 1_400,
          durationMs: 400,
          frequency: 523.25,
          velocity: 80,
        }),
        createVelocityTestNote({
          role: 'bass',
          startMs: 0,
          durationMs: 900,
          frequency: 110,
          velocity: 64,
        }),
      ],
      diagnostics: [
        createVelocityTestDiagnostic(69, 'lead'),
        createVelocityTestDiagnostic(71, 'lead'),
        createVelocityTestDiagnostic(72, 'lead'),
        createVelocityTestDiagnostic(45, 'bass'),
      ],
      songDurationMs: 2_000,
    });

    expect(stats.lead.minVelocity).toBe(80);
    expect(stats.lead.maxVelocity).toBe(92);
    expect(stats.lead.averageVelocity).toBeCloseTo(84);
    expect(stats.lead.uniqueVelocityLevelCount).toBe(2);
    expect(stats.bass.minVelocity).toBe(64);
    expect(stats.bass.maxVelocity).toBe(64);
    expect(stats.bass.averageVelocity).toBe(64);
    expect(stats.bass.uniqueVelocityLevelCount).toBe(1);
    expect(stats.harmony.minVelocity).toBeNull();
    expect(stats.harmony.uniqueVelocityLevelCount).toBe(0);
  });

  it('formats one summary line per track for the debug report', () => {
    const snapshot = DEFAULT_SNAPSHOT;

    const summaryLines = formatMusicDebugTrackPitchSummary(snapshot.trackStats);
    const soundingLines = formatMusicDebugTrackSoundingSummary(
      snapshot.trackStats
    );
    const timingLines = formatMusicDebugTrackTimingSummary(snapshot.trackStats);

    expect(summaryLines).toHaveLength(4);
    expect(summaryLines[0]).toContain('Melody');
    expect(summaryLines[0]).toContain('avg leap');
    expect(summaryLines[1]).toContain('Harmony');
    expect(summaryLines[2]).toContain('Bass');
    expect(summaryLines[3]).toContain('Percussion');
    expect(summaryLines[3]).toContain('out-of-mode 0');
    expect(soundingLines).toHaveLength(4);
    expect(soundingLines[0]).toContain('Melody');
    expect(soundingLines[0]).toContain('% sounding');
    expect(soundingLines[1]).toContain('Harmony');
    expect(soundingLines[2]).toContain('Bass');
    expect(soundingLines[3]).toContain('Percussion');
    expect(timingLines).toHaveLength(4);
    expect(timingLines[0]).toContain('occ');
    expect(timingLines[0]).toContain('avg dur');
    expect(timingLines[1]).toContain('avg gap');
    expect(timingLines[1]).toContain('peak poly');
    expect(summaryLines.join(' | ')).not.toContain('Lead ');
  });

  it('keeps sampled lead leap averages controlled and octave jumps rare in generated songs', () => {
    const sampledLeadSnapshots = [
      PLAINS_SNAPSHOT,
      FOREST_TRACK_STATS_SNAPSHOT,
      SHORE_SNAPSHOT,
      TOWN_SNAPSHOT,
    ];
    const sampledLeadStats = sampledLeadSnapshots.map(
      (snapshot) => snapshot.trackStats.lead
    );

    for (const leadStats of sampledLeadStats) {
      expect(leadStats.averageLeapSemitones).toBeLessThanOrEqual(7);
      expect(leadStats.maxLeapSemitones).toBeLessThanOrEqual(15);
    }
  }, 4_000);

  it('keeps sampled bass motion bounded and inside the low register', () => {
    const sampledBassStats = [
      PLAINS_SNAPSHOT.trackStats.bass,
      FOREST_TRACK_STATS_SNAPSHOT.trackStats.bass,
      CAVE_SNAPSHOT.trackStats.bass,
      TOWN_SNAPSHOT.trackStats.bass,
    ];

    for (const bassStats of sampledBassStats) {
      expect(bassStats.averageLeapSemitones).toBeLessThanOrEqual(10);
      expect(bassStats.maxLeapSemitones).toBeLessThanOrEqual(15);
      expect(bassStats.rangeLabel).toMatch(/^[A-G]#?-?\d-[A-G]#?-?\d$/);
    }
  }, 4_000);

  it('keeps sampled bass notes below the harmony and lead centers', () => {
    const snapshots = [
      PLAINS_SNAPSHOT,
      FOREST_TRACK_STATS_SNAPSHOT,
      TOWN_SNAPSHOT,
    ];

    for (const snapshot of snapshots) {
      const bassRange = parseRangeLabel(snapshot.trackStats.bass.rangeLabel);
      const harmonyRange = parseRangeLabel(
        snapshot.trackStats.harmony.rangeLabel
      );
      const leadRange = parseRangeLabel(snapshot.trackStats.lead.rangeLabel);

      expect(bassRange).not.toBeNull();
      expect(harmonyRange).not.toBeNull();
      expect(leadRange).not.toBeNull();
      expect(averageMidi(bassRange!)).toBeLessThan(averageMidi(harmonyRange!));
      expect(averageMidi(bassRange!)).toBeLessThan(averageMidi(leadRange!));
    }
  }, 4_000);
});

function averageMidi(values: readonly number[]): number {
  return (
    values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
  );
}

function parseRangeLabel(rangeLabel: string): [number, number] | null {
  const match = rangeLabel.match(/^([A-G]#?-?\d)-([A-G]#?-?\d)$/);
  if (!match) {
    return null;
  }
  const lower = parseMidiLabel(match[1]);
  const upper = parseMidiLabel(match[2]);
  if (lower === null || upper === null) {
    return null;
  }
  return [lower, upper];
}

function parseMidiLabel(label: string): number | null {
  const match = label.match(/^([A-G])(#?)(-?\d)$/);
  if (!match) {
    return null;
  }
  const pitchClass = resolvePitchClass(match[1], match[2] === '#');
  const octave = Number.parseInt(match[3] ?? '0', 10);
  return (octave + 1) * 12 + pitchClass;
}

function resolvePitchClass(noteName: string, sharp: boolean): number {
  switch (`${noteName}${sharp ? '#' : ''}`) {
    case 'C':
      return 0;
    case 'C#':
      return 1;
    case 'D':
      return 2;
    case 'D#':
      return 3;
    case 'E':
      return 4;
    case 'F':
      return 5;
    case 'F#':
      return 6;
    case 'G':
      return 7;
    case 'G#':
      return 8;
    case 'A':
      return 9;
    case 'A#':
      return 10;
    case 'B':
      return 11;
    default:
      return 0;
  }
}

function createVelocityTestNote(
  overrides: Partial<
    Parameters<typeof createMusicDebugTrackStats>[0]['notes'][number]
  > &
    Pick<
      Parameters<typeof createMusicDebugTrackStats>[0]['notes'][number],
      'role' | 'startMs' | 'durationMs' | 'frequency'
    >
): Parameters<typeof createMusicDebugTrackStats>[0]['notes'][number] {
  return {
    themeId: 'plains-day',
    instrumentId: `${overrides.role}-instrument`,
    role: overrides.role,
    startMs: overrides.startMs,
    durationMs: overrides.durationMs,
    frequency: overrides.frequency,
    volume: 0.8,
    velocity: overrides.velocity,
    waveform: 'sine',
    timbre: {
      attackShape: 'linear',
      harmonicSeries: [1],
      noiseLevel: 0,
      pulseWidth: 0.5,
      unisonDetuneCents: 0,
      lowPassHz: 2_000,
      resonance: 0,
      vibratoDepthCents: 0,
      vibratoRateHz: 0,
      glideMs: 0,
      bitCrushBits: 0,
      waveFolderAmount: 0,
      tremoloDepth: 0,
      tremoloRateHz: 0,
      stereoWidth: 0,
    },
    attackMs: 20,
    releaseMs: 80,
    detuneCents: 0,
    harmonicGain: 0,
    pulseRate: 0,
  };
}

function createVelocityTestDiagnostic(
  midiNote: number,
  role: 'lead' | 'harmony' | 'bass' | 'percussion'
) {
  return {
    noteIndex: 0,
    role,
    frequency: 440,
    midiNote,
    relativeSemitones: midiNote - 60,
    scaleDegree: 1,
    scaleDegreeLabel: '1',
    isBlackKey: false,
    inMode: true,
    accidentalReason: role === 'percussion' ? 'percussion' : 'in-mode',
    accidentalRuleLabel: null,
    accidentalExplanation: null,
  };
}
