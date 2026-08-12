import { describe, expect, it } from 'vitest';
import { sampleTerrainRouteDistanceField } from './route-distance-field.ts';
import { blendTerrainRouteJunctionIntoSample } from './route-junction-blend.ts';

describe('terrain route junction blend', () => {
  it('blends multiple route contributions into one normalized crossroads sample', () => {
    const distanceField = sampleTerrainRouteDistanceField({
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

    const blend = blendTerrainRouteJunctionIntoSample({
      baseSample: {
        entries: [
          { layerId: 'grass-a', weight: 0.7 },
          { layerId: 'soil', weight: 0.3 },
        ],
      },
      contributions: distanceField.contributions.map((contribution) => ({
        ...contribution,
        routeLayerId:
          contribution.routeId === 'east-west' ? 'dirt-road' : 'gravel-road',
      })),
      fallbackLayerId: 'grass-a',
    });

    expect(blend.combinedRouteWeight).toBe(1);
    expect(blend.routeLayerWeights).toEqual({
      'dirt-road': 0.5,
      'gravel-road': 0.5,
    });
    expect(blend.sample.entries).toEqual([
      { layerId: 'dirt-road', weight: 0.5 },
      { layerId: 'gravel-road', weight: 0.5 },
    ]);
  });

  it('merges repeated route layer ids instead of stacking overlapping mesh-like entries', () => {
    const blend = blendTerrainRouteJunctionIntoSample({
      baseSample: {
        entries: [
          { layerId: 'grass-a', weight: 0.8 },
          { layerId: 'soil', weight: 0.2 },
        ],
      },
      contributions: [
        {
          routeId: 'road-a',
          routeLayerId: 'dirt-road',
          distanceFromCenter: 0,
          nearestPoint: { x: 1, z: 1 },
          segmentIndex: 0,
          surfaceWeight: 1,
          shoulderWeight: 0,
          totalRouteWeight: 0.6,
        },
        {
          routeId: 'road-b',
          routeLayerId: 'dirt-road',
          distanceFromCenter: 0.04,
          nearestPoint: { x: 1.1, z: 1 },
          segmentIndex: 0,
          surfaceWeight: 0.9,
          shoulderWeight: 0.05,
          totalRouteWeight: 0.4,
        },
      ],
      fallbackLayerId: 'grass-a',
    });

    expect(blend.combinedRouteWeight).toBeCloseTo(0.76);
    expect(blend.routeLayerWeights['dirt-road']).toBeCloseTo(0.76);
    expect(
      blend.sample.entries.filter((entry) => entry.layerId === 'dirt-road')
    ).toHaveLength(1);
  });

  it('keeps shared intersection blends identical across chunk boundaries for the same world point', () => {
    const routes = [
      {
        routeId: 'east-west',
        points: [
          { x: 1, z: 2 },
          { x: 3, z: 2 },
        ],
        widthPlan: {
          surfaceWidth: 0.24,
          shoulderWidth: 0.12,
        },
      },
      {
        routeId: 'north-south',
        points: [
          { x: 2, z: 1 },
          { x: 2, z: 3 },
        ],
        widthPlan: {
          surfaceWidth: 0.24,
          shoulderWidth: 0.12,
        },
      },
    ] as const;

    const leftChunk = blendTerrainRouteJunctionIntoSample({
      baseSample: {
        entries: [
          { layerId: 'grass-a', weight: 0.7 },
          { layerId: 'soil', weight: 0.3 },
        ],
      },
      contributions: sampleTerrainRouteDistanceField({
        samplePoint: { x: 2, z: 2 },
        routes,
      }).contributions.map((contribution) => ({
        ...contribution,
        routeLayerId:
          contribution.routeId === 'east-west' ? 'dirt-road' : 'gravel-road',
      })),
      fallbackLayerId: 'grass-a',
    });
    const rightChunk = blendTerrainRouteJunctionIntoSample({
      baseSample: {
        entries: [
          { layerId: 'grass-a', weight: 0.7 },
          { layerId: 'soil', weight: 0.3 },
        ],
      },
      contributions: sampleTerrainRouteDistanceField({
        samplePoint: { x: 2, z: 2 },
        routes,
      }).contributions.map((contribution) => ({
        ...contribution,
        routeLayerId:
          contribution.routeId === 'east-west' ? 'dirt-road' : 'gravel-road',
      })),
      fallbackLayerId: 'grass-a',
    });

    expect(leftChunk).toEqual(rightChunk);
  });
});
