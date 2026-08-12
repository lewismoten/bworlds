import { mkdtempSync, rmSync } from 'node:fs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatRuntimePerformanceIssueFileName,
  formatRuntimePerformanceSnapshotFileName,
  readRecentRuntimePerformanceIssues,
  readRecentRuntimePerformanceSnapshots,
  saveRuntimePerformanceIssue,
  saveRuntimePerformanceSnapshot,
} from '../runtime-performance-snapshot-store.mjs';
import { createValidRuntimePerformanceSnapshot } from './runtime-performance-snapshot-validation.ts';

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
            visibleTileGenerationAverageMs: 8,
            visibleTileGenerationMaxMs: 16,
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

  it('round-trips runtime performance snapshots without losing data', () => {
    const snapshotDir = mkdtempSync(
      path.join(os.tmpdir(), 'bworlds-runtime-snapshots-roundtrip-')
    );
    tempDirs.push(snapshotDir);

    const snapshot = createValidRuntimePerformanceSnapshot();
    snapshot.createdAt = '2026-08-12T02:05:00.000Z';
    snapshot.source = 'music-debug';
    snapshot.trigger = 'midi-export';
    snapshot.route = '/debug/music';
    snapshot.context = {
      id: 'music-debug',
      label: 'Music Debug',
      depth: 0,
    };
    snapshot.metrics.songGenerationMs = 325;
    snapshot.metrics.midiExportMs = 640;

    saveRuntimePerformanceSnapshot(snapshot, {
      snapshotDir,
      maxSnapshots: 10,
    });

    expect(
      readRecentRuntimePerformanceSnapshots({
        snapshotDir,
        limit: 10,
      })
    ).toEqual([snapshot]);
  });

  it('formats stable issue file names from the timestamp, source, and hash', () => {
    expect(
      formatRuntimePerformanceIssueFileName({
        createdAt: '2026-08-10T15:30:45.123Z',
        source: 'game',
        issueHash: 'deadbeef',
      })
    ).toBe('game-deadbeef.json');
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
              visibleTileGenerationAverageMs: 8,
              visibleTileGenerationMaxMs: 16,
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
            rejectedModels: 'tile-forest',
            staticMatrixUpdates: 'tile-sign',
          },
          currentTile: {
            plugin: 'tile-plains',
            requestedDetailLevel: 'full',
            renderedDetailLevel: 'low',
            cachedDetailLevel: 'low',
            fallbackReason:
              'tile has no plugin model and uses the wall-height fallback',
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

  it('overwrites repeated issue hashes instead of creating duplicate issue files', () => {
    const snapshotDir = mkdtempSync(
      path.join(os.tmpdir(), 'bworlds-runtime-issues-dedupe-')
    );
    tempDirs.push(snapshotDir);

    const firstIssue = {
      schemaVersion: 1 as const,
      createdAt: '2026-08-12T02:40:46.593Z',
      source: 'game' as const,
      route: '/',
      worldSeed: 'alpha',
      context: null,
      issueHash: 'repeat-hash',
      summary: 'First summary.',
      reasons: ['First summary.'],
      performanceSnapshot: {
        schemaVersion: 1 as const,
        createdAt: '2026-08-12T02:40:46.593Z',
        source: 'game' as const,
        trigger: 'runtime-issue' as const,
        route: '/',
        worldSeed: 'alpha',
        context: null,
        limits: {
          initialWorldGenerationMs: 4000,
          visibleTileGenerationAverageMs: 8,
          visibleTileGenerationMaxMs: 16,
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
      renderState: {
        performanceTier: 'reduced',
        renderQualityLevel: 'reduced',
        renderQualityLimiters: ['Chunk draw calls exceeded the soft cap'],
        targetFps: 60,
        visibilityRadius: 13.8,
        pendingTileCount: 4,
      },
      pluginHotspots: {
        materials: 'tile-town',
        drawCalls: 'tile-forest',
        objects: 'tile-forest',
        meshes: 'tile-forest',
        lodSwaps: null,
        fallbackBoxes: null,
        rejectedModels: null,
        staticMatrixUpdates: null,
      },
      currentTile: {
        plugin: 'tile-route',
        requestedDetailLevel: 'full',
        renderedDetailLevel: 'full',
        cachedDetailLevel: 'full',
        fallbackReason: null,
        hasVisibleModel: true,
      },
      resourceWarnings: [],
    };
    const updatedIssue = {
      ...firstIssue,
      createdAt: '2026-08-12T02:40:56.644Z',
      summary: 'Updated summary.',
      reasons: ['Updated summary.'],
      performanceSnapshot: {
        ...firstIssue.performanceSnapshot,
        createdAt: '2026-08-12T02:40:56.644Z',
      },
    };

    saveRuntimePerformanceIssue(firstIssue, {
      snapshotDir,
      maxSnapshots: 10,
    });
    saveRuntimePerformanceIssue(updatedIssue, {
      snapshotDir,
      maxSnapshots: 10,
    });

    expect(
      fs.readdirSync(snapshotDir).filter((entry) => entry.endsWith('.json'))
    ).toEqual(['game-repeat-hash.json']);
    expect(
      readRecentRuntimePerformanceIssues({
        snapshotDir,
        limit: 10,
      })
    ).toEqual([expect.objectContaining({ summary: 'Updated summary.' })]);
  });

  it('skips runtime issue files that disappear between listing and reading', () => {
    const snapshotDir = mkdtempSync(
      path.join(os.tmpdir(), 'bworlds-runtime-issues-race-')
    );
    tempDirs.push(snapshotDir);

    const stableIssue = {
      schemaVersion: 1 as const,
      createdAt: '2026-08-12T02:29:40.450Z',
      source: 'game' as const,
      route: '/',
      worldSeed: 'alpha',
      context: null,
      issueHash: 'stable',
      summary: 'Stable issue.',
      reasons: ['Stable issue.'],
      performanceSnapshot: {
        schemaVersion: 1 as const,
        createdAt: '2026-08-12T02:29:40.450Z',
        source: 'game' as const,
        trigger: 'runtime-issue' as const,
        route: '/',
        worldSeed: 'alpha',
        context: null,
        limits: {
          initialWorldGenerationMs: 4000,
          visibleTileGenerationAverageMs: 8,
          visibleTileGenerationMaxMs: 16,
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
        rejectedModels: 'tile-forest',
        staticMatrixUpdates: 'tile-sign',
      },
      currentTile: {
        plugin: 'tile-plains',
        requestedDetailLevel: 'full',
        renderedDetailLevel: 'low',
        cachedDetailLevel: 'low',
        fallbackReason:
          'tile has no plugin model and uses the wall-height fallback',
        hasVisibleModel: true,
      },
      resourceWarnings: [],
    };
    const missingIssue = {
      ...stableIssue,
      createdAt: '2026-08-12T02:29:42.463Z',
      issueHash: 'missing',
      summary: 'Missing issue.',
      reasons: ['Missing issue.'],
      performanceSnapshot: {
        ...stableIssue.performanceSnapshot,
        createdAt: '2026-08-12T02:29:42.463Z',
      },
    };

    saveRuntimePerformanceIssue(stableIssue, {
      snapshotDir,
      maxSnapshots: 10,
    });
    saveRuntimePerformanceIssue(missingIssue, {
      snapshotDir,
      maxSnapshots: 10,
    });

    const missingPath = path.join(
      snapshotDir,
      formatRuntimePerformanceIssueFileName(missingIssue)
    );
    const originalReadFileSync = fs.readFileSync.bind(fs);
    const readFileSyncSpy = vi.spyOn(fs, 'readFileSync');
    readFileSyncSpy.mockImplementation((filePath, options) => {
      if (String(filePath) === missingPath) {
        throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      }
      return originalReadFileSync(filePath, options);
    });

    expect(
      readRecentRuntimePerformanceIssues({
        snapshotDir,
        limit: 10,
      })
    ).toEqual([expect.objectContaining({ issueHash: 'stable' })]);

    readFileSyncSpy.mockRestore();
  });
});
