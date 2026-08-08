# Errors 

Errors or other breaking changes will be displayed here for review over time that take a higher priority.

The following is not necearily an error, but a high priority based on a heap profile when it is dificult to walk in the game with many pauses.

The sampled allocations are about **60.9 MB**, and compared with the earlier profile, the dominant concern has shifted much more strongly toward **3D rendering, forest/tree generation, material cloning, and per-object setup**.

I would turn it into this task backlog, roughly in priority order.

## Highest Priority — Three.js Material / Uniform Explosion

* [ ] Investigate why `Three.js cloneUniforms()` accounts for roughly **34 MB** of sampled allocation across the major call sites.
* [ ] Determine how many unique `Material` instances exist in a typical forest scene.
* [ ] Determine how many shader programs are being created.
* [ ] Verify whether otherwise-identical trees are receiving separate material instances.
* [ ] Verify whether materials are being cloned merely to support distance fading.
* [ ] Review `prepareObjectForDistanceFade()` around `packages/render3d/src/index.ts:1018`.
* [x] Remove unnecessary `material.clone()` calls from `prepareObjectForDistanceFade()`.
* [ ] Prefer shared materials wherever per-object material state is unnecessary.
* [ ] Determine whether distance fading can be handled through shared shader logic rather than cloned materials.
* [ ] Consider using per-instance opacity/fade values rather than separate material instances.
* [ ] Consider `onBeforeCompile`, custom attributes, uniforms shared at a larger level, or another batching strategy for fading.
* [x] Cache compatible faded material variants instead of creating one per object.
* [ ] Ensure changing distance LOD does not create another material clone every time.
* [ ] Verify old cloned materials are disposed when no longer needed.
* [x] Add a debug counter showing active materials.
* [x] Add a debug counter showing compiled WebGL shader programs.
* [x] Add a warning if material count grows continuously while walking around.

The biggest allocation path is currently approximately:

```text
render()
  ↓
WebGLRenderer.render()
  ↓
setProgram()
  ↓
getProgram()
  ↓
cloneUniforms()
```

That usually points less toward "Three.js itself is wasteful" and more toward **the application presenting Three.js with a large number of distinct material/program configurations**.

---

# Distance Fade System

This deserves its own review because this path is allocating about **2.44 MB inclusive**:

```text
syncTileModelDetailLevels()
  ↓
buildTileNode()
  ↓
prepareObjectForDistanceFade()
  ↓
material.clone()
```

* [ ] Review whether every child mesh really requires independent distance fading.
* [ ] Apply fading at the tile/group level where possible.
* [ ] Avoid traversing every descendant just to clone its material.
* [ ] Cache traversal results for static models.
* [ ] Mark objects that have already been prepared for fading.
* [ ] Prevent the same object from being prepared multiple times.
* [x] Avoid cloning materials when a material has already been converted to a fade-capable variant.
* [ ] Determine whether fading can occur using dithering rather than transparency.
* [ ] Consider LOD switching without fades for sufficiently distant objects.
* [ ] Limit crossfade duration so two LODs are not rendered simultaneously for long periods.
* [ ] Verify both LOD versions are removed after transitions finish.
* [ ] Ensure old LOD geometry/material resources are released when no longer referenced.
* [ ] Avoid setting `transparent = true` on large numbers of objects unless necessary.
* [ ] Profile GPU overdraw caused by distance fading separately from heap allocation.

---

# Forest Tree 3D Generation

`tile-forest/src/index.ts:create3DModel()` is one of the largest application-owned allocation paths:

* about **5.7 MB inclusive** through one call path
* another **4.32 MB inclusive** while initial world building occurs

That should be a major optimization target.

