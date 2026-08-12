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
- flatten packed splat grids into transferable typed arrays

Why this comes first:

- shader work needs stable layer IDs before texture arrays can stay aligned
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
