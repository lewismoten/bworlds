# Testing Guardrails

The Vitest suite now includes a source audit that scans repository test files
for two common hang sources before they become runtime failures:

- unconditional infinite loops such as `while (true)` or `for (;;)`
- oversized static fixtures such as `Array.from({ length: 5001 })`

The audit lives in [apps/web/src/testing/test-source-audit.ts](/Users/lewismoten/dev/bworlds/apps/web/src/testing/test-source-audit.ts:1)
and runs as part of the normal Vitest suite through
[apps/web/src/testing/test-source-audit.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/testing/test-source-audit.test.ts:1).

The suite also keeps a direct regression test around the full-suite timeout
path in [apps/web/src/vitest-supervisor.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/vitest-supervisor.test.ts:1).
That test simulates a hung run and verifies the supervisor prints the active
test files, last started test, worker PIDs, and hang-debug rerun command
before it forces shutdown.

Fast-path `npm run test` is intended to stay focused on short feedback loops.
Expensive cache-rollover and broad deterministic-search scenarios should live in
dedicated long-suite files that are only included by `npm run test:long` and
`npm run test:all` through [vitest.suite-mode.ts](/Users/lewismoten/dev/bworlds/vitest.suite-mode.ts:1).
Keep the normal `*.test.ts` files for behavior checks that should run during
every `npm run check`.

When a file grows into a broad integration sweep that explores many seeds,
tiles, routes, or song variants in one pass, prefer renaming it to
`*.long.test.ts` so the fast suite excludes it through the glob-based long-path
selection automatically. Keep `LONG_TEST_FILES` for the heavy files that have
not been split or renamed yet. The fast suite now does that for the heaviest
map-overworld, overworld-support, route-network, dock traffic, ambience-debug,
and procedural-music repair files so `npm run check` stays bounded around
unit-level feedback.

When a helper can be tested with a small structural fixture, keep that as the
fast-path unit test and move the representative full-generation determinism
check into a `*.long.test.ts` companion. The music snapshot signature tests now
follow that split so normal checks do not rebuild the full procedural song just
to verify string serialization behavior. The known-good seed registry now does
the same: fast-path tests keep seed-id and resolver coverage in
`music-debug-known-good-seeds.test.ts`, while the full per-seed snapshot
determinism sweep lives in `music-debug-known-good-seeds.long.test.ts`.
The same pattern now applies to the procedural music harmony-span sweep and the
dock route cache-eviction churn regression: the short-path files keep the local
behavior checks, while `procedural-music.long.test.ts` and
`packages/dock-route-support/src/index.long.test.ts` hold the representative
full-song and cache-rollover coverage. Forest rendering now follows the same
shape: [packages/tile-forest/src/index.test.ts](/Users/lewismoten/dev/bworlds/packages/tile-forest/src/index.test.ts:1)
keeps the cheap smoke checks in the normal suite, while
[packages/tile-forest/src/index.long.test.ts](/Users/lewismoten/dev/bworlds/packages/tile-forest/src/index.long.test.ts:1)
holds the broad descriptor and rendering sweeps. Route rendering now follows it
too: [packages/tile-route/src/index.test.ts](/Users/lewismoten/dev/bworlds/packages/tile-route/src/index.test.ts:1)
keeps the fast-path route classifier and dock smoke checks, while
[packages/tile-route/src/index.long.test.ts](/Users/lewismoten/dev/bworlds/packages/tile-route/src/index.long.test.ts:1)
holds the heavier bridge/dock scan and cache-churn coverage.

After that split exists, remove the short `*.test.ts` file from
`LONG_TEST_FILES` in
[vitest.suite-mode.ts](/Users/lewismoten/dev/bworlds/vitest.suite-mode.ts:1).
That manual allowlist should only carry heavyweight files that have not been
split yet. Leaving an already-split short file on the list quietly drops its
normal behavior coverage from `npm run test`.

When a long-running music or world-generation test needs representative
snapshots, prefer module-level shared fixtures or named known-good seeds over
rebuilding the same deterministic snapshots inside multiple assertions. That
keeps regression coverage intact while avoiding repeated generator work inside a
single file.

The same rule applies to expensive derived artifacts such as export bundles,
WAV previews, or other debug-package outputs: if multiple tests assert on the
same deterministic artifact, build it once in a shared test fixture module and
reuse it across files.

For deterministic grid or tile sweeps, precompute the sampled profile set once
when multiple assertions need to walk the same coordinates. The tree quality
tests now reuse cached branch, canopy, trunk, age, and fruit samples instead of
regenerating the same forest profiles in separate loops.

When the goal is determinism rather than object-shape exhaustiveness, prefer a
small stable signature over whole-object deep equality. Music snapshot
regression checks now use
[createMusicDebugSnapshotSignature](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-snapshot-signature.ts:1)
to compare the parts of a snapshot that matter for repeatability without paying
for large nested equality diffs.

When a fast-path test intentionally exercises timeout handling, prefer the
smallest timeout that still proves the behavior. Both
[registerTestCleanup](/Users/lewismoten/dev/bworlds/apps/web/src/test-cleanup.ts:27)
and
[trackClosableTestResource](/Users/lewismoten/dev/bworlds/apps/web/src/test-cleanup.ts:39)
accept `timeoutMs` so timeout-path assertions do not burn an extra `100ms` in
the normal suite unless the production default itself is what needs coverage.

If a test needs one of these patterns intentionally, add a suppression comment
directly above the line:

```ts
// test-source-audit-disable-next-line
while (true) {
  break;
}
```

Use suppressions sparingly. The preferred fix is to add an explicit exit
condition or construct large fixtures incrementally.
