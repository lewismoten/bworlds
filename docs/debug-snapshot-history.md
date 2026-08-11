# Debug Snapshot History

The exported debug snapshot now keeps a rolling two-minute frame-history window
instead of only one minute.

Current behavior:

- performance samples are still recorded at most once per second
- the rolling buffer now keeps roughly 120 seconds of frame-history samples
- exported history covers longer degradations, repeated stutters, and slower
  quality-reduction trends without changing the payload structure

This keeps the runtime overhead small while making snapshot exports more useful
for the `errors.md` and performance-follow-up diagnostics.
