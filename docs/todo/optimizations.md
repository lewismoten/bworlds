
- [X] If the FPS is too low, lower the distance at which things are being rendered.
- [X] For low FPS, consider rendering less models sitting on the land that are far away, and let them fade into view as you approach
- [X] Setup models to have a lower-detailed model if it is far away

# Developer Notes
Make performance a **first-class game system**, especially because you support text, 2D, and 3D modes. The goal should be that increasing world complexity does not cause CPU, GPU, memory, or network usage to grow proportionally with the size of the entire world.

A useful principle is:

```text
Huge world
    ≠
Huge active simulation

Only nearby/relevant things should be:
    simulated
    rendered
    animated
    producing audio
    checking collisions
    running AI
    occupying expensive memory
```

Here’s a development checklist you can work through.

# Overall Performance Architecture

* [ ] Establish performance budgets for CPU, GPU, memory, rendering, networking, and audio.
* [X] Establish a target frame rate such as 60 FPS.
* [X] Allow lower-performance devices to target 30 FPS.
* [X] Measure frame time rather than relying only on FPS.
* [ ] Keep normal 60 FPS frames below roughly 16.7 ms.
* [ ] Avoid doing large amounts of work during a single frame.
* [ ] Spread expensive work across multiple frames.
* [ ] Prioritize work according to how immediately the player needs the result.
* [ ] Separate rendering frequency from simulation frequency where practical.
* [ ] Avoid updating systems simply because a render frame occurred.
* [ ] Pause unnecessary simulation when the game is paused.
* [X] Suspend expensive systems while the browser tab is hidden.
* [ ] Detect major performance degradation and reduce optional effects dynamically.
* [X] Maintain performance telemetry during development.
* [ ] Regularly test performance on slower hardware rather than only the development machine.

# World Chunking

* [ ] Divide the overworld into chunks.
* [ ] Divide caves into chunks or regions.
* [ ] Divide interiors into logical rooms or sectors.
* [ ] Load only chunks near the player.
* [ ] Keep a small ring of nearby chunks preloaded.
* [ ] Unload distant chunks.
* [ ] Avoid keeping full 3D representations of the entire world in memory.
* [ ] Keep lightweight world-state records for unloaded chunks.
* [ ] Regenerate deterministic visual information from seeds instead of permanently storing it.
* [ ] Prioritize chunk generation in the direction the player is moving.
* [ ] Generate nearby chunks before distant ones.
* [ ] Prevent rapid player movement from creating an ever-growing generation queue.
* [ ] Cancel generation work for chunks that are no longer needed.
* [ ] Reuse chunk objects when practical.
* [ ] Cache recently visited chunks within a bounded cache.
* [ ] Evict least-recently-used chunks when memory thresholds are exceeded.

# Simulation Distance

* [ ] Define an active simulation radius around each player.
* [ ] Fully simulate only nearby NPCs and creatures.
* [ ] Use simplified simulation for moderately distant entities.
* [ ] Use statistical or event-based simulation for remote entities.
* [ ] Stop running movement AI for creatures hundreds of tiles away.
* [ ] Stop collision checks for inactive remote entities.
* [ ] Stop animation updates for invisible entities.
* [ ] Stop detailed environmental simulations outside active regions.
* [ ] Preserve important remote outcomes without simulating every intermediate second.
* [ ] Resume detailed simulation when the player approaches.
* [ ] Avoid sudden simulation jumps that visibly break immersion.

# Levels of Simulation

* [ ] Create multiple entity simulation levels.
* [ ] Use full simulation for visible nearby entities.
* [ ] Use reduced-frequency simulation for nearby but invisible entities.
* [ ] Use simplified state transitions for distant entities.
* [ ] Use scheduled events for very distant world activity.
* [ ] Store only important state for dormant entities.
* [ ] Avoid maintaining Three.js objects for dormant entities.
* [ ] Avoid maintaining physics bodies for dormant entities.
* [ ] Avoid maintaining active audio nodes for dormant entities.

For example:

```text
0–50m
Full simulation

50–200m
Reduced simulation

200–1000m
Very coarse simulation

1000m+
State/events only
```

# Frame Loop

* [ ] Keep the main animation loop small.
* [ ] Avoid allocating objects inside `requestAnimationFrame()` where possible.
* [ ] Avoid creating arrays during every frame.
* [ ] Avoid creating temporary `{ x, y, z }` objects every frame.
* [ ] Avoid repeatedly constructing `Vector2`, `Vector3`, `Matrix4`, or quaternion objects.
* [ ] Reuse temporary math objects.
* [ ] Avoid creating closures inside frequently executed loops.
* [ ] Avoid string construction inside hot loops.
* [ ] Avoid object spreading in per-frame operations.
* [ ] Avoid repeatedly cloning game state.
* [ ] Separate high-frequency and low-frequency updates.
* [ ] Run expensive nonvisual updates less frequently than rendering.
* [ ] Process large queues incrementally.
* [ ] Establish maximum work allowed from background systems during one frame.