* [ ] Audit everything created by `tile-forest.create3DModel()` around line 438.
* [ ] Count meshes produced per forest tile.
* [ ] Count `Object3D`s produced per tree.
* [ ] Count geometries produced per tree.
* [ ] Count materials produced per tree.
* [ ] Determine whether each tree gets unique geometry unnecessarily.
* [ ] Determine whether branches are separate meshes.
* [ ] Determine whether foliage clusters are separate meshes.
* [ ] Determine whether trunks are separate meshes.
* [ ] Reduce the number of `Object3D` containers per tree.
* [ ] Avoid creating a `Group` merely to contain one child.
* [ ] Avoid creating individual meshes for details that can be merged.
* [ ] Merge static components where practical.
* [ ] Convert repeated forest components to `InstancedMesh`.
* [ ] Instance common trunk shapes.
* [ ] Instance common branch geometry where possible.
* [ ] Instance foliage clusters.
* [ ] Instance fruit, flowers, rocks, and minor tree decorations.
* [ ] Share geometries across procedural variants whenever the difference can be expressed with transforms.
* [ ] Share materials across trees of the same visual family.
* [ ] Use vertex color or instance color for variation rather than unique materials.
* [ ] Avoid creating high-detail trees until they are close enough to require them.

---

# Tree Descriptor Generation

This call path is worth examining:

```text
getForestTreeDescriptors()
  ↓
resolveCoordinateValue()
  ↓
tile-forest/src/index.ts:84
```

It accounts for roughly **1.53 MB inclusive**, with about **1.17 MB directly sampled at the callback around line 84**.

* [ ] Inspect the callback/function at `tile-forest/src/index.ts:84`.
* [ ] Identify exactly what it allocates for each coordinate lookup.
* [ ] Look for returned object literals.
* [ ] Look for temporary arrays.
* [ ] Look for repeated string generation.
* [ ] Look for object spreading.
* [ ] Look for closures.
* [ ] Look for generated style objects.
* [ ] Avoid constructing coordinate resolver objects repeatedly.
* [ ] Cache deterministic coordinate-based values where repeated.
* [ ] Compute tree descriptor properties together rather than making many independent procedural coordinate calls.
* [ ] Avoid recalculating the same noise/random value several times for one tree.
* [ ] Pass a reusable generation context through tree-generation operations.
* [ ] Consider creating one deterministic random/noise state per tree rather than repeatedly resolving values by coordinate.
* [ ] Keep tree descriptors compact.
* [ ] Avoid retaining rendering data inside logical tree descriptors.

This is one of the first pieces of **your code**, rather than Three.js, that I would inspect line-by-line.

---

# Excessive `Object3D` Creation

There are multiple large `_Object3D` allocation sites totaling several megabytes.

One particularly large path is:

```text
buildTileNode()
  ↓
tile-forest.create3DModel()
  ↓
Mesh()
  ↓
Object3D()
```

with one sampled site around **4.1 MB**.

* [ ] Measure total `scene.children` and descendant object count.
* [ ] Add a recursive Three.js object count to your debug panel.
* [ ] Record object counts by type: `Mesh`, `Group`, `Points`, `Sprite`, lights, etc.
* [ ] Record object counts by plugin/tile type.
* [ ] Establish an object-count budget per visible tile.
* [ ] Establish an object-count budget per tree.
* [ ] Replace repeated individual meshes with instancing.
* [ ] Flatten unnecessary `Group` hierarchies.
* [ ] Avoid representing tiny details as individual `Object3D`s.
* [ ] Move purely decorative details into geometry or shaders.
* [ ] Don't create objects for features invisible at the current LOD.
* [ ] Don't create wildlife/decorative models until close enough to see them.
* [ ] Remove objects immediately when their owning tile unloads.
* [ ] Verify unloading actually removes references to descendants.

---

# Floor Meshes

`createFloorMesh()` accounts for about **0.96 MB inclusive** in this recording.

* [ ] Determine whether every tile gets an independent floor `Mesh`.
* [ ] Consider combining floor tiles into chunk meshes.
* [ ] Consider using one instanced floor geometry.
* [ ] Avoid one `Object3D` per floor tile if thousands are visible.
* [ ] Share floor geometry.
* [ ] Share floor materials.
* [ ] Use per-vertex or per-instance color for terrain variation.
* [ ] Merge contiguous same-material floor regions.
* [ ] Generate collision independently from visual floor segmentation.
* [ ] Compare chunked terrain meshes against one-mesh-per-tile rendering.

If your world currently resembles:

```text
tile
 ├─ floor Mesh
 ├─ tree Group
 ├─ ...
```

