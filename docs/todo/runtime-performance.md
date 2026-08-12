# Runtime Performance Snapshot Tests

- [x] Validate every snapshot against a runtime schema.
- [x] Require a supported schema version.
- [x] Require a valid ISO timestamp.
- [x] Require a known snapshot source.
- [x] Require a known trigger value.
- [x] Require a world seed.
- [x] Require a valid world context.
- [x] Reject negative performance limits.
- [x] Reject negative performance metrics.
- [x] Require finite numeric metric values.
- [x] Define which metrics are allowed to be null.
- [ ] Fail when a required metric is null.
- [x] Treat null as not measured, not zero.
- [ ] Keep limit fields aligned with metric fields.
- [x] Fail when measured values exceed hard limits.
- [x] Add a violation for every failed hard limit.
- [x] Include expected and actual values in violations.
- [x] Include the metric name in every violation.
- [x] Ensure passing metrics create no violations.
- [x] Ensure multiple failures create multiple violations.
- [x] Test exact values at each configured limit.
- [x] Test values just below each configured limit.
- [x] Test values just above each configured limit.
- [x] Test maximum frame duration enforcement.
- [ ] Test visible tile average duration enforcement.
- [x] Test visible tile maximum duration enforcement.
- [ ] Add a pending tile count limit.
- [ ] Test pending tile count enforcement.
- [ ] Add a minimum tile build rate if useful.
- [ ] Test minimum tile build rate enforcement.
- [x] Test active Three.js object count enforcement.
- [x] Test draw call count enforcement.
- [x] Test audio node count enforcement.
- [x] Test memory usage enforcement when measured.
- [x] Test song generation duration enforcement.
- [x] Test MIDI export duration enforcement.
- [x] Test WAV export duration enforcement.
- [ ] Reject impossible object or draw-call counts.
- [ ] Warn when expected startup metrics are missing.
- [ ] Warn when suspicious metrics are near zero.
- [ ] Keep warnings separate from hard violations.
- [ ] Test snapshot JSON can round-trip without data loss.
- [ ] Test old schema versions can be migrated.
- [ ] Test unknown schema versions are rejected.

Progress: runtime snapshots now pass through
`validateRuntimePerformanceSnapshot(...)` before the Vite snapshot API writes
them to disk, the latest-snapshot regression test now validates saved
snapshots with that same schema check, and focused validation tests now cover
schema metadata, nullable-vs-measured metrics, finite/non-negative number
requirements, expected violation accounting, and exact / below / above hard-
limit behavior for the current startup, frame, tile-build max, object, draw-
call, audio, memory, song-export, MIDI-export, and WAV-export limits.