# Update Frequencies

Not everything needs 60 updates per second.

* [ ] Update camera and essential movement every frame.
* [ ] Update nearby combat AI at an appropriate high frequency.
* [ ] Update ordinary NPC AI less frequently.
* [ ] Update distant creatures even less frequently.
* [ ] Update weather simulation periodically rather than every frame.
* [ ] Update economy simulation on long intervals.
* [ ] Update vegetation growth on very long intervals.
* [ ] Update day/night calculations incrementally.
* [ ] Update expensive pathfinding only when paths actually change.
* [ ] Update UI only when displayed values change.
* [ ] Update minimaps only when necessary.
* [ ] Avoid recalculating unchanged procedural systems.

You might eventually have:

```ts
render();             // 60 Hz
updateMovement();     // 60 Hz
updateCombat();       // 20 Hz
updateNearbyAI();     // 10 Hz
updateDistantAI();    // 1 Hz
updateWeather();      // 1 Hz
updateEconomy();      // 0.1 Hz
```

# Object Allocation and Garbage Collection

This is especially relevant given the heap profile you were examining earlier.

* [ ] Minimize allocations inside hot code paths.
* [ ] Reuse frequently created temporary objects.
* [ ] Pool short-lived objects when profiling demonstrates a benefit.
* [ ] Reuse arrays by clearing them rather than repeatedly replacing them.
* [ ] Reuse vector objects.
* [ ] Reuse matrices.
* [ ] Reuse raycasting result buffers where possible.
* [ ] Avoid unnecessary object spreads.
* [ ] Avoid unnecessary `map()`, `filter()`, and `reduce()` chains inside hot loops.
* [ ] Prefer a single iteration when several array operations can be combined.
* [ ] Avoid large temporary arrays.
* [ ] Avoid repeatedly converting between object representations.
* [ ] Cache deterministic calculations.
* [ ] Bound every cache.
* [ ] Monitor garbage-collection pauses.
* [ ] Profile allocation rates while the player stands still.
* [ ] Investigate any steady memory growth during idle gameplay.

# Memory Management

* [ ] Establish a reasonable maximum memory target.
* [ ] Measure memory after 5 minutes of gameplay.
* [ ] Measure memory after 30 minutes.
* [ ] Measure memory after several hours when practical.
* [ ] Travel repeatedly between regions and verify memory returns near its previous level.
* [ ] Enter and exit caves repeatedly while monitoring memory.
* [ ] Enter and exit 3D mode repeatedly while monitoring memory.
* [ ] Dispose unused textures.
* [ ] Dispose unused geometries.
* [ ] Dispose unused materials.
* [ ] Dispose render targets.
* [ ] Remove unused event listeners.
* [ ] Disconnect unused Web Audio nodes.
* [ ] Terminate unused Web Workers.
* [ ] Clear references to unloaded chunks.
* [ ] Ensure caches have maximum sizes.
* [ ] Avoid retaining entire historical game-state graphs unnecessarily.

# 3D Scene Management

* [ ] Keep the number of Three.js scene objects bounded.
* [ ] Remove objects from the scene when their chunk unloads.
* [ ] Avoid creating one `Mesh` for every tiny decorative object.
* [ ] Group static geometry where beneficial.
* [ ] Use instancing heavily for repeated models.
* [ ] Share geometries between identical objects.
* [ ] Share materials between identical objects.
* [ ] Avoid cloning materials unnecessarily.
* [ ] Avoid cloning geometry unnecessarily.
* [ ] Keep scene hierarchy reasonably shallow.
* [ ] Avoid thousands of unnecessary `Object3D` containers.
* [ ] Disable matrix updates for completely static objects where appropriate.
* [ ] Update transforms only when objects actually move.
* [ ] Avoid rebuilding the scene every frame.

# Instanced Rendering

This could give you major improvements for your procedural environments.

* [ ] Use `InstancedMesh` for trees.
* [ ] Use instancing for grass.
* [ ] Use instancing for rocks.
* [ ] Use instancing for cave stalagmites.
* [ ] Use instancing for cave stalactites.
* [ ] Use instancing for mine supports.
* [ ] Use instancing for rail segments.
* [ ] Use instancing for repeated buildings or structural pieces.
* [ ] Use instancing for repeated furniture.
* [ ] Use instancing for repeated debris.
* [ ] Use instancing for stars.
* [ ] Use instancing for repeated particles where appropriate.
* [ ] Store per-instance transforms instead of creating individual scene objects.
* [ ] Use per-instance colors where appropriate instead of separate materials.

For example, avoid:

```text
5,000 trees
=
5,000 Mesh objects
```

when you can potentially have:

```text
Tree type A
    InstancedMesh × 2,000

Tree type B
    InstancedMesh × 1,800

Tree type C
    InstancedMesh × 1,200
```

# Draw Calls

