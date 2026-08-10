import type { MusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugMidiFileUnchecked,
  type MusicDebugMidiMetadataOptions,
} from './music-debug-midi.ts';

export type MusicDebugMidiAudit = {
  exportedBpm: number | null;
  exportedDurationMs: number;
  exportedMeasureCount: number;
  markerLabels: string[];
  sectionsMatchPlannedMarkers: boolean;
  mismatchMessages: string[];
  warningMessages: string[];
  isConsistent: boolean;
};

export function createMusicDebugMidiExportAudit(
  snapshot: MusicDebugSnapshot,
  metadataOptions: MusicDebugMidiMetadataOptions = {}
): MusicDebugMidiAudit {
  const file = createMusicDebugMidiFileUnchecked(snapshot, metadataOptions);
  return inspectMusicDebugMidiBytes(file.bytes, snapshot);
}

export function inspectMusicDebugMidiBytes(
  bytes: Uint8Array,
  snapshot: Pick<
    MusicDebugSnapshot,
    | 'durationMs'
    | 'measureCount'
    | 'resolvedBpm'
    | 'song'
    | 'trackStats'
    | 'harmonyChordDetections'
  >
): MusicDebugMidiAudit {
  const chunks = parseMidiChunks(bytes);
  const conductorTrack = chunks.tracks[0] ?? new Uint8Array();
  const tempoMeta = readTrackMetaEvent(conductorTrack, 0x51);
  const timeSignatureMeta = readTrackMetaEvent(conductorTrack, 0x58);
  const markerLabels = readTrackMetaTexts(conductorTrack, 0x06);
  const exportedBpm =
    tempoMeta && tempoMeta.length >= 3 ? decodeTempoBpm(tempoMeta) : null;
  const exportedDurationMs =
    exportedBpm === null
      ? 0
      : ticksToMilliseconds(
          readTrackEndTick(conductorTrack),
          chunks.header.ticksPerQuarter,
          exportedBpm
        );
  const exportedMeasureCount = resolveMidiMeasureCount(
    readTrackEndTick(conductorTrack),
    chunks.header.ticksPerQuarter,
    timeSignatureMeta
  );
  const mismatchMessages: string[] = [];
  const warningMessages: string[] = [];
  let sectionsMatchPlannedMarkers = true;

  if (
    exportedBpm !== null &&
    Math.abs(exportedBpm - snapshot.resolvedBpm) > 0.05
  ) {
    mismatchMessages.push(
      `MIDI BPM ${exportedBpm.toFixed(2)} does not match ${snapshot.resolvedBpm.toFixed(2)}.`
    );
  }
  if (Math.abs(exportedDurationMs - snapshot.durationMs) > 10) {
    mismatchMessages.push(
      `MIDI duration ${Math.round(exportedDurationMs)} ms does not match ${snapshot.durationMs} ms.`
    );
  }
  if (exportedMeasureCount !== snapshot.measureCount) {
    mismatchMessages.push(
      `MIDI measures ${exportedMeasureCount} do not match ${snapshot.measureCount}.`
    );
  }
  if (snapshot.trackStats.harmony.maxPolyphony <= 1) {
    mismatchMessages.push(
      'Harmony track collapsed to single notes instead of sustained chord voicings.'
    );
  }
  if (
    !snapshot.harmonyChordDetections.some(
      (section) => section.chordLabels.length > 0
    )
  ) {
    mismatchMessages.push(
      'Harmony track does not expose recognizable chord stacks in any section.'
    );
  }
  if (
    snapshot.harmonyChordDetections.some(
      (section) =>
        requiresStrictProgressionAudit(section.sectionId) &&
        section.detectedChordLabels.length > 0 &&
        !section.followsPlannedProgression
    )
  ) {
    warningMessages.push(
      'Detected harmony chords drift from the planned progression order.'
    );
  }
  if (markerLabels.length !== snapshot.song.sections.length) {
    sectionsMatchPlannedMarkers = false;
    mismatchMessages.push(
      `MIDI section markers ${markerLabels.length} do not match ${snapshot.song.sections.length}.`
    );
  } else {
    for (let index = 0; index < markerLabels.length; index += 1) {
      const markerLabel = markerLabels[index]!;
      const sectionLabel = snapshot.song.sections[index]?.label ?? '';
      if (markerLabel !== sectionLabel) {
        sectionsMatchPlannedMarkers = false;
        mismatchMessages.push(
          `MIDI marker ${index + 1} is "${markerLabel}" instead of "${sectionLabel}".`
        );
      }
    }
  }

  return {
    exportedBpm,
    exportedDurationMs,
    exportedMeasureCount,
    markerLabels,
    sectionsMatchPlannedMarkers,
    mismatchMessages,
    warningMessages,
    isConsistent: mismatchMessages.length === 0,
  };
}

function requiresStrictProgressionAudit(sectionId: string): boolean {
  return (
    sectionId === 'intro' ||
    sectionId === 'a' ||
    sectionId === 'return' ||
    sectionId === 'outro'
  );
}

function parseMidiChunks(bytes: Uint8Array): {
  header: {
    format: number;
    trackCount: number;
    ticksPerQuarter: number;
  };
  tracks: Uint8Array[];
} {
  const headerLength = readUint32(bytes, 4);
  const format = readUint16(bytes, 8);
  const trackCount = readUint16(bytes, 10);
  const ticksPerQuarter = readUint16(bytes, 12);
  let offset = 8 + headerLength;
  const tracks: Uint8Array[] = [];

  while (offset < bytes.length) {
    const length = readUint32(bytes, offset + 4);
    const start = offset + 8;
    tracks.push(bytes.slice(start, start + length));
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
    offset += (status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0 ? 1 : 2;
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
    offset += (status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0 ? 1 : 2;
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
    offset += (status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0 ? 1 : 2;
  }

  return tick;
}

function resolveMidiMeasureCount(
  endTick: number,
  ticksPerQuarter: number,
  timeSignatureMeta: number[] | null
): number {
  const numerator = timeSignatureMeta?.[0] ?? 4;
  const denominatorPower = timeSignatureMeta?.[1] ?? 2;
  const denominator = 2 ** denominatorPower;
  const ticksPerMeasure = ticksPerQuarter * numerator * (4 / denominator);
  return Math.round(endTick / Math.max(1, ticksPerMeasure));
}

function decodeTempoBpm(metaData: number[]): number {
  const microsecondsPerQuarter =
    ((metaData[0] ?? 0) << 16) | ((metaData[1] ?? 0) << 8) | (metaData[2] ?? 0);
  return 60_000_000 / Math.max(1, microsecondsPerQuarter);
}

function ticksToMilliseconds(
  tick: number,
  ticksPerQuarter: number,
  bpm: number
): number {
  return (tick / Math.max(1, ticksPerQuarter)) * (60_000 / Math.max(1, bpm));
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
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
