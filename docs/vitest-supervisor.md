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
  Snapshot-heavy timeline rendering coverage now stays on the long path while
  [music-debug-timeline-fast.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-timeline-fast.test.ts:1)
  keeps the cheap timeline coordinate and label helpers in the normal check.
- `npm run test:all`
  Runs the supervised full suite without fast-suite exclusions.
- `npm run test:long`
  Runs only the known long-running suites behind the same supervisor path.
  The slowest audio/browser suites can be split into multiple long-suite files
  so Vitest can parallelize them without putting those checks back into the
  fast path.
  Recent examples include the split sound-bank shell coverage described in
  [docs/sound-bank-debug-shell-tests.md](/Users/lewismoten/dev/bworlds/docs/sound-bank-debug-shell-tests.md:1).
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
