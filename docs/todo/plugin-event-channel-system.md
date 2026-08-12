# Plugin Event Channel System

## Core Event Model

- [x] Create a generic plugin event channel system.
- [x] Keep the event system independent from specific plugins.
- [x] Define one shared plugin event interface.
- [x] Give every event a type.
- [x] Give every event a source.
- [x] Give every event a short message.
- [x] Limit event messages to 80 characters.
- [x] Allow an optional details object.
- [x] Add an optional event timestamp.
- [x] Add an optional event severity.
- [x] Keep event details serializable when possible.

## Event Types

- [x] Support `error` as the first event type.
- [x] Keep event types extensible for future use.
- [x] Avoid hard-coding logic around only error events.
- [x] Define shared constants for common event types.
- [x] Allow plugins to define namespaced event types.
- [x] Prevent event type name collisions where practical.

## Event Sources

- [x] Use the plugin ID as the default event source.
- [x] Allow subsystems to append a source name.
- [x] Keep source names stable across runs.
- [x] Include the source in every reported error.
- [x] Reject events without a valid source.

## Publishing Events

- [x] Add a shared function for publishing plugin events.
- [x] Let plugins publish without knowing any listeners.
- [x] Keep publishing synchronous and lightweight.
- [x] Prevent one listener failure from stopping others.
- [x] Prevent event handlers from changing the event object.
- [x] Avoid expensive work inside the publish path.

## Subscribing to Events

- [x] Add a function to subscribe to all events.
- [x] Add a function to subscribe by event type.
- [x] Add a function to subscribe by source.
- [x] Return an unsubscribe function from subscriptions.
- [x] Remove listeners cleanly during plugin shutdown.
- [x] Prevent duplicate listener registration.
- [x] Keep listener ordering deterministic when needed.

## Error Events

- [x] Add a helper for publishing plugin errors.
- [x] Require a short error message.
- [x] Allow the original Error in event details.
- [x] Convert Error objects into serializable details.
- [x] Preserve stack traces when available.
- [x] Preserve error names when available.
- [x] Include plugin context in error details when useful.
- [ ] Avoid swallowing the original plugin error.

## Performance Snapshot Integration

- [x] Listen for error events during performance tracking.
- [x] Record recent error events in debug snapshots.
- [x] Include event type in snapshot entries.
- [x] Include event source in snapshot entries.
- [x] Include event message in snapshot entries.
- [x] Include event details when they are serializable.
- [x] Include the event timestamp in snapshots.
- [x] Limit stored events to a bounded history.
- [x] Keep newest snapshot events first.
- [x] Track event counts by source and type.

## Runtime Error Reporting

- [x] Forward plugin error events to the error snapshot system.
- [x] Only persist errors when performance tracking is enabled.
- [x] Reuse the existing error message hashing rules.
- [x] Keep one stored snapshot per unique error message.
- [x] Update stored errors when the same message repeats.
- [x] Avoid reporting the reporter's own failures.
- [x] Keep console error output visible after reporting.

## Event Details

- [x] Define a safe event details serialization helper.
- [x] Remove functions from event details.
- [x] Avoid serializing Three.js objects directly.
- [x] Avoid serializing AudioNodes directly.
- [x] Avoid circular object references.
- [x] Limit event detail depth.
- [x] Limit event detail size.
- [x] Truncate oversized strings in event details.
- [x] Mark details when values were truncated.

## Event History

- [x] Keep a bounded in-memory event history.
- [x] Configure the maximum history size.
- [x] Drop oldest events when the history is full.
- [x] Allow debug tools to read recent events.
- [x] Allow debug tools to filter events by type.
- [x] Allow debug tools to filter events by source.
- [x] Allow debug tools to clear event history.

## Event Debug Page

- [ ] Add a debug view for recent plugin events.
- [ ] Show event time.
- [ ] Show event type.
- [ ] Show event source.
- [ ] Show event message.
- [ ] Allow expanding event details.
- [ ] Add filters for type and source.
- [ ] Add a clear-history button.
- [ ] Add a copy-event button.
- [ ] Add a download-events button.

## Future Event Support

- [ ] Support warning events.
- [ ] Support informational events.
- [ ] Support performance events.
- [ ] Support plugin lifecycle events.
- [ ] Support world state events.
- [ ] Support player events.
- [ ] Support audio events.
- [ ] Support weather events.
- [ ] Support generation events.
- [ ] Keep future consumers independent from publishers.

## Plugin Lifecycle

- [ ] Remove plugin listeners when a plugin unloads.
- [ ] Prevent unloaded plugins from publishing events.
- [ ] Include plugin load failures as error events.
- [ ] Include plugin initialization errors as events.
- [ ] Include plugin shutdown errors as events.

## Safety and Performance

- [x] Prevent recursive event publishing loops.
- [ ] Detect excessive event rates from one source.
- [ ] Rate-limit noisy diagnostic events when needed.
- [ ] Never rate-limit critical error events silently.
- [ ] Keep event dispatch off the render hot path.
- [ ] Measure event dispatch overhead in debug mode.

## Tests

- [x] Test publishing an event with no listeners.
- [x] Test publishing an event to one listener.
- [x] Test publishing an event to multiple listeners.
- [x] Test subscribing by event type.
- [x] Test subscribing by source.
- [x] Test listener unsubscribe behavior.
- [x] Test one broken listener does not stop others.
- [x] Test event messages over 80 characters are rejected.
- [x] Test error details preserve the stack trace.
- [x] Test circular details serialize safely.
- [x] Test history never exceeds its configured limit.
- [x] Test error events appear in debug snapshots.
- [x] Test disabled tracking does not persist errors.
- [x] Test recursive event loops are prevented.

## Progress Notes

- Added `@bworlds/plugin-event-channel` with a shared `PluginEvent`
  interface, stable event/source validation, bounded newest-first in-memory
  history, synchronous publish/subscribe helpers, duplicate listener
  prevention, and a `publishError(...)` helper.
- Added safe event-details serialization that removes functions, converts
  `Error` objects into serializable detail payloads, avoids circular object
  references, truncates oversized values, and marks truncation.
- Added focused tests for publish ordering, scoped subscriptions,
  unsubscribe behavior, listener isolation, message-length validation,
  detail serialization, and bounded history behavior.
- Added an active-publish signature guard in `@bworlds/plugin-event-channel`
  so a listener cannot recursively republish the same event forever while
  still allowing distinct nested follow-up events to flow synchronously.
- Added `apps/web/src/runtime-performance-plugin-events.ts` so the web app can
  listen for shared plugin error events, mirror them into the local debug
  recent-event stream as `plugin-error`, and attach bounded recent event
  history plus per-type and per-source counts to runtime performance snapshot
  payloads.
- Added exported debug snapshot coverage for `plugin-error` recent events so
  source, severity, timestamp, and serialized details stay visible in the
  saved snapshot payload instead of only being validated at the tracker layer.
- Added plugin error forwarding to `apps/web/src/client-error-snapshot.ts` so
  shared plugin `error` events reuse the existing client error snapshot
  endpoint, message-hash dedupe, tracking gate, and console-loop protections.
