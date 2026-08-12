## Visible Terrain Chunk Materials

`render3d` now exposes one material-compatibility planning step for shared
terrain chunks:

- `src/visible-terrain-chunk-materials.ts`

What it does:

- collects active terrain layer IDs from each visible chunk's shared splat grid
- builds one texture binding runtime plan per chunk
- builds one terrain splat material plan per chunk
- summarizes binding reuse and material reuse across the visible chunk set
- groups compatible chunks into future shared material buckets

Why this exists:

- chunk geometry alone does not remove per-chunk material drift
- the live renderer needs one stable way to decide when multiple chunks can
  share the same splat material instance and texture bindings
- this keeps compatibility planning separate from the later Three/WebGL shader
  upload and scene integration work
