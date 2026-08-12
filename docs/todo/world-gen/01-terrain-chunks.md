# Terrain Chunk Rendering

## Chunk Coordinates

- [ ] Choose a logical chunk size for the first live renderer.
- [ ] Start with sixteen by sixteen logical cells per chunk.
- [ ] Use seventeen by seventeen height samples per chunk.
- [ ] Define signed integer chunk X and Y coordinates.
- [ ] Define local cell X and Y inside each chunk.
- [ ] Convert world cells to chunk and local coordinates.
- [ ] Keep conversions correct for negative world coordinates.
- [ ] Add tests around zero and negative chunk boundaries.

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

- [ ] Sample chunk border heights from world coordinates.
- [ ] Never derive border heights from local-only noise.
- [ ] Share exact border height samples between neighbors.
- [ ] Use world-space UVs across all chunk borders.
- [ ] Keep splat weights continuous across chunk borders.
- [ ] Keep route and river influence continuous across borders.
- [ ] Recalculate normals from seam-safe height samples.
- [ ] Add a chunk seam debug view.
- [ ] Add a chunk wireframe debug view.

## Sextant Panel

- [ ] Show current chunk X.
- [ ] Show current chunk Y.
- [ ] Show local cell X.
- [ ] Show local cell Y.
- [ ] Show world cell X.
- [ ] Show world cell Y.
- [ ] Show sampled terrain height.
- [ ] Show dominant splat layer.
- [ ] Show current biome ID.
- [ ] Show current terrain chunk LOD.

## Visible Milestone

- [ ] Walk across nine connected PBR terrain chunks.
- [ ] Confirm no square floor meshes are visible nearby.
- [ ] Confirm textures do not reset at chunk borders.
- [ ] Confirm height is continuous across chunk borders.
- [ ] Confirm sextant chunk and local values are correct.
- [ ] Capture before and after draw-call metrics.
