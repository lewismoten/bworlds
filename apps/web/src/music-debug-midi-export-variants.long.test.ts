import { describe, expect, it } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import { createMusicDebugMidiFile } from './music-debug-midi-file.ts';
import {
  findVocalsSnapshot,
  parseMidiChunks,
  readMidiNoteOns,
  readTrackMetaTexts,
  readTrackName,
  resolveExpectedPercussionMidiNotes,
  toExportableSnapshot,
} from './testing/music-debug-midi-test-support.ts';
import { resolvePercussionFamilyFromInstrumentId } from './procedural-music-percussion.ts';

describe('music debug midi export variants', () => {
  it('uses richer GM drum note mappings on the percussion channel export', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'shore',
      contextType: 'overworld',
      clusterX: 8,
      clusterY: -4,
      dayProgress: 0.85,
      weatherKind: 'heavy-rain',
      weatherIntensity: 1,
    });
    const exportableSnapshot = toExportableSnapshot(snapshot);

    const file = createMusicDebugMidiFile(exportableSnapshot, {
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });
    const chunks = parseMidiChunks(file.bytes);
    const percussionNotes = readMidiNoteOns(chunks.tracks[4]!);
    const expectedFamilyNotes = new Set<number>();

    for (const note of snapshot.notes) {
      if (note.role !== 'percussion') {
        continue;
      }
      const family =
        resolvePercussionFamilyFromInstrumentId(note.instrumentId) ??
        snapshot.instrumentBank.instruments.percussion.family;
      for (const midiNote of resolveExpectedPercussionMidiNotes(family)) {
        expectedFamilyNotes.add(midiNote);
      }
    }

    expect(percussionNotes.length).toBeGreaterThan(0);
    expect(new Set(percussionNotes).size).toBeGreaterThan(1);
    expect(expectedFamilyNotes.size).toBeGreaterThan(0);
    expect(percussionNotes.every((note) => expectedFamilyNotes.has(note))).toBe(
      true
    );
  });

  it('exports a melody-only midi file for rapid lead review', () => {
    const snapshot = toExportableSnapshot(
      createMusicDebugSnapshot({
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 0,
        clusterY: 0,
      })
    );

    const file = createMusicDebugMidiFile(snapshot, {
      variant: 'melody-only',
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });
    const chunks = parseMidiChunks(file.bytes);

    expect(file.fileName).toBe('bworlds-deep-forest-0-0-melody.mid');
    expect(chunks.header.trackCount).toBe(2);
    expect(chunks.tracks).toHaveLength(2);
    expect(readTrackName(chunks.tracks[1]!)).toContain('Lead:');
  });

  it('exports a harmony-and-bass midi file for accompaniment review', () => {
    const snapshot = toExportableSnapshot(
      createMusicDebugSnapshot({
        tileKind: 'town',
        contextType: 'town',
        clusterX: 3,
        clusterY: -2,
      })
    );

    const file = createMusicDebugMidiFile(snapshot, {
      variant: 'harmony-and-bass',
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });
    const chunks = parseMidiChunks(file.bytes);

    expect(file.fileName).toBe('bworlds-town-square-3--2-harmony-bass.mid');
    expect(chunks.header.trackCount).toBe(3);
    expect(chunks.tracks).toHaveLength(3);
    expect(readTrackName(chunks.tracks[1]!)).toContain('Bass:');
    expect(readTrackName(chunks.tracks[2]!)).toContain('Harmony:');
  });

  it('includes lyric meta events when the generated lead instrument uses vocals', () => {
    const snapshot = findVocalsSnapshot();
    const exportableSnapshot = toExportableSnapshot(snapshot);
    const file = createMusicDebugMidiFile(exportableSnapshot, {
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });
    const chunks = parseMidiChunks(file.bytes);
    const leadLyrics = readTrackMetaTexts(chunks.tracks[3]!, 0x05);

    expect(snapshot.instrumentBank.instruments.lead.family).toBe('vocals');
    expect(snapshot.lyrics.length).toBeGreaterThan(0);
    expect(leadLyrics).toEqual(snapshot.lyrics.map((line) => line.text));
  }, 4_000);
});
