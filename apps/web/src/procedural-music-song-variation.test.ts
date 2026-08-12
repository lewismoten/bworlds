import { describe, expect, it } from 'vitest';
import type { ProceduralMusicNote } from './procedural-music.ts';
import { transformSongSectionNote } from './procedural-music-song-variation.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

const BASE_NOTE: ProceduralMusicNote = {
  themeId: 'deep-forest',
  instrumentId: 'deep-forest:lead:0:0',
  role: 'lead',
  startMs: 10_000,
  durationMs: 320,
  frequency: 440,
  volume: 0.04,
  waveform: 'triangle',
  timbre: {
    harmonicWaveform: 'sine',
    harmonicRatio: 2,
    filterType: 'lowpass',
    filterCutoffHz: 1_800,
    filterQ: 0.9,
  },
  attackMs: 24,
  releaseMs: 160,
  detuneCents: 0,
  harmonicGain: 0.3,
  pulseRate: 1,
};

const BASE_NOTE_WITH_VELOCITY: ProceduralMusicNote = {
  ...BASE_NOTE,
  velocity: 80,
};

function createSection(
  id: ProceduralMusicSongSection['id']
): ProceduralMusicSongSection {
  return {
    id,
    label: id,
    startOffsetMs: 0,
    durationMs: 24_000,
    loopEligible: true,
    measureCount: 16,
    startMeasure: 1,
    endMeasure: 16,
    startTick: 0,
    endTick: 16 * 1920,
  };
}

