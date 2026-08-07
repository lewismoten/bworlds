# Plugin System

The plugin system now has two layers:

- runtime hooks for map decoration and content tweaks
- tile plugins that can own overworld placement, 2D rendering, and 3D model generation for a tile kind

## Registry

`@bworlds/plugin-api` exports `PluginRegistry`, which stores plugin objects, indexed tile plugins, and invokes named hooks in registration order.

The registry now supports:

- `register(plugin)`
- `registerPack(pack)`
- `getTilePlugin(kind)`
- `classifyTerrainTile(payload)`
- `classifyOverworldTile(payload)`
- `createMap(payload)`
- `resolveOverworldTile(payload)`
- `resolveOverworldAnchors(payload)`
- `resolveFloorKind3D(payload)`
- `createWorldAction(payload)`
- `decorateOverworldTile(payload)`
- `decorateTownTile(payload)`
- `decorateBuildingTile(payload)`
- `decorateDepthTile(payload)`
- `setActivePluginRegistry(registry)` and `getActivePluginRegistry()` for render/runtime packages that need the shared tile registry at runtime
- `createDefaultTilePlugins()` and `createDefaultPluginRegistry()` from `@bworlds/worldgen` so apps and tests can boot the same built-in tile/plugin set from one shared entry point
- `listBuiltinContentPacks()`, `listContentPacks(packDefinitions)`, `createPluginRegistryFromPack(packId, packDefinitions)`, and `createPluginRegistryFromPacks(packIds, packDefinitions)` from `@bworlds/worldgen` for manifest-driven pack selection and composition
- `createWorldRuntime(...)` from `@bworlds/worldgen` for shared registry/generator/state bootstrap with built-in or caller-supplied pack definitions plus saved-session rehydration
- `createPluginPackCatalog(...)` from `@bworlds/plugin-api` for a reusable shared pack catalog that can list manifests, validate pack ids, expose default selections, and create registries for either built-in or external content-pack definitions

It also now exports typed contexts for:

- base terrain classification
- overworld placement
- 2D atlas painting
- 3D model generation
- 3D occupancy / collision checks
- map creation and interior decoration

Those shared contexts now match the runtime payload shapes used by the built-in packages: tile hooks receive numeric `tileX`/`tileY` coordinates, movement hooks receive `nextX`/`nextY`, and map interfaces use `getTile(x, y)` and `getAction(x, y)` rather than an older point-object convention. That makes the published contract a more reliable target for external plugin packages.

It also exports shared runtime shapes such as `WorldStateLike` and `RuntimePlayerLike` so tile and map packages can depend on player position, current context, tile sampling, and tile-definition lookup through a stable API instead of reaching into app-specific state objects or importing core fallback tables directly.

Tile packages can now also contribute `definition` metadata directly on their tile entries. `PluginRegistry` stores those definitions and exposes `getTileDefinition(kind)`, `resolveTileDefinition(kind, fallback)`, `listTileDefinitions()`, and `listResolvedTileDefinitions(fallbackEntries)` so renderers, atlases, and app bootstrap code can resolve plugin-owned tile metadata through one shared plugin-aware API instead of each reimplementing its own fallback merge logic.

Tile plugins can also mark one tile entry as `isDefaultTile`, which lets the registry expose `getDefaultTileKind()` and `getDefaultTileDefinition()`. The overworld composition path now uses that plugin-owned default tile as its initial terrain draft instead of assuming `plains`, which makes the base terrain of a content-pack stack configurable through the same shared tile contract.

The atlas and 3D renderer now consume the active plugin registry directly for tile-definition discovery, rather than importing the built-in core tile table as their primary source of truth. That keeps visible tile catalogs aligned with the currently selected content-pack stack, which matters for overlay packs and future external packages that introduce new tile kinds.

`@bworlds/core` now treats tile-definition fallback more generically. The built-in tile-definition catalog used by the default world stack is derived from `@bworlds/content-pack-default`, which keeps ownership of those built-in definitions closer to the tile plugins that actually provide them instead of treating one built-in catalog as a universal engine primitive.

