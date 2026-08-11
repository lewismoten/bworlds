# Client Error Snapshots

Client error snapshots now live in `.client-error-snapshots/` at the repository
root. The directory is ignored by Git and is intended only for local debugging.

The browser reporter uses the existing
`runtimePerformanceTrackingEnabled` session preference. When tracking is
disabled, client error snapshots are not captured or posted.

Captured snapshots currently include:

- the snapshot timestamp
- the normalized error message
- the original stack when one exists
- the error source
- the current page URL
- readable details for non-`Error` thrown values

Saved files use the stable hash of the normalized message as the file name, so
repeated errors overwrite the same JSON file and update its timestamp.

The Vite dev server now exposes `/api/client-error-snapshots`:

- `POST` saves or replaces one snapshot file
- `GET` lists the most recent saved snapshots first

Tests:

- [client-error-snapshot.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/client-error-snapshot.test.ts:1)
  covers normalization, posting, disabled tracking, global error capture,
  `console.error` capture, and loop prevention.
- [client-error-snapshot-store.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/client-error-snapshot-store.test.ts:1)
  covers stable file naming, duplicate-message overwrite behavior, and newest-
  first listing.
- [client-error-snapshot-latest.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/client-error-snapshot-latest.test.ts:1)
  fails when saved snapshots still exist locally and prints the timestamps,
  messages, and stacks that must be cleared after the underlying errors are
  fixed.
