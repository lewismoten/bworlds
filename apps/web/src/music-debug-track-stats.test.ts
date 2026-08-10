import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugTrackStats,
  formatMusicDebugTrackPitchSummary,
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
    const timingLines = formatMusicDebugTrackTimingSummary(snapshot.trackStats);

    expect(summaryLines).toHaveLength(4);
    expect(summaryLines[0]).toContain('Bass');
    expect(summaryLines[0]).toContain('avg leap');
    expect(summaryLines[1]).toContain('Harmony');
    expect(summaryLines[2]).toContain('Lead');
    expect(summaryLines[3]).toContain('Percussion');
    expect(summaryLines[3]).toContain('out-of-mode 0');
    expect(timingLines).toHaveLength(4);
    expect(timingLines[0]).toContain('occ');
    expect(timingLines[0]).toContain('avg dur');
    expect(timingLines[1]).toContain('avg gap');
    expect(timingLines[1]).toContain('peak poly');
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
      expect(leadStats.maxLeapSemitones).toBeLessThanOrEqual(13);
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
});