describe('procedural music song variation', () => {
  it("changes A' phrase endings with transposition and a small rhythm shift", () => {
    const transformed = transformSongSectionNote(
      BASE_NOTE,
      createSection('a-prime'),
      7,
      0
    );

    expect(transformed).not.toBeNull();
    expect(transformed?.startMs).toBeGreaterThan(BASE_NOTE.startMs);
    expect(transformed?.frequency).toBeGreaterThan(BASE_NOTE.frequency);
  });

  it('creates a more distinct variation section with changed notes and timing', () => {
    const transformed = transformSongSectionNote(
      BASE_NOTE,
      createSection('variation'),
      4,
      0
    );

    expect(transformed).not.toBeNull();
    expect(transformed?.startMs).toBe(BASE_NOTE.startMs);
    expect(transformed?.frequency).toBeGreaterThan(BASE_NOTE.frequency);
    expect(transformed?.durationMs).toBeGreaterThan(BASE_NOTE.durationMs);
  });

  it('shortens variation lead notes as the section builds toward its climax', () => {
    const earlyVariation = transformSongSectionNote(
      { ...BASE_NOTE, startMs: 750 },
      createSection('variation'),
      0,
      0
    );
    const nearClimaxVariation = transformSongSectionNote(
      { ...BASE_NOTE, startMs: 9_000 },
      createSection('variation'),
      0,
      0
    );
    const postClimaxVariation = transformSongSectionNote(
      { ...BASE_NOTE, startMs: 18_000 },
      createSection('variation'),
      0,
      0
    );

    expect(earlyVariation).not.toBeNull();
    expect(nearClimaxVariation).not.toBeNull();
    expect(postClimaxVariation).not.toBeNull();
    expect(nearClimaxVariation?.durationMs).toBeLessThan(
      earlyVariation?.durationMs ?? 0
    );
    expect(postClimaxVariation?.durationMs).toBeGreaterThan(
      nearClimaxVariation?.durationMs ?? 0
    );
  });

  it('adds small timing offsets that differ by instrument role', () => {
    const section = createSection('a');
    const lead = transformSongSectionNote(
      { ...BASE_NOTE, role: 'lead', instrumentId: 'deep-forest:lead:0:0' },
      section,
      1,
      0
    );
    const bass = transformSongSectionNote(
      {
        ...BASE_NOTE,
        role: 'bass',
        instrumentId: 'deep-forest:bass:0:0',
        waveform: 'sine',
      },
      section,
      1,
      0
    );
    const harmony = transformSongSectionNote(
      {
        ...BASE_NOTE,
        role: 'harmony',
        instrumentId: 'deep-forest:harmony:0:0',
      },
      section,
      1,
      0
    );
    const percussion = transformSongSectionNote(
      {
        ...BASE_NOTE,
        role: 'percussion',
        instrumentId: 'deep-forest:percussion:0:0',
      },
      section,
      1,
      0
    );

    expect(lead).not.toBeNull();
    expect(bass).not.toBeNull();
    expect(harmony).not.toBeNull();
    expect(percussion).not.toBeNull();
    expect(lead?.startMs).toBe(BASE_NOTE.startMs);
    expect(bass?.startMs).toBe(BASE_NOTE.startMs + 2);
    expect(harmony?.startMs).toBe(BASE_NOTE.startMs + 7);
    expect(percussion?.startMs).toBe(BASE_NOTE.startMs + 1);
  });

  it('lets bass notes land slightly ahead of or behind the beat from one repeating profile', () => {
    const section = createSection('a');
    const earlyBass = transformSongSectionNote(
      {
        ...BASE_NOTE,
        role: 'bass',
        instrumentId: 'deep-forest:bass:0:0',
        waveform: 'sine',
      },
      section,
      0,
      0
    );
    const lateBass = transformSongSectionNote(
      {
        ...BASE_NOTE,
        role: 'bass',
        instrumentId: 'deep-forest:bass:0:0',
        waveform: 'sine',
      },
      section,
      1,
      0
    );

    expect(earlyBass).not.toBeNull();
    expect(lateBass).not.toBeNull();
    expect(earlyBass?.startMs).toBe(BASE_NOTE.startMs - 2);
    expect(lateBass?.startMs).toBe(BASE_NOTE.startMs + 2);
  });

  it('staggeres harmony notes by a few milliseconds while keeping percussion timing tightly bounded', () => {
    const section = createSection('a');
    const harmonyStarts = [0, 1, 2, 3].map(
      (phrasePosition) =>
        transformSongSectionNote(
          {
            ...BASE_NOTE,
            role: 'harmony',
            instrumentId: 'deep-forest:harmony:0:0',
          },
          section,
          phrasePosition,
          0
        )?.startMs ?? 0
    );
    const percussionOffsets = Array.from(
      { length: 8 },
      (_, phrasePosition) =>
        (transformSongSectionNote(
          {
            ...BASE_NOTE,
            role: 'percussion',
            instrumentId: 'deep-forest:percussion:0:0',
          },
          section,
          phrasePosition,
          0
        )?.startMs ?? BASE_NOTE.startMs) - BASE_NOTE.startMs
    );

    expect(harmonyStarts).toEqual([
      BASE_NOTE.startMs + 4,
      BASE_NOTE.startMs + 7,
      BASE_NOTE.startMs + 5,
      BASE_NOTE.startMs + 8,
    ]);
    expect(Math.min(...percussionOffsets)).toBeGreaterThanOrEqual(-4);
    expect(Math.max(...percussionOffsets)).toBeLessThanOrEqual(3);
    expect(new Set(percussionOffsets).size).toBeGreaterThan(3);
  });

  it('reuses the same humanization profile instead of randomizing each note independently', () => {
    const section = createSection('a');
    const firstBass = transformSongSectionNote(
      {
        ...BASE_NOTE_WITH_VELOCITY,
        role: 'bass',
        instrumentId: 'deep-forest:bass:0:0',
        waveform: 'sine',
      },
      section,
      0,
      0
    );
    const repeatedBass = transformSongSectionNote(
      {
        ...BASE_NOTE_WITH_VELOCITY,
        role: 'bass',
        instrumentId: 'deep-forest:bass:0:0',
        waveform: 'sine',
      },
      section,
      8,
      0
    );
    const firstPercussion = transformSongSectionNote(
      {
        ...BASE_NOTE_WITH_VELOCITY,
        role: 'percussion',
        instrumentId: 'deep-forest:percussion:0:0',
      },
      section,
      2,
      0
    );
    const repeatedPercussion = transformSongSectionNote(
      {
        ...BASE_NOTE_WITH_VELOCITY,
        role: 'percussion',
        instrumentId: 'deep-forest:percussion:0:0',
      },
      section,
      10,
      0
    );

    expect(firstBass).not.toBeNull();
    expect(repeatedBass).not.toBeNull();
    expect(firstPercussion).not.toBeNull();
    expect(repeatedPercussion).not.toBeNull();
    expect(firstBass?.startMs).toBe(repeatedBass?.startMs);
    expect(firstBass?.velocity).toBe(repeatedBass?.velocity);
    expect(firstPercussion?.startMs).toBe(repeatedPercussion?.startMs);
    expect(firstPercussion?.velocity).toBe(repeatedPercussion?.velocity);
  });

  it('keeps accompaniment timing identities consistent within a section but different across sections', () => {
    const bassInB = transformSongSectionNote(
      {
        ...BASE_NOTE_WITH_VELOCITY,
        role: 'bass',
        instrumentId: 'deep-forest:bass:0:0',
        waveform: 'sine',
      },
      createSection('b'),
      1,
      0
    );
    const repeatedBassInB = transformSongSectionNote(
      {
        ...BASE_NOTE_WITH_VELOCITY,
        role: 'bass',
        instrumentId: 'deep-forest:bass:0:0',
        waveform: 'sine',
      },
      createSection('b'),
      9,
      0
    );
    const bassInReturn = transformSongSectionNote(
      {
        ...BASE_NOTE_WITH_VELOCITY,
        role: 'bass',
        instrumentId: 'deep-forest:bass:0:0',
        waveform: 'sine',
      },
      createSection('return'),
      1,
      0
    );
    const harmonyInB = transformSongSectionNote(
      {
        ...BASE_NOTE_WITH_VELOCITY,
        role: 'harmony',
        instrumentId: 'deep-forest:harmony:0:0',
      },
      createSection('b'),
      3,
      0
    );
    const repeatedHarmonyInB = transformSongSectionNote(
      {
        ...BASE_NOTE_WITH_VELOCITY,
        role: 'harmony',
        instrumentId: 'deep-forest:harmony:0:0',
      },
      createSection('b'),
      11,
      0
    );
    const harmonyInReturn = transformSongSectionNote(
      {
        ...BASE_NOTE_WITH_VELOCITY,
        role: 'harmony',
        instrumentId: 'deep-forest:harmony:0:0',
      },
      createSection('return'),
      3,
      0
    );

    expect(bassInB).not.toBeNull();
    expect(repeatedBassInB).not.toBeNull();
    expect(bassInReturn).not.toBeNull();
    expect(harmonyInB).not.toBeNull();
    expect(repeatedHarmonyInB).not.toBeNull();
    expect(harmonyInReturn).not.toBeNull();

    expect(repeatedBassInB?.startMs).toBe(bassInB?.startMs);
    expect(repeatedBassInB?.velocity).toBe(bassInB?.velocity);
    expect(repeatedHarmonyInB?.startMs).toBe(harmonyInB?.startMs);
    expect(repeatedHarmonyInB?.velocity).toBe(harmonyInB?.velocity);

    expect(bassInReturn?.startMs).not.toBe(bassInB?.startMs);
    expect(harmonyInReturn?.startMs).not.toBe(harmonyInB?.startMs);
  });

  it('changes articulation at phrase boundaries for sustained non-percussion roles', () => {
    const section = createSection('a');
    const openingLead = transformSongSectionNote(
      {
        ...BASE_NOTE,
        role: 'lead',
        instrumentId: 'deep-forest:lead:0:0',
      },
      section,
      0,
      0
    );
    const middleLead = transformSongSectionNote(
      {
        ...BASE_NOTE,
        role: 'lead',
        instrumentId: 'deep-forest:lead:0:0',
      },
      section,
      3,
      0
    );
    const closingLead = transformSongSectionNote(
      {
        ...BASE_NOTE,
        role: 'lead',
        instrumentId: 'deep-forest:lead:0:0',
      },
      section,
      7,
      0
    );

    expect(openingLead).not.toBeNull();
    expect(middleLead).not.toBeNull();
    expect(closingLead).not.toBeNull();
    expect(openingLead?.attackMs).toBeLessThan(middleLead?.attackMs ?? 0);
    expect(openingLead?.releaseMs).toBeLessThan(middleLead?.releaseMs ?? 0);
    expect(closingLead?.attackMs).toBeGreaterThan(middleLead?.attackMs ?? 0);
    expect(closingLead?.releaseMs).toBeGreaterThan(middleLead?.releaseMs ?? 0);
  });

  it('adds a small upward scoop for expressive lead phrase openings', () => {
    const section = createSection('a');
    const openingLead = transformSongSectionNote(
      {
        ...BASE_NOTE,
        family: 'flute',
        instrumentId: 'deep-forest:lead:0:0',
      },
      section,
      0,
      0
    );
    const middleLead = transformSongSectionNote(
      {
        ...BASE_NOTE,
        family: 'flute',
        instrumentId: 'deep-forest:lead:0:0',
      },
      section,
      3,
      0
    );

    expect(openingLead).not.toBeNull();
    expect(middleLead).not.toBeNull();
    expect(openingLead?.timbre.pitchSweepSemitones).toBeCloseTo(-0.32, 3);
    expect(openingLead?.timbre.pitchSweepDurationMs).toBe(72);
    expect(middleLead?.timbre.pitchSweepSemitones).toBeUndefined();
  });

  it('adds a restrained fall-off bend for expressive lead phrase endings', () => {
    const section = createSection('a');
    const closingLead = transformSongSectionNote(
      {
        ...BASE_NOTE,
        family: 'vocals',
        instrumentId: 'deep-forest:lead:0:0',
      },
      section,
      7,
      0
    );

    expect(closingLead).not.toBeNull();
    expect(closingLead?.timbre.pitchSweepSemitones).toBeCloseTo(0.24, 3);
    expect(closingLead?.timbre.pitchSweepDurationMs).toBe(64);
  });

  it('skips phrase pitch bends for unsupported lead families', () => {
    const section = createSection('a');
    const openingLead = transformSongSectionNote(
      {
        ...BASE_NOTE,
        family: 'piano',
        instrumentId: 'deep-forest:lead:0:0',
      },
      section,
      0,
      0
    );

    expect(openingLead).not.toBeNull();
    expect(openingLead?.timbre.pitchSweepSemitones).toBeUndefined();
    expect(openingLead?.timbre.pitchSweepDurationMs).toBeUndefined();
  });

  it('leaves percussion articulation unchanged at phrase boundaries', () => {
    const section = createSection('a');
    const openingPercussion = transformSongSectionNote(
      {
        ...BASE_NOTE,
        role: 'percussion',
        instrumentId: 'deep-forest:percussion:0:0',
      },
      section,
      0,
      0
    );
    const closingPercussion = transformSongSectionNote(
      {
        ...BASE_NOTE,
        role: 'percussion',
        instrumentId: 'deep-forest:percussion:0:0',
      },
      section,
      7,
      0
    );

    expect(openingPercussion).not.toBeNull();
    expect(closingPercussion).not.toBeNull();
    expect(openingPercussion?.attackMs).toBe(BASE_NOTE.attackMs);
    expect(closingPercussion?.attackMs).toBe(BASE_NOTE.attackMs);
    expect(openingPercussion?.releaseMs).toBe(closingPercussion?.releaseMs);
  });

  it('caps accompaniment release tails so they do not blur later chord changes', () => {
    const section = createSection('variation');
    const harmony = transformSongSectionNote(
      {
        ...BASE_NOTE,
        role: 'harmony',
        instrumentId: 'deep-forest:harmony:0:0',
        durationMs: 320,
        releaseMs: 240,
      },
      section,
      7,
      0
    );
    const bass = transformSongSectionNote(
      {
        ...BASE_NOTE,
        role: 'bass',
        instrumentId: 'deep-forest:bass:0:0',
        waveform: 'sine',
        durationMs: 320,
        releaseMs: 220,
      },
      section,
      7,
      0
    );

    expect(harmony).not.toBeNull();
    expect(bass).not.toBeNull();
    expect(harmony!.releaseMs).toBeLessThanOrEqual(
      Math.round(harmony!.durationMs * 0.4)
    );
    expect(bass!.releaseMs).toBeLessThanOrEqual(
      Math.round(bass!.durationMs * 0.36)
    );
  });

  it('keeps lead releases expressive but still bounded by the shaped note length', () => {
    const section = createSection('variation');
    const lead = transformSongSectionNote(
      {
        ...BASE_NOTE,
        role: 'lead',
        instrumentId: 'deep-forest:lead:0:0',
        durationMs: 320,
        releaseMs: 260,
      },
      section,
      7,
      0
    );

    expect(lead).not.toBeNull();
    expect(lead!.releaseMs).toBeLessThanOrEqual(
      Math.round(lead!.durationMs * 0.55)
    );
    expect(lead!.releaseMs).toBeGreaterThan(
      Math.round(lead!.durationMs * 0.35)
    );
  });

  it('adds small velocity changes across phrase positions', () => {
    const section = createSection('a');
    const firstLead = transformSongSectionNote(
      {
        ...BASE_NOTE_WITH_VELOCITY,
        role: 'lead',
        instrumentId: 'deep-forest:lead:0:0',
      },
      section,
      0,
      0
    );
    const secondLead = transformSongSectionNote(
      {
        ...BASE_NOTE_WITH_VELOCITY,
        role: 'lead',
        instrumentId: 'deep-forest:lead:0:0',
      },
      section,
      1,
      0
    );
    const firstHarmony = transformSongSectionNote(
      {
        ...BASE_NOTE_WITH_VELOCITY,
        role: 'harmony',
        instrumentId: 'deep-forest:harmony:0:0',
      },
      section,
      0,
      0
    );
    const secondHarmony = transformSongSectionNote(
      {
        ...BASE_NOTE_WITH_VELOCITY,
        role: 'harmony',
        instrumentId: 'deep-forest:harmony:0:0',
      },
      section,
      1,
      0
    );

    expect(firstLead).not.toBeNull();
    expect(secondLead).not.toBeNull();
    expect(firstHarmony).not.toBeNull();
    expect(secondHarmony).not.toBeNull();
    expect(firstLead?.velocity).toBe(83);
    expect(secondLead?.velocity).toBe(78);
    expect(firstHarmony?.velocity).toBe(79);
    expect(secondHarmony?.velocity).toBe(82);
  });

  it('assigns deterministic lead rhythm identities to each named song section', () => {
    const noteIndexInSection = 2;
    const intro = transformSongSectionNote(
      BASE_NOTE,
      createSection('intro'),
      noteIndexInSection,
      0
    );
    const sectionA = transformSongSectionNote(
      BASE_NOTE,
      createSection('a'),
      noteIndexInSection,
      0
    );
    const sectionAPrime = transformSongSectionNote(
      BASE_NOTE,
      createSection('a-prime'),
      noteIndexInSection,
      0
    );
    const sectionB = transformSongSectionNote(
      BASE_NOTE,
      createSection('b'),
      noteIndexInSection,
      0
    );
    const variation = transformSongSectionNote(
      BASE_NOTE,
      createSection('variation'),
      noteIndexInSection,
      0
    );
    const sectionReturn = transformSongSectionNote(
      BASE_NOTE,
      createSection('return'),
      noteIndexInSection,
      0
    );
    const outro = transformSongSectionNote(
      BASE_NOTE,
      createSection('outro'),
      noteIndexInSection,
      0
    );

    expect(intro).not.toBeNull();
    expect(sectionA).not.toBeNull();
    expect(sectionAPrime).not.toBeNull();
    expect(sectionB).not.toBeNull();
    expect(variation).not.toBeNull();
    expect(sectionReturn).not.toBeNull();
    expect(outro).not.toBeNull();
    expect(sectionA).toEqual(BASE_NOTE);
    expect(sectionAPrime?.startMs).toBe(sectionA?.startMs);
    expect(sectionAPrime?.durationMs).toBeGreaterThanOrEqual(
      sectionA?.durationMs ?? 0
    );
    expect(intro?.durationMs).toBeGreaterThan(sectionA?.durationMs ?? 0);
    expect(sectionB?.startMs).not.toBe(sectionA?.startMs);
    expect(variation?.startMs).not.toBe(sectionA?.startMs);
    expect(sectionReturn?.startMs).not.toBe(sectionA?.startMs);
    expect(outro?.durationMs).toBeGreaterThan(sectionA?.durationMs ?? 0);
  });

  it('keeps repaired lead density notes from picking up extra section transposition', () => {
    const repairedLeadNote: ProceduralMusicNote = {
      ...BASE_NOTE,
      instrumentId: 'deep-forest:lead:0:0:measure-1-0',
    };

    const aPrime = transformSongSectionNote(
      repairedLeadNote,
      createSection('a-prime'),
      7,
      0
    );
    const variation = transformSongSectionNote(
      repairedLeadNote,
      createSection('variation'),
      4,
      0
    );

    expect(aPrime).not.toBeNull();
    expect(variation).not.toBeNull();
    expect(aPrime?.frequency).toBe(repairedLeadNote.frequency);
    expect(variation?.frequency).toBe(repairedLeadNote.frequency);
  });

  it('keeps the base A section unchanged', () => {
    expect(
      transformSongSectionNote(BASE_NOTE, createSection('a'), 3, 0)
    ).toEqual(BASE_NOTE);
  });
});
