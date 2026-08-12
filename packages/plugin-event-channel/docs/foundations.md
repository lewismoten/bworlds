# Plugin Event Channel Foundations

`@bworlds/plugin-event-channel` is the first isolated slice of the plugin event
channel work tracked in
[docs/todo/plugin-event-channel-system.md](../../../docs/todo/plugin-event-channel-system.md).

This foundation package stays independent from renderer, audio, and individual
plugins. It currently provides:

- one shared `PluginEvent` interface with `type`, `source`, and short
  `message` fields
- optional `details`, `timestamp`, and `severity`
- validation for stable event types and sources
- an `80` character message limit
- synchronous publish/subscribe helpers
- subscriptions for all events, one event type, or one source
- duplicate-listener prevention and unsubscribe cleanup
- bounded newest-first in-memory event history with filtering and clearing
- a serializing details helper that strips functions, converts `Error` objects,
  avoids circular references, and marks truncation
- a `publishError(...)` helper that emits the shared `error` event type

The package does not yet integrate with runtime performance snapshots or the
debug UI. That follow-up work can now depend on one stable event shape instead
of inventing plugin-specific error payloads.
