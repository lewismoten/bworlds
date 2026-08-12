# Terrain Splat Foundations

`@bworlds/terrain-splat-support` is the first concrete slice of the PBR splat
work. It does not render terrain yet. It establishes the shared data contracts
that rendering, chunk generation, and debug tooling can build on without each
feature inventing its own layer or weight shape.

Current responsibilities:

- define one stable terrain material layer interface
- define one terrain splat weight/sample interface
- validate layer definitions before they enter a shared catalog
- assign stable layer indices from catalog order
- normalize/clamp splat samples down to a bounded active layer set
- validate that samples reference known layers and sum near `1.0`
- pack normalized samples into fixed `Uint8Array(4)` layer indices and weights
- validate packed samples before worker transfer or attribute upload
- derive deterministic splat samples from seed, tile kind, and terrain signals
- keep overworld terrain-to-splat mapping renderer-free and reusable
- build chunk-like sample grids without coupling splat generation to meshes
- capture renderer-free terrain-state snapshots before chunk build or render
  planning
- flatten packed splat grids into transferable typed arrays
- summarize chunk layer usage before renderer integration decides budgets
- share deterministic terrain family variant pools across chunk generation paths
- merge terrain splat contributions from multiple plugins into one shared
  catalog set
- plan one bounded active layer pool for neighboring chunk groups
- plan aligned texture-array slots and validate descriptor consistency before
  renderer upload code exists
- resolve deterministic per-layer UV transforms for rotation and mirroring
- resolve deterministic per-layer tint variation metadata without new materials
- support low-frequency tint fields so nearby terrain can share broader color
  drift without new materials
- project deterministic world-space UV samples so future terrain chunks can
  share border-safe sampling rules without renderer coupling

Why this comes first:

- shader work needs stable layer IDs before texture arrays can stay aligned
- texture-array upload work needs validated dimensions, formats, memory
  estimates, and per-layer slot alignment before WebGL integration can stay
  deterministic
- chunk generation needs one normalized sample shape before it can cache or
  transfer compact splat buffers
- validation and tests are cheaper to harden now than after the renderer and
  worker pipelines depend on ad hoc shapes

Current limits:

- up to `4` active layers per splat sample
- weights below `0.01` are dropped during normalization by default
- normalization is deterministic for tied weights because ties fall back to
  `layerId` sorting
- packed weights sum to `255` so one sample fits cleanly into compact vertex or
  worker-transfer buffers
- deterministic terrain mapping currently targets overworld-style kinds and
  signal inputs rather than final renderer integration
- recommended overworld mappings now cover grass, forest floor, sand, dirt,
  path, road, rocky, snow, and mud surface families
- UV transform support currently resolves metadata only; renderer code still
  needs to apply the transforms in shared terrain materials
- tint variation support currently resolves metadata only; renderer code still
  needs to apply the resolved colors through shared material inputs
- hard-boundary warnings currently detect abrupt single-layer transitions; they
  do not generate blend zones or smooth the terrain automatically
