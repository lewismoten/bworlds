# Rail Support Tests

`packages/rail-support/src/index.test.ts` keeps the fast-path behavior checks
that should run during every `npm run check`: deterministic curve generation,
stable connection reuse, tile/train cache reuse, and overlapping path signal
deduplication.

`packages/rail-support/src/index.long.test.ts` carries the broader nearby-station
anchor sweep that walks the representative regional station search and confirms
it still deduplicates overlapping anchor coordinates. That coverage stays on the
long path because it is more expensive than the local behavior checks it backs
up.
