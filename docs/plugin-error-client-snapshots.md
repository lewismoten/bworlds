# Plugin Error Client Snapshots

The browser now forwards shared plugin `error` events into the same client
error snapshot pipeline used by `window.error`, `unhandledrejection`, and
`console.error`.

## Flow

- `@bworlds/plugin-event-channel` remains the single publisher/subscriber seam
  for plugin diagnostics
- `apps/web/src/runtime-performance-plugin-events.ts` still records those
  events into runtime performance snapshots for recent-event inspection
- `apps/web/src/client-error-snapshot.ts` now also subscribes to plugin
  `error` events when runtime performance tracking is enabled
- forwarded plugin errors are posted to `/api/client-error-snapshots` using the
  existing message-hash rules, so the server-side snapshot store still keeps
  one file per unique message

## Notes

- browser-side forwarding does not duplicate hash or file-management logic
- disabled runtime performance tracking still suppresses plugin error
  persistence
- plugin event details are serialized into the snapshot `details` field, and a
  serialized nested `error.stack` is reused as the snapshot stack when present