* [ ] Monitor draw-call counts.
* [ ] Establish a practical draw-call budget.
* [ ] Reduce material changes.
* [ ] Share materials.
* [ ] Batch compatible static geometry.
* [ ] Use instancing for repeated meshes.
* [ ] Avoid assigning unique materials to tiny variations.
* [ ] Prefer vertex colors where they can replace separate materials.
* [ ] Use texture atlases when appropriate.
* [ ] Combine compatible UI textures.
* [ ] Avoid rendering invisible objects.
* [ ] Avoid rendering objects completely behind opaque geometry.

# Frustum Culling

* [ ] Ensure objects outside the camera frustum are not rendered.
* [ ] Verify procedural meshes have correct bounding volumes.
* [ ] Create chunk-level bounding volumes.
* [ ] Cull entire chunks before examining individual objects.
* [ ] Avoid testing thousands of tiny objects individually when their parent region is invisible.
* [ ] Handle unusually large objects carefully so incorrect bounds do not prevent culling.

# Occlusion Culling

Particularly useful for your caves and buildings.

* [ ] Avoid rendering cave chambers hidden behind solid rock.
* [ ] Avoid rendering rooms behind walls when they cannot be seen.
* [ ] Divide interior maps into visibility sectors.
* [ ] Use doorways and tunnel openings as visibility portals.
* [ ] Cull entire cave branches when their connecting tunnel is not visible.
* [ ] Avoid drawing underground geometry while the player is outdoors.
* [ ] Avoid drawing exterior terrain while deep inside sealed interiors unless actually visible.
* [ ] Use conservative visibility rules so geometry does not visibly pop in and out incorrectly.

A cave is ideal for this:

```text
Player chamber
   ↓ visible doorway
Next chamber
   ↓ hidden bend
Everything beyond bend
NOT RENDERED
```

# Level of Detail — LOD

* [ ] Create multiple detail levels for major models.
* [ ] Use detailed character models nearby.
* [ ] Use lower-poly models at medium distance.
* [ ] Use very simple representations at long distance.
* [ ] Simplify trees with distance.
* [ ] Simplify buildings with distance.
* [ ] Simplify rock formations with distance.
* [ ] Simplify cave formations with distance.
* [ ] Reduce animation complexity with distance.
* [ ] Reduce shadow complexity with distance.
* [ ] Reduce material complexity with distance.
* [ ] Reduce particle effects with distance.
* [ ] Consider billboards or impostors for extremely distant vegetation.
* [ ] Crossfade LOD transitions where obvious popping becomes distracting.
* [ ] Use hysteresis around LOD boundaries to prevent rapid switching.

# Terrain Optimization

* [ ] Divide terrain meshes into chunks.
* [ ] Use lower terrain resolution farther from the player.
* [ ] Avoid generating vertices that cannot influence visible terrain.
* [ ] Generate distant terrain asynchronously.
* [ ] Cache terrain heights.
* [ ] Avoid repeatedly evaluating procedural noise for the same coordinate.
* [ ] Cache expensive biome calculations.
* [ ] Generate collision terrain at lower resolution than visual terrain when possible.
* [ ] Avoid individual objects for tiny terrain details.
* [ ] Merge or instance repeated terrain decorations.
* [ ] Reduce grass density with distance.
* [ ] Reduce small rocks with distance.
* [ ] Reduce ground clutter with distance.

# Procedural Generation Performance

* [ ] Make procedural generation deterministic.
* [ ] Cache expensive deterministic results.
* [ ] Separate logical generation from visual generation.
* [ ] Generate topology before decoration.
* [ ] Generate only data required for the current renderer.
* [ ] Avoid generating 3D assets while playing in text mode.
* [ ] Avoid generating 3D assets while playing in 2D mode.
* [ ] Avoid generating invisible cave decorations.
* [ ] Avoid fully generating distant cities.
* [ ] Generate lightweight metadata for distant regions.
* [ ] Perform heavy generation asynchronously.
* [ ] Break large generation operations into jobs.
* [ ] Prioritize player-visible generation jobs.
* [ ] Cancel obsolete jobs.
* [ ] Profile generation functions separately from rendering.

# Web Workers

For a JavaScript MMORPG, these could be particularly useful.

* [ ] Move expensive deterministic world generation into Web Workers.
* [ ] Consider workers for terrain generation.
* [ ] Consider workers for cave generation.
* [ ] Consider workers for procedural music preparation.
* [ ] Consider workers for navigation calculations.
* [ ] Consider workers for large pathfinding jobs.
* [ ] Consider workers for procedural mesh-data preparation.
* [ ] Keep WebGL rendering on the appropriate rendering thread unless deliberately using supported worker rendering architecture.
* [ ] Avoid sending huge object graphs between workers.
* [ ] Use transferable buffers for large numeric data.
* [ ] Avoid excessive worker messaging.
* [ ] Maintain a bounded worker/job queue.
* [ ] Reuse workers instead of constantly creating and destroying them.

# Typed Arrays

