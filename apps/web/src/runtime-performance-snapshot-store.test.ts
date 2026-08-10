import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  formatRuntimePerformanceSnapshotFileName,
  readRecentRuntimePerformanceSnapshots,
  saveRuntimePerformanceSnapshot,
} from '../runtime-performance-snapshot-store.mjs';

describe('runtime performance snapshot store', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs.splice(0)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('formats stable file names from the snapshot timestamp, source, and trigger', () => {
    expect(
      formatRuntimePerformanceSnapshotFileName({
        createdAt: '2026-08-10T15:30:45.123Z',
        source: 'music-debug',
        trigger: 'midi-export',
      })
    ).toBe('2026-08-10T15-30-45-123Z-music-debug-midi-export.json');
  });

  it('keeps only the 10 most recent snapshots on disk', () => {
    const snapshotDir = mkdtempSync(
      path.join(os.tmpdir(), 'bworlds-runtime-snapshots-')
    );
    tempDirs.push(snapshotDir);

    for (let index = 0; index < 12; index += 1) {
      saveRuntimePerformanceSnapshot(
        {
          schemaVersion: 1,
          createdAt: `2026-08-10T15:30:${String(index).padStart(2, '0')}.000Z`,
          source: 'game',
          trigger: 'startup',
          route: '/',
          worldSeed: null,
          context: null,
          limits: {
            initialWorldGenerationMs: 4000,
            visibleTileGenerationMs: 16,
            maximumFrameMs: 50,
            memoryAfterRegionChangeMb: 512,
            activeThreeObjectCount: 2500,
            drawCalls: 1200,
            audioNodeCount: 16,
            songGenerationMs: 750,
            midiExportMs: 1500,
            wavExportMs: 2000,
          },
          metrics: {
            initialWorldGenerationMs: 1000,
            visibleTileGeneration: null,
            maximumFrameMs: 30,
            memoryAfterRegionChangeMb: null,
            activeThreeObjectCount: 1200,
            drawCalls: 500,
            audioNodeCount: 4,
            songGenerationMs: null,
            midiExportMs: null,
            wavExportMs: null,
          },
          violations: [],
        },
        {
          snapshotDir,
          maxSnapshots: 10,
        }
      );
    }

    expect(
      readRecentRuntimePerformanceSnapshots({
        snapshotDir,
        limit: 20,
      })
    ).toHaveLength(10);
  });
});
