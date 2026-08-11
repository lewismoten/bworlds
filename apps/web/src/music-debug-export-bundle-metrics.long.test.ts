import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import { createMeasuredMusicDebugExportBundle } from './music-debug-export-bundle.ts';
import { toExportableSnapshot } from './testing/music-debug-export-bundle-fixtures.ts';

describe('music debug export bundle metrics', () => {
  it('reports export timing metrics for midi and preview wav generation', () => {
    const snapshot = toExportableSnapshot(
      createMusicDebugSnapshot({
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 1,
        clusterY: 2,
      })
    );

    const measured = createMeasuredMusicDebugExportBundle(snapshot, {
      createdAt: new Date('2026-08-10T00:00:00.000Z'),
    });

    expect(measured.bundle.fileName).toContain('-export.zip');
    expect(measured.metrics).toEqual(
      expect.objectContaining({
        midiExportMs: expect.any(Number),
        wavExportMs: expect.any(Number),
        totalExportMs: expect.any(Number),
        previewWavFileCount: expect.any(Number),
      })
    );
    expect(measured.metrics.previewWavFileCount).toBeGreaterThan(0);
  }, 5_000);
});
