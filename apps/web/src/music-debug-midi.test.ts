import { describe, expect, it, vi } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugMidiFile,
  downloadMusicDebugMidiFile,
} from './music-debug-midi.ts';

describe('music debug midi', () => {
  it('encodes the current generated song as a multitrack midi file with a stable filename', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
      dayProgress: 0.25,
      yearProgress: 0.75,
    });

    const file = createMusicDebugMidiFile(snapshot, {
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
      ...encodeExpectedTempoMeta(snapshot),
    ]);
    expect(readTrackMetaEvent(chunks.tracks[0]!, 0x58)).toEqual([
      0x04, 0x02, 24, 8,
    ]);
    expect(readTrackMetaEvent(chunks.tracks[0]!, 0x59)).toHaveLength(2);
    expect(readTrackEndTick(chunks.tracks[0]!)).toBe(
      msToTicks(snapshot.durationMs)
    );
    expect(file.bytes.length).toBeGreaterThan(256);
  });

  it('adds descriptive metadata text and instrument names to exported tracks', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });

    const file = createMusicDebugMidiFile(snapshot, {
      author: 'bworlds test suite',
      arranger: 'music debug page',
      createdAt: new Date('2026-08-09T12:34:56.000Z'),
      website: 'https://example.test/debug/music/',
      source: 'forest preview source',
      sequencer: 'bworlds midi tests',
    });
    const chunks = parseMidiChunks(file.bytes);
    const conductorTexts = readTrackMetaTexts(chunks.tracks[0]!, 0x01);

    expect(conductorTexts).toContain('Author: bworlds test suite');
    expect(conductorTexts).toContain('Arranger: music debug page');
    expect(conductorTexts).toContain('Created Date: 2026-08-09');
    expect(conductorTexts).toContain(
      'Website: https://example.test/debug/music/'
    );
    expect(conductorTexts).toContain('Source: forest preview source');
    expect(conductorTexts).toContain('Sequencer: bworlds midi tests');
    expect(conductorTexts.some((text) => text.startsWith('Comments: '))).toBe(
      true
    );
    expect(
      conductorTexts.filter((text) => text.startsWith('More comments: '))
    ).toHaveLength(4);
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

    const file = createMusicDebugMidiFile(snapshot);
    const chunks = parseMidiChunks(file.bytes);
    const markers = readTrackMetaTexts(chunks.tracks[0]!, 0x06);

    expect(markers).toContain(snapshot.song.sections[0]?.label);
    expect(markers).toContain(snapshot.song.sections[1]?.label);
    expect(markers).toContain(snapshot.song.sections.at(-1)?.label);
  });

  it('adds role setup controller events for bank select, volume, and pan', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });

    const file = createMusicDebugMidiFile(snapshot, {
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

  it('downloads the encoded midi file through a blob url', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 0,
      clusterY: 0,
    });
    const remove = vi.fn();
    const click = vi.fn();
    const anchor = {
      href: '',
      download: '',
      click,
      remove,
    };
    const appendAnchor = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:music');
    const revokeObjectURL = vi.fn();

    downloadMusicDebugMidiFile(snapshot, {
      createObjectURL,
      revokeObjectURL,
      createAnchor: () => anchor,
      appendAnchor,
    });

    expect(anchor.href).toBe('blob:music');
    expect(anchor.download).toBe('bworlds-deep-forest-0-0.mid');
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(appendAnchor).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:music');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });
});

function parseMidiChunks(bytes: Uint8Array): {
  header: {
    format: number;
    trackCount: number;
    ticksPerQuarter: number;
  };
  tracks: Uint8Array[];
} {
  const view = bytes;
  expect(readAscii(view, 0, 4)).toBe('MThd');
  const headerLength = readUint32(view, 4);
  const format = readUint16(view, 8);
  const trackCount = readUint16(view, 10);
  const ticksPerQuarter = readUint16(view, 12);
  let offset = 8 + headerLength;
  const tracks: Uint8Array[] = [];

  while (offset < view.length) {
    expect(readAscii(view, offset, 4)).toBe('MTrk');
    const length = readUint32(view, offset + 4);
    const start = offset + 8;
    tracks.push(view.slice(start, start + length));
    offset = start + length;
  }

  return {
    header: {
      format,
      trackCount,
      ticksPerQuarter,
    },
    tracks,
  };
}

function readTrackName(track: Uint8Array): string | null {
  return readTrackMetaTexts(track, 0x03)[0] ?? null;
}

