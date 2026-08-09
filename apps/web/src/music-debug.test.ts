import { describe, expect, it } from 'vitest';
import {
  buildMusicDebugMarkup,
  buildMusicDebugSummaryMarkup,
  createMusicDebugSnapshot,
  formatMusicDebugDuration,
  formatMusicDebugLoopRange,
  normalizeMusicDebugOptions,
  randomizeMusicDebugSeed,
} from './music-debug.ts';

describe('music debug', () => {
  it('normalizes partial options into a safe debug snapshot configuration', () => {
    expect(
      normalizeMusicDebugOptions({
        tileKind: 'forest',
        dayProgress: 2,
        yearProgress: -1,
        weatherIntensity: 4,
      })
    ).toEqual(
      expect.objectContaining({
        tileKind: 'forest',
        contextType: 'overworld',
        dayProgress: 1,
        yearProgress: 0,
        weatherIntensity: 1,
      })
    );
  });

  it('builds deterministic snapshots from the current procedural music system', () => {
    const first = createMusicDebugSnapshot(
      {
        tileKind: 'town',
        contextType: 'town',
        clusterX: 3,
        clusterY: -2,
        dayProgress: 0.25,
        yearProgress: 0.75,
      },
      1000
    );
    const second = createMusicDebugSnapshot(
      {
        tileKind: 'town',
        contextType: 'town',
        clusterX: 3,
        clusterY: -2,
        dayProgress: 0.25,
        yearProgress: 0.75,
      },
      1000
    );

    expect(first.theme.id).toBe('town-square');
    expect(first.instrumentBank).toEqual(second.instrumentBank);
    expect(first.notes).toEqual(second.notes);
    expect(first.durationMs).toBeGreaterThanOrEqual(120_000);
    expect(first.durationMs).toBeLessThanOrEqual(180_000);
    expect(first.song.sections.map((section) => section.id)).toEqual([
      'intro',
      'a',
      'a-prime',
      'b',
      'variation',
      'return',
      'outro',
    ]);
    expect(first.roleCounts.bass).toBeGreaterThan(0);
  });

  it('renders markup and summary content for the laboratory page', () => {
    const snapshot = createMusicDebugSnapshot();
    const markup = buildMusicDebugMarkup(snapshot);
    const summary = buildMusicDebugSummaryMarkup(snapshot);

    expect(markup).toContain('Music Laboratory');
    expect(markup).toContain('music-debug-form');
    expect(markup).toContain('music-debug-timeline');
    expect(markup).toContain('music-debug-randomize');
    expect(markup).toContain('Play Song');
    expect(summary).toContain('Scheduled Notes');
    expect(summary).toContain('Song Length');
    expect(summary).toContain('Loop Range');
    expect(summary).toContain(snapshot.theme.id);
  });

  it('formats song durations and loop ranges as minute-second labels', () => {
    expect(formatMusicDebugDuration(0)).toBe('0:00');
    expect(formatMusicDebugDuration(62_000)).toBe('1:02');
    expect(formatMusicDebugLoopRange(8_000, 136_000)).toBe('0:08 - 2:16');
  });

  it('randomizes generator seed coordinates within the supported debug range', () => {
    expect(
      randomizeMusicDebugSeed(
        {
          tileKind: 'forest',
          clusterX: 0,
          clusterY: 0,
        },
        () => 1
      )
    ).toEqual(
      expect.objectContaining({
        clusterX: 9_999,
        clusterY: 9_999,
      })
    );
    expect(
      randomizeMusicDebugSeed(
        {
          tileKind: 'forest',
          clusterX: 0,
          clusterY: 0,
        },
        () => 0
      )
    ).toEqual(
      expect.objectContaining({
        clusterX: -9_999,
        clusterY: -9_999,
      })
    );
  });
});
