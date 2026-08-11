# Vitest Supervisor

The root `npm test` script now runs through [scripts/vitest-supervisor.mjs](/Users/lewismoten/dev/bworlds/scripts/vitest-supervisor.mjs:1) instead of invoking `vitest run` directly.

What it does:

- Keeps the normal Vitest worker pool enabled for ordinary suite runs.
- Fails the full suite after 60 seconds.
- Prevents overlapping full-suite runs in the same checkout with `.vitest-full-suite.lock`.
- Records observed worker PIDs shortly after the suite starts.
- Prints recently active test files plus the last observed verbose test label before forced termination.
- Kills the whole Vitest process group on timeout, then escalates to `SIGKILL` if needed.
- Passes a suite mode through `BWORLDS_VITEST_SUITE_MODE` so the Vitest config can run the fast suite, the long suite, or the whole test set.

Related commands:

- `npm test`
  Runs the supervised fast suite and excludes the known long-running files,
  including heavy MIDI export audit coverage and repository-wide audit sweeps.
  `npm run check` intentionally goes through this same fast path by invoking
  `npm run test` rather than `npm run test:all` or `npm run test:long`, so CI
  keeps the normal read-only gate bounded while the broader representative
  coverage stays available behind explicit long-suite commands.
  Snapshot-heavy timeline rendering coverage now stays on the long path while
  [music-debug-timeline-fast.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-timeline-fast.test.ts:1)
  keeps the cheap timeline coordinate and label helpers in the normal check.
  The same allowlist now keeps the broadest overworld and audio generation
  sweeps off the default path, including
  [ambience-debug.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/ambience-debug.test.ts:1),
  [music-debug-preview-wav.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-preview-wav.test.ts:1),
  [procedural-music-song-base.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-song-base.test.ts:1),
  [sound-effects.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/sound-effects.test.ts:1),
  [packages/map-overworld/src/index.test.ts](/Users/lewismoten/dev/bworlds/packages/map-overworld/src/index.test.ts:1),
  and [packages/overworld-support/src/index.test.ts](/Users/lewismoten/dev/bworlds/packages/overworld-support/src/index.test.ts:1).
  Recent companion `*.long.test.ts` splits also keep brute-force cache churn and
  seed-sweep checks off the default path, including
  [music-debug-timeline.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-timeline.long.test.ts:1),
  [procedural-music.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music.long.test.ts:1),
  [procedural-music-integration.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-integration.long.test.ts:1),
  [procedural-music-song-repair.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-song-repair.long.test.ts:1),
  [test-source-audit-repository.long.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/testing/test-source-audit-repository.long.test.ts:1),
  [packages/runtime-overworld-anchors/src/index.long.test.ts](/Users/lewismoten/dev/bworlds/packages/runtime-overworld-anchors/src/index.long.test.ts:1),
  [packages/dock-route-support/src/index.long.test.ts](/Users/lewismoten/dev/bworlds/packages/dock-route-support/src/index.long.test.ts:1),
  [packages/town-support/src/index.long.test.ts](/Users/lewismoten/dev/bworlds/packages/town-support/src/index.long.test.ts:1),
  and [packages/tile-sign/src/index.long.test.ts](/Users/lewismoten/dev/bworlds/packages/tile-sign/src/index.long.test.ts:1).
- `npm run test:fast`
  Runs the same supervised fast suite through an explicit named command. Use
  this when you want to call out the intended suite directly in local or CI
  automation while keeping `npm test -- <file>` argument forwarding unchanged.
- `npm run test:all`
  Runs the supervised full suite without fast-suite exclusions.
- `npm run test:long`
  Runs only the known long-running suites behind the same supervisor path.
  Files named `*.long.test.ts` automatically stay off the normal fast path.
  Once a suite has that companion file, its short `*.test.ts` file should come
  back onto the fast path instead of staying in the manual long-file list.
  The slowest audio/browser suites can be split into multiple long-suite files
  so Vitest can parallelize them without putting those checks back into the
  fast path.
  Recent examples include the split sound-bank shell coverage described in
  [docs/sound-bank-debug-shell-tests.md](/Users/lewismoten/dev/bworlds/docs/sound-bank-debug-shell-tests.md:1)
  plus the renamed `music-debug-export-bundle-*.long.test.ts`,
  `music-debug-midi-export-*.long.test.ts`,
  `music-debug-snapshot-generation-*.long.test.ts`,
  `music-debug-markup.long.test.ts`, and
  `music-debug-song-playback.long.test.ts` suites.
- `npm run test:watch`
  Runs Vitest watch mode against the fast suite by default so iterative local
  runs do not automatically pull the long audio and world sweeps back in.
- `npm run test:watch:all`
  Runs watch mode against the whole suite when broad local coverage is
  intentional.
- `npm run test:watch:long`
  Runs watch mode only for the long-suite bucket.
- `npm run test -- apps/web/src/example.test.ts`
  Still forwards file arguments through to Vitest and bypasses fast/long suite filtering.
- `npm run test:hang-debug -- <files...>`
  Re-runs suspected hanging files with one worker and the verbose reporter.

Reporter and output options such as `--reporter json` and
`--outputFile /tmp/report.json` still count as full-suite invocations unless an
actual test file path is present, so suite-mode filtering keeps working for CI
and profiling runs.

Current timeout defaults still live in [vitest.config.ts](/Users/lewismoten/dev/bworlds/vitest.config.ts:1):

- `testTimeout: 1500`
- `hookTimeout: 1000`

Shared cleanup now lives in [apps/web/src/test-setup.ts](/Users/lewismoten/dev/bworlds/apps/web/src/test-setup.ts:1):

- restores real timers after each test
- restores mocks after each test
- unstubs globals and env vars after each test
- runs registered cleanup callbacks after each test

Tests that open handles with longer lifetimes can register them through
[apps/web/src/test-cleanup.ts](/Users/lewismoten/dev/bworlds/apps/web/src/test-cleanup.ts:1):

- `registerTestCleanup(() => ...)` for custom teardown logic
- `trackClosableTestResource(resource)` for callback-style `close()` handles and promise-based `terminate()`/`destroy()` handles
- cleanup promises that never settle now fail after 100ms instead of hanging the suite teardown

That split keeps per-test/hook limits in Vitest itself while the supervisor handles whole-suite process cleanup.
