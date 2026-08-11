# Client Error Snapshots

Client error snapshots now live in `.client-error-snapshots/` at the repository
root. The directory is ignored by Git and is intended only for local debugging.

The browser reporter uses the existing
`runtimePerformanceTrackingEnabled` session preference. When tracking is
disabled, client error snapshots are not captured or posted.

The reporter is now loaded lazily by the main game and music debug entrypoints,
which keeps the snapshot logic out of the initial JavaScript bundle while still
installing the same reporter once the deferred chunk resolves.

Captured snapshots currently include:

- the snapshot timestamp
- the normalized error message
- the original stack when one exists
- the error source
- the current page URL
- readable details for non-`Error` thrown values

Unhandled `window.error` and `unhandledrejection` events are prevented from
finishing their first browser-default path, reported to the snapshot endpoint,
then rethrown. When the original value is an `Error`, the reporter rethrows the
same object so the original stack stays intact.

Saved files use the stable hash of the normalized message as the file name, so
repeated errors overwrite the same JSON file and update its timestamp.

The Vite dev server now exposes `/api/client-error-snapshots`:

- `POST` saves or replaces one snapshot file
- `GET` lists the most recent saved snapshots first

Local cleanup commands:

- `npm run client-error-snapshots:remove -- <message-hash-or-file-name>`
  removes one saved snapshot
- `npm run client-error-snapshots:clear`
  removes every saved client error snapshot

Tests:

- [client-error-snapshot.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/client-error-snapshot.test.ts:1)
  covers normalization, posting, disabled tracking, global error capture,
  `console.error` capture, and loop prevention.
- [client-error-snapshot-loader.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/client-error-snapshot-loader.test.ts:1)
  covers deferred installation, pre-resolution cleanup, and chunk-load failure
  logging for the lazy reporter loader.
- [client-error-snapshot-store.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/client-error-snapshot-store.test.ts:1)
  covers stable file naming, duplicate-message overwrite behavior, and newest-
  first listing plus one-shot and full-directory cleanup helpers.
- [client-error-snapshot-cleanup.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/client-error-snapshot-cleanup.test.ts:1)
  covers the cleanup command argument parsing and exit behavior.
- [client-error-snapshot-latest.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/client-error-snapshot-latest.test.ts:1)
  fails when saved snapshots still exist locally and prints the timestamps,
  messages, and stacks that must be cleared after the underlying errors are
  fixed.
