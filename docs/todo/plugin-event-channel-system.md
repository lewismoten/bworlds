# Plugin Event Channel System

## Core Event Model

- [ ] Create a generic plugin event channel system.
- [ ] Keep the event system independent from specific plugins.
- [ ] Define one shared plugin event interface.
- [ ] Give every event a type.
- [ ] Give every event a source.
- [ ] Give every event a short message.
- [ ] Limit event messages to 80 characters.
- [ ] Allow an optional details object.
- [ ] Add an optional event timestamp.
- [ ] Add an optional event severity.
- [ ] Keep event details serializable when possible.

## Event Types

- [ ] Support `error` as the first event type.
- [ ] Keep event types extensible for future use.
- [ ] Avoid hard-coding logic around only error events.
- [ ] Define shared constants for common event types.
- [ ] Allow plugins to define namespaced event types.
- [ ] Prevent event type name collisions where practical.

## Event Sources

- [ ] Use the plugin ID as the default event source.
- [ ] Allow subsystems to append a source name.
- [ ] Keep source names stable across runs.
- [ ] Include the source in every reported error.
- [ ] Reject events without a valid source.

## Publishing Events

- [ ] Add a shared function for publishing plugin events.
- [ ] Let plugins publish without knowing any listeners.
- [ ] Keep publishing synchronous and lightweight.
- [ ] Prevent one listener failure from stopping others.
- [ ] Prevent event handlers from changing the event object.
- [ ] Avoid expensive work inside the publish path.

## Subscribing to Events

- [ ] Add a function to subscribe to all events.
- [ ] Add a function to subscribe by event type.
- [ ] Add a function to subscribe by source.
- [ ] Return an unsubscribe function from subscriptions.
- [ ] Remove listeners cleanly during plugin shutdown.
- [ ] Prevent duplicate listener registration.
- [ ] Keep listener ordering deterministic when needed.

## Error Events

- [ ] Add a helper for publishing plugin errors.
- [ ] Require a short error message.
- [ ] Allow the original Error in event details.
- [ ] Convert Error objects into serializable details.
- [ ] Preserve stack traces when available.
- [ ] Preserve error names when available.
- [ ] Include plugin context in error details when useful.
- [ ] Avoid swallowing the original plugin error.

## Performance Snapshot Integration

- [ ] Listen for error events during performance tracking.
- [ ] Record recent error events in debug snapshots.
- [ ] Include event type in snapshot entries.
- [ ] Include event source in snapshot entries.
- [ ] Include event message in snapshot entries.
- [ ] Include event details when they are serializable.
- [ ] Include the event timestamp in snapshots.
- [ ] Limit stored events to a bounded history.
- [ ] Keep newest snapshot events first.
- [ ] Track event counts by source and type.

## Runtime Error Reporting

- [ ] Forward plugin error events to the error snapshot system.
- [ ] Only persist errors when performance tracking is enabled.
- [ ] Reuse the existing error message hashing rules.
- [ ] Keep one stored snapshot per unique error message.
- [ ] Update stored errors when the same message repeats.
- [ ] Avoid reporting the reporter's own failures.
- [ ] Keep console error output visible after reporting.

## Event Details

- [ ] Define a safe event details serialization helper.
- [ ] Remove functions from event details.
- [ ] Avoid serializing Three.js objects directly.
- [ ] Avoid serializing AudioNodes directly.
- [ ] Avoid circular object references.
- [ ] Limit event detail depth.
- [ ] Limit event detail size.
- [ ] Truncate oversized strings in event details.
- [ ] Mark details when values were truncated.

## Event History

- [ ] Keep a bounded in-memory event history.
- [ ] Configure the maximum history size.
- [ ] Drop oldest events when the history is full.
- [ ] Allow debug tools to read recent events.
- [ ] Allow debug tools to filter events by type.
- [ ] Allow debug tools to filter events by source.
- [ ] Allow debug tools to clear event history.

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

- [ ] Prevent recursive event publishing loops.
- [ ] Detect excessive event rates from one source.
- [ ] Rate-limit noisy diagnostic events when needed.
- [ ] Never rate-limit critical error events silently.
- [ ] Keep event dispatch off the render hot path.
- [ ] Measure event dispatch overhead in debug mode.

## Tests

- [ ] Test publishing an event with no listeners.
- [ ] Test publishing an event to one listener.
- [ ] Test publishing an event to multiple listeners.
- [ ] Test subscribing by event type.
- [ ] Test subscribing by source.
- [ ] Test listener unsubscribe behavior.
- [ ] Test one broken listener does not stop others.
- [ ] Test event messages over 80 characters are rejected.
- [ ] Test error details preserve the stack trace.
- [ ] Test circular details serialize safely.
- [ ] Test history never exceeds its configured limit.
- [ ] Test error events appear in debug snapshots.
- [ ] Test disabled tracking does not persist errors.
- [ ] Test recursive event loops are prevented.