For 3D generation hooks it now also exposes named host-side types such as `ThreeHostLike` and `ThreeMaterialLike`/`ThreeTextureLike`. These are still lightweight abstractions over the renderer host, but they give plugin packages a shared vocabulary for model-generation dependencies without requiring renderer-owned ad hoc material bags in the tile contract.

Shared seeded helpers now live in `@bworlds/core` for things like deterministic POI naming, so tile packages can reuse the same naming and noise-driven conventions without depending on `worldgen` internals.

## Supported hooks

- `decorateOverworldTile`
- `decorateTownTile`
- `decorateBuildingTile`
- `decorateDepthTile`

Each hook receives a mutable payload with the current tile draft, context, coordinates, and seed data.

## Tile plugin contract

A tile plugin can expose a `tiles` array. Each tile entry is keyed by `kind` and may implement:

- `definition` to provide the tile's shared metadata such as name, colors, walkability, and wall height
- `classifyTerrainTile(context)` to participate in the base terrain pass before roads and POIs are applied
- `classifyOverworldTile(context)` to propose or replace a tile during overworld generation
- `paint2D(context)` to render the tile into the atlas sprite
- `paint2DOverlay(context)` to draw optional animated or runtime-aware 2D effects on top of the cached atlas sprite
- `create3DModel(context)` to return a custom 3D model for that tile in the perspective renderer
- `canOccupy3D(context)` to block or allow smooth movement against tile-owned geometry such as trees
- `getSurfaceProfile3D(context)` to describe shared 3D surface behavior such as lowered water, bridge underlays, or bank/chamfer transitions
- `getTraversalProfile3D(context)` to describe shared movement semantics such as route grouping or bridge slide axes
- `resolveFloorKind3D(context)` to pick the 3D floor texture kind for overlay tiles such as roads without hardcoding that decision in the renderer

This lets one package own the full lifecycle for a tile family instead of spreading its logic across the generator, atlas, and renderer packages.

For terrain/water boundaries, `SurfaceProfile3D` now also carries optional `boundaryTransition` metadata so tiles can declare how neighboring land should taper toward them in 3D. First-party water and bridge tiles now provide those settings through the shared `createBoundarySurfaceProfile(...)` helper in `@bworlds/tile-support`, which moves river/ocean bank tuning out of the renderer and into tile-owned packages.

For package authoring, `@bworlds/plugin-api` now also exposes `createTilePlugin(...)` so tile packages can use a shared wrapper for the common `name + tiles` plugin shape instead of repeating that outer boilerplate by hand.

All current first-party tile packages now use that helper, so external packages have one consistent pattern to copy whether they only provide metadata, or also implement placement, painting, traversal, collision, and custom 3D models.

## Map plugin contract

A runtime plugin can also expose `createMap(context)` plus decoration hooks for specific map families.

`@bworlds/map-support` now provides small shared helpers for child-context creation, common enter/deepen/exit action wiring, and `createContextMapPlugin(...)` for the repeated “only handle these context types, then delegate to a map factory” wrapper. That lets new map packages share the same routing and transition semantics instead of hand-building those outer plugin shells each time.

Current first-party map plugins are:

- `@bworlds/map-overworld`
- `@bworlds/map-town`
- `@bworlds/map-building`
- `@bworlds/map-depth`

This keeps overworld, settlement, building, and depth generation independently swappable while still sharing the same `PluginRegistry`, seeded helpers, and world-state API.

`@bworlds/map-overworld` is now narrower than before: it focuses on terrain-signal sampling and map assembly, while curated start-region tiles and overworld anchor generation live in separate runtime packages. That keeps more of the default overworld flavor in ordinary runtime plugins instead of bundling it into the map package itself.

## Runtime content plugins

Not every extension point belongs to a single tile kind or a whole map generator. Some packages just add flavor or small behavioral tweaks through runtime hooks.

Current first-party runtime content plugins are:

- `@bworlds/runtime-wayfinding`
- `@bworlds/runtime-depth-flavor`
- `@bworlds/runtime-frontier-flavor`
- `@bworlds/runtime-start-region`
- `@bworlds/runtime-overworld-anchors`

These demonstrate that town/depth/overworld decoration and overworld composition support can be shipped as standalone packages and registered alongside map and tile plugins.

