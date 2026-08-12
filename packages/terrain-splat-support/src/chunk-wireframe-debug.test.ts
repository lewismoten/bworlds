import { describe, expect, it } from 'vitest';
import { createTerrainChunkWireframeDebugView } from './chunk-wireframe-debug.ts';
import {
  createTerrainHeightField,
  createTerrainSplatHeightGeometryPlan,
} from './height-field.ts';
import {
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from './index.ts';
import { createTerrainSplatSampleGrid } from './sample-grid.ts';

describe('terrain chunk wireframe debug', () => {
  it('builds one deduplicated wireframe payload from chunk geometry without diagonals by default', () => {
    const geometryPlan = createGeometryPlan();

    const view = createTerrainChunkWireframeDebugView({
      geometryPlan,
    });

    expect(view.includeDiagonals).toBe(false);
    expect(view.width).toBe(3);
    expect(view.height).toBe(3);
    expect(view.vertexCount).toBe(9);
    expect(view.triangleCount).toBe(8);
    expect(view.segmentCount).toBe(12);
    expect(view.borderSegmentCount).toBe(8);
    expect(view.segments.every((segment) => segment.kind !== 'diagonal')).toBe(
      true
    );
  });

  it('can include triangle diagonals for full mesh inspection', () => {
    const geometryPlan = createGeometryPlan();

    const view = createTerrainChunkWireframeDebugView({
      geometryPlan,
      includeDiagonals: true,
    });

    expect(view.includeDiagonals).toBe(true);
    expect(view.segmentCount).toBe(16);
    expect(
      view.segments.filter((segment) => segment.kind === 'diagonal')
    ).toHaveLength(4);
    expect(view.segments[0]).toEqual(
      expect.objectContaining({
        start: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          z: expect.any(Number),
        }),
        end: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          z: expect.any(Number),
        }),
      })
    );
  });
});

function createGeometryPlan() {
  const grid = createTerrainSplatSampleGrid({
    seed: 'wireframe-debug-seed',
    bounds: {
      minX: 0,
      maxX: 2,
      minY: 0,
      maxY: 2,
    },
    kindCatalog: createTerrainKindSplatCatalog(
      [
        {
          kind: 'plains',
          baseLayerIds: ['grass-a'],
        },
      ],
      createTerrainMaterialLayerCatalog([
        {
          id: 'grass-a',
          baseColorTextureId: 'grass-a/base',
          normalTextureId: 'grass-a/normal',
          roughnessTextureId: 'grass-a/roughness',
          textureScale: 3,
          defaultTint: '#88aa55',
          defaultRoughness: 0.9,
        },
      ])
    ),
    resolveTile: () => ({
      kind: 'plains',
    }),
    fallbackLayerId: 'grass-a',
  });
  const heightField = createTerrainHeightField({
    bounds: {
      minX: 0,
      maxX: 2,
      minY: 0,
      maxY: 2,
    },
    resolveHeight: ({ x, y }) => x * 0.1 + y * 0.2,
  });

  return createTerrainSplatHeightGeometryPlan({
    grid,
    heightField,
  });
}
