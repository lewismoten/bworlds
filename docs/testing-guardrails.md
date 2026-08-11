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

Default watch mode should follow the same rule. `npm run test:watch` now pins
`BWORLDS_VITEST_SUITE_MODE=fast` so day-to-day iterative runs stay on the short
path, while `npm run test:watch:all` and `npm run test:watch:long` opt back
into the broader buckets explicitly.

When a file grows into a broad integration sweep that explores many seeds,
tiles, routes, or song variants in one pass, prefer renaming it to
`*.long.test.ts` so the fast suite excludes it through the glob-based long-path
selection automatically. Keep `LONG_TEST_FILES` only for heavyweight files that
cannot yet move to filename-based long classification. The fast suite now does
that for the heaviest map-overworld, overworld-support, route-network, and dock
traffic files, while the broad audio/browser sweeps moved to `*.long.test.ts`
filenames so `npm run check` stays bounded around unit-level feedback.

When a helper can be tested with a small structural fixture, keep that as the
fast-path unit test and move the representative full-generation determinism
check into a `*.long.test.ts` companion. The music snapshot signature tests now
follow that split so normal checks do not rebuild the full procedural song just
to verify string serialization behavior. The known-good seed registry now does
the same: fast-path tests keep seed-id and resolver coverage in
`music-debug-known-good-seeds.test.ts`, while the full per-seed snapshot
determinism sweep lives in `music-debug-known-good-seeds.long.test.ts`.
The same pattern now applies to the procedural music harmony-span sweep, the
broader procedural music integration coverage, and the dock route cache-eviction
churn regression: the short-path files keep the local behavior checks, while
`procedural-music.long.test.ts`,
`procedural-music-integration.long.test.ts`, and
`packages/dock-route-support/src/index.long.test.ts` hold the representative
full-song, full integration, and cache-rollover coverage. Forest rendering now
follows the same shape: [packages/tile-forest/src/index.test.ts](/Users/lewismoten/dev/bworlds/packages/tile-forest/src/index.test.ts:1)
keeps the cheap smoke checks in the normal suite, while
[packages/tile-forest/src/index.long.test.ts](/Users/lewismoten/dev/bworlds/packages/tile-forest/src/index.long.test.ts:1)
holds the broad descriptor and rendering sweeps. Route rendering now follows it
too: [packages/tile-route/src/index.test.ts](/Users/lewismoten/dev/bworlds/packages/tile-route/src/index.test.ts:1)
keeps the fast-path route classifier and dock smoke checks, while
[packages/tile-route/src/index.long.test.ts](/Users/lewismoten/dev/bworlds/packages/tile-route/src/index.long.test.ts:1)
holds the heavier bridge/dock scan and cache-churn coverage.
Town quest coverage follows the same rule: [packages/town-support/src/index.test.ts](/Users/lewismoten/dev/bworlds/packages/town-support/src/index.test.ts:1)
keeps deterministic roster, schedule, and one-step quest smoke coverage in the
fast suite, while
[packages/town-support/src/index.long.test.ts](/Users/lewismoten/dev/bworlds/packages/town-support/src/index.long.test.ts:1)
holds the broad coordinate-and-time quest availability sweeps.
Rail support now follows it too: [packages/rail-support/src/index.test.ts](/Users/lewismoten/dev/bworlds/packages/rail-support/src/index.test.ts:1)
keeps the local deterministic connection and cache reuse checks in the fast
suite, while
[packages/rail-support/src/index.long.test.ts](/Users/lewismoten/dev/bworlds/packages/rail-support/src/index.long.test.ts:1)
holds the broader nearby-station anchor sweep.
Render-budget validation follows the same split now:
[packages/render3d/src/index.test.ts](/Users/lewismoten/dev/bworlds/packages/render3d/src/index.test.ts:1)
keeps the unit-level resource, budget, and visibility checks on the fast path,
while
[packages/render3d/src/index.long.test.ts](/Users/lewismoten/dev/bworlds/packages/render3d/src/index.long.test.ts:1)
holds the representative tile-plugin model acceptance checks that instantiate
real forest, town, lighthouse, and dungeon renderers.

When a fast-path assertion only needs one derived field from a large generated
object, prefer a tiny purpose-built fixture over a full snapshot bootstrap.
[apps/web/src/music-debug-patch-quality.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-patch-quality.test.ts:1)
now builds a minimal instrument-bank fixture around
`knownGoodPatchComparison` instead of generating a full procedural music
snapshot just to exercise warning thresholds and message formatting.

When fast-path tests must import one of the heavy procedural snapshot modules,
prefer keeping related assertions in the same `*.test.ts` file so Vitest only
pays the module-load cost once. The sound-bank preview mode and phrase checks
now follow that pattern instead of loading the full sound-bank debug snapshot
graph in two separate fast-path files.

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
single file. The long-path debug snapshot suites now follow that pattern in
[apps/web/src/music-debug-midi-validation-content.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-midi-validation-content.long.test.ts:1),
[apps/web/src/music-debug-snapshot-generation-variants.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-snapshot-generation-variants.long.test.ts:1),
and
[apps/web/src/sound-bank-debug-percussion.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/sound-bank-debug-percussion.long.test.ts:1)
so repeated assertion blocks reuse one deterministic snapshot per scenario.

The same rule applies to expensive derived artifacts such as export bundles,
WAV previews, or other debug-package outputs: if multiple tests assert on the
same deterministic artifact, build it once in a shared test fixture module and
reuse it across files.
That rename now also keeps the broad `sound-effects`,
`music-debug-preview-wav`, and `procedural-music-song-base` sweeps on the long
path without needing manual allowlist entries.
The same split now applies to station and transport-runtime cache churn:
`packages/map-station/src/index.test.ts`,
`packages/runtime-dock-traffic/src/index.test.ts`, and
`packages/runtime-rail-network/src/index.test.ts` keep the fast-path behavior
assertions, while their `*.long.test.ts` companions hold the bounded eviction
regressions that would otherwise force the whole file off the normal suite.

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