* [ ] Use typed arrays for large homogeneous numeric datasets.
* [ ] Use typed arrays for terrain height values.
* [ ] Use typed arrays for mesh attributes.
* [ ] Use typed arrays for tile identifiers where appropriate.
* [ ] Use typed arrays for large procedural-noise buffers.
* [ ] Use compact integer types when the full numeric range is unnecessary.
* [ ] Avoid storing millions of tiny numeric objects.
* [ ] Avoid converting repeatedly between typed arrays and normal JavaScript arrays.

Instead of millions of:

```ts
{
  x: 123,
  y: 456,
  height: 17
}
```

some systems may benefit from:

```ts
Float32Array
Uint16Array
Uint8Array
```

# Texture Optimization

* [ ] Keep texture resolutions appropriate to actual screen size.
* [ ] Avoid enormous textures for tiny objects.
* [ ] Use compressed GPU texture formats where practical.
* [ ] Generate mipmaps where appropriate.
* [ ] Avoid loading every possible texture at startup.
* [ ] Load texture groups by region or theme.
* [ ] Unload textures no longer needed.
* [ ] Reuse textures across models.
* [ ] Use texture atlases for many small related textures.
* [ ] Avoid unnecessarily unique textures for procedural variants.
* [ ] Use shader parameters and vertex colors for inexpensive variation.
* [ ] Monitor GPU texture memory separately from JavaScript heap memory.

# Materials and Shaders

* [ ] Minimize the number of unique materials.
* [ ] Reuse material instances.
* [ ] Avoid creating materials inside render loops.
* [ ] Avoid unnecessary transparency.
* [ ] Avoid expensive shader effects on small or distant objects.
* [ ] Create simplified materials for distant LODs.
* [ ] Avoid recompiling shaders unnecessarily.
* [ ] Avoid constantly changing shader defines.
* [ ] Limit expensive per-pixel effects.
* [ ] Profile shaders on integrated GPUs.

# Lighting

Lighting can become one of the largest 3D performance costs.

* [ ] Limit the number of dynamic lights.
* [ ] Limit the number of shadow-casting lights even more aggressively.
* [ ] Make most decorative lights non-shadow-casting.
* [ ] Prioritize the player's nearest/most important lights.
* [ ] Disable distant lights.
* [ ] Represent distant lights with emissive materials where possible.
* [ ] Use baked-looking or ambient illumination for static environments where practical.
* [ ] Avoid hundreds of real point lights in towns.
* [ ] Use emissive windows, signs, torches, etc. when actual lighting is unnecessary.
* [ ] Update moving lights only when they actually move.
* [ ] Dynamically reduce lights on lower graphics settings.

# Shadows

Your cave ideas make shadows visually important, so this needs particularly careful budgeting.

* [ ] Limit the number of lights casting real-time shadows.
* [ ] Give the player's primary cave light high-quality shadows.
* [ ] Disable shadows for distant lights.
* [ ] Disable shadow casting on tiny decorative objects.
* [ ] Disable shadow receiving where visually unnecessary.
* [ ] Reduce shadow-map resolution based on quality settings.
* [ ] Reduce shadow distance.
* [ ] Update static shadows less frequently where possible.
* [ ] Prefer a few meaningful sharp shadows over dozens of expensive low-quality shadow sources.
* [ ] Profile cave scenes with many stalactites and stalagmites.
* [ ] Use simplified shadow geometry where appropriate.

# Particles

* [ ] Use particle pools.
* [ ] Avoid creating and destroying particle objects constantly.
* [ ] Use GPU-friendly point/instanced particle systems.
* [ ] Limit particle counts.
* [ ] Reduce particles with distance.
* [ ] Disable invisible particle emitters.
* [ ] Reduce particles under poor performance.
* [ ] Limit particles produced by frequently repeated combat attacks.
* [ ] Avoid expensive transparent particles filling large portions of the screen.
* [ ] Combine similar environmental particle systems.

# Transparency and Overdraw

* [ ] Minimize large transparent surfaces.
* [ ] Avoid layering many transparent effects over one another.
* [ ] Reduce overlapping foliage transparency.
* [ ] Use alpha testing instead of full blending when visually acceptable.
* [ ] Keep particle sizes reasonable.
* [ ] Avoid rendering transparent objects that cannot contribute visibly.
* [ ] Profile forests, fog, water, particles, and spell effects for overdraw.

# Water Rendering

* [ ] Use simpler water shaders for small pools.
* [ ] Reserve expensive reflections for important water surfaces.
* [ ] Avoid real-time planar reflections everywhere.
* [ ] Reduce reflection update frequency when practical.
* [ ] Disable expensive underwater effects when the player is not underwater.
* [ ] Use simpler cave-water materials than major outdoor oceans when appropriate.
* [ ] Use LOD for large bodies of water.

# Physics and Collision

* [ ] Keep collision geometry simpler than visible geometry.
* [ ] Use primitive collision shapes where possible.
* [ ] Avoid triangle-level collision against every decorative rock.
* [ ] Use spatial partitioning for collision queries.
* [ ] Check collisions only against nearby objects.
* [ ] Remove distant physics bodies.
* [ ] Put static objects into efficient static collision structures.
* [ ] Avoid giving decorative objects physics when interaction is unnecessary.
* [ ] Put sleeping physics objects to sleep.
* [ ] Limit the number of active debris bodies.
* [ ] Destroy or deactivate debris after a reasonable time.
* [ ] Avoid physics calculations for objects outside active simulation areas.

