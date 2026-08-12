# Terrain Height Influence Plugins

`@bworlds/worldgen` now exposes a dedicated height-influence plugin contract for
the authoritative terrain height pipeline:

- `WorldTerrainHeightInfluencePlugin`
- `createWorldTerrainHeightInfluencePlugin(...)`
- `sortWorldTerrainHeightInfluencePlugins(...)`
- `sampleWorldTerrainHeightInfluences(...)`

## Purpose

The shared terrain height sampler needs a composition layer that is narrower
than the general world-generation record pipeline:

- plugins contribute signed height deltas
- execution order is deterministic
- plugins can declare supported resolutions
- plugins can declare world-space bounds

This makes it possible to build an ordered authoritative stack such as:

1. continent uplift
2. mountain detail
3. river carving
4. route grading
5. bridge and tunnel grading

without mixing render-only noise into the world-space terrain height API.

## Contract

Each plugin declares:

- `id`
- optional `order` using `priority`, `after`, and `before`
- optional `sampling`
- `sample(context)`

`sample(context)` returns either:

- a signed `number`
- `{ amount, reason }`
- `null` or `undefined` to skip the plugin for that query

Positive values raise terrain. Negative values carve or lower terrain.

## Sampling Declaration

The optional `sampling` block can declare:

- `resolutions`: `coarse`, `fine`, or both
- `bounds`: world-space min and max extents
- `sampleStep`: intended local sampling resolution for later consumers

The current composition helper enforces `resolutions` and `bounds` directly
when querying the stack. `sampleStep` is normalized and preserved as declared
metadata for later height-pipeline consumers that need to inspect plugin
sampling cost or precision.

## Composition Helper

`sampleWorldTerrainHeightInfluences(...)` accepts:

- `plugins`
- `seed`
- `worldX`
- `worldY`
- `resolution`
- optional `baseHeight`

It returns:

- `baseHeight`
- final `height`
- ordered `contributions`

That contribution list is the intended future hook for invalid-height
attribution and height-pipeline debugging.

## Current Usage

`createWorldGenerator(...)` now routes its current preview terrain height path
through one sorted default height-influence stack:

- `continent-uplift`
- `mountain-detail`
- `river-carving`

These layers preserve the current shared relief behavior while moving the
sampler onto the ordered plugin composition path needed for the full
authoritative height pipeline.

Callers can also pass `heightInfluencePlugins` into `createWorldGenerator(...)`
to extend that stack. Those caller-supplied influences are merged with the
built-in default layers and sorted together by `priority`,
`after`, and `before`.

That gives current tests and future worldgen packages one real composition
entry point for:

- continent uplift from the shared elevation field
- mountain detail after uplift
- river carving after mountains
- route grading after hydrology
