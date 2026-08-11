## Music Debug Playhead Bounds

The music debug playhead now uses the same vertical bounds as the track lane
area in both canvas rendering and exported SVG markup.

That keeps the live timeline and exported timeline aligned and avoids the
playhead visually intruding into the label rows above the tracks.
