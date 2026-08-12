# Flat Terrain Rendering Optimization

## Shared Terrain Architecture

* [ ] Identify all tile types that use terrain-surface geometry.
* [ ] Separate terrain surfaces from objects placed on terrain.
* [ ] Keep logical tile state independent from terrain rendering.
* [ ] Create one shared terrain rendering system.
* [ ] Route compatible tile plugins through the terrain system.
* [ ] Keep special geometry outside normal terrain chunks.
* [ ] Keep bridges separate from terrain chunk geometry.
* [ ] Keep buildings separate from terrain chunk geometry.
* [ ] Keep trees and props separate from terrain chunk geometry.

## Chunked Terrain Geometry

* [ ] Replace individual flat tile meshes with terrain chunks.
* [ ] Choose an initial terrain chunk size.
* [ ] Start with 16x16 logical tiles per terrain chunk.
* [ ] Build one geometry for all terrain cells in a chunk.
* [ ] Use a 17x17 vertex grid for a 16x16 tile chunk.
* [ ] Share vertices between neighboring cells in a chunk.
* [ ] Avoid one Object3D per logical terrain tile.
* [ ] Avoid one Mesh per logical terrain tile.
* [ ] Keep tile IDs available after geometry is combined.
* [ ] Map chunk faces back to their logical tile IDs.

## Continuous Terrain Height

* [ ] Sample terrain height from global world coordinates.
* [ ] Use one height source for every terrain plugin.
* [ ] Share exact height samples on neighboring tile corners.
* [ ] Share exact height samples on neighboring chunk edges.
* [ ] Generate slopes instead of independent tile platforms.
* [ ] Keep terrain height independent from texture selection.
* [ ] Keep terrain height independent from visual LOD.
* [ ] Recalculate normals after terrain heights are applied.
* [ ] Smooth terrain normals across tile boundaries.
* [ ] Smooth terrain normals across chunk boundaries.
* [ ] Prevent visible cracks between terrain chunks.

## Terrain Subdivision

* [ ] Support more than four height samples per tile when needed.
* [ ] Define a standard terrain subdivision density.
* [ ] Use lower subdivision density for distant terrain.
* [ ] Preserve chunk edge samples across every terrain LOD.
* [ ] Preserve tile corner heights across every terrain LOD.
* [ ] Keep chunk dimensions identical across terrain LODs.
* [ ] Avoid terrain shape popping during LOD changes.

## Shared Geometry

* [ ] Cache reusable terrain geometry layouts by chunk size.
* [ ] Reuse index buffers between compatible terrain chunks.
* [ ] Reuse UV layouts between compatible terrain chunks.
* [ ] Avoid rebuilding static topology for each chunk.
* [ ] Update only height data when topology is unchanged.
* [ ] Reuse normal buffers when terrain shape permits it.
* [ ] Report geometry reuse counts in debug snapshots.

## Shared Material System

* [ ] Create one shared terrain material system.
* [ ] Avoid creating one material per terrain tile.
* [ ] Avoid cloning materials only for visual variation.
* [ ] Cache terrain materials by effective render settings.
* [ ] Share terrain materials between compatible tile types.
* [ ] Keep terrain material counts bounded.
* [ ] Add a hard cap for terrain material signatures.
* [ ] Report terrain material cache hit rates.
* [ ] Report unique terrain materials by terrain family.
* [ ] Warn when a terrain tile creates a unique material.

## Texture Pools

* [ ] Create a bounded texture pool for each terrain family.
* [ ] Limit each terrain family to 10 base texture variants.
* [ ] Reuse texture variants across nearby terrain cells.
* [ ] Select variants deterministically from world position.
* [ ] Keep texture selection stable across reloads.
* [ ] Keep texture selection stable across LOD changes.
* [ ] Avoid generating textures for individual terrain cells.
* [ ] Report texture pool usage by terrain family.
* [ ] Warn when a terrain family exceeds its texture cap.

## Texture Variation

* [ ] Support texture rotation at 0, 90, 180, and 270 degrees.
* [ ] Support horizontal texture mirroring.
* [ ] Support vertical texture mirroring.
* [ ] Apply rotation through UV transforms.
* [ ] Apply mirroring through UV transforms.
* [ ] Do not create duplicate images for rotated textures.
* [ ] Do not create duplicate images for mirrored textures.
* [ ] Add subtle deterministic tint variation.
* [ ] Avoid cloning materials for tint changes.
* [ ] Keep tint differences within terrain-safe ranges.

