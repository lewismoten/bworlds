import { describe, expect, it } from 'vitest';
import {
  buildTerrainChunkDebugMarkup,
  createTerrainChunkDebugSnapshot,
  normalizeTerrainChunkDebugOptions,
} from './terrain-chunk-debug.ts';

describe('terrain chunk debug', () => {
  it('normalizes partial options into a valid chunk-debug configuration', () => {
    expect(
      normalizeTerrainChunkDebugOptions({
        seed: '  frontier-seed  ',
        chunkX: 3.6,
        chunkY: -2.2,
        lodStepMultiplier: 9 as 1,
        includeDiagonals: true,
      })
    ).toEqual({
      seed: 'frontier-seed',
      chunkX: 4,
      chunkY: -2,
      lodStepMultiplier: 1,
      includeDiagonals: true,
    });
  });

  it('builds deterministic chunk seam and wireframe diagnostics from the shared terrain contracts', () => {
    const first = createTerrainChunkDebugSnapshot({
      seed: 'terrain-debug-seed',
      chunkX: 2,
      chunkY: -1,
      lodStepMultiplier: 2,
    });
    const second = createTerrainChunkDebugSnapshot({
      seed: 'terrain-debug-seed',
      chunkX: 2,
      chunkY: -1,
      lodStepMultiplier: 2,
    });

    expect(first.chunkBounds).toEqual(second.chunkBounds);
    expect(first.sampleGridSizeLabel).toBe('17x17');
    expect(first.cellCount).toBe(289);
    expect(first.logicalTileCellCount).toBe(256);
    expect(first.parityMatchCount + first.parityMismatchCount).toBe(256);
    expect(first.parityStatus).toBe(
      first.parityMismatchCount === 0 ? 'aligned' : 'drift'
    );
    expect(first.parityMismatchPreview).toHaveLength(
      Math.min(first.parityMismatchCount, 8)
    );
    expect(first.verificationChecks).toHaveLength(2);
    expect(first.verificationChecks.map((check) => check.id)).toEqual([
      'seams',
      'parity',
    ]);
    expect(first.verificationStatus).toBe(
      first.verificationChecks.some((check) => check.status === 'attention')
        ? 'attention'
        : 'passing'
    );
    expect(first.wireframe.vertexCount).toBeGreaterThan(0);
    expect(first.wireframe.segmentCount).toBeGreaterThan(
      first.wireframe.borderSegmentCount
    );
    expect(first.seamSummaries).toHaveLength(2);
    expect(first.seamSummaries.every((seam) => seam.matchesExactly)).toBe(true);
    expect(first.seamSummaries.every((seam) => seam.heightMaxDelta === 0)).toBe(
      true
    );
    expect(
      first.seamSummaries.every(
        (seam) =>
          Number.isFinite(seam.normalMaxDelta) && seam.normalMaxDelta >= 0
      )
    ).toBe(true);
    expect(first.chunkCells).toEqual(second.chunkCells);
  });

  it('keeps full-resolution border-normal deltas effectively zero for adjacent preview chunks', () => {
    const snapshot = createTerrainChunkDebugSnapshot({
      seed: 'terrain-debug-seed',
      chunkX: 2,
      chunkY: -1,
      lodStepMultiplier: 1,
    });

    expect(
      snapshot.seamSummaries.every((seam) => seam.normalMaxDelta <= 0.000001)
    ).toBe(true);
  });

  it('renders a dedicated debug shell with splat, seam, and wireframe sections', () => {
    const markup = buildTerrainChunkDebugMarkup(
      createTerrainChunkDebugSnapshot({
        seed: 'terrain-debug-seed',
        chunkX: 0,
        chunkY: 0,
      })
    );

    expect(markup).toContain('<h1>Terrain Chunk Debug</h1>');
    expect(markup).toContain('id="terrain-chunk-debug-form"');
    expect(markup).toContain('Dominant Splat Grid');
    expect(markup).toContain('Verification Summary');
    expect(markup).toContain('Chunk Seams');
    expect(markup).toContain('Tile Parity');
    expect(markup).toContain('Logical Tile Parity');
    expect(markup).toContain('Parity Status');
    expect(markup).toContain('Parity Matches');
    expect(markup).toContain('Parity Mismatches');
    expect(markup).toContain('Wireframe View');
    expect(markup).toContain('Seam Analysis');
    expect(markup).toContain('East Seam');
    expect(markup).toContain('South Seam');
    expect(markup).toContain('Max Normal Delta');
    expect(markup).toContain('Top-down terrain chunk wireframe');
  });
});
