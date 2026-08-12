`@bworlds/map-support` now exposes one small shared zoom-policy layer for
canonical map features:

- `createHydrologyFeatureZoomRange(...)`
- `createTransportFeatureZoomRange(...)`

## Purpose

The canonical feature model carries explicit `zoomRange` values, but later map
layers still need consistent rules for deciding which kinds of rivers and
transport features appear at which zooms.

These helpers provide one shared preset path so later PMTiles generators do
not scatter hand-tuned zoom thresholds across multiple layer implementations.

## Hydrology Presets

`createHydrologyFeatureZoomRange(...)` currently uses these scales:

- `major-river`
- `river`
- `stream`
- `local-stream`

The presets intentionally keep major rivers visible earlier than smaller
waterways so low-zoom physical maps retain recognizable drainage structure.

## Transport Presets

`createTransportFeatureZoomRange(...)` currently uses these scales:

- `rail-trunk`
- `highway`
- `arterial-road`
- `local-road`
- `track`

The presets intentionally reveal local roads later than mainline transport
corridors so low-zoom maps stay legible while higher zooms can show finer
street-level detail.