## Texture Arrays

* [ ] Evaluate WebGL2 texture arrays for terrain textures.
* [ ] Put terrain variants into shared texture arrays.
* [ ] Store a texture layer index for each terrain cell.
* [ ] Let one terrain material sample multiple terrain types.
* [ ] Keep texture array dimensions consistent.
* [ ] Group compatible texture formats into one array.
* [ ] Add a fallback when texture arrays are unavailable.
* [ ] Measure draw calls before and after texture arrays.

## Mixed Terrain Chunks

* [ ] Allow one chunk to contain multiple terrain types.
* [ ] Store terrain type per cell or terrain vertex.
* [ ] Avoid splitting chunks only because terrain type changes.
* [ ] Keep plains and forest ground in the same terrain mesh.
* [ ] Keep dirt and grass in the same terrain mesh.
* [ ] Keep roads compatible with mixed terrain chunks.
* [ ] Keep water separate when it needs special rendering.
* [ ] Keep transparent terrain separate when required.

## Terrain Blending

* [ ] Support blending between neighboring terrain materials.
* [ ] Store terrain blend weights where needed.
* [ ] Blend grass into dirt near terrain boundaries.
* [ ] Blend sand into grass near terrain boundaries.
* [ ] Avoid hard square texture borders where possible.
* [ ] Keep blending deterministic from world data.
* [ ] Keep terrain blending stable across LOD changes.
* [ ] Limit the number of blended materials per surface.

## Large-Scale Variation

* [ ] Add regional tint variation above tile texture variation.
* [ ] Add moisture variation above tile texture variation.
* [ ] Add seasonal color variation without new textures.
* [ ] Add elevation-based terrain tint variation.
* [ ] Add large-scale noise to reduce visible repetition.
* [ ] Keep large-scale noise continuous across tile borders.
* [ ] Keep large-scale noise continuous across chunk borders.
* [ ] Avoid making every tile look independently randomized.

## Roads and Trails

* [ ] Decide whether roads are terrain layers or overlays.
* [ ] Prefer road strips over replacing whole terrain cells.
* [ ] Project road geometry onto terrain height.
* [ ] Keep roads smooth across tile boundaries.
* [ ] Blend road edges into surrounding terrain.
* [ ] Avoid unique road materials per road tile.
* [ ] Reuse road textures and materials across chunks.

## Forest Ground

* [ ] Separate forest biome state from base terrain material.
* [ ] Let forest vegetation sit above shared ground terrain.
* [ ] Reuse grass and soil materials under forest tiles.
* [ ] Add leaf litter as an overlay when needed.
* [ ] Avoid unique ground materials for every forest tile.
* [ ] Let vegetation density define forest appearance.

## Player Ground Height

* [ ] Query the terrain surface under the player position.
* [ ] Interpolate terrain height inside each terrain cell.
* [ ] Keep player elevation synchronized with terrain height.
* [ ] Keep camera eye height relative to terrain height.
* [ ] Smooth small camera elevation changes.
* [ ] Follow slopes instead of stepping between tile heights.
* [ ] Use the same height data for rendering and movement.
* [ ] Recheck terrain height after crossing chunk boundaries.

## Collision

* [ ] Derive terrain collision from the same height field.
* [ ] Avoid separate flat collision planes for terrain tiles.
* [ ] Keep collision aligned with visible slopes.
* [ ] Keep terrain collision stable across visual LOD changes.
* [ ] Reuse terrain height samples for collision queries.
* [ ] Avoid rebuilding collision when only textures change.

## Chunk Rebuilding

* [ ] Rebuild only chunks affected by terrain changes.
* [ ] Avoid rebuilding chunks for unrelated tile state changes.
* [ ] Keep the old chunk visible while rebuilding.
* [ ] Swap chunk geometry only when replacement is ready.
* [ ] Cancel stale terrain chunk rebuild requests.
* [ ] Prioritize visible terrain chunk rebuilds.
* [ ] Cache recently used terrain chunks.

## Chunk Boundaries

