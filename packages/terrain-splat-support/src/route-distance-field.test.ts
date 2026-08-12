import { describe, expect, it } from 'vitest';
import { sampleTerrainRouteDistanceField } from './route-distance-field.ts';

describe('terrain route distance field', () => {
  it('samples curved world-space route data inside logical terrain cells', () => {
    const sample = sampleTerrainRouteDistanceField({
      samplePoint: { x: 0.82, z: 0.57 },
      routes: [
        {
          routeId: 'curved-road',
          points: [
            { x: 0.2, z: 0.2 },
            { x: 0.9, z: 0.55 },
            { x: 1.6, z: 1.35 },
          ],
          widthPlan: {
            surfaceWidth: 0.28,
            shoulderWidth: 0.12,
          },
        },
      ],
    });

    expect(sample.nearestRouteId).toBe('curved-road');
    expect(sample.totalRouteWeight).toBeGreaterThan(0.9);
    expect(sample.nearestPoint).not.toEqual({ x: 1, z: 1 });
    expect(sample.nearestPoint?.x).toBeCloseTo(0.84, 1);
  });

  it('combines crossing world-space routes into one deterministic crossroads sample', () => {
    const sample = sampleTerrainRouteDistanceField({
      samplePoint: { x: 1, z: 1 },
      routes: [
        {
          routeId: 'east-west',
          points: [
            { x: 0, z: 1 },
            { x: 2, z: 1 },
          ],
          widthPlan: {
            surfaceWidth: 0.24,
            shoulderWidth: 0.12,
          },
        },
        {
          routeId: 'north-south',
          points: [
            { x: 1, z: 0 },
            { x: 1, z: 2 },
          ],
          widthPlan: {
            surfaceWidth: 0.24,
            shoulderWidth: 0.12,
          },
        },
      ],
    });

    expect(sample.intersectionCount).toBe(2);
    expect(sample.contributions.map((entry) => entry.routeId)).toEqual([
      'east-west',
      'north-south',
    ]);
    expect(sample.combinedSurfaceWeight).toBe(1);
    expect(sample.totalRouteWeight).toBe(1);
  });

  it('stays deterministic for the same world-space route inputs', () => {
    const params = {
      samplePoint: { x: 2.2, z: 1.8 },
      routes: [
        {
          routeId: 'trail-a',
          points: [
            { x: 1.8, z: 1.3 },
            { x: 2.4, z: 1.9 },
            { x: 2.9, z: 2.6 },
          ],
          widthPlan: {
            surfaceWidth: 0.18,
            shoulderWidth: 0.08,
          },
          weightScale: 0.85,
        },
      ],
    } as const;

    expect(sampleTerrainRouteDistanceField(params)).toEqual(
      sampleTerrainRouteDistanceField(params)
    );
  });

  it('keeps shared boundary samples identical when adjacent chunks query the same world point', () => {
    const routes = [
      {
        routeId: 'border-road',
        points: [
          { x: 1.6, z: 0.5 },
          { x: 2.4, z: 1.2 },
          { x: 3.2, z: 1.8 },
        ],
        widthPlan: {
          surfaceWidth: 0.28,
          shoulderWidth: 0.12,
        },
      },
    ] as const;

    const leftChunkSample = sampleTerrainRouteDistanceField({
      samplePoint: { x: 2, z: 1 },
      routes,
    });
    const rightChunkSample = sampleTerrainRouteDistanceField({
      samplePoint: { x: 2, z: 1 },
      routes,
    });

    expect(leftChunkSample).toEqual(rightChunkSample);
  });
});
