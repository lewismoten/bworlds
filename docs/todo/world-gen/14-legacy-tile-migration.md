# Legacy Floor Tile Migration

## Preserve Logical Tiles

- [x] Keep logical tiles for gameplay indexing.
- [x] Keep logical tiles for local feature queries.
- [x] Keep logical tiles for the 2D tile map.
- [ ] Stop treating each tile as one 3D floor mesh.
- [ ] Stop treating each tile as one material owner.

Current support:

- `packages/render3d/src/logical-tile-state.ts` now creates one explicit logical
  tile snapshot before any floor-content decision runs, so the renderer keeps
  authoritative decorated tile state, tile definitions, plugin ownership, and
  terrain-surface selection separate from legacy floor meshes.
- That logical tile snapshot is now the source for renderer-local floor content
  setup, which means gameplay indexing, local feature queries, and the 2D map
  can continue to rely on shared logical tiles even while the 3D floor path is
  being replaced.
- `packages/render3d/src/index.ts` now routes simple flat overworld `plains`,
  `forest`, and `shore` floor tiles through shared visible floor batches, and
  `road` continues to use that path when temporary terrain surface selection
  switches it to `shared-splat`.
- `packages/render3d/src/visible-terrain-chunks.ts` now groups visible
  shared-floor terrain cells into authoritative `@bworlds/worldgen` chunk IDs
  and `16x16` chunk bounds, which gives the future chunk floor renderer one
  renderer-owned chunk selection input instead of a raw visible tile scan.
- `packages/render3d/src/visible-terrain-chunk-geometries.ts` now consumes
  those visible chunk groups, builds shared splat chunk render data, and turns
  each chunk into one `BufferGeometry` backed by shared height samples and
  packed terrain splat attributes.
- `packages/render3d/src/visible-terrain-chunk-materials.ts` now derives active
  layer sets, texture binding runtime plans, terrain splat material plans, and
  compatibility buckets across visible chunks so later scene integration can
  share one splat material instance across compatible terrain chunks.
- `packages/render3d/src/visible-terrain-chunk-renderables.ts` now combines the
  shared chunk geometry path and shared chunk material compatibility path into
  cached renderable records, so unchanged chunks can preserve geometry and
  material pairing identity across repeated builds before the live renderer
  starts swapping them into the scene.
- `packages/render3d/src/visible-terrain-chunk-meshes.ts` now syncs those
  cached chunk renderables into one dedicated root group while reusing one
  shared material instance per compatibility bucket, which gives the later live
  renderer one scene-level chunk mesh path without deleting legacy floor meshes
  yet.

## Replace Floor Meshes

- [x] Group visible floor cells into terrain chunks.
- [x] Build chunk geometry from shared height samples.
- [x] Build chunk splat weights from shared terrain state.
- [ ] Render one shared PBR material across chunks.
- [ ] Keep water, structures, and vegetation separate.

## Texture Migration

- [ ] Remove random nine-tile floor texture placement.
- [ ] Use world-space UVs for terrain textures.
- [ ] Use deterministic UV rotation and mirroring.
- [ ] Use low-frequency tint and macro UV variation.
- [ ] Use splat blending to break square boundaries.
- [ ] Keep texture phase continuous across chunk borders.

## Forest Floors

- [ ] Remove tree icons from 3D forest floor tiles.
- [ ] Use soil and leaf litter as the forest base floor.
- [ ] Add moss and grass from local moisture and canopy.
- [ ] Render trees as vegetation objects above the floor.

## Rollout

- [ ] Add legacy and chunk floor debug toggles.
- [ ] Capture side-by-side screenshots for one seed.
- [ ] Compare 2D tile state with chunk splat dominance.
- [ ] Fix parity issues before deleting legacy floors.
- [ ] Remove legacy floor rendering after parity passes.

## Performance

- [ ] Measure draw calls before and after migration.
- [ ] Measure unique materials before and after migration.
- [ ] Measure geometry memory before and after migration.
- [ ] Confirm walking does not rebuild unchanged chunks.
