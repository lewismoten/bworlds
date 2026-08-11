import { describe, expect, it } from 'vitest';
import { createProceduralMusicSong } from './procedural-music-song.ts';
import {
  REPRESENTATIVE_FOREST_EXPLORATION_SONG,
  collectLeadMotifRhythmShape,
} from './testing/procedural-music-song-test-support.ts';

describe('procedural music song structure layout', () => {
  it('builds deterministic full-song structures with loopable middle sections', () => {
    const first = REPRESENTATIVE_FOREST_EXPLORATION_SONG;
    const second = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    });

    expect(first.sections.map((section) => section.id)).toEqual([
      'intro',
      'a',
      'a-prime',
      'b',
      'variation',
      'return',
      'outro',
    ]);
    expect(first.blueprint.id).toBe('exploration-cycle');
    expect(first.dna.identityId).toBe(second.dna.identityId);
    expect(first.dna.progression).toEqual(second.dna.progression);
    expect(first.dna.leadMotif).toEqual(second.dna.leadMotif);
    expect(first.loopStartOffsetMs).toBe(first.sections[1]?.startOffsetMs);
    expect(first.loopEndOffsetMs).toBe(
      first.sections[first.sections.length - 1]!.startOffsetMs
    );
    expect(first.sections[0]).toEqual(
      expect.objectContaining({ startMeasure: 1, endMeasure: 8 })
    );
    expect(first.sections[1]).toEqual(
      expect.objectContaining({ startMeasure: 9, endMeasure: 24 })
    );
    expect(first.sections[2]).toEqual(
      expect.objectContaining({ startMeasure: 25, endMeasure: 40 })
    );
    expect(first.sections[3]).toEqual(
      expect.objectContaining({ startMeasure: 41, endMeasure: 56 })
    );
    expect(first.sections[4]).toEqual(
      expect.objectContaining({ startMeasure: 57, endMeasure: 72 })
    );
    expect(first.sections[5]).toEqual(
      expect.objectContaining({ startMeasure: 73, endMeasure: 80 })
    );
    expect(first.sections.at(-1)).toEqual(
      expect.objectContaining({ startMeasure: 81, endMeasure: 88 })
    );
    expect(first.durationMs).toBeGreaterThan(100_000);
    expect(first.durationMs).toBe(second.durationMs);
    expect(first.notes).toEqual(second.notes);
  });

  it('makes the variation section audibly distinct through changed lead rhythm', () => {
    const song = REPRESENTATIVE_FOREST_EXPLORATION_SONG;
    const sectionA = song.sections.find((section) => section.id === 'a')!;
    const variation = song.sections.find(
      (section) => section.id === 'variation'
    )!;
    const sectionARhythm = collectLeadMotifRhythmShape(song, sectionA).slice(
      0,
      4
    );
    const variationRhythm = collectLeadMotifRhythmShape(song, variation).slice(
      0,
      4
    );

    expect(sectionARhythm).toHaveLength(4);
    expect(variationRhythm).toHaveLength(4);
    expect(variationRhythm).not.toEqual(sectionARhythm);
  });

  it('assigns a stable lead rhythm identity to each song section', () => {
    const song = REPRESENTATIVE_FOREST_EXPLORATION_SONG;
    const intro = song.sections.find((section) => section.id === 'intro')!;
    const sectionA = song.sections.find((section) => section.id === 'a')!;
    const sectionAPrime = song.sections.find(
      (section) => section.id === 'a-prime'
    )!;
    const sectionB = song.sections.find((section) => section.id === 'b')!;
    const variation = song.sections.find(
      (section) => section.id === 'variation'
    )!;
    const sectionReturn = song.sections.find(
      (section) => section.id === 'return'
    )!;
    const outro = song.sections.find((section) => section.id === 'outro')!;

    const introRhythm = collectLeadMotifRhythmShape(song, intro).slice(0, 4);
    const sectionARhythm = collectLeadMotifRhythmShape(song, sectionA).slice(
      0,
      4
    );
    const sectionAPrimeRhythm = collectLeadMotifRhythmShape(
      song,
      sectionAPrime
    ).slice(0, 4);
    const sectionBRhythm = collectLeadMotifRhythmShape(song, sectionB).slice(
      0,
      4
    );
    const variationRhythm = collectLeadMotifRhythmShape(song, variation).slice(
      0,
      4
    );
    const returnRhythm = collectLeadMotifRhythmShape(song, sectionReturn).slice(
      0,
      4
    );
    const outroRhythm = collectLeadMotifRhythmShape(song, outro).slice(0, 4);

    expect(introRhythm).toHaveLength(4);
    expect(sectionARhythm).toHaveLength(4);
    expect(sectionAPrimeRhythm).toEqual(sectionARhythm);
    expect(sectionBRhythm).toHaveLength(4);
    expect(variationRhythm).toHaveLength(4);
    expect(returnRhythm).toHaveLength(4);
    expect(outroRhythm).toHaveLength(4);
    expect(introRhythm).not.toEqual(sectionARhythm);
    expect(sectionBRhythm).not.toEqual(sectionARhythm);
    expect(variationRhythm).not.toEqual(sectionARhythm);
    expect(returnRhythm).not.toEqual(sectionARhythm);
    expect(outroRhythm).not.toEqual(sectionARhythm);
  });
});
