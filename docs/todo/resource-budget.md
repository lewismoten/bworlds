# Resource Budget System

Operates at several levels: per model, per LOD, per plugin, per chunk, and per entire scene. The renderer should be able to degrade quality before performance collapses.

## Core Resource Budget System

* [X] Create a common `RenderBudget` interface.
* [X] Define separate **soft limits** and **hard limits**.
* [X] Let plugins receive the current budget before generating a model.
* [X] Validate every generated model against hard limits before accepting it.
* [X] Allow the renderer to reject an entire model when required limits are exceeded.
* [X] Allow the renderer to discard optional model parts when budgets are exceeded.
* [X] Require generated model parts to have explicit priorities.
* [X] Treat higher-priority parts as more important to preserve.
* [X] Require optional decorations to have lower priority than structural geometry.
* [X] Allow plugins to report estimated resource cost before generating expensive content.
* [X] Allow plugins to report actual resource cost after generation.
* [X] Record budget violations by plugin.
* [X] Expose budget violations in the developer HUD.
* [X] Log which portions of a model were removed because of limits.
* [X] Ensure a bad plugin cannot crash or freeze the renderer by generating excessive geometry.

# Per-Model Caps

* [X] Cap total `Object3D` count per generated model.
* [X] Cap total `Group` count.
* [X] Cap total mesh count.
* [X] Cap total instanced-mesh count.
* [X] Cap total sprite count.
* [X] Cap total `Points` objects.
* [X] Cap total line objects.
* [X] Cap total particle emitters.
* [X] Cap total geometry objects.
* [X] Cap total materials.
* [X] Cap total textures.
* [X] Cap total lights.
* [X] Cap total shadow-casting lights.
* [X] Cap total animation mixers.
* [X] Cap total skeletons.
* [X] Cap total bones.
* [X] Cap total morph targets.
* [X] Cap total model attachments.
* [X] Cap total collision shapes.
* [X] Cap total audio emitters associated with one model.

# Geometry Caps

* [X] Cap vertices per mesh.
* [X] Cap vertices per complete generated model.
* [X] Cap indexed vertices.
* [X] Cap triangle count per mesh.
* [X] Cap triangle count per model.
* [X] Cap line-segment count.
* [X] Cap point count.
* [X] Cap geometry groups.
* [X] Cap separate draw ranges.
* [X] Cap attributes per geometry.
* [X] Cap custom vertex attributes.
* [X] Cap vertex attribute byte size.
* [X] Reject geometry containing invalid `NaN` or infinite coordinates.
* [X] Reject geometry with unreasonable bounding dimensions.
* [X] Reject accidental ultra-dense geometry occupying a tiny visual area.
* [ ] Avoid truncating arbitrary triangle/index buffers mid-mesh.
* [ ] Drop an oversized optional mesh as a whole instead of corrupting its geometry.
* [ ] Allow plugins to provide a cheaper replacement for oversized meshes.
* [X] Validate that geometry index types are appropriate for vertex counts.

# Draw-Call Budgets

* [X] Estimate draw calls before adding generated content.
* [X] Cap draw calls per model.
* [X] Cap draw calls per tile.
* [X] Cap draw calls per chunk.
* [X] Cap total scene draw calls.
* [X] Count each material group as a potential draw call.
* [X] Penalize models containing many material groups.
* [X] Prefer one mesh with one shared material over many tiny meshes.
* [X] Encourage instancing when many identical parts are generated.
* [X] Automatically reduce distant detail when scene draw-call budget is high.
* [X] Add warnings for plugins that produce unusually high draw-call-to-triangle ratios.

# Material Caps

Given the heap issue you just saw, I would take this very seriously.

* [X] Cap materials per model.
* [X] Cap materials per LOD.
* [X] Cap unique materials per plugin.
* [X] Cap total unique materials in the active scene.
* [X] Encourage plugins to request materials from a shared material registry.
* [X] Prefer shared material references instead of `material.clone()`.
* [X] Detect identical or equivalent materials that could be shared.
* [X] Warn when a plugin creates a material for every object instance.
* [X] Avoid creating separate materials solely for color variation.
* [ ] Use instance colors where possible.
* [ ] Use vertex colors where possible.
* [ ] Use uniforms for cheap variation where sharing permits it.
* [X] Cap material texture slots.
* [X] Cap shader complexity classes.
* [X] Avoid unique shader `define` combinations unless necessary.
* [X] Cache common material variants.
* [X] Dispose rejected materials immediately.
* [X] Dispose no-longer-used plugin-generated materials safely.