for hundreds or thousands of tiles, there is probably significant room to collapse that scene hierarchy.

---

# `buildTileNode()`

There are two important paths through `buildTileNode()`:

* **~8.25 MB inclusive** during LOD synchronization

* **~6.83 MB inclusive** during pending-world building

* [ ] Audit `buildTileNode()` around `render3d/src/index.ts:155`.

* [ ] Determine whether a tile node is ever built more than once unnecessarily.

* [ ] Cache built nodes by tile + required LOD where appropriate.

* [ ] Avoid rebuilding a node merely to switch its LOD.

* [ ] Avoid rebuilding unchanged tiles.

* [ ] Separate initial tile construction from later visual updates.

* [ ] Make seasonal/weather changes update existing visual state where practical.

* [ ] Make LOD transitions replace only the parts whose detail actually changes.

* [ ] Track why a tile was rebuilt in debug mode.

* [ ] Add counters for `buildTileNode()` calls per second.

* [ ] Warn if tiles rebuild while the camera/player is stationary.

* [ ] Ensure rebuilt tile nodes release old resources.

---

# `syncTileModelDetailLevels()`

This is about **8.25 MB inclusive** in this sample.

* [ ] Audit how frequently `syncTileModelDetailLevels()` runs.
* [ ] Do not evaluate LOD changes for every tile every frame if unnecessary.
* [ ] Reevaluate LOD only after meaningful camera movement.
* [ ] Bucket LOD checks across several frames.
* [ ] Use squared distance for LOD thresholds.
* [ ] Cull obviously distant chunks before per-tile LOD checks.
* [ ] Add hysteresis between LOD boundaries.
* [ ] Prevent trees from repeatedly switching between two LODs near a boundary.
* [ ] Cache each object's current LOD.
* [ ] Skip work if desired LOD equals current LOD.
* [ ] Avoid rebuilding material/fade configuration during every LOD check.
* [ ] Consider performing LOD at the forest-chunk level for sufficiently distant scenery.

---

# `flushPendingWorldBuild()`

This represents about **6.86 MB inclusive**.

* [ ] Review how much world-building work is processed during one flush.
* [ ] Put a strict frame-time budget on pending world builds.
* [ ] Limit how many tiles may be constructed per frame.
* [ ] Prioritize visible tiles.
* [ ] Prioritize tiles in the player's movement direction.
* [ ] Delay decorative details until essential terrain is visible.
* [ ] Cancel queued builds for tiles that leave the active area.
* [ ] Deduplicate pending build requests.
* [ ] Avoid rebuilding tiles already waiting in the queue.
* [ ] Track queue length.
* [ ] Track average tile build time.
* [ ] Track maximum tile build time.
* [ ] Spread expensive forest generation over several frames if necessary.

---

# WebGL Program / Binding Setup

The profile also shows significant work inside Three.js:

* `createBindingState()` ~**2.7 MB**
* `parseUniform()` ~**1.69 MB**
* `saveCache()` ~**1.25 MB**
* `setValueV3f()` ~**1.25 MB**
* `setup()` ~**0.92 MB**
* `getProgram()` ~**0.84 MB**

These reinforce the material/program concern.

* [ ] Count unique combinations of materials and shader defines.
* [ ] Minimize different shader configurations.
* [ ] Avoid creating different material feature sets for tiny visual differences.
* [ ] Standardize forest materials where possible.
* [ ] Standardize tree shadow settings.
* [ ] Avoid toggling shader-defining material properties dynamically.
* [ ] Prefer uniforms over shader defines for differences that do not require recompilation.
* [ ] Avoid unique clipping/fog/transparency configurations per tree.
* [ ] Warm up common shaders during loading if first-use pauses are noticeable.
* [ ] Verify shader/program count stabilizes after entering an area.

---

# Fireflies

`getForestFireflies()` showed roughly **0.94 MB inclusive** on one path.

