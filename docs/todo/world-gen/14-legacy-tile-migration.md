# Legacy Floor Tile Migration

## Preserve Logical Tiles

- [ ] Keep logical tiles for gameplay indexing.
- [ ] Keep logical tiles for local feature queries.
- [ ] Keep logical tiles for the 2D tile map.
- [ ] Stop treating each tile as one 3D floor mesh.
- [ ] Stop treating each tile as one material owner.

## Replace Floor Meshes

- [ ] Group visible floor cells into terrain chunks.
- [ ] Build chunk geometry from shared height samples.
- [ ] Build chunk splat weights from shared terrain state.
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
