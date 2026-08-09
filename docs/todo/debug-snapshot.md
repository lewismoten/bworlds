# Debug Snapshot

Instead of trying to cram every metric into a live panel, keep the live panel focused on **quick health indicators**, then add a **“Download Debug Snapshot”** button that exports a structured JSON file with much deeper diagnostics.

That gives you something you can save from a slow scene, attach to a bug report, compare between commits, or send back here for analysis.

## Download Debug Snapshot

* [x] Add a `Download Debug Snapshot` button to the debug panel.
* [x] Export the snapshot as JSON.
* [x] Include timestamp.
* [x] Include game version.
* [x] Include git commit/build identifier when available.
* [x] Include world seed.
* [x] Include current level/map identifier.
* [x] Include player grid/world position.
* [x] Include current renderer mode: text, 2D, or 3D.
* [x] Include active content packs.
* [x] Include enabled plugins.
* [x] Include graphics-quality settings.
* [x] Include render radius.
* [x] Include device/browser information.
* [x] Include WebGL/WebGPU capabilities.
* [x] Include hardware concurrency and available device-memory hints where exposed.
* [x] Include active performance-budget configuration.
* [x] Include soft and hard caps alongside actual values.
* [x] Generate a descriptive filename such as `bworlds-debug-20260808-151120.json`.

# Snapshot Summary

* [x] Include current FPS.
* [x] Include average FPS over a recent window.
* [x] Include minimum FPS.
* [x] Include frame-time average.
* [x] Include P50 frame time.
* [x] Include P95 frame time.
* [x] Include P99 frame time.
* [x] Include worst recent frame.
* [x] Include target frame time.
* [x] Include current performance tier.
* [x] Include number of frames exceeding 16.7 ms.
* [x] Include number of frames exceeding 33.3 ms.
* [x] Include number of frames exceeding 50 ms.

# CPU Timing Breakdown

* [x] Include total CPU frame time.
* [ ] Include world simulation time.
* [ ] Include AI time.
* [ ] Include animation time.
* [ ] Include physics time.
* [ ] Include pathfinding time.
* [ ] Include procedural-generation time.
* [ ] Include tile-build time.
* [ ] Include LOD-management time.
* [ ] Include render-preparation time.
* [ ] Include Three.js render-call CPU time.
* [ ] Include UI-update time.
* [ ] Include audio-processing scheduling time where measurable.
* [ ] Include network-processing time.
* [ ] Include uncategorized frame time.
* [ ] Include average and maximum time for each subsystem.

# GPU and Rendering Summary

* [x] Include draw calls.
* [x] Include triangles.
* [x] Include vertices where calculable.
* [x] Include points.
* [x] Include lines.
* [x] Include visible object count.
* [ ] Include culled object count where available.
* [x] Include visible mesh count.
* [x] Include visible instanced-mesh count.
* [x] Include total rendered instances.
* [ ] Include transparent draw count.
* [ ] Include shadow-pass draw count.
* [ ] Include post-processing passes.
* [ ] Include GPU frame timing when available.
* [x] Include render-resolution dimensions.
* [x] Include device pixel ratio.
* [x] Include render scale.

# Three.js Scene Graph

* [x] Include total `Object3D` count.
* [x] Include `Group` count.
* [x] Include `Mesh` count.
* [x] Include `InstancedMesh` count.
* [x] Include `Sprite` count.
* [x] Include `Points` node count.
* [x] Include line-object count.
* [x] Include camera count.
* [x] Include light count.
* [x] Include maximum hierarchy depth.
* [x] Include average hierarchy depth.
* [x] Include empty groups.
* [x] Include one-child groups.
* [x] Include invisible objects.
* [x] Include objects with `matrixAutoUpdate = true`.
* [x] Include static objects still updating transforms.
* [ ] Include scene objects belonging to unloaded tiles if detected.

# Materials

* [x] Include total material references.
* [x] Include unique material instances.
* [x] Include shared material instances.
* [x] Include cloned-material count where trackable.
* [x] Include transparent materials.
* [x] Include materials using alpha testing.
* [x] Include double-sided materials.
* [x] Include materials receiving fog.
* [x] Include materials using custom shaders.
* [x] Include materials by type.
* [x] Include materials created during the sampling window.
* [x] Include materials disposed during the sampling window.
* [x] Include peak material count.
* [ ] Include material-cache hit rate.
* [ ] Include material-cache miss rate.
* [ ] Include estimated material usage by plugin.
* [ ] Include the highest-material-count models or tile types.

# Shader Programs