# Texture Dimension Caps

* [X] Set maximum texture width.
* [X] Set maximum texture height.
* [X] Set maximum texture pixel count.
* [X] Set maximum texture count per model.
* [X] Set maximum texture count per material.
* [X] Set lower texture limits for distant LODs.
* [ ] Reject textures above hardware-supported dimensions.
* [ ] Downscale oversized procedural textures when safe.
* [ ] Allow plugins to provide lower-resolution fallback textures.
* [ ] Avoid loading 4K textures for small world objects.
* [ ] Avoid unique textures where procedural tinting can produce variation.
* [ ] Prefer shared atlases for related props.

# Texture Memory Budgets

Do not rely only on file size.

* [X] Estimate decoded texture memory.
* [X] Include mipmap memory in estimates.
* [X] Track GPU texture-memory estimates separately from JavaScript heap.
* [X] Cap estimated texture bytes per model.
* [X] Cap estimated texture bytes per chunk.
* [X] Cap estimated texture bytes per plugin.
* [X] Cap estimated texture bytes for the active scene.
* [ ] Prefer compressed texture formats where available.
* [ ] Reduce texture quality dynamically under memory pressure.
* [ ] Evict unused texture groups using an LRU strategy.
* [ ] Keep frequently reused shared textures resident when advantageous.

# Texture Feature Caps

* [ ] Cap anisotropy according to graphics quality.
* [ ] Avoid maximum anisotropy on every texture.
* [ ] Disable mipmaps where they provide no benefit.
* [ ] Require mipmaps for appropriate distant 3D surfaces.
* [ ] Limit expensive filtering modes.
* [ ] Limit simultaneous high-resolution normal maps.
* [ ] Limit displacement maps.
* [ ] Limit environment maps.
* [ ] Limit reflection/refraction textures.
* [ ] Limit procedural render-target textures.
* [ ] Limit texture array/layer counts.

# Render-Target Caps

These can quietly consume huge amounts of GPU memory.

* [ ] Cap render-target width and height.
* [ ] Cap number of active render targets.
* [ ] Cap total render-target pixel count.
* [ ] Cap multisampled render-target sample count.
* [ ] Dispose temporary render targets promptly.
* [ ] Reuse compatible render targets from a pool.
* [ ] Lower reflection render-target resolution.
* [ ] Lower shadow or reflection targets according to distance.
* [ ] Avoid allocating separate full-resolution targets for individual objects.

# LOD Budget System

* [ ] Define budgets separately for each LOD.
* [ ] Make LOD0 the most generous budget.
* [ ] Reduce triangle limits substantially for LOD1.
* [ ] Reduce mesh/material limits substantially for LOD1.
* [ ] Reduce texture sizes for LOD1.
* [ ] Reduce animation complexity for LOD1.
* [ ] Make LOD2 preserve recognizable shape rather than fine detail.
* [ ] Limit LOD2 to very few materials.
* [ ] Remove small attachments from LOD2.
* [ ] Remove small wildlife/decorations from LOD2.
* [ ] Disable most animation at LOD2.
* [ ] Make LOD3 use extremely cheap representations.
* [ ] Support billboard/impostor LOD where appropriate.
* [ ] Avoid generating high-detail models before determining requested LOD.
* [X] Pass LOD budget to plugins before generation.
* [X] Validate plugin-generated LOD against the requested LOD budget.
* [ ] Allow the renderer to substitute a lower LOD if the requested one exceeds available scene resources.

# Example LOD Caps to Start Testing

These should be **starting points**, not universal rules.

```text
LOD 0 — Close / Hero

Objects:          64
Meshes:           32
Triangles:        25,000
Materials:        6
Textures:         8
Texture max:      2048×2048
Lights:           2
Shadow lights:    1
Bones:            100
```

```text
LOD 1 — Nearby

Objects:          32
Meshes:           16
Triangles:        8,000
Materials:        3
Textures:         4
Texture max:      1024×1024
Lights:           1
Shadow lights:    0
Bones:            60
```

