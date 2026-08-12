import { describe, expect, it } from 'vitest';
import { createTerrainHeightField } from './height-field.ts';
import { projectTerrainRouteSplatOntoHeightField } from './route-splat-projection.ts';

describe('terrain route splat projection', () => {
  it('projects weighted route splat points onto the shared terrain height field', () => {
    const heightField = createTerrainHeightField({
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveHeight: ({ x, y }) => x * 0.2 + y * 0.1,
    });

    const projection = projectTerrainRouteSplatOntoHeightField({
      heightField,
      surfaceOffsetY: 0.02,
      points: [
        { x: 0, z: 0, weight: 1, layerId: 'dirt-road' },
        { x: 1, z: 1, weight: 0.65, layerId: 'dirt-road' },
        { x: 2, z: 2, weight: 0.2, layerId: 'gravel-road' },
      ],
    });

    expect(projection.surfaceOffsetY).toBe(0.02);
    expect(projection.points[0]).toEqual({
      x: 0,
      z: 0,
      y: 0.02,
      weight: 1,
      layerId: 'dirt-road',
    });
    expect(projection.points[1]?.y).toBeCloseTo(0.32);
    expect(projection.points[1]?.weight).toBeCloseTo(0.65);
    expect(projection.points[2]?.y).toBeCloseTo(0.62);
    expect(projection.points[2]?.layerId).toBe('gravel-road');
  });

  it('clamps invalid route splat weights while preserving projected world positions', () => {
    const heightField = createTerrainHeightField({
      bounds: {
        minX: 10,
        maxX: 12,
        minY: 20,
        maxY: 22,
      },
      resolveHeight: ({ x, y }) => (x - 10) * 0.3 + (y - 20) * 0.4,
    });

    const projection = projectTerrainRouteSplatOntoHeightField({
      heightField,
      points: [
        { x: 10, z: 20, weight: -1 },
        { x: 12, z: 22, weight: 2 },
        { x: 11, z: 21, weight: Number.NaN },
      ],
    });

    expect(projection.points.map((point) => point.weight)).toEqual([0, 1, 0]);
    expect(projection.points[0]?.y).toBeCloseTo(0);
    expect(projection.points[1]?.y).toBeCloseTo(1.4);
    expect(projection.points[2]?.y).toBeCloseTo(0.7);
  });

  it('interpolates route splat heights between terrain samples to avoid gaps along the road', () => {
    const heightField = createTerrainHeightField({
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveHeight: ({ x, y }) => x + y,
    });

    const projection = projectTerrainRouteSplatOntoHeightField({
      heightField,
      points: [
        { x: 0.5, z: 0.5, weight: 1, layerId: 'dirt-road' },
        { x: 1.5, z: 0.5, weight: 1, layerId: 'dirt-road' },
        { x: 1.25, z: 1.75, weight: 0.7, layerId: 'gravel-road' },
      ],
    });

    expect(projection.points[0]?.y).toBeCloseTo(1);
    expect(projection.points[1]?.y).toBeCloseTo(2);
    expect(projection.points[2]?.y).toBeCloseTo(3);
  });

  it('clamps route splat projection samples at the edge of the height field instead of leaving height gaps', () => {
    const heightField = createTerrainHeightField({
      bounds: {
        minX: 10,
        maxX: 12,
        minY: 20,
        maxY: 22,
      },
      resolveHeight: ({ x, y }) => (x - 10) * 0.3 + (y - 20) * 0.4,
    });

    const projection = projectTerrainRouteSplatOntoHeightField({
      heightField,
      surfaceOffsetY: 0.01,
      points: [
        { x: 9.5, z: 19.5, weight: 1, layerId: 'dirt-road' },
        { x: 12.5, z: 22.5, weight: 0.6, layerId: 'gravel-road' },
      ],
    });

    expect(projection.points[0]?.y).toBeCloseTo(0.01);
    expect(projection.points[1]?.y).toBeCloseTo(1.41);
  });
});