For package authoring, `@bworlds/plugin-api` now also exposes `createRuntimePlugin(...)` so lightweight runtime-flavor packages can share the same outer plugin shape instead of hand-writing `{ name, hook }` wrappers in each package.

## Content Packs

`@bworlds/content-pack-default` now owns the built-in plugin composition order for maps, runtime content, and tile packages. `PluginRegistry.registerPack(...)` applies those groups in stage order, which makes the default world stack more declarative and gives future content packs a cleaner shared shape to target.

Plugins can also now declare lightweight `order` metadata with `priority`, `after`, and `before` so content packs can express intra-stage ordering without relying purely on array position.

`@bworlds/plugin-api` now also exports small authoring helpers like `withPluginOrder(...)` and `definePluginPack(...)` so content-pack packages can share the same ordering and manifest-definition conventions instead of reimplementing that boilerplate locally.

It also now exposes shared pack-catalog helpers such as `listPluginPackManifests(...)`, `resolvePluginPackDefinition(...)`, and `createPluginRegistryFromPackDefinitions(...)`. That lets pack-driven tooling and alternate bootstraps reuse the same manifest and registry-composition behavior without depending on `worldgen`.

For callers that want one reusable object instead of several loose helpers, `createPluginPackCatalog(...)` now wraps those behaviors into a shared catalog API with `defaultPackIds`, `list()`, `listSelected(...)`, `resolve(...)`, and `createRegistry(...)`. `@bworlds/worldgen` now uses that same catalog path for the built-in pack stack instead of owning a separate selection flow.

Built-in packs are no longer limited to one-at-a-time selection. `@bworlds/worldgen` can compose multiple built-in pack definitions into the same registry, which makes overlay packs a first-class pattern for additive flavor, alternate runtime systems, or future biome packs without forking the default overworld stack.

The bootstrap path is also no longer hard-wired to built-in manifests. Callers can pass their own `PluginPackDefinitionLike[]` into `listContentPacks(...)`, `createPluginRegistryFromPack(...)`, `createPluginRegistryFromPacks(...)`, or `createWorldRuntime(...)` so an external package can join the same registry/state pipeline without editing `worldgen`.

Current built-in packs include:

- `@bworlds/content-pack-default` for the base world stack
- `@bworlds/content-pack-frontier` for an additive overworld flavor overlay
- `@bworlds/content-pack-ruins` for an additive landmark overlay built from a standalone tile package

## Authoring pattern

The built-in monorepo now follows the same staged pattern across package families:

- tile packages use `createTilePlugin(...)`
- map packages use `createContextMapPlugin(...)`
- runtime flavor packages use `createRuntimePlugin(...)`
- content packs use `definePluginPack(...)` plus `withPluginOrder(...)`
- pack catalogs use `createPluginPackCatalog(...)`

That gives external packages a smaller shared API surface to learn while still letting each stage own its own world-placement logic, 2D painting, 3D models, traversal rules, map generation, or flavor hooks.

`@bworlds/content-pack-ruins` plus `@bworlds/tile-ruins` now serve as a concrete overlay example: the pack is not part of the default selection, but it plugs into the same pack catalog, uses the same seeded POI naming path, contributes its own placement rule, paints its own atlas tile, and generates its own 3D landmark model. That gives future package authors a small end-to-end reference for “add one new tile family without editing the default stack.”

## Shared 3D Helpers

`@bworlds/three-support` now provides shared canvas-texture setup helpers plus reusable spline/ribbon geometry helpers for plugin-owned 3D assets. Tile packages can use `createCanvasTexture(...)`, `createPaintedCanvasTexture(...)`, `createQuadraticBezierPoints(...)`, `createCubicBezierPoints(...)`, and `createRibbonMesh(...)` to build procedural textures, curved paths, channels, and similar strip-like geometry without re-implementing canvas or Three.js mesh plumbing inside each tile package.

That gives plugin authors a reusable renderer-support layer for both textured materials and common curved-surface meshes without tying packages to app-specific renderer code.

## Shared Style Helpers

`@bworlds/procedural-style` now provides small seeded style helpers such as regional key generation, threshold-based palette selection, and hex tinting. This starts turning repeated “regional style” logic into reusable support code instead of leaving every tile package to reimplement the same seeded style patterns.

