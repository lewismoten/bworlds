# Music Debug Timeline Overlays

The music debug page now treats timeline diagnostics as a separate overlay layer
that can be hidden without removing the underlying note bars.

## Overlay Groups

The legend currently controls these overlay groups:

- `note-warnings`
- `cadence`
- `harmony-drift`
- `bass-drift`
- `motif`
- `climax`

## Flow

1. `music-debug-timeline-overlays.ts` defines the supported overlay kinds and
   normalizes persisted hidden-overlay state.
2. `music-debug-page.ts` renders a legend button for each overlay kind and
   persists the hidden set through the existing page-persistence controller.
3. `music-debug-timeline.ts` respects that hidden set when:
   - drawing the interactive canvas
   - resolving hover details
   - building standalone SVG exports

## Why This Matters

This keeps the timeline usable when several diagnostics are present at once:

- users can isolate one signal without muting whole tracks
- note bars remain visible even when warning colors are hidden
- exported timeline SVGs can match the reduced overlay view
