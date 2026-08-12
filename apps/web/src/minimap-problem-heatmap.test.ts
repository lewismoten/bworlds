import { describe, expect, it } from 'vitest';
import {
  buildMinimapProblemCells,
  getMinimapProblemCanvasPoint,
  buildMinimapProblemDialogMarkup,
  buildMinimapProblemTooltipMarkup,
  formatMinimapProblemSeverityLabel,
  getHoveredMinimapProblemCell,
  parseMinimapProblemTileKey,
} from './minimap-problem-heatmap.ts';
import type { DebugSnapshot } from './debug-panel.ts';
import type { DebugSnapshotRecentEvent } from './debug-snapshot.ts';

function createState() {
  return {
    player: { x: 10.25, y: -4.4, facing: 0 },
    getCurrentTile(worldX = 0, worldY = 0) {
      if (worldX === 11 && worldY === -4) {
        return { kind: 'forest' };
      }
      if (worldX === 10 && worldY === -4) {
        return { kind: 'plains' };
      }
      return { kind: 'river' };
    },
    getTileDefinition(kind: string) {
      return {
        name: kind,
        color: '#000000',
        miniColor: '#111111',
        walkable: true,
        wallHeight: 0,
      };
    },
  };
}

function createSnapshot(overrides: Partial<DebugSnapshot> = {}): DebugSnapshot {
  return {
    fps: 60,
    averageFps: 60,
    frameMs: 16.7,
    worstRecentFrameMs: 16.7,
    targetFps: 60,
    performanceTier: 'healthy',
    renderQualityLevel: 'Full',
    renderQualityLimiters: 'None',
    playerLevel: 1,
    visibilityRadius: 18,
    drawCalls: 100,
    triangles: 1000,
    points: 0,
    lines: 0,
    sceneChildCount: 1,
    visibleTileCount: 1,
    visibleTreeCount: 0,
    loadedChunkCount: 1,
    chunkGenerationQueueSize: 0,
    pendingTileCount: 0,
    averagePendingFlushTiles: 0,
    maxPendingFlushTiles: 0,
    averageTileBuildMs: 0,
    maxTileBuildMs: 0,
    tileNodeBuildsPerSecond: 0,
    tileBuildsPerSecond: 0,
    lodChecksPerSecond: 0,
    lodReplacementsPerSecond: 0,
    object3dCount: 0,
    groupCount: 0,
    meshCount: 0,
    visibleMeshCount: 0,
    pointsCount: 0,
    activeParticleCount: 0,
    spriteCount: 0,
    lightCount: 0,
    dynamicLightCount: 0,
    shadowLightCount: 0,
    activeNpcCount: 0,
    fullSimulationEntityCount: 0,
    reducedSimulationEntityCount: 0,
    activeAudioSourceCount: 0,
    materialCount: 0,
    geometryCount: 0,
    vertexCount: 0,
    geometryMemoryCount: 0,
    treeObjectCount: 0,
    treeMeshCount: 0,
    treeMaterialRefCount: 0,
    visibleTileKindSummary: 'plains:1',
    textureCount: 0,
    textureMemoryEstimateMb: 0,
    programCount: 0,
    latitude: 0,
    longitude: 0,
    gridX: 10,
    gridY: -4,
    worldSeed: 'test',
    heapUsedMb: null,
    heapLimitMb: null,
    resourceWarnings: [],
    ...overrides,
  };
}

