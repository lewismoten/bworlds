import { describe, expect, it } from 'vitest';

import { analyzeMusicDebugPitches } from './music-debug-note-analysis.ts';
import { regeneratePhrasesContainingUnresolvedChromaticNotes } from './procedural-music-song-chromatic.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import { resolveMusicThemeById } from './procedural-music.ts';
import { resolveProceduralMidiNoteFrequency } from './procedural-music-scale.ts';

describe('procedural music song chromatic repair', () => {
  it('repairs phrases containing unresolved chromatic notes without changing clean phrases', () => {
    const theme = resolveMusicThemeById('frontier-plains');
    const phraseDurationMs = 8_000;
    const songStartMs = 1_000;
    const notes: ProceduralMusicNote[] = [
      createNote(theme.id, 'lead', songStartMs + 200, 0),
      createNote(theme.id, 'lead', songStartMs + 1_400, 6),
      createNote(theme.id, 'lead', songStartMs + 2_600, 9),
      createNote(theme.id, 'lead', songStartMs + phraseDurationMs + 300, 0),
      createNote(theme.id, 'lead', songStartMs + phraseDurationMs + 1_500, 2),
      createNote(theme.id, 'lead', songStartMs + phraseDurationMs + 2_700, 4),
    ];

    const before = analyzeMusicDebugPitches({
      notes,
      rootHz: theme.rootHz,
      modePitchOffsets: theme.scale,
      themeId: theme.id,
      encounterMode: 'ambient',
    });
    const repaired = regeneratePhrasesContainingUnresolvedChromaticNotes(
      notes,
      {
        songStartMs,
        phraseDurationMs,
      }
    );
    const after = analyzeMusicDebugPitches({
      notes: repaired,
      rootHz: theme.rootHz,
      modePitchOffsets: theme.scale,
      themeId: theme.id,
      encounterMode: 'ambient',
    });

    expect(before.unexplainedAccidentalCount).toBe(1);
    expect(after.unexplainedAccidentalCount).toBe(0);
    expect(after.isValidForMidiExport).toBe(true);
    expect(repaired[1]?.frequency).not.toBe(notes[1]?.frequency);
    expect(repaired[3]?.frequency).toBe(notes[3]?.frequency);
    expect(repaired[4]?.frequency).toBe(notes[4]?.frequency);
    expect(repaired[5]?.frequency).toBe(notes[5]?.frequency);
  });
});

function createNote(
  themeId: ProceduralMusicNote['themeId'],
  role: ProceduralMusicNote['role'],
  startMs: number,
  relativeSemitones: number
): ProceduralMusicNote {
  const theme = resolveMusicThemeById(themeId);
  return {
    themeId,
    instrumentId: `${role}-test`,
    role,
    startMs,
    durationMs: 320,
    frequency: resolveProceduralMidiNoteFrequency(
      theme.rootMidiNote + relativeSemitones
    ),
    volume: 0.03,
    waveform: 'sine',
    timbre: {
      harmonicWaveform: 'triangle',
      harmonicRatio: 2,
      filterType: 'lowpass',
      filterCutoffHz: 1_200,
      filterQ: 0.8,
    },
    attackMs: 20,
    releaseMs: 80,
    detuneCents: 0,
    harmonicGain: 0.4,
    pulseRate: 0,
  };
}
