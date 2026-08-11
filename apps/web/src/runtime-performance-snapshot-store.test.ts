import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  formatRuntimePerformanceIssueFileName,
  formatRuntimePerformanceSnapshotFileName,
  readRecentRuntimePerformanceIssues,
  readRecentRuntimePerformanceSnapshots,
  saveRuntimePerformanceIssue,
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

  it('formats stable issue file names from the timestamp, source, and hash', () => {
    expect(
      formatRuntimePerformanceIssueFileName({
        createdAt: '2026-08-10T15:30:45.123Z',
        source: 'game',
        issueHash: 'deadbeef',
      })
    ).toBe('2026-08-10T15-30-45-123Z-game-deadbeef.json');
  });

  it('keeps the most recent issue reports on disk', () => {
    const snapshotDir = mkdtempSync(
      path.join(os.tmpdir(), 'bworlds-runtime-issues-')
    );
    tempDirs.push(snapshotDir);

    for (let index = 0; index < 3; index += 1) {
      saveRuntimePerformanceIssue(
        {
          schemaVersion: 1,
          createdAt: `2026-08-10T15:30:${String(index).padStart(2, '0')}.000Z`,
          source: 'game',
          route: '/',
          worldSeed: 'alpha',
          context: null,
          issueHash: `issue-${index}`,
          summary: 'Frame time exceeded budget.',
          reasons: ['Frame time exceeded budget.'],
          performanceSnapshot: {
            schemaVersion: 1,
            createdAt: `2026-08-10T15:30:${String(index).padStart(2, '0')}.000Z`,
            source: 'game',
            trigger: 'runtime-issue',
            route: '/',
            worldSeed: 'alpha',
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
              initialWorldGenerationMs: null,
              visibleTileGeneration: {
                averageMs: 8,
                maxMs: 18,
                buildsPerSecond: 4,
                pendingTileCount: 4,
              },
              maximumFrameMs: 60,
              memoryAfterRegionChangeMb: null,
              activeThreeObjectCount: 2600,
              drawCalls: 1300,
              audioNodeCount: 4,
              songGenerationMs: null,
              midiExportMs: null,
              wavExportMs: null,
            },
            violations: ['Maximum frame time 60.0 ms exceeded 50.0 ms.'],
          },
          renderState: {
            performanceTier: 'critical',
            renderQualityLevel: 'reduced',
            renderQualityLimiters: ['frame time'],
            targetFps: 60,
            visibilityRadius: 6,
            pendingTileCount: 4,
          },
          pluginHotspots: {
            materials: 'tile-water',
            drawCalls: 'tile-forest',
            objects: 'tile-town',
            meshes: 'tile-town',
            lodSwaps: 'tile-town',
            fallbackBoxes: 'tile-plains',
            rejectedModels: 'tile-plains',
            staticMatrixUpdates: 'tile-sign',
          },
          currentTile: {
            plugin: 'tile-plains',
            requestedDetailLevel: 'full',
            renderedDetailLevel: 'low',
            cachedDetailLevel: 'low',
            fallbackReason: 'Budget rejection',
            hasVisibleModel: true,
          },
          resourceWarnings: [
            'Instanced meshes are missing from the visible scene.',
          ],
        },
        {
          snapshotDir,
          maxSnapshots: 2,
        }
      );
    }

    expect(
      readRecentRuntimePerformanceIssues({
        snapshotDir,
        limit: 10,
      })
    ).toHaveLength(2);
  });
});
