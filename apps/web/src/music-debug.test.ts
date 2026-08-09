import { describe, expect, it } from 'vitest';
import {
  buildMusicDebugMarkup,
  buildMusicDebugSummaryMarkup,
  createMusicDebugSnapshot,
  formatMusicDebugDuration,
  normalizeMusicDebugOptions,
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
    expect(first.roleCounts.bass).toBeGreaterThan(0);
  });

  it('renders markup and summary content for the laboratory page', () => {
    const snapshot = createMusicDebugSnapshot();
    const markup = buildMusicDebugMarkup(snapshot);
    const summary = buildMusicDebugSummaryMarkup(snapshot);

    expect(markup).toContain('Music Laboratory');
    expect(markup).toContain('music-debug-form');
    expect(markup).toContain('music-debug-timeline');
    expect(summary).toContain('Scheduled Notes');
    expect(summary).toContain(snapshot.theme.id);
  });

  it('formats preview durations as minute-second labels', () => {
    expect(formatMusicDebugDuration(0)).toBe('0:00');
    expect(formatMusicDebugDuration(62_000)).toBe('1:02');
  });
});