* [ ] Share border height samples between adjacent chunks.
* [ ] Share terrain blend values across chunk borders.
* [ ] Keep texture transforms stable across chunk borders.
* [ ] Prevent visible seams between adjacent chunks.
* [ ] Add skirt geometry only as a last-resort seam fix.
* [ ] Test chunk boundaries at large elevation differences.

## Culling

* [ ] Frustum cull terrain by chunk instead of tile.
* [ ] Avoid processing terrain cells in invisible chunks.
* [ ] Keep chunk bounds updated for terrain elevation.
* [ ] Use terrain chunk bounds for visibility tests.
* [ ] Measure culling savings after terrain consolidation.

## Draw Calls

* [ ] Record terrain draw calls separately from object draws.
* [ ] Set a target draw-call count for visible terrain.
* [ ] Compare per-tile rendering with chunk rendering.
* [ ] Minimize material groups inside terrain chunks.
* [ ] Avoid one draw call per terrain type when possible.
* [ ] Fail benchmarks when terrain draw calls regress badly.

## Scene Graph

* [ ] Remove terrain tile Object3D nodes after chunking.
* [ ] Keep logical tiles outside the Three.js scene graph.
* [ ] Reduce scene graph depth for terrain surfaces.
* [ ] Disable matrix auto-update for static terrain chunks.
* [ ] Avoid empty groups around terrain chunks.
* [ ] Report terrain Object3D counts separately.

## Resource Metrics

* [ ] Report terrain mesh count.
* [ ] Report terrain geometry count.
* [ ] Report terrain material count.
* [ ] Report terrain texture count.
* [ ] Report terrain draw calls.
* [ ] Report terrain triangle count.
* [ ] Report terrain GPU memory estimate.
* [ ] Report average tiles represented per terrain mesh.
* [ ] Report material reuse percentage.
* [ ] Report texture reuse percentage.

## Debug Visualization

* [ ] Add a toggle to show terrain chunk boundaries.
* [ ] Add a toggle to show logical tile boundaries.
* [ ] Show terrain type for each logical cell.
* [ ] Show texture variant IDs on terrain cells.
* [ ] Show texture rotation on terrain cells.
* [ ] Show texture mirror state on terrain cells.
* [ ] Show terrain tint values on terrain cells.
* [ ] Show height samples as debug points.
* [ ] Show terrain vertex normals.
* [ ] Show terrain material IDs.
* [ ] Show terrain chunk draw-call counts.
* [ ] Show terrain chunk memory estimates.

## Validation

* [ ] Reject terrain chunks with mismatched border heights.
* [ ] Reject terrain chunks containing invalid height values.
* [ ] Reject terrain chunks containing NaN vertices.
* [ ] Reject unsupported terrain texture indices.
* [ ] Reject terrain families exceeding texture limits.
* [ ] Warn when one terrain chunk uses too many materials.
* [ ] Warn when neighboring terrain creates visible seams.

## Tests

* [ ] Test adjacent tiles share identical corner heights.
* [ ] Test adjacent chunks share identical border heights.
* [ ] Test one chunk can contain several terrain types.
* [ ] Test texture rotation does not create new textures.
* [ ] Test texture mirroring does not create new textures.
* [ ] Test tinting does not create new materials.
* [ ] Test texture variants stay within the configured cap.
* [ ] Test logical tile IDs survive geometry consolidation.
* [ ] Test player height follows the rendered terrain.
* [ ] Test collision height matches the rendered terrain.
* [ ] Test roads follow terrain slopes.
* [ ] Test chunk rebuilding preserves neighboring seams.
* [ ] Test terrain output is deterministic for one seed.

## Performance Tests

* [ ] Benchmark 256 individual terrain tile meshes.
* [ ] Benchmark one equivalent 16x16 terrain chunk.
* [ ] Compare material counts before and after chunking.
* [ ] Compare Object3D counts before and after chunking.
* [ ] Compare draw calls before and after chunking.
* [ ] Compare frame time before and after chunking.
* [ ] Compare GPU memory before and after chunking.
* [ ] Benchmark mixed terrain chunks.
* [ ] Benchmark terrain texture arrays.
* [ ] Benchmark terrain blending.
* [ ] Set regression limits from the improved baseline.