## Shared Overworld Helpers

`@bworlds/overworld-support` now provides shared seeded overworld helpers such as `createOverworldTerrainSignalSampler(...)`, `isNearOverworldLand(...)`, `createOverworldGenerationContext(...)`, and `composeOverworldTileFromPlugins(...)`. This keeps the default terrain-noise recipe, common overworld heuristics, and the full “curated override -> terrain pass -> overworld pass -> decoration” tile pipeline in a reusable support package instead of trapping it inside `@bworlds/map-overworld`, which gives future runtime or map packages a stable way to reuse the same signal-generation and plugin-composition rules.

## Shared POI Helpers

`@bworlds/poi-support` now provides reusable helpers for common point-of-interest tile behavior such as land-placement eligibility, deterministic named POI tile creation, and enter-action generation. This reduces boilerplate across enterable tile packages like towns, caves, and dungeons while keeping the shared POI conventions in one place.

It now also provides `createEnterablePoiTileFeatures(...)` for the common “walk onto it like a route tile and interact to enter” pattern. That gives new enterable POI packages a single helper for shared traversal and enter-action behavior instead of repeating those hooks by hand.

For generated overworld POIs, `createChanceBasedLandPoiClassifier(...)` now covers the common “land-only, chance-threshold, deterministic named POI tile” pattern used by packages like caves and dungeons. That keeps new POI packages aligned on placement rules and seeded naming without copying the same classification boilerplate.

## Shared Paint Helpers

`@bworlds/paint-support` now provides reusable 2D tile-painting helpers for common backdrops like plains grass. This reduces repeated atlas and tile-package paint code so new land-based tiles can share visual conventions without copying the same fill-and-blade logic into each package.

The shared atlas no longer keeps special-case painters for extracted tiles like plains or caves. Once a tile package owns `paint2D(...)` and any optional `paint2DOverlay(...)`, the atlas just hosts sprite generation, variant selection, and plugin dispatch, which keeps tile visuals co-located with the package that owns placement and 3D behavior.

## Shared Tile Helpers

`@bworlds/tile-support` now provides small reusable tile-level helpers such as a standard route traversal profile, threshold-based terrain classifiers, and dominant-neighbor floor resolution for 3D overlays. This keeps repeated tile-plugin defaults like shared travel-group semantics, common “replace plains when a signal crosses a threshold” placement logic, and route-like ground borrowing out of individual tile packages so new terrain or route-adjacent tiles can opt into the same behavior with less boilerplate.

## Current extracted examples

`@bworlds/tile-plains`, `@bworlds/tile-route`, `@bworlds/tile-water`, `@bworlds/tile-mountain`, `@bworlds/tile-forest`, `@bworlds/tile-cave`, `@bworlds/tile-dungeon`, `@bworlds/tile-sign`, and `@bworlds/tile-town` are the current concrete tile packages using this architecture.

`@bworlds/tile-interior` now also owns the reusable interior tile family (`wall`, `floor`, `door`, `stairsUp`, `stairsDown`, `shop`) to demonstrate package-owned tile definitions and 2D painters outside the central atlas module.

They currently own combinations of:

- base terrain placement
- post-terrain overworld adjustment through runtime hooks where that fits better than a single terrain pass
- overworld placement for their random POI path
- 2D atlas painting for their tile kind
- 3D landmark generation for their tile kind
- 3D occupancy / collision behavior where needed

This is the pattern intended for future extraction of the remaining core-owned tile systems that are still left, especially any renderer fallback code and the tiles that still have hardcoded 3D paths.

## Why this shape

- It keeps the generation pipeline open for extension.
- It reduces the amount of tile-specific code trapped inside the core renderer and world generator.
- It lets future packages contribute biome rules, POIs, encounters, and content packs independently while still sharing the same seed and state APIs.

## Growth path

As the project expands, this should keep moving toward:

1. More extracted tile packages for the built-in terrain and POI families
2. Stronger typed shared contexts across more plugins
3. Package-discovered tile manifests and dependency ordering
4. Runtime-safe plugin sandboxes and content-pack loading
5. Saved-world mutation hooks for quests, settlements, and simulation systems