```text
LOD 2 — Distant

Objects:          8
Meshes:           4
Triangles:        1,500
Materials:        1–2
Textures:         2
Texture max:      512×512
Lights:           0
Bones:            0–20
```

```text
LOD 3 — Very Distant

Objects:          1–2
Meshes:           1
Triangles:        2–200
Materials:        1
Textures:         1
Texture max:      256×256 or 512×512
Lights:           0
Animation:        none
```

* [ ] Make these values configurable instead of hard-coding them permanently.
* [ ] Tune values independently for characters, buildings, trees, and tiny props.
* [ ] Allow “hero” objects to request larger budgets when justified.

# Size-on-Screen Budgeting

This can be smarter than distance alone.

* [ ] Estimate projected screen size of models.
* [ ] Give small screen-space objects smaller geometry budgets.
* [ ] Give objects occupying many pixels larger budgets.
* [ ] Reduce texture resolution when a texture is mapped to only a small number of pixels.
* [ ] Reduce shadow complexity for objects occupying tiny screen areas.
* [ ] Skip tiny decorations below a screen-size threshold.
* [ ] Use projected-size thresholds to switch to impostors.
* [ ] Avoid spending thousands of triangles on objects covering ten pixels.

# Scene-Level Caps

This is critical because individually valid models can still overwhelm the renderer collectively.

* [X] Cap total visible objects.
* [X] Cap total visible meshes.
* [X] Cap total visible triangles.
* [X] Cap total visible vertices.
* [X] Cap total scene draw calls.
* [X] Cap total scene materials.
* [X] Cap total active textures.
* [X] Cap estimated GPU memory.
* [ ] Cap total animated characters.
* [ ] Cap total active skeletons.
* [ ] Cap total bones being evaluated per frame.
* [ ] Cap total particle count.
* [X] Cap total lights.
* [X] Cap total shadow lights.
* [ ] Cap total active audio emitters.
* [ ] Cap total reflection surfaces.
* [ ] Cap total expensive shader instances.
* [ ] Cap total active physics objects.

# Chunk-Level Caps

* [X] Cap objects per chunk.
* [X] Cap meshes per chunk.
* [X] Cap triangles per chunk.
* [ ] Cap foliage count per chunk.
* [ ] Cap particles per chunk.
* [ ] Cap lights per chunk.
* [ ] Cap audio sources per chunk.
* [ ] Cap animated objects per chunk.
* [ ] Cap unique materials per chunk.
* [ ] Cap textures introduced by one chunk.
* [ ] Lower chunk detail automatically when several dense chunks are visible simultaneously.

# Plugin-Level Caps

* [ ] Track resource usage by plugin.
* [ ] Give each plugin a maximum active-object budget.
* [ ] Give each plugin a maximum geometry budget.
* [ ] Give each plugin a maximum texture-memory budget.
* [ ] Give each plugin a maximum material count.
* [ ] Give each plugin a maximum draw-call contribution.
* [ ] Give each plugin a maximum active-light count.
* [ ] Give each plugin a maximum animation contribution.
* [ ] Prevent one plugin from consuming the entire scene budget.
* [ ] Reduce the offending plugin's distant LODs first.
* [ ] Temporarily disable optional plugin effects if it repeatedly exceeds budget.
* [ ] Surface plugin resource usage in debug tools.

# Priority-Based Model Parts

* [ ] Require every optional model part to expose a priority.
* [ ] Define reserved priority ranges.
* [ ] Place essential structural components at highest priority.
* [ ] Put silhouette-defining components above decorative details.
* [ ] Put interaction-critical components above cosmetic components.
* [ ] Give collisions their own independent priority.
* [ ] Give quest-significant visible components high priority.
* [ ] Give tiny decorations low priority.
* [ ] Sort optional parts before budget allocation.
* [ ] Stop accepting lower-priority parts after budget exhaustion.
* [ ] Do not assume generation order unless explicitly documented.
* [ ] Support `required: true` for model parts that must render together.
* [ ] Support groups of parts that should be accepted or rejected atomically.

For example:

```ts
interface GeneratedModelPart {
  priority: number;
  required?: boolean;
  group?: string;
  object: THREE.Object3D;
}
```

