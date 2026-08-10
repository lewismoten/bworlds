import { describe, expect, it } from 'vitest';

import {
  constrainSongSectionNote,
  isNoteInsideSongSection,
} from './procedural-music-song-boundaries.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

function createSection(
  overrides: Partial<ProceduralMusicSongSection> = {}
): ProceduralMusicSongSection {
  return {
    id: 'variation',
    label: 'Variation',
    startOffsetMs: 2_000,
    durationMs: 4_000,
    loopEligible: true,
    measureCount: 4,
    startMeasure: 1,
    endMeasure: 4,
    startTick: 0,
    endTick: 7_680,
    ...overrides,
  };
}

function createNote(
  overrides: Partial<ProceduralMusicNote> = {}
): ProceduralMusicNote {
  return {
    themeId: 'deep-forest',
    instrumentId: 'lead-flute',
    role: 'lead',
    startMs: 2_100,
    durationMs: 1_200,
    frequency: 440,
    volume: 0.7,
    waveform: 'triangle',
    timbre: {
      attackCurve: 'smooth',
      releaseCurve: 'soft',
      partials: [],
      noiseMix: 0,
      vibratoDepth: 0,
      vibratoRate: 0,
      filterCutoff: 0.7,
      filterQ: 0.1,
      shimmerMix: 0,
    },
    attackMs: 20,
    releaseMs: 180,
    detuneCents: 0,
    harmonicGain: 0.2,
    pulseRate: 0,
    ...overrides,
  };
}

describe('procedural music song boundaries', () => {
  it('clips note tails so section changes happen exactly at boundaries', () => {
    const section = createSection();
    const note = createNote({
      startMs: 5_600,
      durationMs: 1_200,
    });

    const constrained = constrainSongSectionNote(note, section, 0);

    expect(constrained).not.toBeNull();
    expect(constrained?.startMs).toBe(5_600);
    expect(constrained?.durationMs).toBe(400);
    expect(isNoteInsideSongSection(constrained!, section, 0)).toBe(true);
  });

  it('drops notes that shift beyond the end of their assigned section', () => {
    const section = createSection();
    const note = createNote({
      startMs: 6_100,
      durationMs: 320,
    });

    expect(constrainSongSectionNote(note, section, 0)).toBeNull();
  });

  it('pulls early notes back inside the section start when needed', () => {
    const section = createSection();
    const note = createNote({
      startMs: 1_900,
      durationMs: 600,
    });

    const constrained = constrainSongSectionNote(note, section, 0);

    expect(constrained?.startMs).toBe(2_000);
    expect(constrained?.durationMs).toBe(500);
    expect(isNoteInsideSongSection(constrained!, section, 0)).toBe(true);
  });
});
