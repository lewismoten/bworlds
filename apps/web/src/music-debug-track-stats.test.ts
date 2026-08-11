import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugTrackStats,
  formatMusicDebugTrackPitchSummary,
  formatMusicDebugTrackSoundingSummary,
  formatMusicDebugTrackTimingSummary,
} from './music-debug-track-stats.ts';

describe('music debug track stats', () => {
  it('summarizes per-track ranges, leaps, and out-of-mode counts', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 6,
      clusterY: -4,
    });

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

  it('formats one summary line per track for the debug report', () => {
    const snapshot = createMusicDebugSnapshot();

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
      createMusicDebugSnapshot({
        tileKind: 'plains',
        contextType: 'overworld',
        clusterX: 0,
        clusterY: 0,
      }),
      createMusicDebugSnapshot({
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 3,
        clusterY: -2,
      }),
      createMusicDebugSnapshot({
        tileKind: 'shore',
        contextType: 'overworld',
        clusterX: 8,
        clusterY: -4,
        dayProgress: 0.85,
      }),
      createMusicDebugSnapshot({
        tileKind: 'town',
        contextType: 'town',
        clusterX: 3,
        clusterY: -2,
      }),
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
      createMusicDebugSnapshot({
        tileKind: 'plains',
        contextType: 'overworld',
        clusterX: 0,
        clusterY: 0,
      }).trackStats.bass,
      createMusicDebugSnapshot({
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 3,
        clusterY: -2,
      }).trackStats.bass,
      createMusicDebugSnapshot({
        tileKind: 'cave',
        contextType: 'dungeon',
        clusterX: 7,
        clusterY: 4,
      }).trackStats.bass,
      createMusicDebugSnapshot({
        tileKind: 'town',
        contextType: 'town',
        clusterX: 3,
        clusterY: -2,
      }).trackStats.bass,
    ];

    for (const bassStats of sampledBassStats) {
      expect(bassStats.averageLeapSemitones).toBeLessThanOrEqual(10);
      expect(bassStats.maxLeapSemitones).toBeLessThanOrEqual(15);
      expect(bassStats.rangeLabel).toMatch(/^[A-G]#?-?\d-[A-G]#?-?\d$/);
    }
  }, 4_000);

  it('keeps sampled bass notes below the harmony and lead centers', () => {
    const snapshots = [
      createMusicDebugSnapshot({
        tileKind: 'plains',
        contextType: 'overworld',
        clusterX: 0,
        clusterY: 0,
      }),
      createMusicDebugSnapshot({
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 3,
        clusterY: -2,
      }),
      createMusicDebugSnapshot({
        tileKind: 'town',
        contextType: 'town',
        clusterX: 3,
        clusterY: -2,
      }),
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
