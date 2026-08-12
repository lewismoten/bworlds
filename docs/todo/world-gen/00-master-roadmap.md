# World Generation Master Roadmap

## Phase 1: Make Chunk Terrain Visible

- [ ] Complete `01-terrain-chunks.md`.
- [ ] Render one live PBR splat chunk in-world.
- [ ] Replace nearby flat floor tiles with chunk geometry.
- [ ] Keep logical tile state separate from chunk geometry.
- [ ] Keep old floor rendering behind a temporary debug toggle.
- [ ] Add chunk X and Y to the sextant panel.
- [ ] Add local X and Y inside the current chunk.
- [ ] Verify adjacent chunks share identical border heights.
- [ ] Verify the player crosses chunk seams without a visible step.
- [ ] Verify the 2D tile map still represents the 3D world.

## Phase 2: Build the Shared Height Pipeline

- [ ] Complete `02-height-pipeline.md`.
- [ ] Make one world-space height API authoritative.
- [ ] Make terrain, player, camera, and collision use that height API.
- [ ] Make roads and rivers use the same height API.
- [ ] Keep all height layers deterministic from the world seed.

## Phase 3: Build Continental Geology

- [ ] Complete `03-continental-geology.md`.
- [ ] Generate continent uplift and ocean depth.
- [ ] Add cratons, shields, platforms, plains, and active belts.
- [ ] Add shelves, slopes, rifts, mountains, hills, and volcanoes.
- [ ] Add canyons, trenches, craters, and volcanic islands.

## Phase 4: Build Hydrology

- [ ] Complete `04-hydrology.md`.
- [ ] Add large lakes after major geology is stable.
- [ ] Add large rivers with sparse Bezier control points.
- [ ] Add smaller rivers with finer resolution and natural forks.
- [ ] Store flow direction on every river segment.

## Phase 5: Build Climate and Biomes

- [ ] Complete `05-climate-biomes.md`.
- [ ] Derive climate from latitude and elevation.
- [ ] Derive humidity from water, weather, and rain shadows.
- [ ] Derive biomes from climate signals.
- [ ] Feed biome results into terrain splats.

## Phase 6: Build Vegetation

- [ ] Complete `06-vegetation.md`.
- [ ] Use dirt and leaves as forest floor splats.
- [ ] Place trees and bushes above the shared floor geometry.
- [ ] Prevent vegetation on water, roads, rails, docks, and cliffs.

## Phase 7: Place Settlements

- [ ] Complete `07-settlements.md`.
- [ ] Favor settlements near rivers and coasts.
- [ ] Reduce settlement chance at high elevation.
- [ ] Reserve clearings before final vegetation placement.

## Phase 8: Build Crossing Structures

- [ ] Complete `08-bridges-tunnels-docks.md`.
- [ ] Reserve bridges before routes finalize.
- [ ] Reserve tunnel portals before routes finalize.
- [ ] Place docks, ferries, lighthouses, and observatories.

## Phase 9: Build Roads and Rail

- [ ] Complete `09-roads-rail.md`.
- [ ] Use route points five to twenty tiles apart.
- [ ] Fit smooth Bezier curves between route control points.
- [ ] Enforce road and rail grade limits.
- [ ] Require routes to connect to a purpose.

## Phase 10: Add Names and Borders

- [ ] Complete `10-naming.md`.
- [ ] Complete `11-regions-borders.md`.
- [ ] Name major natural and human features.
- [ ] Generate region, county, and district borders.

## Phase 11: Build Map Products

- [ ] Complete `12-map-projections.md`.
- [ ] Complete `13-map-layers-pmtiles.md`.
- [ ] Derive 2D and 3D maps from the same world data.
- [ ] Generate PMTiles data with zoom-dependent detail.

## Phase 12: Remove Legacy Floor Rendering

- [ ] Complete `14-legacy-tile-migration.md`.
- [ ] Remove one-mesh-per-floor-tile rendering.
- [ ] Replace random tile scatter with world-space UV variation.
- [ ] Compare performance against the old floor renderer.

## Architecture Rule

- [ ] Complete `15-plugin-architecture.md`.
- [ ] Keep each generation layer as a plugin.
- [ ] Keep regional feature queries fast and deterministic.
