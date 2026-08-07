# Architecture

`bworlds` uses npm workspaces so the game can grow as a set of focused packages instead of one large browser bundle.

## Workspace layout

- `apps/web`: the browser client and interaction layer
- `packages/core`: shared math, GPS conversion, tile definitions, and world state
- `packages/plugin-api`: simple plugin registry and lifecycle hooks
- `packages/worldgen`: plugin assembly and built-in registry bootstrapping
- `packages/content-pack-default`: declarative first-party plugin composition and ordering
- `packages/content-pack-frontier`: additive built-in content-pack overlay proving multi-pack composition
- `packages/map-overworld`: overworld sampling, curated start-area composition, and anchor resolution
- `packages/map-town`: settlement map generation
- `packages/map-building`: building interior map generation
- `packages/map-depth`: cave and dungeon depth map generation
- `packages/runtime-wayfinding`: first-party town flavor and routing tweaks
- `packages/runtime-depth-flavor`: first-party cave and dungeon flavor hooks
- `packages/runtime-frontier-flavor`: additive regional overworld flavor hooks for overlay packs
- `packages/tile-interior`: reusable interior tile family definitions and 2D sprite painters
- `packages/tile-plains`: the base land tile package, moving default overworld terrain metadata into the plugin system
- `packages/procedural-style`: shared seeded style helpers for regional keys, tints, and palette selection
- `packages/three-support`: shared Three.js texture helpers for plugin-owned 3D assets
- `packages/render2d`: top-down chip-map renderer
- `packages/render3d`: perspective renderer powered by the same world state
- `packages/atlas`: tile legend and atlas helpers

## Architectural principles

- Deterministic generation: the same seed and coordinates always produce the same world tile
- Shared simulation: 2D and 3D are just views over the same player state and map state
- On-demand maps: towns, buildings, caves, and dungeon floors are generated only when entered
- Plugin-friendly hooks: generation stages expose hook points so world features can be extended without rewriting the core generator
- Package boundaries: worldgen does not know about DOM rendering, renderers do not own map creation, and map generation is split into composable runtime plugins
- Bootstrap openness: worldgen can now compose caller-supplied content-pack definitions through the same runtime/bootstrap API used by the built-in packs
- Shared contract validation: `npm run typecheck` now validates the workspace TypeScript surface so shared plugin/map/tile APIs stay aligned with actual package usage
- Workspace-aware bootstrap: the web app auto-discovers `@bworlds/*` workspace aliases from package metadata so newly extracted packages do not require a hand-maintained bundler alias list

## Current gameplay slice

The bootstrap focuses on a strong vertical slice:

- Infinite-feeling overworld near Earth scale through deterministic coordinate sampling
- GPS-like latitude and longitude display derived from world tile coordinates
- Enterable towns, buildings, caves, and dungeons
- Dungeon depth progression with per-level maps
- Seamless 2D and 3D mode switching with the same movement state

This gives us a clean base for future additions like richer assets, save data, NPC simulation, combat, quests, and async streaming.