function readTrackMetaTexts(track: Uint8Array, metaType: number): string[] {
  const texts: string[] = [];
  let offset = 0;

  while (offset < track.length) {
    const delta = readVariableLengthQuantity(track, offset);
    offset += delta.length;
    const status = track[offset++];
    if (status === undefined) {
      break;
    }
    if (status === 0xff) {
      const eventType = track[offset++];
      const lengthInfo = readVariableLengthQuantity(track, offset);
      offset += lengthInfo.length;
      const data = track.slice(offset, offset + lengthInfo.value);
      offset += lengthInfo.value;
      if (eventType === metaType) {
        texts.push(new TextDecoder().decode(data));
      }
      continue;
    }
    if ((status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0) {
      offset += 1;
      continue;
    }
    offset += 2;
  }

  return texts;
}

function readTrackMetaEvent(
  track: Uint8Array,
  metaType: number
): number[] | null {
  let offset = 0;

  while (offset < track.length) {
    const delta = readVariableLengthQuantity(track, offset);
    offset += delta.length;
    const status = track[offset++];
    if (status === undefined) {
      break;
    }
    if (status === 0xff) {
      const eventType = track[offset++];
      const lengthInfo = readVariableLengthQuantity(track, offset);
      offset += lengthInfo.length;
      const data = Array.from(track.slice(offset, offset + lengthInfo.value));
      offset += lengthInfo.value;
      if (eventType === metaType) {
        return data;
      }
      continue;
    }
    if ((status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0) {
      offset += 1;
      continue;
    }
    offset += 2;
  }

  return null;
}

function readTrackEndTick(track: Uint8Array): number {
  let offset = 0;
  let tick = 0;

  while (offset < track.length) {
    const delta = readVariableLengthQuantity(track, offset);
    tick += delta.value;
    offset += delta.length;
    const status = track[offset++];
    if (status === undefined) {
      break;
    }
    if (status === 0xff) {
      const eventType = track[offset++];
      const lengthInfo = readVariableLengthQuantity(track, offset);
      offset += lengthInfo.length + lengthInfo.value;
      if (eventType === 0x2f) {
        return tick;
      }
      continue;
    }
    if ((status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0) {
      offset += 1;
      continue;
    }
    offset += 2;
  }

  return tick;
}

function readControllerValue(
  track: Uint8Array,
  controller: number
): number | null {
  let offset = 0;

  while (offset < track.length) {
    const delta = readVariableLengthQuantity(track, offset);
    offset += delta.length;
    const status = track[offset++];
    if (status === undefined) {
      break;
    }
    if (status === 0xff) {
      const lengthInfo = readVariableLengthQuantity(track, offset + 1);
      offset += 1 + lengthInfo.length + lengthInfo.value;
      continue;
    }
    if ((status & 0xf0) === 0xb0) {
      const controllerNumber = track[offset++];
      const value = track[offset++];
      if (controllerNumber === controller) {
        return value ?? null;
      }
      continue;
    }
    if ((status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0) {
      offset += 1;
      continue;
    }
    offset += 2;
  }

  return null;
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset]! << 24) |
      (bytes[offset + 1]! << 16) |
      (bytes[offset + 2]! << 8) |
      bytes[offset + 3]!) >>>
    0
  );
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return new TextDecoder().decode(bytes.slice(offset, offset + length));
}

function readVariableLengthQuantity(
  bytes: Uint8Array,
  offset: number
): { value: number; length: number } {
  let value = 0;
  let length = 0;
  while (offset + length < bytes.length) {
    const byte = bytes[offset + length]!;
    value = (value << 7) | (byte & 0x7f);
    length += 1;
    if ((byte & 0x80) === 0) {
      break;
    }
  }
  return { value, length };
}

function msToTicks(milliseconds: number): number {
  return Math.max(0, Math.round((milliseconds / 1000) * (480 * 2)));
}

function encodeExpectedTempoMeta(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): number[] {
  const microsecondsPerMinute = 60_000_000;
  const baseQuarterMs = snapshot.theme.noteDurationMs / 1.5;
  const adjustedQuarterMs =
    baseQuarterMs / Math.max(0.1, snapshot.mood.tempoMultiplier);
  const microsecondsPerQuarter = Math.max(
    1,
    Math.round(
      microsecondsPerMinute /
        (microsecondsPerMinute / (adjustedQuarterMs * 1000))
    )
  );
  return [
    (microsecondsPerQuarter >> 16) & 0xff,
    (microsecondsPerQuarter >> 8) & 0xff,
    microsecondsPerQuarter & 0xff,
  ];
}
