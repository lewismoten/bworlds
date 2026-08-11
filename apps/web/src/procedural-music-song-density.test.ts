import { describe, expect, it } from 'vitest';

import { resolveProceduralSongDensityMeasureTargets } from './procedural-music-density-rules.ts';
import { applyProceduralSongDensityPlan } from './procedural-music-song-density.ts';
import { createProceduralMusicSong } from './procedural-music-song.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

const PLAINS_REPRESENTATIVE_SONG = createProceduralMusicSong({
  nowMs: 1_000,
  tileKind: 'plains',
  contextType: 'overworld',
  dayProgress: 0.45,
  yearProgress: 0.25,
  clusterX: 0,
  clusterY: 0,
});
const FOREST_REPRESENTATIVE_SONG = createProceduralMusicSong({
  nowMs: 1_000,
  tileKind: 'forest',
  contextType: 'overworld',
  dayProgress: 0.45,
  yearProgress: 0.25,
  clusterX: 3,
  clusterY: -2,
});

describe('procedural music song density', () => {
  it('thins intro and most outro lead measures while ramping variation density toward the center', () => {
    const notes = applyProceduralSongDensityPlan({
      notes: [
        ...createMeasureLeadNotes(0, 8, 4),
        ...createMeasureLeadNotes(8_000, 16, 4),
        ...createMeasureLeadNotes(24_000, 8, 4),
      ],
      sections: [
        createSection('intro', 0, 8_000, 8),
        createSection('variation', 8_000, 16_000, 16),
        createSection('outro', 24_000, 8_000, 8),
      ],
      songStartMs: 0,
    });

    expect(
      countRoleNotesByMeasure(notes, 0, 8_000, 8, 'lead').map(
        (count) => count <= 3
      )
    ).not.toContain(false);
    const outroLeadCounts = countRoleNotesByMeasure(
      notes,
      24_000,
      8_000,
      8,
      'lead'
    );

    expect(outroLeadCounts[0]).toBeLessThanOrEqual(4);
    expect(outroLeadCounts.slice(1).every((count) => count <= 3)).toBe(true);
    expect(outroLeadCounts.at(-1)).toBeLessThanOrEqual(1);

    const variationCounts = countRoleNotesByMeasure(
      notes,
      8_000,
      16_000,
      16,
      'lead'
    );
    const earlyVariation = average(variationCounts.slice(0, 4));
    const lateVariation = average(variationCounts.slice(6, 10));

    expect(lateVariation).toBeGreaterThan(earlyVariation);
  });

  it('preserves accompaniment inside measures where the lead is resting', () => {
    const notes = applyProceduralSongDensityPlan({
      notes: [
        ...createMeasureLeadNotes(0, 1, 4),
        ...createHarmonyNotesForMeasure(0, 1),
      ],
      sections: [createSection('variation', 0, 16_000, 16)],
      songStartMs: 0,
    });

    const secondMeasureSupport = notes.filter(
      (note) =>
        (note.role === 'harmony' || note.role === 'bass') &&
        note.startMs >= 1_000 &&
        note.startMs < 2_000
    );

    expect(
      notes.every(
        (note) =>
          !(
            note.role === 'lead' &&
            note.startMs >= 1_000 &&
            note.startMs < 2_000
          )
      )
    ).toBe(true);
    expect(secondMeasureSupport.length).toBeGreaterThan(0);
  });

  it('restores one planned note when pruning would otherwise leave a whole measure silent', () => {
    const notes = applyProceduralSongDensityPlan({
      notes: [
        createNote({
          role: 'harmony',
          instrumentId: 'strings:voice-0',
          startMs: 3_120,
        }),
      ],
      sections: [createSection('a', 0, 8_000, 8)],
      songStartMs: 0,
    });

    const fourthMeasureNotes = notes.filter(
      (note) => note.startMs >= 3_000 && note.startMs < 4_000
    );

    expect(fourthMeasureNotes).toHaveLength(1);
    expect(fourthMeasureNotes[0]?.role).toBe('harmony');
    expect(fourthMeasureNotes[0]?.durationMs).toBeGreaterThan(0);
  });

  it('synthesizes one repair attack when a measure starts completely empty', () => {
    const notes = applyProceduralSongDensityPlan({
      notes: [
        createNote({
          role: 'bass',
          instrumentId: 'bass:anchor',
          startMs: 120,
        }),
      ],
      sections: [createSection('a', 0, 4_000, 4)],
      songStartMs: 0,
    });

    const secondMeasureNotes = notes.filter(
      (note) => note.startMs >= 1_000 && note.startMs < 2_000
    );

    expect(secondMeasureNotes).toHaveLength(1);
    expect(secondMeasureNotes[0]?.instrumentId).toContain(
      ':measure-gap-repair'
    );
    expect(secondMeasureNotes[0]?.role).toBe('bass');
  });

  it('keeps the protected outro opening motif without exceeding the first-measure lead cap', () => {
    const notes = applyProceduralSongDensityPlan({
      notes: [
        ...createLeadNotesInSingleMeasure(24_000, [120, 260, 420, 600, 780]),
      ],
      sections: [createSection('outro', 24_000, 8_000, 8)],
      songStartMs: 0,
    });

    const firstMeasureLead = notes
      .filter(
        (note) =>
          note.role === 'lead' &&
          note.startMs >= 24_000 &&
          note.startMs < 25_000
      )
      .map((note) => note.startMs);

    expect(firstMeasureLead).toEqual([24_120, 24_260, 24_420, 24_600]);
  });

  it('applies phrase-based density targets across a representative full song', () => {
    expect(PLAINS_REPRESENTATIVE_SONG.notes.length).toBeLessThanOrEqual(620);

    for (const section of PLAINS_REPRESENTATIVE_SONG.sections) {
      const leadCounts = countRoleNotesByMeasure(
        PLAINS_REPRESENTATIVE_SONG.notes,
        PLAINS_REPRESENTATIVE_SONG.startMs + section.startOffsetMs,
        section.durationMs,
        section.measureCount,
        'lead'
      );
      for (const role of ['bass', 'harmony', 'lead', 'percussion'] as const) {
        const targets = resolveProceduralSongDensityMeasureTargets(
          section.id,
          role,
          section.measureCount
        );
        if (!targets) {
          continue;
        }
        const counts = countRoleNotesByMeasure(
          PLAINS_REPRESENTATIVE_SONG.notes,
          PLAINS_REPRESENTATIVE_SONG.startMs + section.startOffsetMs,
          section.durationMs,
          section.measureCount,
          role
        );
        const exceededMeasures = counts
          .map((count, measureIndex) => ({
            count,
            measureIndex,
            role,
            sectionId: section.id,
            leadCount: leadCounts[measureIndex] ?? 0,
            target: targets[measureIndex] ?? 0,
          }))
          .filter(
            ({ count, leadCount, role, target }) =>
              count > target &&
              !(leadCount === 0 && (role === 'bass' || role === 'harmony'))
          );
        expect(exceededMeasures).toEqual([]);
      }
    }
  });

  it('adds planned accompaniment breathing measures so support layers are not constant in every section', () => {
    for (const sectionId of [
      'a',
      'a-prime',
      'b',
      'variation',
      'return',
    ] as const) {
      const section = FOREST_REPRESENTATIVE_SONG.sections.find(
        (candidate) => candidate.id === sectionId
      );
      expect(section).toBeDefined();

      const harmonyCounts = countRoleNotesByMeasure(
        FOREST_REPRESENTATIVE_SONG.notes,
        FOREST_REPRESENTATIVE_SONG.startMs + section!.startOffsetMs,
        section!.durationMs,
        section!.measureCount,
        'harmony'
      );
      const percussionCounts = countRoleNotesByMeasure(
        FOREST_REPRESENTATIVE_SONG.notes,
        FOREST_REPRESENTATIVE_SONG.startMs + section!.startOffsetMs,
        section!.durationMs,
        section!.measureCount,
        'percussion'
      );

      expect(
        harmonyCounts.some((count) => count === 0) ||
          percussionCounts.some((count) => count === 0)
      ).toBe(true);
    }
  });

  it('keeps at least one role attacking in every measure of a representative full song', () => {
    for (const section of FOREST_REPRESENTATIVE_SONG.sections) {
      const roleCounts = (
        ['bass', 'harmony', 'lead', 'percussion'] as const
      ).map((role) =>
        countRoleNotesByMeasure(
          FOREST_REPRESENTATIVE_SONG.notes,
          FOREST_REPRESENTATIVE_SONG.startMs + section.startOffsetMs,
          section.durationMs,
          section.measureCount,
          role
        )
      );
      const totalCountsByMeasure = roleCounts[0]!.map((_, measureIndex) =>
        roleCounts.reduce((sum, counts) => sum + (counts[measureIndex] ?? 0), 0)
      );

      expect(totalCountsByMeasure.every((count) => count > 0)).toBe(true);
    }
  });
});

