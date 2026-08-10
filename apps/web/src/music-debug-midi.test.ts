import { describe, expect, it, vi } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugMidiFile,
  downloadMusicDebugMidiFile,
} from './music-debug-midi.ts';
import { resolveMusicDebugMidiExportRoles } from './music-debug-midi-export-variant.ts';
import { msToMusicDebugTicks } from './music-debug-tempo.ts';
import { resolvePercussionFamilyFromInstrumentId } from './procedural-music-percussion.ts';

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
      msToTicks(snapshot.durationMs, snapshot.resolvedBpm)
    );
    expect(
      ticksToMilliseconds(
        readTrackEndTick(chunks.tracks[0]!),
        chunks.header.ticksPerQuarter,
        snapshot.resolvedBpm
      )
    ).toBeCloseTo(snapshot.durationMs, -1);
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

    const file = createMusicDebugMidiFile(snapshot);
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

    const file = createMusicDebugMidiFile(snapshot);
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

    const file = createMusicDebugMidiFile(snapshot, {
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

  it('blocks MIDI export when percussion validation fails', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });

    expect(() =>
      createMusicDebugMidiFile({
        ...snapshot,
        percussionValidation: {
          isValidForMidiExport: false,
          messages: [
            'Variation percussion should stay thinner than Section A.',
          ],
        },
      })
    ).toThrow(
      'Cannot export MIDI: Variation percussion should stay thinner than Section A.'
    );
  });

  it('downloads the encoded midi file through a blob url', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 0,
      clusterY: 0,
    });
    const exportableSnapshot = {
      ...snapshot,
      midiExportValidation: {
        ...snapshot.midiExportValidation,
        isValidForMidiExport: true,
        messages: [],
      },
    };
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

    downloadMusicDebugMidiFile(exportableSnapshot, {
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

  it('exports a melody-only midi file for rapid lead review', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 0,
      clusterY: 0,
    });

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
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });

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
    const file = createMusicDebugMidiFile(snapshot, {
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });
    const chunks = parseMidiChunks(file.bytes);
    const leadLyrics = readTrackMetaTexts(chunks.tracks[3]!, 0x05);

    expect(snapshot.instrumentBank.instruments.lead.family).toBe('vocals');
    expect(snapshot.lyrics.length).toBeGreaterThan(0);
    expect(leadLyrics).toEqual(snapshot.lyrics.map((line) => line.text));
  }, 4_000);

  it('rejects MIDI export when chromatic-note validation fails', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 0,
      clusterY: 0,
    });

    expect(() =>
      createMusicDebugMidiFile({
        ...snapshot,
        midiExportValidation: {
          ...snapshot.midiExportValidation,
          isValidForMidiExport: false,
          messages: ['Found 1 unexplained chromatic note.'],
        },
      })
    ).toThrow('Cannot export MIDI: Found 1 unexplained chromatic note.');
  });

  it('rejects MIDI export when timing validation fails', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 0,
      clusterY: 0,
    });

    expect(() =>
      createMusicDebugMidiFile({
        ...snapshot,
        midiExportValidation: {
          ...snapshot.midiExportValidation,
          isValidForMidiExport: true,
          messages: [],
        },
        timingValidation: {
          ...snapshot.timingValidation,
          isValidForMidiExport: false,
          messages: ['Loop range must stay inside the exported song duration.'],
        },
      })
    ).toThrow(
      'Cannot export MIDI: Loop range must stay inside the exported song duration.'
    );
  });

  it('rejects MIDI export when the configured motif never appears', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 0,
      clusterY: 0,
    });

    expect(() =>
      createMusicDebugMidiFile({
        ...snapshot,
        motifValidation: {
          ...snapshot.motifValidation,
          isValidForMidiExport: false,
          messages: [
            'Configured lead motif 1-3-5-3 never appears in the generated song.',
          ],
        },
      })
    ).toThrow(
      'Cannot export MIDI: Configured lead motif 1-3-5-3 never appears in the generated song.'
    );
  });

  it.each([
    ['full', ['bass', 'harmony', 'lead', 'percussion']],
    ['melody-only', ['lead']],
    ['harmony-and-bass', ['bass', 'harmony']],
  ] as const)(
    'maps the %s export variant onto the intended role set',
    (variant, roles) => {
      expect(resolveMusicDebugMidiExportRoles(variant)).toEqual(roles);
    }
  );
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

function readTrackMetaTextTick(
  track: Uint8Array,
  metaType: number,
  text: string
): number | null {
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
      offset += lengthInfo.length;
      const data = track.slice(offset, offset + lengthInfo.value);
      offset += lengthInfo.value;
      if (eventType === metaType && new TextDecoder().decode(data) === text) {
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

function readMidiNoteOns(track: Uint8Array): number[] {
  const notes: number[] = [];
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
    if ((status & 0xf0) === 0x90) {
      const note = track[offset++];
      const velocity = track[offset++];
      if ((velocity ?? 0) > 0) {
        notes.push(note ?? 0);
      }
      continue;
    }
    if ((status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0) {
      offset += 1;
      continue;
    }
    offset += 2;
  }

  return notes;
}

function resolveExpectedPercussionMidiNotes(family: string): number[] {
  switch (family) {
    case 'kick':
      return [35, 36, 41];
    case 'snare':
      return [37, 38, 39, 40];
    case 'cymbals':
      return [42, 46, 49, 51];
    case 'shaker':
      return [42, 54, 69, 70];
    case 'hand-percussion':
      return [54, 60, 61, 69];
    default:
      return [];
  }
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

function msToTicks(milliseconds: number, bpm: number): number {
  return msToMusicDebugTicks(milliseconds, bpm);
}

function encodeExpectedTempoMeta(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): number[] {
  const microsecondsPerMinute = 60_000_000;
  const microsecondsPerQuarter = Math.max(
    1,
    Math.round(microsecondsPerMinute / snapshot.resolvedBpm)
  );
  return [
    (microsecondsPerQuarter >> 16) & 0xff,
    (microsecondsPerQuarter >> 8) & 0xff,
    microsecondsPerQuarter & 0xff,
  ];
}

function findVocalsSnapshot(): ReturnType<typeof createMusicDebugSnapshot> {
  for (let clusterX = -8; clusterX <= 8; clusterX += 1) {
    for (let clusterY = -8; clusterY <= 8; clusterY += 1) {
      const snapshot = createMusicDebugSnapshot({
        tileKind: 'town',
        contextType: 'town',
        clusterX,
        clusterY,
        dayProgress: 0.45,
        yearProgress: 0.5,
      });
      if (snapshot.instrumentBank.instruments.lead.family === 'vocals') {
        return snapshot;
      }
    }
  }

  throw new Error('Expected to find a vocals snapshot for MIDI lyric export');
}

function ticksToMilliseconds(
  ticks: number,
  ticksPerQuarter: number,
  bpm: number
): number {
  return (ticks * 60_000) / (Math.max(1, ticksPerQuarter) * Math.max(1, bpm));
}
