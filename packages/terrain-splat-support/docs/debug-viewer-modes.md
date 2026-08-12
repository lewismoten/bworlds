# Terrain Splat Debug Viewer Modes

`@bworlds/terrain-splat-support/debug-viewer` provides a viewer-facing wrapper
around the renderer-free splat debug payloads.

## Goals

- let terrain viewers enumerate one stable set of splat debug modes
- avoid hardcoding mode labels, catalog requirements, and layer-target rules in
  UI code
- keep viewer mode selection tied to the same shared debug payload builder

## Main API

- `createTerrainSplatViewerDebugModel(...)`

## Model

- exposes stable mode metadata with labels and whether a mode needs catalog or
  target-layer or route-layer inputs
- resolves the selected debug mode safely when the requested mode is not
  currently valid
- lists available active target layers so viewers can wire one layer-weight
  selector without inspecting raw splat samples
- lists available route layer IDs and preserves a route-only toggle so viewers
  can inspect road/path splat contributions without re-filtering cells
