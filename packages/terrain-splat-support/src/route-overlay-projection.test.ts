import { describe, expect, it } from 'vitest';
import { createTerrainHeightField } from './height-field.ts';
import {
  projectTerrainRouteOverlayOntoHeightField,
  sampleTerrainHeightFieldAtWorldPosition,
} from './route-overlay-projection.ts';

describe('terrain route overlay projection', () => {
  it('projects overlay points onto the shared terrain height field', () => {
    const heightField = createTerrainHeightField({
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveHeight: ({ x, y }) => x * 0.2 + y * 0.1,
    });

    const projection = projectTerrainRouteOverlayOntoHeightField({
      heightField,
      overlayOffsetY: 0.02,
      points: [
        { x: 0, z: 0 },
        { x: 1, z: 1 },
        { x: 2, z: 2 },
      ],
    });

    expect(projection.overlayOffsetY).toBe(0.02);
    expect(projection.points[0]).toEqual({ x: 0, y: 0.02, z: 0 });
    expect(projection.points[1]?.y).toBeCloseTo(0.32);
    expect(projection.points[2]?.y).toBeCloseTo(0.62);
  });

  it('interpolates overlay heights between sampled terrain points to avoid gaps', () => {
    const heightField = createTerrainHeightField({
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveHeight: ({ x, y }) => x + y,
    });

    expect(
      sampleTerrainHeightFieldAtWorldPosition(heightField, { x: 0.5, z: 0.5 })
    ).toBeCloseTo(1);
    expect(
      sampleTerrainHeightFieldAtWorldPosition(heightField, { x: 1.5, z: 0.5 })
    ).toBeCloseTo(2);
    expect(
      sampleTerrainHeightFieldAtWorldPosition(heightField, { x: 1.25, z: 1.75 })
    ).toBeCloseTo(3);
  });

  it('clamps projection samples at the edge of the height field instead of producing gaps', () => {
    const heightField = createTerrainHeightField({
      bounds: {
        minX: 10,
        maxX: 12,
        minY: 20,
        maxY: 22,
      },
      resolveHeight: ({ x, y }) => (x - 10) * 0.3 + (y - 20) * 0.4,
    });

    const projection = projectTerrainRouteOverlayOntoHeightField({
      heightField,
      points: [
        { x: 9.5, z: 19.5 },
        { x: 12.5, z: 22.5 },
      ],
    });

    expect(projection.points[0]?.y).toBeCloseTo(0.01);
    expect(projection.points[1]?.y).toBeCloseTo(1.41);
  });
});