* [ ] Review `getForestFireflies()` around `tile-forest/src/index.ts:1012`.
* [ ] Avoid creating individual `Object3D`s for each firefly.
* [ ] Use one `Points` object for many fireflies.
* [ ] Consider a GPU particle implementation.
* [ ] Generate firefly positions in compact typed arrays.
* [ ] Animate them in a shader where practical.
* [ ] Cap the number of visible fireflies.
* [ ] Scale density based on camera distance.
* [ ] Disable fireflies outside appropriate times/seasons.
* [ ] Avoid recalculating deterministic firefly populations every frame.
* [ ] Share firefly materials.
* [ ] Avoid one light source per firefly.
* [ ] Use emissive sprites/points rather than actual dynamic lights.

---

# Wind Responders

`markPoiWindResponder()` appears several times and contributes a smaller but noticeable amount.

* [ ] Review how wind-responsive objects are tagged.
* [ ] Avoid allocating metadata objects for every foliage element.
* [ ] Avoid storing callbacks independently on thousands of objects.
* [ ] Use shared identifiers or compact flags.
* [ ] Group wind-responsive vegetation.
* [ ] Favor shader-based wind over JavaScript object-by-object animation.
* [ ] Avoid traversing the scene every frame looking for wind responders.
* [ ] Maintain a bounded registry of relevant nearby wind objects if CPU-side updates are necessary.
* [ ] Remove wind responders when their chunks unload.

---

# Forest Material Strategy

I would create a deliberate material-sharing design.

* [ ] Define shared bark materials by tree family.
* [ ] Define shared foliage materials by tree family/season.
* [ ] Define shared dead-tree materials.
* [ ] Define shared burnt-tree materials.
* [ ] Define shared blossom materials.
* [ ] Define shared fruit materials.
* [ ] Express tree-to-tree color variation through vertex/instance attributes.
* [ ] Express tree health variation through attributes/uniform parameters.
* [ ] Express seasonal variation without cloning an entire material for each tree.
* [ ] Keep the number of actual Three.js material objects dramatically smaller than the number of trees.
* [ ] Cache material variants by meaningful key.

For example, prefer:

```text
oak-bark
oak-summer-leaf
oak-autumn-leaf
oak-dead-leaf
```

shared among hundreds of trees rather than:

```text
oak #1 bark material
oak #2 bark material
oak #3 bark material
...
```

---

# Forest Geometry Strategy

* [ ] Determine how many genuinely different tree geometries need to exist at once.
* [ ] Generate a modest pool of structural tree variants per species/age class.
* [ ] Reuse those variants with scale, rotation, lean, color, foliage density, and other parameters.
* [ ] Reserve completely unique geometry for especially important nearby trees.
* [ ] Generate hero trees procedurally at high detail only near the player.
* [ ] Use standardized low-LOD silhouettes for distant trees.
* [ ] Consider converting procedural trees into reusable geometry templates after generation.
* [ ] Cache generated tree geometry by structural descriptor.
* [ ] Bound the tree-geometry cache.

This doesn't mean giving up procedural trees. You can have:

```text
logical tree:
seed = 938242
age = 74
species = oak
health = .89
lean = .12
canopy = .78
```

while still rendering it using a reusable structural geometry plus procedural transforms and details.

---

# LOD Review for Trees

Given the profile, I would make tree LOD much more aggressive.

* [ ] Do not generate tiny branches for medium-distance trees.
* [ ] Do not generate branch hollows at medium distance.
* [ ] Do not generate nests at medium distance.
* [ ] Do not generate fruit models at long distance.
* [ ] Do not generate individual flowers at long distance.
* [ ] Do not generate insects or wildlife at long distance.
* [ ] Use fewer foliage clusters at medium distance.
* [ ] Use very few foliage clusters at long distance.
* [ ] Use instanced tree silhouettes at farther distance.
* [ ] Consider billboard/impostor trees at extreme distance.
* [ ] Stop branch animation beyond a defined range.
* [ ] Stop individual foliage animation beyond a defined range.
* [ ] Stop tree shadow casting beyond a defined range.
* [ ] Preserve silhouette first; sacrifice internal detail first.

---

# Rendering Loop Review

Nearly the entire **60.9 MB** sample is beneath:

```text
main.ts:2372 loop()
  ↓
main.ts:1863 render()
  ↓
render3d.render()
```

That's expected structurally because the profile was recorded while rendering, but it gives you a useful test to run next.