# Semantic Importance

* [ ] Mark a model's trunk/body/main structure as essential.
* [ ] Mark collision-significant geometry as essential.
* [ ] Mark player-interactable geometry as important.
* [ ] Mark quest objects as important.
* [ ] Mark visual landmarks as important.
* [ ] Mark tiny ambient decorations as disposable.
* [ ] Prefer dropping decorative geometry before structural geometry.
* [ ] Prefer dropping invisible-backside details before silhouette changes.
* [ ] Preserve gameplay information even under low graphics settings.

# Lights

Hard-cap these aggressively.

* [ ] Cap point lights per model.
* [ ] Cap spotlights per model.
* [ ] Cap directional lights created by plugins.
* [ ] Generally prohibit model plugins from creating global directional lights.
* [ ] Cap shadow-casting lights to an especially low number.
* [ ] Treat every shadow light as a high-cost resource.
* [ ] Prefer emissive materials to actual lights for distant glows.
* [ ] Group nearby decorative light sources where possible.
* [ ] Replace many small lights with one approximate light.
* [ ] Turn off distant local lights.
* [ ] Disable shadows first when reducing lighting quality.
* [ ] Prevent individual fireflies, candles, crystals, etc. from each creating full dynamic lights.

# Shadow Budgets

* [ ] Cap shadow-casting objects.
* [ ] Cap shadow-casting lights.
* [ ] Cap total shadow-map pixels.
* [ ] Cap shadow-map resolution per light.
* [ ] Reduce shadow resolution with distance.
* [ ] Limit cascaded shadow count if used.
* [ ] Disable shadows on very small objects.
* [ ] Disable shadows for distant vegetation.
* [ ] Use simplified shadow geometry for complex models.
* [ ] Avoid alpha-heavy foliage casting expensive high-detail shadows at distance.
* [ ] Let only important nearby lights update dynamic shadows.

# Skeleton and Animation Caps

* [ ] Cap skeleton bones per character/model.
* [ ] Cap bones evaluated per frame across the whole scene.
* [ ] Cap simultaneous animation mixers.
* [ ] Cap animation layers per character.
* [ ] Cap morph targets.
* [ ] Cap simultaneous active morph influences.
* [ ] Reduce animation update rate with distance.
* [ ] Freeze very distant characters into static poses.
* [ ] Use simplified skeletons for distant LODs.
* [ ] Disable finger animation at medium distance.
* [ ] Disable facial animation at long distance.
* [ ] Disable IK at long distance.
* [ ] Cap procedural IK solves per frame.

# Particle Budgets

* [ ] Cap particles per emitter.
* [ ] Cap particles per model.
* [ ] Cap particles per chunk.
* [ ] Cap total visible particles.
* [ ] Cap particle emitters.
* [ ] Reduce particle density with distance.
* [ ] Reduce lifetime before reducing important foreground particle quality.
* [ ] Stop offscreen emitters.
* [ ] Stop emitters hidden behind opaque geometry if practical.
* [ ] Prevent particles from creating individual `Object3D`s.
* [ ] Use one GPU-friendly system for many particles.
* [ ] Cap transparent-pixel coverage to reduce overdraw.

# Transparency / Overdraw Budgets

* [ ] Track transparent material count.
* [ ] Cap transparent meshes per model.
* [ ] Cap layered transparent surfaces.
* [ ] Avoid large overlapping transparent quads.
* [ ] Prefer alpha testing for foliage where acceptable.
* [ ] Avoid full transparency for distance fading when alternatives exist.
* [ ] Reduce transparent particle effects under GPU pressure.
* [ ] Warn when a plugin creates large full-screen transparent geometry.
* [ ] Treat excessive overdraw as a resource-budget violation.

# Shader Budgets

* [ ] Classify shaders by complexity.
* [ ] Cap custom shader count.
* [ ] Cap unique shader program combinations.
* [ ] Limit texture samples per shader.
* [ ] Limit dynamic branches in frequently used shaders.
* [ ] Limit expensive noise calculations per fragment.
* [ ] Reduce procedural fragment effects with distance.
* [ ] Avoid compiling unique shaders for each generated object.
* [ ] Prefer shared shader programs with instance parameters.
* [ ] Track shader compilation count.
* [ ] Track shader program count.
* [ ] Flag plugins that continuously cause new program creation.