* [x] Include current shader-program count.
* [ ] Include total program compilations.
* [ ] Include shader compilations during recent sampling window.
* [ ] Include estimated shader compilation time.
* [ ] Include shader cache hits.
* [ ] Include shader cache misses.
* [ ] Include program count by material family where possible.
* [ ] Include program count by plugin where attributable.
* [ ] Flag program counts that continue increasing in a stable scene.

# Geometry

* [x] Include total geometry references.
* [x] Include unique geometry instances.
* [x] Include GPU geometry count.
* [x] Include shared geometry count.
* [x] Include total geometry bytes where calculable.
* [x] Include vertex-buffer bytes.
* [x] Include index-buffer bytes.
* [x] Include average vertices per geometry.
* [x] Include largest geometry by vertices.
* [x] Include largest geometry by memory.
* [ ] Include geometries created during sampling period.
* [ ] Include geometries disposed during sampling period.
* [ ] Include geometry-cache hits.
* [ ] Include geometry-cache misses.
* [ ] Include geometry usage by plugin.
* [ ] Include highest-geometry-cost models.

# Textures

* [x] Include texture count.
* [ ] Include texture dimensions.
* [ ] Include largest texture width/height.
* [x] Include decoded texture-memory estimate.
* [ ] Include estimated GPU texture memory.
* [ ] Include mipmap-memory estimate.
* [ ] Include compressed versus uncompressed texture count.
* [ ] Include normal-map count.
* [ ] Include displacement-map count.
* [ ] Include environment-map count.
* [ ] Include render-target texture count.
* [ ] Include render-target memory estimate.
* [ ] Include textures by plugin.
* [ ] Include texture-cache hits and misses.
* [ ] Include textures loaded and disposed during sampling window.

# Lighting and Shadows

* [x] Include ambient-light count.
* [x] Include directional-light count.
* [x] Include point-light count.
* [x] Include spot-light count.
* [x] Include hemisphere-light count.
* [x] Include currently active lights.
* [ ] Include culled/inactive lights.
* [x] Include shadow-casting lights.
* [ ] Include shadow-map count.
* [ ] Include each shadow-map resolution.
* [ ] Include total shadow-map pixels.
* [ ] Include shadow-render draw calls.
* [ ] Include shadow-render CPU/GPU timing if measurable.
* [ ] Include lights by plugin or model.
* [ ] Include the highest-cost shadow lights.

# World and Tile State

* [x] Include current map/level.
* [x] Include visible tile count.
* [x] Include loaded tile count.
* [ ] Include active tile count.
* [ ] Include dormant tile count.
* [x] Include pending tile-build count.
* [x] Include tile builds per second.
* [ ] Include unique tile builds per second.
* [ ] Include duplicate tile builds per second.
* [ ] Include tile rebuilds per second.
* [x] Include average tile-build time.
* [x] Include worst tile-build time.
* [ ] Include tile-cache hit/miss rate.
* [x] Include tile counts by kind.
* [ ] Include rendering cost by tile kind.
* [ ] Include build cost by tile kind.
* [ ] Include memory estimate by tile kind.

# LOD State

* [ ] Include LOD0 model count.
* [ ] Include LOD1 model count.
* [ ] Include LOD2 model count.
* [ ] Include LOD3 model count.
* [x] Include LOD checks per second.
* [x] Include LOD swaps per second.
* [ ] Include LOD builds per second.
* [x] Include current LOD thresholds.
* [ ] Include LOD cache hits and misses.
* [ ] Include current objects participating in LOD crossfades.
* [ ] Include crossfade duration.
* [ ] Include material clones caused by LOD.
* [ ] Include geometry created because of LOD changes.
* [ ] Include LOD CPU time.
* [ ] Include models bouncing repeatedly across LOD thresholds.

# Tree Diagnostics

Given how important trees currently are, I would definitely include a specialized section.

* [ ] Include visible tree count.
* [ ] Include loaded tree count.
* [ ] Include tree count by species/family.
* [ ] Include trees by LOD.
* [ ] Include average objects per tree.
* [ ] Include average meshes per tree.
* [ ] Include average vertices per tree.
* [ ] Include average triangles per tree.
* [ ] Include average materials per tree.
* [ ] Include average draw calls per tree.
* [ ] Include trees using unique materials.
* [ ] Include trees using shared materials.
* [ ] Include trees using instancing.
* [ ] Include tree generation calls.
* [ ] Include average tree-generation time.
* [ ] Include maximum tree-generation time.
* [ ] Include active wind-responsive trees.
* [ ] Include shadow-casting trees.
* [ ] Include trees with active wildlife.
* [ ] Include trees with particles.
* [ ] Include tree cache hits/misses.
* [ ] Include tree-generator budget violations.

