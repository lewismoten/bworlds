import { describe, expect, it } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import { createMusicDebugMidiFile } from './music-debug-midi-file.ts';
import {
  parseMidiChunks,
  readTrackMetaTextTick,
  readTrackMetaTexts,
  toExportableSnapshot,
} from './testing/music-debug-midi-test-support.ts';

describe('music debug midi export metadata', () => {
  it('adds descriptive metadata text and instrument names to exported tracks', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const exportableSnapshot = toExportableSnapshot(snapshot);

    const file = createMusicDebugMidiFile(exportableSnapshot, {
      author: 'bworlds test suite',
      arranger: 'music debug page',
      createdAt: new Date('2026-08-09T12:34:56.000Z'),
      website: 'https://example.test/debug/audio/',
      source: 'forest preview source',
      sequencer: 'bworlds midi tests',
    });
    const chunks = parseMidiChunks(file.bytes);
    const conductorTexts = readTrackMetaTexts(chunks.tracks[0]!, 0x01);

    expect(conductorTexts).toContain('Author: bworlds test suite');
    expect(conductorTexts).toContain('Arranger: music debug page');
    expect(conductorTexts).toContain('Created Date: 2026-08-09');
    expect(conductorTexts).toContain(
      'Website: https://example.test/debug/audio/'
    );
    expect(conductorTexts).toContain('Source: forest preview source');
    expect(conductorTexts).toContain('Sequencer: bworlds midi tests');
    expect(conductorTexts.some((text) => text.startsWith('Comments: '))).toBe(
      true
    );
    expect(
      conductorTexts.filter((text) => text.startsWith('More comments: '))
    ).toHaveLength(6);
    expect(conductorTexts.some((text) => text.includes('Chromatic'))).toBe(
      true
    );
    expect(
      conductorTexts.some((text) => text.includes('Export variant full'))
    ).toBe(true);
    expect(readTrackMetaTexts(chunks.tracks[1]!, 0x04)).toHaveLength(1);
    expect(readTrackMetaTexts(chunks.tracks[2]!, 0x04)).toHaveLength(1);
    expect(readTrackMetaTexts(chunks.tracks[3]!, 0x04)).toHaveLength(1);
    expect(readTrackMetaTexts(chunks.tracks[4]!, 0x04)).toHaveLength(1);
  });

  it('adds section marker meta events to the conductor track', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const exportableSnapshot = toExportableSnapshot(snapshot);

    const file = createMusicDebugMidiFile(exportableSnapshot);
    const chunks = parseMidiChunks(file.bytes);
    const markers = readTrackMetaTexts(chunks.tracks[0]!, 0x06);

    expect(markers).toContain(snapshot.song.sections[0]?.label);
    expect(markers).toContain(snapshot.song.sections[1]?.label);
    expect(markers).toContain(snapshot.song.sections.at(-1)?.label);
    expect(readTrackMetaTextTick(chunks.tracks[0]!, 0x06, 'Intro')).toBe(
      snapshot.song.sections[0]?.startTick
    );
    expect(
      readTrackMetaTextTick(
        chunks.tracks[0]!,
        0x06,
        snapshot.song.sections[1]?.label ?? ''
      )
    ).toBe(snapshot.song.sections[1]?.startTick);
  });

  it('adds chord-change cue points to the conductor track at measure starts', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'plains',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
    });
    const exportableSnapshot = toExportableSnapshot(snapshot);

    const file = createMusicDebugMidiFile(exportableSnapshot);
    const chunks = parseMidiChunks(file.bytes);
    const chordCues = readTrackMetaTexts(chunks.tracks[0]!, 0x07);

    expect(chordCues.slice(0, 4)).toEqual([
      'Chord 1 major',
      'Chord 5 minor',
      'Chord 6 minor',
      'Chord 1 major',
    ]);
    expect(
      readTrackMetaTextTick(chunks.tracks[0]!, 0x07, 'Chord 1 major')
    ).toBe(0);
    expect(
      readTrackMetaTextTick(chunks.tracks[0]!, 0x07, 'Chord 5 minor')
    ).toBeGreaterThan(0);
    expect(chordCues.length).toBeGreaterThanOrEqual(snapshot.measureCount / 4);
  });
});
