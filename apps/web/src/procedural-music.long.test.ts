import { describe, expect, it } from 'vitest';
import { createProceduralMusicSong } from './procedural-music-song.ts';

describe('procedural music long', () => {
  it('sustains harmony notes across most of each chord window instead of short stabs', () => {
    const song = createProceduralMusicSong({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      yearProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    const harmonyNotes = song.notes.filter((note) => note.role === 'harmony');
    const harmonyStarts = [
      ...new Set(harmonyNotes.map((note) => note.startMs)),
    ].sort((left, right) => left - right);
    const harmonyStartDeltas = harmonyStarts
      .slice(1)
      .map((startMs, index) => startMs - harmonyStarts[index]!);
    const averageDurationMs =
      harmonyNotes.reduce((total, note) => total + note.durationMs, 0) /
      Math.max(1, harmonyNotes.length);
    const averageHarmonySpanMs =
      harmonyStartDeltas.reduce((total, delta) => total + delta, 0) /
      Math.max(1, harmonyStartDeltas.length);

    expect(harmonyNotes.length).toBeGreaterThan(0);
    expect(averageHarmonySpanMs).toBeGreaterThan(0);
    expect(averageDurationMs).toBeGreaterThan(averageHarmonySpanMs * 0.7);
  });
});