# Instancing

* [x] Include total `InstancedMesh` nodes.
* [x] Include total rendered instances.
* [ ] Include instance counts by plugin.
* [ ] Include instance counts by model category.
* [ ] Include repeated meshes that are not currently instanced.
* [ ] Include estimated potential draw-call savings from instancing.
* [ ] Include percentage of eligible repeated geometry that uses instancing.

# Particles

* [x] Include active particle systems.
* [x] Include active particles.
* [x] Include maximum particles during sampling window.
* [ ] Include particle emitters by plugin.
* [ ] Include transparent particle count.
* [ ] Include particle draw calls.
* [ ] Include particle simulation time.
* [ ] Include particle systems beyond visible/audible range.
* [ ] Include dropped particles due to budget limits.

# Characters and Animation

* [ ] Include visible character count.
* [ ] Include fully simulated characters.
* [ ] Include reduced-simulation characters.
* [ ] Include dormant characters.
* [ ] Include active animation mixers.
* [ ] Include active skeletons.
* [ ] Include total bones evaluated.
* [ ] Include characters with IK enabled.
* [ ] Include facial-animation count.
* [ ] Include morph-target count.
* [ ] Include animation update CPU time.
* [ ] Include average bones per visible character.
* [ ] Include characters by animation LOD.
* [ ] Include characters whose animations are frozen due to distance.

# AI and Pathfinding

* [ ] Include active AI character count.
* [ ] Include AI decisions per second.
* [ ] Include perception checks per second.
* [ ] Include raycasts used by AI.
* [ ] Include pathfinding requests per second.
* [ ] Include active pathfinding jobs.
* [ ] Include queued pathfinding jobs.
* [ ] Include average pathfinding duration.
* [ ] Include maximum pathfinding duration.
* [ ] Include cached path hits and misses.
* [ ] Include AI CPU time by behavior category if practical.

# Physics and Collision

* [ ] Include active physics bodies.
* [ ] Include sleeping physics bodies.
* [ ] Include static colliders.
* [ ] Include dynamic colliders.
* [ ] Include collision queries per second.
* [ ] Include broad-phase candidate count.
* [ ] Include narrow-phase checks.
* [ ] Include physics-step CPU time.
* [ ] Include raycasts per second.
* [ ] Include active ragdolls.
* [ ] Include active debris objects.
* [ ] Include objects exceeding collision-complexity budgets.

# Audio

* [ ] Include active Web Audio voices.
* [ ] Include positional audio-source count.
* [ ] Include ambient audio count.
* [ ] Include procedural oscillator count.
* [ ] Include audio buffers.
* [ ] Include estimated audio-buffer memory.
* [ ] Include currently active reverb/effect chains.
* [ ] Include audio events per second.
* [ ] Include sounds rejected because of voice limits.
* [ ] Include sounds culled by distance.
* [ ] Include music voices/instruments separately.
* [ ] Include audio nodes created/disposed per second.

# Heap and JavaScript Memory

* [ ] Include current used heap.
* [ ] Include total allocated heap if available.
* [ ] Include browser heap limit.
* [ ] Include configured game memory target.
* [ ] Include peak heap during snapshot window.
* [ ] Include heap delta over 10 seconds.
* [ ] Include heap delta over 60 seconds.
* [ ] Include estimated allocation rate where measurable.
* [ ] Include GC events if observable.
* [ ] Include longest observed GC pause.
* [ ] Include world-cache size.
* [ ] Include geometry-cache size.
* [ ] Include texture-cache size.
* [ ] Include model-cache size.
* [ ] Include audio-cache size.
* [ ] Include procedural-generation cache size.

# Network State

Since this is intended to become an MMORPG:

* [ ] Include connection status.
* [ ] Include current ping.
* [ ] Include inbound bytes/sec.
* [ ] Include outbound bytes/sec.
* [ ] Include inbound messages/sec.
* [ ] Include outbound messages/sec.
* [ ] Include pending network messages.
* [ ] Include dropped/late messages if tracked.
* [ ] Include subscribed entity count.
* [ ] Include nearby network-relevant entity count.
* [ ] Include server tick rate where known.

# Plugin Breakdown

This could be one of the most useful portions of the entire file.

For every plugin, include:

* [ ] Plugin name.
* [ ] Plugin version.
* [ ] Content pack.
* [ ] Models currently active.
* [ ] Objects contributed.
* [ ] Meshes contributed.
* [ ] Vertices contributed.
* [ ] Triangles contributed.
* [ ] Draw calls contributed.
* [ ] Geometries contributed.
* [ ] Materials contributed.
* [ ] Unique materials contributed.
* [ ] Textures contributed.
* [ ] Estimated GPU bytes.
* [ ] Lights contributed.
* [ ] Shadow lights contributed.
* [ ] Particle systems contributed.
* [ ] Audio sources contributed.
* [ ] Generation calls.
* [ ] Generation CPU time.
* [ ] Average generation time.
* [ ] Maximum generation time.
* [ ] Cache hit/miss rate.
* [ ] Soft-limit violations.
* [X] Hard-limit violations.
* [ ] Dropped model parts.
* [X] Rejected models.

Then analysis becomes much easier:

```json
{
  "plugin": "tile-forest",
  "objects": 4210,
  "meshes": 3244,
  "triangles": 18640,
  "materials": 1278,
  "drawCalls": 603,
  "generationMs": 7.4
}
```

Immediately you know where to look.

# Resource-Budget Snapshot

* [X] Include every active soft limit.
* [X] Include every hard limit.
* [X] Include current utilization percentage.
* [X] Include highest utilization observed during sampling.
* [X] Include which limits caused quality reductions.
* [ ] Include which optional features were dropped.
* [ ] Include models automatically lowered to another LOD.
* [ ] Include plugin requests rejected due to budget.
* [ ] Include dynamic quality changes during sampling.

For example:

```json
{
  "drawCalls": {
    "current": 1062,
    "soft": 900,
    "hard": 1400,
    "status": "warning"
  }
}
```

# Recent Performance History

Don't make the snapshot only represent **one instant**.

That is probably the most important improvement I'd make.

* [ ] Keep the previous 10–30 seconds of performance samples in a circular buffer.
* [ ] Export that buffer with the snapshot.
* [X] Record FPS each sample.
* [X] Record CPU frame time.
* [ ] Record GPU frame time where available.
* [X] Record draw calls.
* [X] Record triangles.
* [X] Record objects.
* [X] Record materials.
* [X] Record geometries.
* [X] Record heap.
* [X] Record tile builds.
* [X] Record LOD swaps.
* [X] Record visible tiles.
* [X] Record visible trees.
* [X] Record active lights.
* [X] Record generation queue size.

For example:

```json
{
  "history": [
    {
      "t": -3,
      "fps": 52.1,
      "frameMs": 19.2,
      "drawCalls": 1021,
      "heapMB": 78.2
    },
    {
      "t": -2,
      "fps": 47.8,
      "frameMs": 20.9,
      "drawCalls": 1054,
      "heapMB": 79.1
    },
    {
      "t": -1,
      "fps": 45.7,
      "frameMs": 21.9,
      "drawCalls": 1062,
      "heapMB": 80.0
    }
  ]
}
```

That would let us tell whether the game is **stable, degrading, loading something, or periodically stuttering**.

# Recent Events

Also export a short diagnostic event log.

* [ ] Tile generated.
* [ ] Tile unloaded.
* [ ] Tile rebuilt.
* [ ] LOD changed.
* [ ] Model rejected.
* [ ] Plugin exceeded budget.
* [ ] Texture loaded.
* [ ] Geometry generated.
* [ ] Material cloned.
* [ ] Shader program compiled.
* [ ] Chunk loaded.
* [ ] Chunk unloaded.
* [ ] Graphics quality changed.
* [ ] Long frame detected.
* [ ] Cache eviction occurred.
* [ ] Large allocation detected where trackable.
* [ ] Worker job exceeded expected time.

Use a bounded circular buffer so it does not itself become a memory problem.

# Top Offenders

Have the snapshot automatically calculate rankings.

* [ ] Top plugins by objects.
* [ ] Top plugins by meshes.
* [ ] Top plugins by triangles.
* [ ] Top plugins by draw calls.
* [ ] Top plugins by materials.
* [ ] Top plugins by GPU memory.
* [ ] Top plugins by CPU generation time.
* [ ] Top model instances by triangles.
* [ ] Top models by material count.
* [ ] Top models by object count.
* [ ] Top models by texture memory.
* [ ] Top lights by shadow cost.
* [ ] Top tile kinds by rendering cost.

Then the JSON itself can tell you:

```json
{
  "topOffenders": {
    "materials": [
      {
        "plugin": "tile-forest",
        "count": 1281
      }
    ]
  }
}
```

# Snapshot Modes

I would actually support several buttons eventually:

* [ ] **Download Debug Snapshot** — normal detailed JSON.
* [ ] **Download Lightweight Snapshot** — metrics without expensive scene inspection.
* [ ] **Download Performance Capture** — includes 30–60 seconds of history.
* [ ] **Download Scene Inventory** — detailed object/material/geometry/plugin breakdown.
* [ ] **Download Leak Comparison** — captures resource IDs/counts intended for comparison with another snapshot.