# Physics Caps

* [ ] Cap rigid bodies per model.
* [ ] Cap active rigid bodies per chunk.
* [ ] Cap dynamic bodies globally.
* [ ] Cap collision shapes per object.
* [ ] Prefer primitive collision shapes.
* [ ] Cap convex-hull vertex counts.
* [ ] Avoid detailed triangle meshes for moving physics bodies.
* [ ] Allow static collision meshes only where necessary.
* [ ] Put sleeping bodies to sleep aggressively.
* [ ] Disable physics for distant objects.
* [ ] Limit destructible fragments.
* [ ] Limit active ragdolls.
* [ ] Convert old ragdolls into static representations.
* [ ] Cap physics simulation steps per frame.

# Collision Caps

* [ ] Keep render geometry and collision geometry separate.
* [ ] Cap collision vertices.
* [ ] Cap collision polygons.
* [ ] Cap collider count.
* [ ] Reject tiny decorative colliders.
* [ ] Merge nearby static colliders where useful.
* [ ] Disable collision for purely visual decorations.
* [ ] Use simplified bounding boxes/capsules/spheres.
* [ ] Keep collision complexity constant across visual LOD where possible.

# Raycast Budgets

* [ ] Cap raycasts per frame.
* [ ] Cap AI visibility raycasts.
* [ ] Cap interaction raycasts.
* [ ] Cap projectile raycasts.
* [ ] Exclude decorative meshes from raycast layers.
* [ ] Use bounding volumes before triangle-level raycasts.
* [ ] Use simplified raycast geometry.
* [ ] Batch or stagger expensive line-of-sight checks.

# Audio Caps

* [ ] Cap positional audio sources per model.
* [ ] Cap positional audio sources per chunk.
* [ ] Cap total active audio voices.
* [ ] Prioritize gameplay-critical sounds.
* [ ] Drop low-priority distant sounds first.
* [ ] Aggregate similar ambient sounds.
* [ ] Avoid one continuous sound source per tree or environmental object.
* [ ] Cap active procedural oscillators.
* [ ] Cap reverb/effect nodes.
* [ ] Share environmental reverb buses.
* [ ] Disconnect finished audio nodes.
* [ ] Reduce audio complexity dynamically under CPU pressure.

# CPU Generation Budgets

* [ ] Measure generation time per plugin call.
* [ ] Set a soft generation-time budget.
* [ ] Set a hard generation-time budget.
* [ ] Break expensive generators into incremental jobs.
* [ ] Reject or defer generators that exceed frame-time limits.
* [ ] Run expensive generation in workers where appropriate.
* [ ] Cap generation jobs processed per frame.
* [ ] Cap plugin work queue lengths.
* [ ] Cancel stale requests.
* [ ] Deduplicate identical requests.
* [ ] Cache deterministic generation results.
* [ ] Bound generation caches.
* [ ] Detect generators whose execution time increases unexpectedly with repeated use.

# Main-Thread Frame Budget

* [ ] Establish a 16.7 ms total frame budget for 60 FPS.
* [ ] Reserve a portion for rendering.
* [ ] Reserve a portion for simulation.
* [ ] Reserve a portion for UI.
* [ ] Reserve a small portion for background generation.
* [ ] Stop processing noncritical queues once frame budget is exhausted.
* [ ] Resume deferred work on future frames.
* [ ] Track worst-frame duration.
* [ ] Dynamically reduce optional work after repeated slow frames.

A possible conceptual target:

```text
16.7 ms frame

Simulation       3 ms
Animation        2 ms
Generation       2 ms
Render CPU       4 ms
GPU              10 ms independently
UI/other         1 ms
Headroom          ~4 ms
```

The exact numbers will need profiling.

# Memory Budgets

* [ ] Define target JavaScript heap usage.
* [ ] Define warning heap usage.
* [ ] Define critical heap usage.
* [ ] Define estimated GPU-memory targets.
* [ ] Set model-cache maximum bytes.
* [ ] Set geometry-cache maximum bytes.
* [ ] Set texture-cache maximum bytes.
* [ ] Set audio-buffer-cache maximum bytes.
* [ ] Use LRU eviction for bounded caches.
* [ ] Lower visual quality before hitting critical memory.
* [ ] Purge optional caches under memory pressure.
* [ ] Avoid keeping multiple high-detail LODs resident when not needed.
* [ ] Retain cheap logical state while discarding expensive render state.
* [ ] Track peak memory usage over time.

