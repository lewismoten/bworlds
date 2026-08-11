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

When a long-running music or world-generation test needs representative
snapshots, prefer module-level shared fixtures or named known-good seeds over
rebuilding the same deterministic snapshots inside multiple assertions. That
keeps regression coverage intact while avoiding repeated generator work inside a
single file.

The same rule applies to expensive derived artifacts such as export bundles,
WAV previews, or other debug-package outputs: if multiple tests assert on the
same deterministic artifact, build it once in a shared test fixture module and
reuse it across files.

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
