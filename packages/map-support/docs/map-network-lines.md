`@bworlds/map-support` now exposes one small shared graph-to-map bridge for
2D and 3D network parity:

- `createMapNetworkLineFeatureRecord(...)`
- `createRoadNetworkMapFeatureGeneratorPlugin(...)`
- `createRiverNetworkMapFeatureGeneratorPlugin(...)`

## Purpose

Several runtime and terrain systems already build shared point paths for
network-like world features:

- road or path routes that 3D terrain rendering can splat or mesh
- deterministic river control and sampled curve paths from
  `@bworlds/overworld-support`
- rail or other transit connections that already exist as world-space point
  arrays

The network-line bridge lets later 2D map export reuse those same world-space
paths by converting them into canonical line features instead of tracing a
separate 2D-only network.

## Shared Line Records

`createMapNetworkLineFeatureRecord(...)` turns one shared graph/path sample
into one canonical line feature.

That keeps:

- network geometry in shared `worldX/worldY` coordinates
- line ids stable from authoritative source object ids
- map export or styling code focused on presentation instead of graph
  normalization

## Road And River Network Generators

`createRoadNetworkMapFeatureGeneratorPlugin(...)` wraps
`getRoadNetworkSamples(request)` and normalizes the generator as:

- `layerId: 'road-network'`
- default `id: 'road-network-map-layer'`
- default `label: 'Road Network Layer'`

`createRiverNetworkMapFeatureGeneratorPlugin(...)` wraps
`getRiverNetworkSamples(request)` and normalizes the generator as:

- `layerId: 'river-network'`
- default `id: 'river-network-map-layer'`
- default `label: 'River Network Layer'`

This gives later PMTiles export or map rendering code one shared bridge from
authoritative route and river point arrays to canonical map features, which is
necessary for keeping 2D road and river products derived from the same graphs
that 3D systems already consume.
