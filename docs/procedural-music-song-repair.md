# Procedural Music Song Repair

`createProceduralMusicSong()` now routes its validation-driven repair loop
through
[repairProceduralMusicSongCriticalFailures()](/Users/lewismoten/dev/bworlds/apps/web/src/procedural-music-song-repair.ts:69).

Current flow:

- Build the repeated base phrase plan once.
- Finalize those notes into arranged, motif-stated, cadenced, chromatic-repaired,
  and density-shaped song notes.
- Detect critical phrase windows from harmony drift, bass-root drift, cadence
  failures, and lead-contour misses.
- Regenerate only the affected repeated phrase windows.
- Rerun the same finalization pipeline on the repaired repeated notes and keep
  the resulting remaining critical phrase set available for later passes or
  diagnostics before the song is returned.

That keeps validation and repair aligned on one phrase index model, so the
repair pass can stay localized instead of rebuilding every phrase after one
critical failure.
