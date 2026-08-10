# Music Debug Rejection Reports

Rejected music-debug snapshots are now persisted automatically in browser
storage under `bworlds:music-debug-rejection-reports`.

Each saved record includes:

- snapshot options and theme metadata
- the current report payload used by the music export bundle
- the rejection reasons that blocked export or validation

The saver deduplicates consecutive identical rejection signatures and keeps only
the most recent 12 reports, which keeps storage bounded while preserving recent
failures for comparison.