You don't necessarily need all of those immediately. Start with one comprehensive snapshot and split them later if it becomes too expensive.

# Snapshot Collection Performance

Important: the debugging system itself shouldn't freeze the game.

* [ ] Avoid recursively inspecting the entire scene during every frame.
* [ ] Maintain cheap counters continuously.
* [ ] Perform expensive inspection only when snapshot is requested.
* [ ] Spread expensive snapshot analysis across frames if needed.
* [ ] Reuse already-known plugin ownership metadata.
* [ ] Avoid serializing raw vertices.
* [ ] Avoid serializing complete textures.
* [ ] Avoid serializing actual Three.js object graphs.
* [ ] Export summaries and identifiers instead.
* [ ] Avoid circular references.
* [ ] Cap diagnostic arrays.
* [ ] Cap event history.
* [ ] Cap top-offender lists.

The snapshot should be perhaps hundreds of KB or a few MB—not a 200 MB dump of your scene.

# Don't Export Raw Model Data by Default

I would specifically **not** include:

* [ ] Full vertex arrays.
* [ ] Full index buffers.
* [ ] Texture pixel data.
* [ ] Shader source for every material.
* [ ] Full `Object3D.toJSON()` output.
* [ ] Complete save-game/world data.
* [ ] Complete network packet history.

Instead include hashes/IDs and statistics:

```json
{
  "geometryId": 782,
  "vertices": 1244,
  "triangles": 2180,
  "bytes": 28192
}
```

If later you need a particular problematic model, you can have a separate **Export Selected Model Debug Data** tool.

# Compare Snapshots

This would be extremely useful after you implement optimization changes.

* [ ] Give every snapshot a schema version.
* [ ] Keep field names stable.
* [ ] Add snapshot ID.
* [ ] Include game build ID.
* [ ] Allow two snapshots to be compared.
* [ ] Compare FPS.
* [ ] Compare CPU time.
* [ ] Compare draw calls.
* [ ] Compare objects.
* [ ] Compare meshes.
* [ ] Compare materials.
* [ ] Compare shader programs.
* [ ] Compare geometries.
* [ ] Compare memory.
* [ ] Compare plugin costs.
* [ ] Highlight regressions.
* [ ] Highlight improvements.

You could eventually produce:

```text
Before → After

FPS             45.7 → 58.4     +27.8%
Draw Calls      1062 → 714      -32.8%
Materials       1550 → 143      -90.8%
Programs         126 → 34       -73.0%
Objects         7868 → 4980     -36.7%
Heap            80MB → 67MB     -16.3%
```

That would be fantastic for validating optimization work.

# Suggested High-Level JSON Shape

I would aim for something like:

```ts
interface BWorldsDebugSnapshot {
  schemaVersion: number;

  meta: DebugMeta;
  environment: EnvironmentInfo;
  location: WorldLocation;

  performance: PerformanceSnapshot;
  history: PerformanceSample[];

  world: WorldDebugInfo;
  renderer: RendererDebugInfo;
  scene: SceneDebugInfo;

  materials: MaterialDebugInfo;
  geometries: GeometryDebugInfo;
  textures: TextureDebugInfo;
  lighting: LightingDebugInfo;

  lod: LodDebugInfo;
  trees: TreeDebugInfo;

  characters: CharacterDebugInfo;
  ai: AiDebugInfo;
  physics: PhysicsDebugInfo;
  audio: AudioDebugInfo;
  network: NetworkDebugInfo;

  memory: MemoryDebugInfo;

  plugins: PluginDebugInfo[];

  budgets: BudgetDebugInfo;
  violations: BudgetViolation[];

  recentEvents: DebugEvent[];

  topOffenders: DebugTopOffenders;
}
```

And importantly, make everything optional:

```ts
interface BWorldsDebugSnapshot {
  // ...
  network?: NetworkDebugInfo;
  physics?: PhysicsDebugInfo;
  audio?: AudioDebugInfo;
}
```

That lets **older plugins and partially implemented game systems still produce valid snapshots**, which fits well with the capability-based architecture you've been developing.

The live panel can then stay fairly simple:

```text
FPS              45.7 ⚠
Frame            21.9 ms ⚠
Draws            1062 ⚠
Objects          7868
Materials        1550 ⚠
Heap             80 MB

[ Download Debug Snapshot ]
```

and the downloaded snapshot becomes the equivalent of a **black-box recorder for the game**.

That is probably the design I'd favor: the HUD tells you *something is wrong*; the debug snapshot gives you enough information to determine **what, where, and which plugin caused it**.
