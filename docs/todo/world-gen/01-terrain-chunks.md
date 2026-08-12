# Terrain Chunk Rendering

## Chunk Coordinates

- [x] Choose a logical chunk size for the first live renderer.
- [x] Start with sixteen by sixteen logical cells per chunk.
- [x] Use seventeen by seventeen height samples per chunk.
- [x] Define signed integer chunk X and Y coordinates.
- [x] Define local cell X and Y inside each chunk.
- [x] Convert world cells to chunk and local coordinates.
- [x] Keep conversions correct for negative world coordinates.
- [x] Add tests around zero and negative chunk boundaries.

## Live Renderer

- [ ] Create a terrain chunk renderer plugin.
- [ ] Consume shared height and splat data.
- [ ] Build one `BufferGeometry` per visible terrain chunk.
- [ ] Attach packed splat indices to chunk geometry.
- [ ] Attach packed splat weights to chunk geometry.
- [ ] Use one shared PBR splat material where compatible.
- [ ] Keep water, structures, and vegetation separate.
- [ ] Render one test chunk beside the legacy floors.
- [ ] Render a three by three live chunk neighborhood.
- [ ] Cache unchanged chunk geometry.

## Seamless Geometry

- [x] Sample chunk border heights from world coordinates.
- [x] Never derive border heights from local-only noise.
- [x] Share exact border height samples between neighbors.
- [x] Use world-space UVs across all chunk borders.
- [x] Keep splat weights continuous across chunk borders.
- [ ] Keep route and river influence continuous across borders.
- [ ] Recalculate normals from seam-safe height samples.
- [ ] Add a chunk seam debug view.
- [ ] Add a chunk wireframe debug view.

Current support:

- `@bworlds/worldgen` exposes chunk cell bounds and 17x17 height-sample bounds
  so later height-field builders can share one world-space seam contract.
- `getTerrainChunkHeightSampleBorder(...)` now exposes the exact world-space
  sample line for each chunk edge, and tests verify adjacent chunks resolve the
  same east/west and north/south seam coordinates.
- `getTerrainChunkHeightSampleCoordinate(...)` now maps every seam-safe sample
  index onto a world-space coordinate, so chunk builders can sample one shared
  height function instead of inventing edge values from local chunk noise; see
  `docs/terrain-chunk-height-sample-contract.md`.
- `@bworlds/terrain-splat-support` already resolves deterministic world-space
  UV samples and verifies they stay continuous across repeated terrain
  boundaries, while sample-grid tests verify border-identical splat weights for
  adjacent chunk builds.
- `@bworlds/terrain-splat-support/chunk-seam-debug` now provides a renderer-free
  seam analysis payload for adjacent chunk borders, so future inspectors can
  surface exact layer and weight mismatches before the live chunk debug overlay
  lands.

## Sextant Panel

- [x] Show current chunk X.
- [x] Show current chunk Y.
- [x] Show local cell X.
- [x] Show local cell Y.
- [x] Show world cell X.
- [x] Show world cell Y.
- [x] Show sampled terrain height.
- [ ] Show dominant splat layer.
- [ ] Show current biome ID.
- [ ] Show current terrain chunk LOD.

Progress:

- The sextant now shows the current decorated tile `surfaceHeight` as a sampled
  terrain-height readout beside world/chunk/local coordinates.
- This is an interim Phase 1 readout based on the current runtime tile
  decoration, not yet the Phase 2 authoritative shared height API.

## Visible Milestone

- [ ] Walk across nine connected PBR terrain chunks.
- [ ] Confirm no square floor meshes are visible nearby.
- [ ] Confirm textures do not reset at chunk borders.
- [ ] Confirm height is continuous across chunk borders.
- [ ] Confirm sextant chunk and local values are correct.
- [ ] Capture before and after draw-call metrics.
