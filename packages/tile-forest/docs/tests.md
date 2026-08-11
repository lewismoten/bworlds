# Forest Tests

The forest tile tests are split by concern so descriptor generation, full-detail
rendering, and close-detail wildlife checks do not all compete in one long test
worker:

- [src/index.test.ts](/Users/lewismoten/dev/bworlds/packages/tile-forest/src/index.test.ts:1)
  covers deterministic forest descriptors, tree profiles, and the bulk of
  forest rendering behavior.
- [src/firefly-close-detail.test.ts](/Users/lewismoten/dev/bworlds/packages/tile-forest/src/firefly-close-detail.test.ts:1)
  covers nearby spider rendering, firefly particles, and far-distance culling
  for close-only wildlife and decorative details.
- [src/testing/forest-test-support.ts](/Users/lewismoten/dev/bworlds/packages/tile-forest/src/testing/forest-test-support.ts:1)
  centralizes the fake Three host, fake nodes, and forest runtime state helpers
  shared by the split rendering tests.
