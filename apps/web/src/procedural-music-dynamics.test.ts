import { describe, expect, it } from 'vitest';
import { applyGentleProceduralMusicCompression } from './procedural-music-dynamics.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

function createNote(
  role: ProceduralMusicNote['role'],
  volume: number
): ProceduralMusicNote {
  return {
    themeId: 'frontier-plains',
    instrumentId: `test:${role}`,
    role,
    startMs: 0,
    durationMs: 320,
    frequency: 220,
    volume,
    waveform: 'sine',
    timbre: {
      harmonicWaveform: 'triangle',
      harmonicRatio: 2,
      filterType: 'lowpass',
      filterCutoffHz: 1200,
      filterQ: 0.8,
    },
    attackMs: 20,
    releaseMs: 80,
    detuneCents: 0,
    harmonicGain: 0.2,
    pulseRate: 1,
  };
}

describe('procedural music dynamics', () => {
  it('softens hot peaks more than quieter supporting notes', () => {
    const notes = [
      createNote('lead', 0.046),
      createNote('harmony', 0.028),
      createNote('bass', 0.025),
      createNote('percussion', 0.018),
    ];

    applyGentleProceduralMusicCompression(notes);

    expect(notes[0]!.volume).toBeLessThan(0.046);
    expect(notes[1]!.volume).toBeGreaterThan(0.024);
    expect(notes[3]!.volume).toBeGreaterThanOrEqual(0.018);
  });

  it('reduces dynamic spread without flattening it away', () => {
    const notes = [
      createNote('lead', 0.05),
      createNote('harmony', 0.03),
      createNote('bass', 0.024),
      createNote('percussion', 0.014),
    ];
    const beforeSpread =
      Math.max(...notes.map((note) => note.volume)) -
      Math.min(...notes.map((note) => note.volume));

    applyGentleProceduralMusicCompression(notes);

    const afterSpread =
      Math.max(...notes.map((note) => note.volume)) -
      Math.min(...notes.map((note) => note.volume));

    expect(afterSpread).toBeLessThan(beforeSpread);
    expect(afterSpread).toBeGreaterThan(0.01);
  });
});
