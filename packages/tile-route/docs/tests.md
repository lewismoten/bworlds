# Route Tests

The route tile tests are split so `npm run check` keeps a few representative
road, dock, and action behaviors on the fast path while the broader bridge and
dock sweeps stay on the long suite:

- [src/index.test.ts](/Users/lewismoten/dev/bworlds/packages/tile-route/src/index.test.ts:1)
  keeps cheap smoke coverage for route classification, floor resolution, dock
  rendering, and route boarding actions.
- [src/index.long.test.ts](/Users/lewismoten/dev/bworlds/packages/tile-route/src/index.long.test.ts:1)
  keeps the exhaustive road, bridge, dock, instancing, and cache-churn
  coverage on the dedicated long-test path, including progressive-build parity
  coverage for all three route-crossing model builders.
