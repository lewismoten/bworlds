import { describe, expect, it } from 'vitest';
import { createTerrainMaterialLayerCatalog } from './index.ts';
import {
  createTerrainRouteOverlayMaterialPlan,
  summarizeTerrainRouteOverlayMaterialReuse,
} from './route-overlay-material-plan.ts';
import { createTerrainRouteSurfacePlan } from './route-surface-plan.ts';

describe('terrain route overlay material plan', () => {
  it('creates one shared overlay material plan from the chosen route layer', () => {
    const catalog = createCatalog();
    const surfacePlan = createTerrainRouteSurfacePlan({
      kind: 'path',
      roadSignal: 0.7,
      dirtRoadLayerId: 'dirt-road',
      gravelRoadLayerId: 'gravel-road',
      gravelTrailLayerId: 'gravel-trail',
    });

    const plan = createTerrainRouteOverlayMaterialPlan({
      surfacePlan,
      catalog,
    });

    expect(plan).toMatchObject({
      layerId: 'gravel-trail',
      textureScale: 2.5,
      defaultTint: '#91867c',
      defaultRoughness: 0.82,
      defaultMetalness: 0,
      mapPurposes: ['baseColor', 'normal', 'roughness'],
      shaderDefines: [
        'TERRAIN_ROUTE_BASE_COLOR_MAP',
        'TERRAIN_ROUTE_NORMAL_MAP',
        'TERRAIN_ROUTE_ROUGHNESS_MAP',
      ],
      globalUniforms: [
        'terrainRouteOverlayBaseColorMap',
        'terrainRouteOverlayNormalMap',
        'terrainRouteOverlayRoughnessMap',
        'terrainRouteOverlayTint',
        'terrainRouteOverlayTextureScale',
        'terrainRouteOverlayRoughness',
        'terrainRouteOverlayMetalness',
        'terrainRouteOverlayWetness',
      ],
      warnings: [],
    });
    expect(plan?.materialKey).toContain('mode:terrain-route-overlay');
    expect(plan?.materialKey).toContain('layer:gravel-trail');
  });

  it('does not create an overlay material plan for splat-only broad roads', () => {
    const plan = createTerrainRouteOverlayMaterialPlan({
      surfacePlan: createTerrainRouteSurfacePlan({
        kind: 'road',
        roadSignal: 0.3,
        dirtRoadLayerId: 'dirt-road',
        gravelRoadLayerId: 'gravel-road',
      }),
      catalog: createCatalog(),
    });

    expect(plan).toBeNull();
  });

  it('reuses one overlay material key across compatible chunks', () => {
    const catalog = createCatalog();
    const first = createTerrainRouteOverlayMaterialPlan({
      surfacePlan: createTerrainRouteSurfacePlan({
        kind: 'path',
        roadSignal: 0.1,
        dirtRoadLayerId: 'dirt-road',
        gravelRoadLayerId: 'gravel-road',
      }),
      catalog,
    });
    const second = createTerrainRouteOverlayMaterialPlan({
      surfacePlan: createTerrainRouteSurfacePlan({
        kind: 'road',
        roadSignal: 0.2,
        prefersOverlay: true,
        dirtRoadLayerId: 'dirt-road',
        gravelRoadLayerId: 'gravel-road',
      }),
      catalog,
    });

    expect(first?.materialKey).toBe(second?.materialKey);

    const summary = summarizeTerrainRouteOverlayMaterialReuse([
      {
        chunkId: '0:0',
        plan: first!,
      },
      {
        chunkId: '1:0',
        plan: second!,
      },
    ]);

    expect(summary.uniqueMaterialCount).toBe(1);
    expect(summary.reusedChunkCount).toBe(1);
    expect(summary.warnings).toEqual([]);
  });

  it('warns when one chunk falls onto a unique overlay material key', () => {
    const catalog = createCatalog();
    const shared = createTerrainRouteOverlayMaterialPlan({
      surfacePlan: createTerrainRouteSurfacePlan({
        kind: 'path',
        roadSignal: 0.1,
        dirtRoadLayerId: 'dirt-road',
        gravelRoadLayerId: 'gravel-road',
      }),
      catalog,
    });
    const unique = createTerrainRouteOverlayMaterialPlan({
      surfacePlan: createTerrainRouteSurfacePlan({
        kind: 'path',
        roadSignal: 0.7,
        dirtRoadLayerId: 'dirt-road',
        gravelRoadLayerId: 'gravel-road',
        gravelTrailLayerId: 'gravel-trail',
      }),
      catalog,
    });

    const summary = summarizeTerrainRouteOverlayMaterialReuse([
      {
        chunkId: '0:0',
        plan: shared!,
      },
      {
        chunkId: '1:0',
        plan: shared!,
      },
      {
        chunkId: '9:9',
        plan: unique!,
      },
    ]);

    expect(summary.uniqueMaterialCount).toBe(2);
    expect(summary.reusedChunkCount).toBe(1);
    expect(summary.warnings).toEqual([
      {
        code: 'unique-route-overlay-material',
        message: `Terrain route overlay chunk ${JSON.stringify('9:9')} created one unique route material "${unique!.materialKey}".`,
      },
    ]);
  });
});

function createCatalog() {
  return createTerrainMaterialLayerCatalog([
    {
      id: 'dirt-road',
      baseColorTextureId: 'dirt-road/base',
      normalTextureId: 'dirt-road/normal',
      roughnessTextureId: 'dirt-road/roughness',
      textureScale: 3,
      defaultTint: '#8d6a42',
      defaultRoughness: 0.9,
    },
    {
      id: 'gravel-road',
      baseColorTextureId: 'gravel-road/base',
      normalTextureId: 'gravel-road/normal',
      roughnessTextureId: 'gravel-road/roughness',
      textureScale: 2.8,
      defaultTint: '#90867c',
      defaultRoughness: 0.84,
    },
    {
      id: 'gravel-trail',
      baseColorTextureId: 'gravel-road/base',
      normalTextureId: 'gravel-road/normal',
      roughnessTextureId: 'gravel-road/roughness',
      textureScale: 2.5,
      defaultTint: '#91867c',
      defaultRoughness: 0.82,
    },
  ]);
}