* [ ] Profile while standing completely still.
* [ ] Profile while looking at the same scene without moving.
* [ ] Check whether allocation continues after all tiles and shaders have warmed up.
* [ ] Record for 30–60 seconds after the scene becomes stable.
* [ ] Compare allocation rate during the first few seconds versus steady state.
* [ ] Verify `buildTileNode()` reaches essentially zero calls when nothing changes.
* [ ] Verify `syncTileModelDetailLevels()` does not generate new objects while stationary.
* [ ] Verify material count stops growing.
* [ ] Verify geometry count stops growing.
* [ ] Verify shader program count stops growing.
* [ ] Verify heap usage plateaus after GC.

That will distinguish **expensive startup/build allocation** from **ongoing allocation churn**.

---

# Add Three.js Resource Diagnostics

I would add a little developer overlay now.

* [x] Display `renderer.info.render.calls`.
* [x] Display `renderer.info.render.triangles`.
* [x] Display `renderer.info.render.points`.
* [x] Display `renderer.info.render.lines`.
* [x] Display `renderer.info.memory.geometries`.
* [x] Display `renderer.info.memory.textures`.
* [x] Display `renderer.info.programs?.length`.
* [x] Count active `Object3D`s recursively.
* [x] Count `Mesh` objects.
* [x] Count `Group` objects.
* [x] Count unique material identities.
* [x] Count unique geometry identities.
* [x] Count visible tiles.
* [x] Count visible trees.
* [x] Calculate meshes per visible tree.
* [x] Calculate materials per visible tree.
* [x] Calculate objects per visible tile.
* [x] Track tile builds per second.
* [x] Track LOD replacements per second.

---

# Resource Disposal Tests

Because you dynamically rebuild tiles and LODs:

* [ ] Travel into a forest and record geometry/material counts.
* [ ] Leave the forest completely.
* [ ] Verify forest geometries are released if not cached.
* [ ] Verify forest-specific material clones disappear.
* [ ] Return to the same forest.
* [ ] Repeat several times.
* [ ] Verify resource counts do not rise with every visit.
* [ ] Verify old LOD models don't stay referenced after replacement.
* [ ] Verify event listeners don't retain discarded models.
* [ ] Verify wind responder registries don't retain discarded models.
* [ ] Verify POI metadata doesn't retain discarded scene nodes.
* [ ] Verify tree animation registries don't retain discarded trees.

---

# Separate Allocation Performance from Leak Testing

* [ ] Treat this `.heapprofile` as an **allocation profile**, not proof of retained memory.
* [ ] Take a normal heap snapshot after entering the forest.
* [ ] Force GC if DevTools allows it.
* [ ] Record retained heap size.
* [ ] Travel away.
* [ ] Force GC again.
* [ ] Take another snapshot.
* [ ] Compare retained `Mesh`, `Material`, `Object3D`, geometry, and tree-related objects.
* [ ] Repeat the enter/leave cycle several times.
* [ ] Look specifically for detached or unreachable game structures retained through registries/caches.

---

## My first five tasks

If you want the shortest practical starting list, I would put these at the very top of `todo.md`:

* [ ] **Rewrite/review `prepareObjectForDistanceFade()` so it does not clone a material for every rendered object.**
* [ ] **Reduce the number of meshes/Object3Ds produced by `tile-forest.create3DModel()`, especially through instancing and shared geometry.**
* [ ] **Inspect `tile-forest/src/index.ts:84`; it directly accounts for about 1.17 MB of sampled allocation and sits inside tree descriptor generation.**
* [ ] **Make `syncTileModelDetailLevels()` perform zero reconstruction/allocation when a stationary scene's LOD has not changed.**
* [ ] **Add live counters for materials, programs, geometries, Object3Ds, draw calls, trees, and tile rebuilds so you can immediately see whether a change actually improved things.**

The most striking number in this profile is really **`cloneUniforms()` at roughly 34 MB out of a 60.9 MB sample**. I would pursue the material cloning/program proliferation issue before micro-optimizing the smaller TypeScript allocation sites. Fixing that may remove a very large fraction of the current churn at once.