# Geometry Cache Caps

* [ ] Cap total cached geometries.
* [ ] Cap cached geometry bytes.
* [ ] Cache frequently reused geometry.
* [ ] Evict rarely used procedural geometry.
* [ ] Avoid caching one-off unique geometry indefinitely.
* [ ] Recreate deterministic geometry when cheaper than permanently storing it.
* [ ] Track geometry cache hit rate.
* [ ] Remove cache entries with consistently poor reuse.

# Material Cache Caps

* [ ] Cap material variants.
* [ ] Use meaningful cache keys.
* [ ] Share cached materials between compatible plugins.
* [ ] Prevent random seeds from becoming material-cache keys unnecessarily.
* [ ] Evict unused variants.
* [ ] Dispose evicted materials correctly.
* [ ] Track hit/miss ratios.

# Dynamic Hardware Budgets

This is where the system gets especially useful.

* [ ] Detect `navigator.hardwareConcurrency`.
* [ ] Consider `navigator.deviceMemory` where available.
* [ ] Detect maximum supported texture size.
* [ ] Detect GPU/WebGL capabilities.
* [ ] Detect maximum anisotropy.
* [ ] Detect available compressed texture formats.
* [ ] Detect WebGL/WebGPU renderer limits where relevant.
* [ ] Build Low/Medium/High/Ultra budgets from hardware capability.
* [ ] Allow manual override.
* [ ] Avoid assuming a high-end desktop GPU.
* [ ] Test integrated graphics explicitly.
* [ ] Test laptops under thermal throttling.
* [ ] Reduce quality if sustained frame time exceeds the target.
* [ ] Raise quality only after sustained good performance.

# Dynamic Performance Response

* [ ] Monitor rolling average frame time.
* [ ] Monitor worst recent frames.
* [ ] Monitor draw calls.
* [ ] Monitor visible triangles.
* [ ] Monitor material count.
* [ ] Monitor active lights.
* [ ] Monitor heap growth.
* [ ] Monitor worker queue depth.
* [ ] Lower distant LOD first when performance suffers.
* [ ] Reduce shadow distance next.
* [ ] Reduce particle density next.
* [ ] Reduce vegetation density next.
* [ ] Reduce dynamic-light count next.
* [ ] Reduce render scale if GPU-limited.
* [ ] Avoid lowering important nearby object quality unless necessary.
* [ ] Recover quality slowly to prevent oscillation.

# Budget Hysteresis

Just like LOD, dynamic optimization needs hysteresis.

* [ ] Do not increase quality immediately after one fast frame.
* [ ] Do not decrease quality after one isolated slow frame.
* [ ] Require sustained poor performance before lowering quality.
* [ ] Require longer sustained good performance before raising quality.
* [ ] Add cool-down times between quality transitions.
* [ ] Avoid rapidly reallocating resources as quality changes.

# Plugin Capability Negotiation

* [ ] Add `supports("lod")`.
* [ ] Add `supports("budget")`.
* [ ] Add `supports("instancing")`.
* [ ] Add `supports("shared-materials")`.
* [ ] Add `supports("texture-atlas")`.
* [ ] Add `supports("simplified-collision")`.
* [ ] Add `supports("billboard")`.
* [ ] Add `supports("dynamic-quality")`.
* [ ] Add `supports("shadow-lod")`.
* [ ] Add `supports("animation-lod")`.
* [ ] Add `supports("incremental-generation")`.
* [ ] Add `supports("worker-generation")`.
* [ ] Provide renderer fallbacks for older plugins.
* [ ] Never require a newly introduced capability for old plugins to remain functional.

# Proposed Plugin Request

Something roughly like:

```ts
interface ModelGenerationRequest {
  lod: number;
  distance: number;
  projectedPixels?: number;

  budget: RenderBudget;

  quality: "low" | "medium" | "high" | "ultra";

  capabilities: {
    shadows: boolean;
    animation: boolean;
    interactions: boolean;
    physics: boolean;
  };
}
```

