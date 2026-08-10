A few things stand out pretty clearly in this profile.

First, I would **not call this a memory leak yet**. This `.heapprofile` is an allocation-sampling profile: it shows _where memory was allocated_. It does not tell us whether those allocations are still retained after garbage collection. For leak hunting, I’d follow this with two or three **Heap Snapshots** taken after forcing GC and repeating the same activity.

From this profile, though, I’d prioritize these areas:

1. **`sampleCubicBezierPoints()` is your biggest repeated allocation hotspot.**
   `packages/overworld-support/src/index.ts:367` accounts for roughly **625 KiB** of sampled self-allocation, and it appears repeatedly through river/anchor calculations.

   The important call path is roughly:

   `resolveOverworldCellAnchor()`
   → `sampleTerrainSignals()`
   → `sampleRiverControlPathSignal()`
   → `createRiverCurvePoints()`
   → `sampleCubicBezierPoints()`

   I would inspect whether `sampleCubicBezierPoints()` creates a new array and new `{x,y}`/vector objects every time. Something like:

   ```ts
   return Array.from({ length: samples }, (_, index) => ({
     x: ...,
     y: ...,
   }));
   ```

   is convenient but expensive when called thousands of times.

   If those samples are temporary, consider:

   - reusing a scratch array,
   - using numeric tuples or typed arrays,
   - calculating points on demand instead of materializing all of them,
   - caching the result when the control points are identical.

2. **Your celestial preview appears to regenerate a surprising amount of world data.**
   This path was especially interesting:

   ```text
   celestial-preview.ts:503
     sampleOverworld()
       getTile()
         classifyTile()
           composeOverworldTileFromPlugins()
   ```

   `buildPlanetTextureGrid()` has about **3.16 MiB inclusive allocation**, and `celestial-preview.render()` is responsible for roughly **3.77 MiB inclusive**.

   That doesn't necessarily mean `buildPlanetTextureGrid()` itself allocates 3 MB. It means everything it calls underneath it does.

   And that includes the expensive overworld generation.

   So my strongest recommendation is:

   **Do not run the complete gameplay world-generation pipeline merely to generate a visual preview if you can avoid it.**

   You might introduce a cheaper preview sampler, for example:

   ```ts
   samplePreviewTerrain(x, y);
   ```

   rather than:

   ```ts
   world.getTile({ x, y });
   ```

   If the planet texture only needs `"forest"`, `"mountain"`, `"water"`, etc., there is probably no reason to calculate:

   - POI anchors,
   - roads,
   - railways,
   - river collision priorities,
   - flavor decorators,
   - quests,
   - detailed relief metadata.

3. **`runtime-frontier-flavor.decorateOverworldTile()` is unusually allocation-heavy.**
   This one accounts for about **592 KiB self-allocation**:

   ```text
   packages/runtime-frontier-flavor/src/index.ts:38
   ```

   One individual sampled allocation site represented about **496 KiB**.

   I would look closely for object spreading:

   ```ts
   return {
     ...tile,
     something: value,
   };
   ```

   or arrays/maps being reconstructed during every decoration pass.

   If tiles go through several plugins and every plugin does:

   ```ts
   tile = { ...tile, property: value };
   ```

   you're effectively cloning the tile repeatedly.

   For world generation, that can become significant very quickly.

   If your architecture permits it, a mutable construction object can be dramatically cheaper:

   ```ts
   tile.frontier = frontier;
   ```

   followed by freezing/finalizing the finished tile if immutability is valuable elsewhere.

4. **The relief decorator deserves the same inspection.**

   ```text
   runtime-overworld-relief/src/index.ts:17
   ~208 KiB self
   ```

   Given that both this and `runtime-frontier-flavor` sit underneath:

   ```text
   composeOverworldTileFromPlugins()
   ```

   I suspect the plugin composition mechanism may be creating lots of intermediate tile objects.

   I'd inspect the entire contract around:

   ```ts
   decorateOverworldTile(tile);
   ```

   If you currently have:

   ```ts
   let result = tile;

   for (const plugin of plugins) {
     result = plugin.decorateOverworldTile(result);
   }
   ```

   with each plugin returning a copy, that's a good optimization target.

