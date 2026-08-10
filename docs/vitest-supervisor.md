# Vitest Supervisor

The root `npm test` script now runs through [scripts/vitest-supervisor.mjs](/Users/lewismoten/dev/bworlds/scripts/vitest-supervisor.mjs:1) instead of invoking `vitest run` directly.

What it does:

- Keeps the normal Vitest worker pool enabled for ordinary full-suite runs.
- Fails the full suite after 60 seconds.
- Prevents overlapping full-suite runs in the same checkout with `.vitest-full-suite.lock`.
- Records observed worker PIDs shortly after the suite starts.
- Prints recently active test files plus the last observed verbose test label before forced termination.
- Kills the whole Vitest process group on timeout, then escalates to `SIGKILL` if needed.

Related commands:

- `npm test`
  Runs the supervised suite.
- `npm run test -- apps/web/src/example.test.ts`
  Still forwards file arguments through to Vitest.
- `npm run test:hang-debug -- <files...>`
  Re-runs suspected hanging files with one worker and the verbose reporter.

Current timeout defaults still live in [vitest.config.ts](/Users/lewismoten/dev/bworlds/vitest.config.ts:1):

- `testTimeout: 1500`
- `hookTimeout: 1000`

Shared cleanup now lives in [apps/web/src/test-setup.ts](/Users/lewismoten/dev/bworlds/apps/web/src/test-setup.ts:1):

- restores real timers after each test
- restores mocks after each test
- unstubs globals and env vars after each test

That split keeps per-test/hook limits in Vitest itself while the supervisor handles whole-suite process cleanup.