* [ ] Pass this request to every model-generating plugin.
* [ ] Encourage plugins to generate directly for the requested budget.
* [ ] Avoid generating full-quality content and trimming afterward whenever possible.

# Model Validation

* [ ] Walk the returned `Object3D` hierarchy once.
* [ ] Count objects.
* [ ] Count meshes.
* [ ] Count vertices.
* [ ] Count triangles.
* [ ] Count line segments.
* [ ] Count points.
* [ ] Count geometries.
* [ ] Count materials.
* [ ] Count textures.
* [ ] Estimate texture memory.
* [ ] Estimate geometry memory.
* [ ] Estimate draw calls.
* [ ] Count lights.
* [ ] Count shadow lights.
* [ ] Count skeleton bones.
* [ ] Count morph targets.
* [ ] Count audio emitters.
* [ ] Calculate bounding dimensions.
* [ ] Detect invalid geometry.
* [ ] Detect runaway hierarchy depth.
* [ ] Detect circular or invalid references where relevant.
* [ ] Cache validation results for immutable models.

# Hierarchy Caps

One thing that is easy to overlook:

* [ ] Cap scene-node hierarchy depth.
* [ ] Warn about deeply nested `Group` structures.
* [ ] Flatten unnecessary wrapper groups.
* [ ] Avoid one-child groups unless they serve a real transform/semantic purpose.
* [ ] Cap children per node where pathological structures could hurt traversal.
* [ ] Avoid recursively traversing enormous trees every frame.

# Bounding Volume Validation

* [ ] Require generated models to have valid bounds.
* [ ] Recompute missing bounding boxes.
* [ ] Recompute missing bounding spheres.
* [ ] Reject absurdly large bounds caused by bad procedural values.
* [ ] Validate collision bounds separately.
* [ ] Use model bounds for frustum and distance culling.
* [ ] Avoid objects with infinite or effectively global bounds that defeat culling.

# Instancing Goals

* [ ] Detect repeated geometries within one generated model.
* [ ] Detect repeated material/geometry combinations.
* [ ] Suggest instancing in debug mode.
* [ ] Allow plugin output to request instancing.
* [ ] Cap individual mesh count more aggressively when instancing is supported.
* [ ] Prefer hundreds of instances over hundreds of separate meshes.
* [ ] Support per-instance transforms.
* [ ] Support per-instance color.
* [ ] Support per-instance simple state values where shaders permit.

# Optional Feature Shedding Order

I would explicitly define what gets sacrificed first.

* [ ] Drop tiny cosmetic attachments first.
* [ ] Drop insects and small wildlife.
* [ ] Drop individual fruit/flowers.
* [ ] Drop tiny branches.
* [ ] Drop minor decals.
* [ ] Drop small particles.
* [ ] Reduce foliage clusters.
* [ ] Reduce shadows.
* [ ] Reduce animation complexity.
* [ ] Reduce texture resolution.
* [ ] Replace detailed geometry with lower LOD.
* [ ] Preserve gameplay-critical geometry until last.
* [ ] Preserve collision independently.
* [ ] Preserve recognizable silhouette for as long as possible.

# Per-Category Budgets

* [ ] Create separate defaults for trees.
* [ ] Create separate defaults for rocks.
* [ ] Create separate defaults for buildings.
* [ ] Create separate defaults for furniture.
* [ ] Create separate defaults for characters.
* [ ] Create separate defaults for monsters.
* [ ] Create separate defaults for vehicles.
* [ ] Create separate defaults for cave formations.
* [ ] Create separate defaults for tiny props.
* [ ] Create separate defaults for world landmarks.
* [ ] Allow exceptional “hero” objects larger budgets.

A barrel should not get the same budget as a cathedral.

# Performance HUD

* [X] Show active objects.
* [X] Show visible meshes.
* [X] Show triangles.
* [X] Show vertices.
* [X] Show draw calls.
* [X] Show materials.
* [X] Show textures.
* [X] Show estimated texture memory.
* [X] Show geometry memory.
* [X] Show shader programs.
* [X] Show lights.
* [X] Show shadow lights.
* [X] Show particles.
* [ ] Show skeletons.
* [ ] Show bones currently animated.
* [X] Show audio voices.
* [X] Show loaded chunks.
* [X] Show model generation queue size.
* [X] Show active render quality level.
* [X] Show which budget is currently limiting quality.

