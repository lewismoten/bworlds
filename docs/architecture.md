# Architecture

`bworlds` uses npm workspaces so the game can grow as a set of focused packages instead of one large browser bundle.

## Workspace layout

- `apps/web`: the browser client and interaction layer
- `packages/core`: shared math, GPS conversion, tile definitions, and world state
- `packages/plugin-api`: simple plugin registry and lifecycle hooks
- `packages/worldgen`: deterministic overworld and interior generation
- `packages/render2d`: top-down chip-map renderer
- `packages/render3d`: perspective renderer powered by the same world state
- `packages/atlas`: tile legend and atlas helpers

## Architectural principles

- Deterministic generation: the same seed and coordinates always produce the same world tile
- Shared simulation: 2D and 3D are just views over the same player state and map state
- On-demand maps: towns, buildings, caves, and dungeon floors are generated only when entered
- Plugin-friendly hooks: generation stages expose hook points so world features can be extended without rewriting the core generator
- Package boundaries: worldgen does not know about DOM rendering, and renderers do not own map creation

## Current gameplay slice

The bootstrap focuses on a strong vertical slice:

- Infinite-feeling overworld near Earth scale through deterministic coordinate sampling
- GPS-like latitude and longitude display derived from world tile coordinates
- Enterable towns, buildings, caves, and dungeons
- Dungeon depth progression with per-level maps
- Seamless 2D and 3D mode switching with the same movement state

This gives us a clean base for future additions like richer assets, save data, NPC simulation, combat, quests, and async streaming.
