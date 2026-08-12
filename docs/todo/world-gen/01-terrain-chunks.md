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
- [x] Recalculate normals from seam-safe height samples.
- [x] Add a chunk seam debug view.
- [x] Add a chunk wireframe debug view.

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
- `@bworlds/terrain-splat-support/chunk-wireframe-debug` now turns one shared
  terrain chunk geometry plan into deduplicated border and interior wireframe
  segments, so future overlays can inspect chunk topology without rebuilding
  mesh edges in renderer-specific code.
- `apps/web` now exposes `/debug/terrain-chunks/`, which builds one real
  preview chunk from the current seed and surfaces the shared dominant splat
  grid, east/south seam diagnostics, sampled seam-height deltas, and wireframe
  SVG without waiting for the full live terrain chunk renderer to replace the
  main world floor path; see `docs/terrain-chunk-debug-page.md`.
- That debug page now also compares each logical `16x16` tile cell against the
  shared terrain-preview dominant layer category and reports parity matches
  versus mismatches, which gives Phase 1 one explicit inspection path toward
  verifying that the 2D tile map still represents the same terrain story as
  the future shared 3D chunk surface.
- The parity card now also surfaces a bounded mismatch preview list with
  logical-cell coordinates, tile kinds, biome IDs, dominant layers, and drift
  reasons so parity regressions can be inspected directly without hovering
  every cell in the grid.
- The debug page now also rolls seam continuity and tile-parity drift into one
  explicit verification summary so Phase 1 inspection can quickly tell whether
  a chunk is currently passing the shared seam and parity checks.
- `@bworlds/terrain-splat-support/height-field` now emits seam-safe vertex
  normals from the shared world-space height samples, supports extra
  `normalSampleRing` world-space samples so curved borders can match across
  neighboring chunks, and keeps reduced-LOD index buffers aligned to the actual
  vertex grid so chunk renderers can reuse one normal contract without
  introducing coarse-mesh seam bugs.
- `@bworlds/three-support` now converts one shared terrain chunk height plan
  plus packed splat attribute plan into a real `BufferGeometry`, so the live
  renderer can consume the shared chunk pipeline without rebuilding positions,
  normals, uvs, or packed splat attributes by hand inside `render3d`.
- `@bworlds/terrain-splat-support/chunk-build` now also exposes one render-data
  builder that combines cached packed splat output, one shared height sampler,
  seam-safe height-field geometry, and packed splat attributes into one
  renderer-ready chunk payload. This gives the future live terrain renderer one
  cacheable integration target instead of rebuilding chunk geometry and splat
  attributes from separate ad hoc steps.

## Sextant Panel

- [x] Show current chunk X.
- [x] Show current chunk Y.
- [x] Show local cell X.
- [x] Show local cell Y.
- [x] Show world cell X.
- [x] Show world cell Y.
- [x] Show sampled terrain height.
- [x] Show dominant splat layer.
- [x] Show current biome ID.
- [x] Show current terrain chunk LOD.

Progress:

- The sextant now shows the current decorated tile `surfaceHeight` as a sampled
  terrain-height readout beside world/chunk/local coordinates.
- This is an interim Phase 1 readout based on the current runtime tile
  decoration, not yet the Phase 2 authoritative shared height API.
- The sextant now also resolves one shared preview dominant splat layer and one
  interim preview biome ID from the current world seed, tile kind, and
  overworld terrain signals so chunk-floor debugging can see what the future
  shared terrain path expects at the player position; see
  `docs/terrain-preview-readouts.md`.
- The sextant now also shows the current terrain render LOD from the active
  visible-tile debug state. This is an interim chunk-LOD proxy until the live
  terrain chunk renderer replaces the legacy per-tile floor path.

## Visible Milestone

- [ ] Walk across nine connected PBR terrain chunks.
- [ ] Confirm no square floor meshes are visible nearby.
- [ ] Confirm textures do not reset at chunk borders.
- [ ] Confirm height is continuous across chunk borders.
- [ ] Confirm sextant chunk and local values are correct.
- [ ] Capture before and after draw-call metrics.