# Per-Plugin Debugging

* [ ] Show objects contributed by each plugin.
* [ ] Show meshes contributed by each plugin.
* [ ] Show triangles contributed by each plugin.
* [ ] Show materials contributed by each plugin.
* [ ] Show texture memory contributed by each plugin.
* [ ] Show draw calls contributed by each plugin.
* [ ] Show lights contributed by each plugin.
* [ ] Show generation CPU time by plugin.
* [ ] Show validation failures by plugin.
* [ ] Rank plugins by current resource cost.
* [ ] Rank plugins by resource cost per visible object.

# Automatic Warnings

* [ ] Warn when a model exceeds its soft object cap.
* [ ] Warn when it exceeds triangle cap.
* [ ] Warn when it exceeds material cap.
* [ ] Warn when it exceeds texture-memory cap.
* [ ] Warn when it exceeds light cap.
* [ ] Warn when it exceeds draw-call cap.
* [ ] Warn when it exceeds generation-time cap.
* [ ] Warn when one plugin consumes an abnormal share of scene resources.
* [ ] Warn when material count grows while standing still.
* [ ] Warn when texture count grows while standing still.
* [ ] Warn when geometries grow while standing still.
* [ ] Warn when LOD transitions continually allocate new resources.
* [ ] Include plugin name and generated object ID in warning output.

# Hard Failure Behavior

* [ ] Never freeze the renderer attempting to process pathological plugin output.
* [ ] Reject model output exceeding absolute safety limits.
* [ ] Replace rejected models with a cheap placeholder.
* [ ] Preserve collision if safe and necessary.
* [ ] Log why the model was rejected.
* [ ] Do not repeatedly regenerate a model known to fail.
* [ ] Cache failure state temporarily.
* [ ] Allow developers to inspect rejected output separately.
* [ ] Dispose rejected resources immediately.

# Benchmarking the Caps

* [ ] Create a dense forest benchmark.
* [ ] Create a cave benchmark.
* [ ] Create a crowded town benchmark.
* [ ] Create a large battle benchmark.
* [ ] Create a building-interior benchmark.
* [ ] Create a particle-heavy magic benchmark.
* [ ] Create a nighttime-light benchmark.
* [ ] Record performance at each quality preset.
* [ ] Record memory consumption.
* [ ] Adjust caps based on actual measured performance.
* [ ] Do not choose permanent limits purely from theoretical numbers.
* [ ] Store benchmark history to catch regressions.

# A Useful Overall Budget Shape

I’d probably evolve toward something like:

```ts
interface RenderBudget {
  objects: ResourceLimit;
  meshes: ResourceLimit;

  vertices: ResourceLimit;
  triangles: ResourceLimit;
  drawCalls: ResourceLimit;

  geometries: ResourceLimit;
  materials: ResourceLimit;

  textures: {
    count: ResourceLimit;
    bytes: ResourceLimit;
    maxWidth: number;
    maxHeight: number;
  };

  lights: ResourceLimit;
  shadowLights: ResourceLimit;

  particles: ResourceLimit;

  animation: {
    skeletons: ResourceLimit;
    bones: ResourceLimit;
    morphTargets: ResourceLimit;
  };

  physics: {
    bodies: ResourceLimit;
    colliders: ResourceLimit;
  };

  audio: {
    voices: ResourceLimit;
  };

  memory: {
    cpuBytes: number;
    gpuBytes: number;
  };

  generationTimeMs: number;
}
```

with:

```ts
interface ResourceLimit {
  soft: number;
  hard: number;
}
```

The most important architectural rule would be:

```text
AVAILABLE RESOURCES
        ↓
Scene budget
        ↓
Chunk budget
        ↓
Plugin budget
        ↓
Model budget
        ↓
LOD budget
        ↓
Prioritized model parts
```

That lets the game react to the **actual machine and actual scene** instead of saying “every tree may have 25,000 triangles” regardless of whether there are 10 trees or 10,000.

Make **unique materials, estimated draw calls, texture memory, lights, and model generation time just as important as triangle counts**. Those are exactly the kinds of costs that are easy for a plugin developer to overlook while the model still appears visually reasonable.
