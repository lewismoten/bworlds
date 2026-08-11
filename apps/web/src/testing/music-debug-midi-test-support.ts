import { expect } from 'vitest';
import { createMusicDebugSnapshot } from '../music-debug.ts';
import { msToMusicDebugTicks } from '../music-debug-tempo.ts';

export const EXPORTABLE_TOWN_MIDI_SNAPSHOT = toExportableSnapshot(
  createMusicDebugSnapshot({
    tileKind: 'town',
    contextType: 'town',
    clusterX: 3,
    clusterY: -2,
  })
);

export function withValidCadenceValidation(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    cadenceValidation: {
      ...snapshot.cadenceValidation,
      isValidForMidiExport: true,
      messages: [],
    },
  };
}

export function withValidPercussionValidation(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    percussionValidation: {
      isValidForMidiExport: true,
      messages: [],
    },
  };
}

export function withValidLeadContourAnalysis(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    leadContourAnalysis: {
      ...snapshot.leadContourAnalysis,
      finalResolvesToTonic: true,
      climaxNearPlannedPeak: true,
      matchesPlannedContour: true,
      messages: snapshot.leadContourAnalysis.messages.filter(
        (message) =>
          !message.includes('climax peaked at') &&
          !message.includes('resolved to scale degree')
      ),
    },
  };
}

export function withValidPhraseIntentValidation(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    phraseIntentValidation: {
      isValidForMidiExport: true,
      messages: [],
    },
  };
}

export function withValidHarmonicAlignmentValidation(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    harmonicAlignmentValidation: {
      isValidForMidiExport: true,
      messages: [],
    },
  };
}

export function withValidProgressionDetections(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    harmonyChordDetections: snapshot.harmonyChordDetections.map((section) => ({
      ...section,
      followsPlannedProgression: true,
      driftWindows: [],
    })),
    bassProgressionDetections: snapshot.bassProgressionDetections.map(
      (section) => ({
        ...section,
        followsPlannedProgression: true,
        driftWindows: [],
      })
    ),
  };
}

export function toExportableSnapshot(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return withValidHarmonicAlignmentValidation(
    withValidPercussionValidation(
      withValidPhraseIntentValidation(
        withValidLeadContourAnalysis(
          withValidProgressionDetections(withValidCadenceValidation(snapshot))
        )
      )
    )
  );
}

export function parseMidiChunks(bytes: Uint8Array): {
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

export function readTrackName(track: Uint8Array): string | null {
  return readTrackMetaTexts(track, 0x03)[0] ?? null;
}

export function readTrackMetaTexts(
  track: Uint8Array,
  metaType: number
): string[] {
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

export function readTrackMetaEvent(
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

export function readTrackMetaTextTick(
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

export function readTrackEndTick(track: Uint8Array): number {
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

export function readControllerValue(
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

export function readMidiNoteOns(track: Uint8Array): number[] {
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

export function resolveExpectedPercussionMidiNotes(family: string): number[] {
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

export function encodeExpectedTempoMeta(
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

export function findVocalsSnapshot(): ReturnType<
  typeof createMusicDebugSnapshot
> {
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

export function msToTicks(milliseconds: number, bpm: number): number {
  return msToMusicDebugTicks(milliseconds, bpm);
}

export function ticksToMilliseconds(
  ticks: number,
  ticksPerQuarter: number,
  bpm: number
): number {
  return (ticks * 60_000) / (Math.max(1, ticksPerQuarter) * Math.max(1, bpm));
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