# Spatial Indexing

This is an important underlying system.

* [ ] Maintain a spatial index for world entities.
* [ ] Use chunks, grids, quadtrees, octrees, or similar structures as appropriate.
* [ ] Query nearby entities rather than iterating over every entity.
* [ ] Use spatial indexing for collision candidates.
* [ ] Use spatial indexing for AI perception.
* [ ] Use spatial indexing for audio sources.
* [ ] Use spatial indexing for interaction searches.
* [ ] Use spatial indexing for nearby network updates.
* [ ] Keep spatial-index updates inexpensive for moving entities.

Instead of:

```ts
for (const enemy of everyEnemyInTheWorld) {
  if (distance(player, enemy) < 20) ...
}
```

you want conceptually:

```ts
const enemies = spatialIndex.near(player.position, 20);
```

# Distance Calculations

* [ ] Avoid unnecessary square roots in repeated distance tests.
* [ ] Compare squared distances when actual distance is unnecessary.
* [ ] Perform inexpensive broad-phase checks before detailed checks.
* [ ] Avoid calculating distance to entities known to be in distant chunks.
* [ ] Cache positions where appropriate during one update pass.

For example:

```ts
dx * dx + dy * dy + dz * dz < radius * radius
```

instead of calculating `Math.sqrt()` every time.

# AI Optimization

* [ ] Do not update every NPC every frame.
* [ ] Reduce AI frequency with distance.
* [ ] Suspend AI for dormant NPCs.
* [ ] Separate perception from decision-making.
* [ ] Perform expensive perception checks less frequently.
* [ ] Use spatial queries instead of scanning all entities.
* [ ] Cache pathfinding results.
* [ ] Recalculate paths only when needed.
* [ ] Allow nearby NPCs to reuse portions of paths where appropriate.
* [ ] Avoid raycasting for every NPC every frame.
* [ ] Use simplified behavior for NPCs outside player perception.
* [ ] Schedule NPC AI updates across different frames.
* [ ] Avoid large AI spikes where every NPC thinks simultaneously.

For example, don't do:

```text
Frame 0:
1,000 NPCs think
```

spread it:

```text
Frame 0: NPC 0–99
Frame 1: NPC 100–199
Frame 2: NPC 200–299
...
```

# Pathfinding

* [ ] Divide navigation data by region.
* [ ] Avoid searching the entire world for local paths.
* [ ] Use hierarchical pathfinding for long-distance travel.
* [ ] Calculate a coarse world route first.
* [ ] Calculate detailed paths only for the nearby portion.
* [ ] Cache common routes.
* [ ] Invalidate paths only when relevant terrain changes.
* [ ] Limit maximum pathfinding work per frame.
* [ ] Run expensive pathfinding asynchronously where possible.
* [ ] Give important player-facing pathfinding higher priority.
* [ ] Allow NPCs to use simplified route-following when far from players.

# Animation

* [ ] Update nearby character animation every frame where necessary.
* [ ] Reduce animation frequency with distance.
* [ ] Stop animation for invisible entities.
* [ ] Stop skeletal animation for entities behind the camera when safe.
* [ ] Share animation clips.
* [ ] Avoid unique animation data for every identical creature.
* [ ] Reduce bone counts for distant LODs.
* [ ] Avoid animating decorative objects unnecessarily.
* [ ] Use shader/instance animation for large repeated environmental effects where practical.

# Audio Performance

* [ ] Limit simultaneous active sounds.
* [ ] Prioritize important sounds.
* [ ] Do not create audio for sources beyond audible range.
* [ ] Stop sounds once they become irrelevant.
* [ ] Pool reusable generated sound buffers.
* [ ] Cache expensive procedural sounds.
* [ ] Generate only inexpensive random variation at playback time.
* [ ] Reduce environmental sound density when many sources overlap.
* [ ] Aggregate many similar distant sounds into ambience.
* [ ] Avoid hundreds of positional audio nodes.
* [ ] Disconnect completed Web Audio nodes.
* [ ] Suspend cave ambience once the player leaves the cave.
* [ ] Suspend music generation when music is not playing.

# Procedural Music Performance

* [ ] Generate musical structures ahead of playback rather than immediately before every note.
* [ ] Schedule Web Audio notes ahead of time.
* [ ] Avoid depending on frame timing for musical timing.
* [ ] Reuse instrument synthesis graphs where practical.
* [ ] Limit polyphony.
* [ ] Use voice stealing.
* [ ] Stop released instrument voices.
* [ ] Cache complex synthesized instrument samples if repeated synthesis is expensive.
* [ ] Reduce inactive music layers instead of leaving them silently processing.
* [ ] Avoid expensive audio effects on every individual instrument when a shared bus effect works.

# UI Performance

