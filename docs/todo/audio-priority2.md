# Music Quality and Debug Priorities

## 1) Enforce musical correctness first

- [ ] Fail export when harmony notes miss planned chord tones.
- [ ] Fail export when bass roots miss planned chord roots.
- [ ] Fail export when cadence notes miss active harmony.
- [ ] Regenerate only failed measures, then rerun validation.
- [ ] Add a chord-tone score for every measure and track.
- [ ] Add a phrase-intent score for motif, contour, cadence.
- [ ] Show pass or fail per section, not only whole-song.
- [x] Block "good" status when any critical musical check fails.

## 2) Make melody feel intentional

- [ ] Limit filler notes between motif anchors per phrase.
- [ ] Reduce repeated pitch bias in lead note selection.
- [ ] Keep lead climax near the planned phrase peak.
- [ ] Reserve the highest note for one main climax only.
- [ ] Force final lead note to tonic or approved cadence tone.
- [ ] Use longer notes at phrase endings.
- [ ] Add clearer call-and-response between phrase pairs.
- [ ] Reuse motif shapes more clearly in Return and Outro.
- [ ] Prefer stepwise motion after large leaps.
- [ ] Reduce random melodic wandering inside a phrase.

## 3) Tighten harmony and bass writing

- [ ] Keep harmony below lead and out of its core register.
- [ ] Prefer chord tones on strong beats.
- [ ] Restrict passing tones to weak beats or approach notes.
- [ ] Add counter-motion rules between bass and melody.
- [ ] Hold bass roots longer at cadence measures.
- [ ] Reduce harmony density during key melody moments.
- [ ] Add section-level tension and release targets.
- [ ] Keep accompaniment patterns more consistent per section.

## 4) Improve instrument identity

- [ ] Map each GM instrument to a hand-tuned patch family.
- [ ] Add reference patches for flute, strings, bass, drums.
- [ ] Compare patches to family spectral targets.
- [ ] Reject patches that fail family similarity checks.
- [ ] Tune lead patches away from thin 8-bit timbres.
- [ ] Add layered oscillators for richer core instruments.
- [ ] Add subtle body resonance to flute and strings.
- [ ] Add timbre shifts by velocity and register.
- [ ] Add patch presets for soft, bright, dark, and distant.
- [ ] Add a "sounds unlike target instrument" warning.

## 5) Improve percussion variety and clarity

- [ ] Give each drum voice its own synth chain.
- [ ] Separate kick, snare, hat, cymbal, tom, shaker roles.
- [ ] Make grooves use at least three drum roles.
- [ ] Add stronger accents on structural beats.
- [ ] Add fills only at section ends or transitions.
- [ ] Pan drum voices slightly for separation.
- [ ] Make shaker and tambourine patches more distinct.
- [ ] Make cymbals longer and hats shorter.
- [ ] Add drum role labels to the report and timeline.
- [ ] Export one-shot drum previews for each drum voice.

## 6) Reduce oversized sample exports

- [ ] Trim leading silence from sample exports.
- [ ] Trim trailing silence from sample exports.
- [ ] Normalize preview exports to a short audition phrase.
- [ ] Add one-shot, loop, and full-song export modes.
- [ ] Add max duration caps for preview sample exports.
- [ ] Skip rendering long silent tails for sparse drum solos.
- [ ] Add optional 22kHz preview mode for debug exports.
- [ ] Add optional compressed preview exports.
- [ ] Show export duration and size before download.
- [ ] Warn when a preview export exceeds size limits.

## 7) Improve the timeline layout

- [ ] Add whole-song and rolling-window timeline modes.
- [ ] Keep a fixed playhead in rolling-window mode.
- [ ] Add zoom for song, section, bar, and beat levels.
- [ ] Show measure numbers and beat subdivisions.
- [ ] Show chord labels above the timeline.
- [ ] Show section labels and cadence markers.
- [ ] Show note name and duration on hover.
- [ ] Show drum voice name on percussion hover.
- [ ] Add per-track eye icons to hide tracks.
- [ ] Add per-track ear icons to solo or mute tracks.
- [ ] Add per-drum toggles within the percussion lane.
- [ ] Add a mini overview strip for fast scrubbing.
- [ ] Add loop-range drag handles on the timeline.
- [ ] Add snap-to-measure and snap-to-section navigation.

## 8) Add better diagnostics to the timeline

- [ ] Mark out-of-scale notes with a warning color.
- [ ] Mark non-chord tones with a warning color.
- [ ] Mark failed cadence notes with icons.
- [ ] Mark harmony drift at exact measures.
- [ ] Mark bass root drift at exact measures.
- [ ] Mark motif matches and motif variations.
- [ ] Mark the planned and actual climax positions.
- [ ] Show current chord under the playhead.
- [ ] Show current scale under the playhead.
- [ ] Add density heatmaps behind each lane.
- [ ] Add a legend toggle so overlays can be hidden.
- [ ] Add filter icons for chords, cadence, motif, contour.

## 9) Improve sound bank debug usefulness

- [ ] Add live ADSR controls to the sound bank page.
- [ ] Add filter, noise, and detune controls.
- [ ] Add oscillator enable and solo toggles.
- [ ] Add A/B patch comparison with instant switching.
- [ ] Add dry versus processed playback buttons.
- [ ] Add one-click reference phrase playback per patch.
- [ ] Add waveform, spectrum, and envelope views together.
- [ ] Add a "compare to reference patch" report.
- [ ] Add patch quality warnings before song export.
- [ ] Save known-good patches and lock them as references.
