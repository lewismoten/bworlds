import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugTrackStats,
  formatMusicDebugTrackStatsSummary,
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

    const summaryLines = formatMusicDebugTrackStatsSummary(snapshot.trackStats);

    expect(summaryLines).toHaveLength(4);
    expect(summaryLines[0]).toContain('Bass');
    expect(summaryLines[0]).toContain('avg leap');
    expect(summaryLines[1]).toContain('Harmony');
    expect(summaryLines[2]).toContain('Lead');
    expect(summaryLines[3]).toContain('Percussion');
    expect(summaryLines[3]).toContain('out-of-mode 0');
  });
});
