`@bworlds/terrain-splat-support/worker-runtime` provides one small async bridge
between the serializable terrain-splat worker contract and a real Worker-like
host.

Goals:

- reuse the existing `worker-contract` request/result shapes instead of
  defining a second async protocol
- keep chunk cache keys and packed typed-array results identical between sync
  and worker builds
- allow browser workers and test fakes to use the same request/response flow

Main API:

- `createTerrainSplatWorkerBuildRequestMessage(...)`
- `buildTerrainSplatWorkerResponseMessage(...)`
- `runTerrainSplatWorkerBuild(...)`

The runtime serializes the terrain kind catalog and layer catalog into the
build message so worker-side code can stay renderer-free and independent from
live gameplay callbacks. The response message returns the same packed layer
index and weight buffers exposed by `worker-contract`, and
`listTerrainSplatWorkerMessageTransferables(...)` forwards those `ArrayBuffer`
handles for `postMessage(...)`.

`buildTerrainSplatChunkDataInWorker(...)` in `chunk-build` uses this runtime to
preserve the existing chunk-state cache behavior while moving the splat grid
build itself onto a Worker-like executor.