* [ ] Avoid rebuilding the entire interface when one value changes.
* [ ] Update only changed UI elements.
* [ ] Avoid DOM layout work every frame.
* [ ] Batch UI updates.
* [ ] Throttle rapidly changing nonessential displays.
* [ ] Virtualize very large inventory lists.
* [ ] Virtualize large chat histories.
* [ ] Limit retained combat-log entries.
* [ ] Avoid excessively large hidden DOM trees.
* [ ] Separate HUD updates from rendering updates.
* [ ] Use CSS transforms for frequently moving UI where appropriate.

# Inventory and Game-State Data

* [ ] Avoid storing full duplicate item definitions for every inventory item.
* [ ] Reference shared item definitions by ID.
* [ ] Store only instance-specific properties on individual items.
* [ ] Use compact identifiers for common data.
* [ ] Avoid deeply cloning world state.
* [ ] Normalize large collections when beneficial.
* [ ] Remove expired temporary state.
* [ ] Bound logs and histories.
* [ ] Avoid accumulating event objects forever.
* [ ] Periodically verify that destroyed entities are actually collectible.

Instead of:

```ts
{
  name: "Iron Sword",
  model: "...",
  description: "...",
  damage: 12,
  weight: 4,
  material: "iron",
  ...
}
```

on 10,000 swords, use:

```ts
{
  itemType: IRON_SWORD,
  durability: 73
}
```

with the shared definition stored once.

# Event Systems

* [ ] Remove listeners when objects are destroyed.
* [ ] Avoid global events reaching thousands of irrelevant listeners.
* [ ] Scope events geographically or by subsystem.
* [ ] Avoid producing large event objects unnecessarily.
* [ ] Reuse common immutable event metadata where appropriate.
* [ ] Prevent accidentally subscribing the same listener multiple times.
* [ ] Profile event-heavy combat and multiplayer situations.

# Networking

For an MMORPG, network optimization will eventually be just as important as rendering.

* [ ] Send players only world updates relevant to them.
* [ ] Use an interest-management radius.
* [ ] Avoid transmitting every entity on the server to every client.
* [ ] Reduce update frequency for distant entities.
* [ ] Send changes rather than complete state repeatedly.
* [ ] Compress common state fields.
* [ ] Quantize coordinates where full floating-point precision is unnecessary.
* [ ] Batch small network updates.
* [ ] Prioritize movement and combat over unimportant state.
* [ ] Avoid transmitting deterministic procedural data that clients can reproduce from seeds.
* [ ] Send seeds rather than full procedural maps where safe and appropriate.
* [ ] Rate-limit player-generated events.
* [ ] Detect disconnected or stalled clients.
* [ ] Avoid letting network queues grow indefinitely.

# Multiplayer Interest Management

* [ ] Define player-interest regions.
* [ ] Subscribe clients only to nearby entities.
* [ ] Add entities when they enter interest range.
* [ ] Remove entities when they leave range.
* [ ] Use hysteresis so entities do not constantly enter/leave around a boundary.
* [ ] Treat party members specially where distant information is useful.
* [ ] Treat world bosses and major global events separately from normal proximity rules.
* [ ] Reduce update detail for objects near the edge of interest range.

# Startup Performance

* [ ] Keep initial JavaScript bundle size under control.
* [ ] Lazy-load 3D mode if the player begins in text or 2D mode.
* [ ] Lazy-load region-specific models.
* [ ] Lazy-load cave-specific assets.
* [ ] Lazy-load music instruments.
* [ ] Lazy-load rarely used UI.
* [ ] Avoid decoding every texture at startup.
* [ ] Show playable content before optional assets finish loading.
* [ ] Preload likely next assets based on player movement.
* [ ] Cache downloaded assets appropriately.

This is particularly valuable for your multi-renderer architecture:

```text
Player selects Text
    ↓
Don't load most Three.js models

Player selects 2D
    ↓
Don't load expensive 3D assets

Player selects 3D
    ↓
Load 3D renderer/assets as needed
```

# Asset Management

* [ ] Use a central asset manager.
* [ ] Prevent the same asset from loading multiple times.
* [ ] Reference-count expensive shared assets where appropriate.
* [ ] Track which chunks use each asset.
* [ ] Dispose assets only when no active area needs them.
* [ ] Avoid duplicate textures under different URLs.
* [ ] Avoid duplicate models representing identical geometry.
* [ ] Cache parsed model data.
* [ ] Preload high-probability upcoming assets.

# Model Optimization

* [ ] Keep polygon counts appropriate to on-screen size.
* [ ] Remove geometry that can never be seen.
* [ ] Simplify small props.
* [ ] Create explicit LOD versions of expensive models.
* [ ] Minimize unnecessary material slots.
* [ ] Reuse skeletons where appropriate.
* [ ] Compress model assets.
* [ ] Instance repeated environmental models.
* [ ] Avoid unique high-detail models for trivial procedural decoration.
* [ ] Profile actual GPU cost rather than judging complexity from file size alone.

