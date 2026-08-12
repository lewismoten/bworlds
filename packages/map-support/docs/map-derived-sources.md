`@bworlds/map-support` now exposes one small shared provenance contract for
derived map layers:

- `createMapDerivedDataSourceReference(...)`
- `createMapDerivedDataSourceReferences(...)`
- `createDerivedMapFeatureGeneratorPlugin(...)`

## Purpose

The earlier map-support helpers establish canonical feature shapes and shared
bridges from terrain samples, route graphs, anchors, and regional records.
This provenance layer makes those dependencies explicit on each derived map
generator.

That keeps:

- map layers tied to authoritative world-data inputs
- provenance visible to later PMTiles export, debug, or audit tooling
- map feature generation aligned with shared terrain, graph, and record paths
  instead of drifting toward hand-authored map-only state

## Data Source References

Each source reference currently declares:

- `kind`
- `sourceId`
- optional `description`

The helper normalizes and deduplicates references so one layer can clearly say
which authoritative systems it depends on, such as:

- `terrain-sampler`
- `overworld-anchor`
- `world-generation-record`
- `route-graph`
- `river-graph`

## Derived Generators

`createDerivedMapFeatureGeneratorPlugin(...)` wraps the existing PMTiles
generator contract and adds a required `dataSources` declaration.

That gives later map-layer code one explicit way to say:

- which shared world-data systems feed the layer
- that the layer is derived, not hand-authored
- where future debugging or validation should look when map output drifts

This is a small but concrete guardrail toward avoiding separate hand-authored
map-only world state.