5. **`resolveOverworldCellAnchor()` is more important than its self number suggests.**
   Its own sampled allocation is only about **112 KiB**, but its **inclusive allocation is roughly 1.57 MiB**.

   That's a classic "orchestrator" hotspot: it isn't necessarily allocating everything itself, but invoking it causes a lot of allocations downstream.

   In particular, I'd investigate caching at this level.

   If you're repeatedly asking:

   ```ts
   resolveOverworldCellAnchor(world, x, y);
   ```

   for the same coordinate during one generation/render cycle, memoizing this may save a lot more than optimizing individual object allocations.

   Something as simple as a generation-scoped cache can work:

   ```ts
   const anchorCache = new Map<string, Anchor>();

   const key = `${x},${y}`;
   ```

   although for performance I'd probably avoid the temporary string and use nested numeric maps or packed integer keys.

6. **River calculations look like particularly good caching candidates.**

   Several functions appear together:

   ```text
   sampleRiverControlPathSignal()
   createRiverCurvePoints()
   createRiverControlPoints()
   createRiverForkPath()
   sampleCubicBezierPoints()
   ```

   If a river's geometry is deterministic from seed + region/cell, calculate the curve once and reuse it.

   Right now the profile suggests the same conceptual river geometry may be getting recomputed while inspecting neighboring cells and resolving competing anchors.

7. **Your Three.js allocations don't worry me nearly as much yet.**

   There are allocations around:

   ```text
   Object3D
   Matrix4
   Matrix3
   cloneUniforms
   Sprite
   Material
   ```

   and `createStarField()` has about **595 KiB inclusive allocation**.

   That can be perfectly normal during scene creation.

   What matters is whether `createStarField()` runs once or repeatedly.

   If this:

   ```ts
   createStarField();
   ```

   runs during initialization, I'd mostly ignore it.

   If you're rebuilding stars during render/update cycles, I'd fix that immediately. Keep the same `Points`, geometry, materials, and buffers and update their attributes instead.

8. **Watch `syncBackgroundStars()` for the same reason.**
   I saw it creating `Mesh`/`Object3D` instances through the solar-system preview.

   If the function is conceptually:

   ```ts
   syncBackgroundStars();
   ```

   but actually does:

   ```ts
   new Mesh(...)
   ```

   every synchronization pass, change it to object reuse.

   In real-time rendering, ideally the normal frame loop allocates almost nothing.

---

### Where I would spend time first

Based purely on this profile, my order would be:

**#1 — `celestial-preview.ts` planet texture generation**

You have about **3.16 MiB of allocation beneath `buildPlanetTextureGrid()`**. Determine whether it really needs the complete overworld tile-generation system.

**#2 — `sampleCubicBezierPoints()`**

About **625 KiB direct sampled allocations**, plus it's deep inside frequently executed terrain/river operations. This looks highly optimizable.

**#3 — plugin tile decoration**

Especially:

```text
runtime-frontier-flavor
runtime-overworld-relief
```

Look for spreading/cloning/intermediate arrays.

**#4 — caching `resolveOverworldCellAnchor()` and river paths**

The inclusive numbers suggest repeated recomputation could be more important than individual allocation sizes.

**#5 — verify that Three.js scene objects are created once**

Star fields, materials, meshes, geometries, textures, etc. should generally live longer than one frame.

---

One particularly useful architectural goal for this project would be:

```text
requestAnimationFrame()
    ↓
update
    ↓
render
```

should approach **zero JavaScript heap allocation per frame** during steady-state gameplay.

World generation can allocate while entering a new area, but ordinary movement/rendering shouldn't continually create objects, arrays, vectors, closures, strings, or Three.js objects.

Your `main.ts:2173 loop()` currently has about **6.08 MiB inclusive allocation represented beneath it**, so I'd specifically record another allocation profile after letting the player simply stand still for 30–60 seconds. **If allocations keep accumulating while nothing changes, that will reveal the much more important frame-loop issues.**