# Dynamic Quality Settings

* [ ] Provide Low, Medium, High, and Ultra presets.
* [ ] Allow shadow quality adjustment.
* [ ] Allow shadow distance adjustment.
* [ ] Allow vegetation-density adjustment.
* [ ] Allow particle-density adjustment.
* [ ] Allow draw-distance adjustment.
* [ ] Allow texture-quality adjustment.
* [ ] Allow water-quality adjustment.
* [ ] Allow anti-aliasing adjustment.
* [ ] Allow dynamic-light-count adjustment.
* [ ] Allow effects-quality adjustment.
* [ ] Allow target frame-rate adjustment.
* [ ] Detect consistently poor performance and suggest lower settings.
* [ ] Optionally adapt quality automatically.

# Dynamic Resolution

* [ ] Consider dynamic rendering resolution.
* [ ] Reduce internal rendering resolution when GPU frame time becomes excessive.
* [ ] Raise resolution again after sustained good performance.
* [ ] Avoid changing resolution too aggressively.
* [ ] Keep UI at native resolution while scaling only 3D rendering where possible.
* [ ] Provide a manual render-scale option.

# Fog and Draw Distance

Your caves and outdoor world can use fog for both atmosphere **and optimization**.

* [ ] Establish maximum meaningful draw distances.
* [ ] Use atmospheric fog to hide distant geometry transitions.
* [ ] Use darkness to limit cave rendering distances naturally.
* [ ] Avoid generating detailed objects beyond visible range.
* [ ] Reduce object density toward the visibility limit.
* [ ] Use weather to justify shorter visibility when appropriate.
* [ ] Avoid rendering kilometers of detail simply because the camera theoretically could see it.

# Minimize Raycasts

* [ ] Avoid raycasting against the entire scene.
* [ ] Raycast only relevant object layers.
* [ ] Use bounding tests before triangle raycasts.
* [ ] Reduce AI line-of-sight raycast frequency.
* [ ] Cache line-of-sight briefly when neither participant moves.
* [ ] Avoid raycasting against decorative objects.
* [ ] Use simplified collision meshes for raycasts.
* [ ] Limit interaction raycasts to nearby objects.

# Data Structures

* [ ] Use `Map` and `Set` where their access patterns are appropriate.
* [ ] Avoid linear searches through giant arrays for ID lookups.
* [ ] Index entities by ID.
* [ ] Index entities spatially.
* [ ] Keep frequently accessed state shallow.
* [ ] Avoid excessive nested proxy/reactive structures for high-frequency game state.
* [ ] Use numeric IDs for frequently referenced entities where helpful.
* [ ] Measure before replacing readable structures with highly specialized ones.

# Save Game / Persistence

* [ ] Save changed world state instead of regenerated deterministic state.
* [ ] Store procedural seeds.
* [ ] Avoid serializing entire generated meshes.
* [ ] Avoid saving derived caches.
* [ ] Compress large persistent data.
* [ ] Save incrementally where possible.
* [ ] Avoid freezing gameplay for a large synchronous save.
* [ ] Perform expensive serialization away from critical frames.
* [ ] Version saved data structures.

# Avoid Main-Thread Blocking

* [ ] Identify operations exceeding a few milliseconds.
* [ ] Break large loops into smaller jobs.
* [ ] Avoid synchronous parsing of huge assets during gameplay.
* [ ] Avoid large synchronous JSON serialization.
* [ ] Avoid large synchronous procedural generation jobs.
* [ ] Move appropriate tasks to workers.
* [ ] Yield between large batches of background work.
* [ ] Give immediate player interaction priority over background tasks.

# Loading Transitions

* [ ] Begin generating cave interiors before the player finishes entering when possible.
* [ ] Preload destination interiors when approaching entrances.
* [ ] Preload nearby overworld chunks before exiting caves.
* [ ] Use doors, tunnels, elevators, passages, or animations to naturally hide streaming.
* [ ] Avoid freezing the render loop while loading.
* [ ] Provide visual progress only when loading genuinely takes noticeable time.
* [ ] Cancel preloads if the player turns away.

# Performance Testing Scenarios

Don't only profile an empty field.

* [ ] Test standing still.
* [ ] Test continuous walking.
* [ ] Test sprinting through new terrain.
* [ ] Test rapidly changing direction at chunk boundaries.
* [ ] Test a dense forest.
* [ ] Test a large town.
* [ ] Test a crowded marketplace.
* [ ] Test heavy combat.
* [ ] Test many spell effects.
* [ ] Test many NPCs.
* [ ] Test a large cave chamber.
* [ ] Test caves with many shadow-casting formations.
* [ ] Test a mine with rails, carts, supports, and lights.
* [ ] Test water-heavy scenes.
* [ ] Test bad weather.
* [ ] Test nighttime scenes with many lights.
* [ ] Test switching text → 2D → 3D repeatedly.
* [ ] Test traveling through many different regions without restarting.
* [ ] Test repeatedly entering and leaving the same cave.
* [ ] Test gameplay after several hours.