function createSection(
  id: ProceduralMusicSongSection['id'],
  startOffsetMs: number,
  durationMs: number,
  measureCount: number
): ProceduralMusicSongSection {
  return {
    id,
    label: id,
    startOffsetMs,
    durationMs,
    loopEligible: id !== 'outro',
    measureCount,
    startMeasure: 1,
    endMeasure: measureCount,
    startTick: 0,
    endTick: measureCount * 1920,
  };
}

function createMeasureLeadNotes(
  sectionStartMs: number,
  measureCount: number,
  notesPerMeasure: number
) {
  const notes = [];
  for (let measureIndex = 0; measureIndex < measureCount; measureIndex += 1) {
    for (let noteIndex = 0; noteIndex < notesPerMeasure; noteIndex += 1) {
      notes.push(
        createNote({
          role: 'lead',
          instrumentId:
            noteIndex >= 2
              ? `lead-flute:measure-${measureIndex}-${noteIndex}`
              : 'lead-flute',
          startMs:
            sectionStartMs + measureIndex * 1_000 + 140 + noteIndex * 170,
        })
      );
    }
  }
  return notes;
}

function createLeadNotesInSingleMeasure(
  measureStartMs: number,
  offsetsMs: readonly number[]
) {
  return offsetsMs.map((offsetMs, noteIndex) =>
    createNote({
      role: 'lead',
      instrumentId:
        noteIndex >= 3 ? `lead-flute:measure-0-${noteIndex}` : 'lead-flute',
      startMs: measureStartMs + offsetMs,
    })
  );
}

