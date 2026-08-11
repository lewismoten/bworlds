# Music Debug Export Bundle

The music debug export ZIP now includes the generated score assets plus
standalone SVG graph images.

Current graph exports:

- `*-timeline.svg`
  Full song timeline with section bands, planned chord cues, planned cadence
  markers, centered section-label pills, adaptive measure numbers, beat
  guides, role lanes, note bars, guides, and optional playback markers.
- `*-lead-contour.svg`
  Standalone lead contour graph showing the planned range, target contour, and
  actual melody checkpoints.
- `*-bass-waveform.svg`
- `*-harmony-waveform.svg`
- `*-lead-waveform.svg`
- `*-percussion-<voice>-waveform.svg`
  Self-contained waveform previews for each exported instrument card.

These SVG files are generated directly from the same snapshot data as the debug
page so they can be inspected outside the browser and remain deterministic in
tests.