# Metrics to Track

I would actually put these into a developer performance panel.

* [ ] Current FPS.
* [ ] Average FPS.
* [ ] Worst recent frame time.
* [ ] CPU frame time.
* [ ] GPU frame time where available.
* [ ] JavaScript heap usage.
* [ ] Allocation rate.
* [ ] Garbage-collection pauses.
* [ ] Three.js object count.
* [ ] Visible mesh count.
* [ ] Triangle count.
* [ ] Vertex count.
* [ ] Draw-call count.
* [ ] Texture count.
* [ ] Geometry count.
* [ ] Material count.
* [ ] Active dynamic-light count.
* [ ] Active shadow-light count.
* [ ] Active particle count.
* [ ] Active audio-source count.
* [ ] Active NPC count.
* [ ] Full-simulation entity count.
* [ ] Reduced-simulation entity count.
* [ ] Loaded chunk count.
* [ ] Chunk-generation queue size.
* [ ] Worker-job queue size.
* [ ] Network messages per second.
* [ ] Network bytes per second.

# Development Performance Warnings

You could even have debug-mode warnings automatically trigger when thresholds are exceeded.

* [ ] Warn when draw calls exceed the target.
* [ ] Warn when triangle count becomes excessive.
* [ ] Warn when too many shadow lights exist.
* [ ] Warn when active audio sources exceed the budget.
* [ ] Warn when chunk-generation queues back up.
* [ ] Warn when a frame exceeds 50 ms.
* [ ] Warn when heap usage continually increases.
* [ ] Warn when a system allocates excessively while idle.
* [ ] Warn when too many Three.js objects exist.
* [ ] Warn when an unloaded region still owns render resources.
* [ ] Warn when a worker queue is no longer being drained.

# Performance Regression Tests

This could fit very well with your existing automated-test approach.

* [ ] Create deterministic benchmark worlds.
* [ ] Create a standard dense-forest benchmark.
* [ ] Create a standard town benchmark.
* [ ] Create a standard cave benchmark.
* [ ] Create a large combat benchmark.
* [ ] Record generation time.
* [ ] Record memory consumption.
* [ ] Record entity counts.
* [ ] Record geometry statistics.
* [ ] Compare benchmark results between commits.
* [ ] Detect major performance regressions automatically.
* [ ] Establish maximum acceptable procedural-generation times.
* [ ] Establish maximum memory usage for benchmark scenes.

# Probably the Biggest Wins for Your Game

If I had to prioritize this giant checklist for what you've described so far, I'd start with these:

* [ ] **Chunk everything.**
* [ ] **Don't fully simulate distant parts of the world.**
* [ ] **Don't create 3D resources unless 3D mode needs them.**
* [ ] **Use `InstancedMesh` aggressively for rocks, trees, cave formations, supports, rails, vegetation, and repeated props.**
* [ ] **Keep dynamic light counts low.**
* [ ] **Keep shadow-casting light counts extremely low.**
* [ ] **Use cave topology for aggressive visibility/occlusion culling.**
* [ ] **Use LOD for terrain, vegetation, buildings, creatures, and cave formations.**
* [ ] **Move expensive procedural generation off the critical render path.**
* [ ] **Use Web Workers for appropriate generation workloads.**
* [ ] **Reuse temporary objects instead of allocating during every frame.**
* [ ] **Cache expensive deterministic procedural calculations.**
* [ ] **Use spatial indexes instead of iterating over every game object.**
* [ ] **Run NPC AI at different frequencies based on relevance.**
* [ ] **Keep collision geometry much simpler than rendered geometry.**
* [ ] **Dispose Three.js resources when areas unload.**
* [ ] **Make every cache bounded.**
* [ ] **Measure performance while standing still to expose unnecessary continuous work.**
* [ ] **Build a live developer performance HUD.**
* [ ] **Create repeatable benchmark maps so optimization doesn't become guesswork.**

The **caves may actually become one of your easiest environments to optimize well in 3D**, despite looking visually complex. A player may be inside a giant underground system containing 100 chambers, but because solid rock blocks visibility, you may only need to render something like:

```text
Current chamber       FULL
Adjacent tunnel       FULL
Visible next chamber  PARTIAL

Everything beyond     NOTHING
```

That means you can afford **better rocks, sharper shadows, dripping water, stalactites, mine supports, bridges, rails and detailed props near the player** while potentially rendering *less* geometry than an outdoor scene.

The overall architectural target I'd pursue is essentially:

```text
                         WORLD
                           │
                 Lightweight World State
                           │
                    Spatial Relevance
                           │
             ┌─────────────┼─────────────┐
             ↓             ↓             ↓
          Dormant       Simulated      Visible
             │             │             │
        tiny state     game logic     game logic
                                      + renderer
                                      + animation
                                      + audio
                                      + shadows
                                      + particles
```

The most expensive representation of something should exist **only while somebody can actually experience it**. That single principle will probably do more for the long-term scalability of an MMORPG than dozens of small JavaScript micro-optimizations.
