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