function createHarmonyNotesForMeasure(
  sectionStartMs: number,
  measureIndex: number
) {
  return [
    createNote({
      role: 'harmony',
      instrumentId: `strings:voice-0`,
      startMs: sectionStartMs + measureIndex * 1_000 + 80,
    }),
    createNote({
      role: 'harmony',
      instrumentId: `strings:voice-1`,
      startMs: sectionStartMs + measureIndex * 1_000 + 340,
    }),
  ];
}

function createNote(overrides: {
  role: 'lead' | 'harmony' | 'bass' | 'percussion';
  instrumentId: string;
  startMs: number;
}): ProceduralMusicNote {
  return {
    themeId: 'frontier-plains',
    instrumentId: overrides.instrumentId,
    role: overrides.role,
    startMs: overrides.startMs,
    durationMs: 120,
    frequency: 440,
    volume: 0.5,
    waveform: 'sine' as const,
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
    harmonicGain: 0.2,
    pulseRate: 0,
  };
}

function countRoleNotesByMeasure(
  notes: ReturnType<typeof applyProceduralSongDensityPlan>,
  sectionStartMs: number,
  sectionDurationMs: number,
  measureCount: number,
  role: 'lead' | 'harmony' | 'bass' | 'percussion'
) {
  const measureDurationMs = sectionDurationMs / measureCount;
  return Array.from(
    { length: measureCount },
    (_, measureIndex) =>
      notes.filter(
        (note) =>
          note.role === role &&
          note.startMs >= sectionStartMs + measureIndex * measureDurationMs &&
          note.startMs < sectionStartMs + (measureIndex + 1) * measureDurationMs
      ).length
  );
}

function average(values: readonly number[]): number {
  return (
    values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
  );
}
