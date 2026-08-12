import { describe, expect, it } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import { createMusicDebugMidiFile } from './music-debug-midi-file.ts';
import {
  encodeExpectedTempoMeta,
  msToTicks,
  parseMidiChunks,
  readControllerValues,
  readControllerValue,
  readTrackEndTick,
  readTrackMetaEvent,
  readTrackName,
  ticksToMilliseconds,
  toExportableSnapshot,
} from './testing/music-debug-midi-test-support.ts';

describe('music debug midi export structure', () => {
  it('encodes the current generated song as a multitrack midi file with a stable filename', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
      dayProgress: 0.25,
      yearProgress: 0.75,
    });
    const exportableSnapshot = toExportableSnapshot(snapshot);

    const file = createMusicDebugMidiFile(exportableSnapshot, {
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });

    expect(file.fileName).toBe('bworlds-town-square-3--2.mid');
    expect(file.mimeType).toBe('audio/midi');
    const chunks = parseMidiChunks(file.bytes);

    expect(Array.from(file.bytes.slice(0, 4))).toEqual([
      0x4d, 0x54, 0x68, 0x64,
    ]);
    expect(chunks.header.format).toBe(1);
    expect(chunks.header.trackCount).toBe(5);
    expect(chunks.header.ticksPerQuarter).toBe(480);
    expect(chunks.tracks).toHaveLength(5);
    expect(readTrackName(chunks.tracks[0]!)).toBe(
      'bworlds music debug conductor'
    );
    expect(readTrackName(chunks.tracks[1]!)).toContain('Bass:');
    expect(readTrackName(chunks.tracks[2]!)).toContain('Harmony:');
    expect(readTrackName(chunks.tracks[3]!)).toContain('Lead:');
    expect(readTrackName(chunks.tracks[4]!)).toContain('Percussion:');
    expect(readTrackMetaEvent(chunks.tracks[0]!, 0x51)).toEqual([
      ...encodeExpectedTempoMeta(exportableSnapshot),
    ]);
    expect(readTrackMetaEvent(chunks.tracks[0]!, 0x58)).toEqual([
      0x04, 0x02, 24, 8,
    ]);
    expect(readTrackMetaEvent(chunks.tracks[0]!, 0x59)).toHaveLength(2);
    expect(readTrackEndTick(chunks.tracks[0]!)).toBe(
      msToTicks(exportableSnapshot.durationMs, exportableSnapshot.resolvedBpm)
    );
    expect(
      ticksToMilliseconds(
        readTrackEndTick(chunks.tracks[0]!),
        chunks.header.ticksPerQuarter,
        exportableSnapshot.resolvedBpm
      )
    ).toBeCloseTo(exportableSnapshot.durationMs, -1);
    expect(file.bytes.length).toBeGreaterThan(256);
  }, 10_000);

  it('adds role setup controller events for bank select, volume, and pan', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });
    const exportableSnapshot = toExportableSnapshot(snapshot);

    const file = createMusicDebugMidiFile(exportableSnapshot, {
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });
    const chunks = parseMidiChunks(file.bytes);

    for (const track of chunks.tracks.slice(1)) {
      expect(readControllerValue(track!, 0)).not.toBeNull();
      expect(readControllerValue(track!, 32)).not.toBeNull();
      expect(readControllerValue(track!, 7)).not.toBeNull();
      expect(readControllerValue(track!, 10)).not.toBeNull();
    }
  });

  it('adds CC11 expression changes for sustained harmony exports', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });
    const exportableSnapshot = toExportableSnapshot(snapshot);
    const file = createMusicDebugMidiFile(exportableSnapshot, {
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });
    const chunks = parseMidiChunks(file.bytes);
    const harmonyTrack = chunks.tracks[2]!;
    const expressionValues = readControllerValues(harmonyTrack, 11);

    expect(expressionValues.length).toBeGreaterThan(2);
    expect(new Set(expressionValues).size).toBeGreaterThan(1);
  });

  it('adds CC1 modulation changes for suitable sustained track exports', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });
    const exportableSnapshot = toExportableSnapshot(snapshot);
    const file = createMusicDebugMidiFile(exportableSnapshot, {
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });
    const chunks = parseMidiChunks(file.bytes);
    const supportedRoles = ['bass', 'harmony', 'lead'].filter((role) => {
      const family = snapshot.instrumentBank.instruments[role].family;
      return (
        family === 'strings' ||
        family === 'synth-pad' ||
        family === 'violin' ||
        family === 'flute' ||
        family === 'trumpet' ||
        family === 'vocals' ||
        family === 'synth-lead'
      );
    }) as Array<'bass' | 'harmony' | 'lead'>;
    expect(supportedRoles.length).toBeGreaterThan(0);

    const trackIndexByRole = {
      bass: 1,
      harmony: 2,
      lead: 3,
    } as const;
    const targetRole = supportedRoles[0]!;
    const targetTrack = chunks.tracks[trackIndexByRole[targetRole]]!;
    const modulationValues = readControllerValues(targetTrack, 1);

    expect(modulationValues.length).toBeGreaterThan(2);
    expect(new Set(modulationValues).size).toBeGreaterThan(1);
  });
});