describe('minimap problem heatmap', () => {
  it('parses tile keys into world coordinates', () => {
    expect(parseMinimapProblemTileKey('12:-8')).toEqual({
      worldX: 12,
      worldY: -8,
    });
    expect(parseMinimapProblemTileKey('oops')).toBeNull();
  });

  it('builds heatmap cells from tile events and tile-scoped snapshot warnings', () => {
    const cells = buildMinimapProblemCells(
      createState(),
      {
        width: 220,
        height: 220,
        zoom: 1,
      },
      {
        recentEvents: [
          {
            nowMs: 10,
            plugin: 'tile-forest',
            type: 'model-rejected',
            tileKey: '11:-4',
            summary: 'lod rebuild exceeded hard cap',
          } satisfies DebugSnapshotRecentEvent,
          {
            nowMs: 11,
            type: 'lod-changed',
            tileKey: '11:-4',
            plugin: 'tile-forest',
            summary: 'full -> low',
          } satisfies DebugSnapshotRecentEvent,
        ],
        latestSnapshot: createSnapshot({
          performanceTier: 'critical',
          renderQualityLimiters: 'Scene materials exceeded the hard cap',
          currentTileFallbackReason:
            '10:-4 / tile-plains: built wall-height fallback',
          lastLodFailureReason: '10:-4 / tile-plains: full-detail build failed',
          resourceWarnings: ['Active audio source count is high (26 > 24).'],
        }),
        currentTileX: 10,
        currentTileY: -4,
      }
    );

    const currentTile = cells.find((cell) => cell.key === '10:-4');
    const neighborTile = cells.find((cell) => cell.key === '11:-4');

    expect(currentTile).toEqual(
      expect.objectContaining({
        tileKind: 'plains',
        severity: 'critical',
        issueCount: 2,
      })
    );
    expect(currentTile?.issues.map((issue) => issue.category)).toEqual([
      'lod',
      'lod',
    ]);
    expect(neighborTile).toEqual(
      expect.objectContaining({
        tileKind: 'forest',
        severity: 'critical',
        issueCount: 2,
      })
    );
    expect(neighborTile?.issues.map((issue) => issue.summary)).toEqual([
      'lod rebuild exceeded hard cap',
      'full -> low',
    ]);
  });

  it('does not attach scene-wide quality and budget warnings to the current tile', () => {
    const cells = buildMinimapProblemCells(
      createState(),
      {
        width: 220,
        height: 220,
        zoom: 1,
      },
      {
        recentEvents: [],
        latestSnapshot: createSnapshot({
          performanceTier: 'critical',
          renderQualityLimiters:
            'Visibility radius reduced to 10; Scene materials exceeded the hard cap',
          resourceWarnings: [
            'Chunk draw calls exceeded the soft cap.',
            'Visible meshes exceeded the soft cap.',
            'Active audio source count is high (26 > 24).',
          ],
        }),
        currentTileX: 10,
        currentTileY: -4,
      }
    );

    expect(cells.find((cell) => cell.key === '10:-4')).toEqual(
      expect.objectContaining({
        severity: 'none',
        issueCount: 0,
      })
    );
  });

  it('resolves hovered cells from canvas coordinates', () => {
    const hovered = getHoveredMinimapProblemCell(
      [
        {
          key: '1:2',
          worldX: 1,
          worldY: 2,
          tileKind: 'plains',
          issueCount: 0,
          severity: 'none',
          score: 0,
          issues: [],
          rect: {
            left: 8,
            top: 12,
            width: 20,
            height: 20,
          },
        },
      ],
      14,
      18
    );

    expect(hovered?.key).toBe('1:2');
    expect(getHoveredMinimapProblemCell([], 0, 0)).toBeNull();
  });

  it('maps client coordinates into canvas coordinates when the canvas is scaled', () => {
    expect(
      getMinimapProblemCanvasPoint(
        { width: 192, height: 192 },
        { width: 96, height: 96 },
        24,
        48
      )
    ).toEqual({
      canvasX: 48,
      canvasY: 96,
    });
  });

  it('formats tooltip and dialog markup for problem tiles', () => {
    const cell = {
      worldX: 10,
      worldY: -4,
      tileKind: 'plains',
      severity: 'warning' as const,
      issueCount: 2,
      issues: [
        {
          category: 'lod' as const,
          severity: 'warning' as const,
          label: 'LOD',
          summary: 'low detail fallback',
          source: 'event' as const,
        },
        {
          category: 'audio' as const,
          severity: 'warning' as const,
          label: 'Audio',
          summary: 'Active audio source count is high',
          source: 'snapshot' as const,
        },
      ],
    };

    expect(formatMinimapProblemSeverityLabel('none')).toBe('Healthy');
    expect(buildMinimapProblemTooltipMarkup(cell)).toContain('plains @ 10:-4');
    expect(buildMinimapProblemTooltipMarkup(cell)).toContain('2 issues');
    expect(buildMinimapProblemDialogMarkup(cell)).toContain(
      'Active audio source count is high'
    );
  });
});
