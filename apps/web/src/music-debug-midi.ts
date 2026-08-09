import type { ProceduralInstrument } from './procedural-music.ts';
import type { MusicDebugSnapshot } from './music-debug.ts';

const MIDI_HEADER_CHUNK_ID = [0x4d, 0x54, 0x68, 0x64];
const MIDI_TRACK_CHUNK_ID = [0x4d, 0x54, 0x72, 0x6b];
const MIDI_FORMAT_SINGLE_TRACK = 0;
const MIDI_TRACK_COUNT = 1;
const MIDI_TICKS_PER_QUARTER = 480;
const MICROSECONDS_PER_MINUTE = 60_000_000;

const ROLE_CHANNELS = {
  bass: 0,
  harmony: 1,
  lead: 2,
  percussion: 9,
} as const;

const INSTRUMENT_PROGRAMS: Record<ProceduralInstrument['family'], number> = {
  vocals: 53,
  'lead-guitar': 29,
  violin: 40,
  flute: 73,
  trumpet: 56,
  'synth-lead': 80,
  piano: 0,
  guitar: 24,
  organ: 19,
  strings: 48,
  'synth-pad': 88,
  'bass-guitar': 33,
  'upright-bass': 32,
  'bass-synth': 38,
  tuba: 58,
  kick: 0,
  snare: 0,
  cymbals: 0,
  shaker: 0,
  'hand-percussion': 0,
};

const PERCUSSION_NOTES: Record<ProceduralInstrument['family'], number> = {
  vocals: 60,
  'lead-guitar': 60,
  violin: 60,
  flute: 72,
  trumpet: 64,
  'synth-lead': 76,
  piano: 60,
  guitar: 60,
  organ: 60,
  strings: 60,
  'synth-pad': 60,
  'bass-guitar': 40,
  'upright-bass': 43,
  'bass-synth': 36,
  tuba: 38,
  kick: 36,
  snare: 38,
  cymbals: 49,
  shaker: 70,
  'hand-percussion': 60,
};

type MidiTrackEvent = {
  tick: number;
  order: number;
  data: number[];
};

export type MusicDebugMidiFile = {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
};

type MusicDebugMidiDownloadEnvironment = {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  createAnchor: () => MusicDebugMidiAnchor;
  appendAnchor: (anchor: MusicDebugMidiAnchor) => void;
};

type MusicDebugMidiAnchor = {
  href: string;
  download: string;
  click(): void;
  remove(): void;
};

type BrowserMidiDownloadEnvironment = {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  createAnchor: () => HTMLAnchorElement;
  appendAnchor: (anchor: HTMLAnchorElement) => void;
};

export function createMusicDebugMidiFile(
  snapshot: MusicDebugSnapshot
): MusicDebugMidiFile {
  const events = buildTrackEvents(snapshot);
  const trackBytes = encodeTrackEvents(events);
  const bytes = new Uint8Array([
    ...MIDI_HEADER_CHUNK_ID,
    ...encodeUint32(6),
    ...encodeUint16(MIDI_FORMAT_SINGLE_TRACK),
    ...encodeUint16(MIDI_TRACK_COUNT),
    ...encodeUint16(MIDI_TICKS_PER_QUARTER),
    ...MIDI_TRACK_CHUNK_ID,
    ...encodeUint32(trackBytes.length),
    ...trackBytes,
  ]);

  return {
    bytes,
    fileName: formatMusicDebugMidiFileName(snapshot),
    mimeType: 'audio/midi',
  };
}

export function downloadMusicDebugMidiFile(
  snapshot: MusicDebugSnapshot,
  environment: MusicDebugMidiDownloadEnvironment = createBrowserMidiDownloadEnvironment()
): void {
  const file = createMusicDebugMidiFile(snapshot);
  const blob = new Blob([file.bytes], { type: file.mimeType });
  const url = environment.createObjectURL(blob);
  const anchor = environment.createAnchor();
  anchor.href = url;
  anchor.download = file.fileName;
  environment.appendAnchor(anchor);
  anchor.click();
  anchor.remove();
  environment.revokeObjectURL(url);
}

function buildTrackEvents(snapshot: MusicDebugSnapshot): MidiTrackEvent[] {
  const events: MidiTrackEvent[] = [];
  const bpm = resolveSongTempoBpm(snapshot);
  const microsecondsPerQuarter = Math.max(
    1,
    Math.round(MICROSECONDS_PER_MINUTE / bpm)
  );

  events.push({
    tick: 0,
    order: 0,
    data: [0xff, 0x03, ...encodeText('bworlds music debug')],
  });
  events.push({
    tick: 0,
    order: 1,
    data: [0xff, 0x51, 0x03, ...encodeUint24(microsecondsPerQuarter)],
  });

  const instruments = snapshot.instrumentBank.instruments;
  events.push(
    createProgramChangeEvent(ROLE_CHANNELS.bass, instruments.bass.family, 2),
    createProgramChangeEvent(
      ROLE_CHANNELS.harmony,
      instruments.harmony.family,
      3
    ),
    createProgramChangeEvent(ROLE_CHANNELS.lead, instruments.lead.family, 4)
  );

  for (let index = 0; index < snapshot.notes.length; index += 1) {
    const note = snapshot.notes[index]!;
    const channel = ROLE_CHANNELS[note.role];
    const instrument = instruments[note.role];
    const midiNote = resolveMidiNoteNumber(note.frequency, instrument.family);
    const velocity = resolveVelocity(note.volume, note.role);
    const startTick = msToTicks(note.startMs - snapshot.song.startMs);
    const endTick = msToTicks(
      note.startMs + note.durationMs - snapshot.song.startMs
    );

    events.push({
      tick: startTick,
      order: 10 + index * 2,
      data: [0x90 | channel, midiNote, velocity],
    });
    events.push({
      tick: Math.max(startTick, endTick),
      order: 11 + index * 2,
      data: [0x80 | channel, midiNote, 0],
    });
  }

  events.push({
    tick: msToTicks(snapshot.durationMs),
    order: Number.MAX_SAFE_INTEGER,
    data: [0xff, 0x2f, 0x00],
  });

  return events;
}

function createProgramChangeEvent(
  channel: number,
  family: ProceduralInstrument['family'],
  order: number
): MidiTrackEvent {
  return {
    tick: 0,
    order,
    data: [0xc0 | channel, INSTRUMENT_PROGRAMS[family] ?? 0],
  };
}

function encodeTrackEvents(events: readonly MidiTrackEvent[]): number[] {
  const sorted = [...events].sort((left, right) => {
    if (left.tick !== right.tick) {
      return left.tick - right.tick;
    }
    return left.order - right.order;
  });
  const bytes: number[] = [];
  let previousTick = 0;

  for (const event of sorted) {
    const delta = Math.max(0, event.tick - previousTick);
    bytes.push(...encodeVariableLengthQuantity(delta), ...event.data);
    previousTick = event.tick;
  }

  return bytes;
}

function formatMusicDebugMidiFileName(snapshot: MusicDebugSnapshot): string {
  const theme = snapshot.theme.id;
  const x = snapshot.options.clusterX;
  const y = snapshot.options.clusterY;
  return `bworlds-${theme}-${x}-${y}.mid`;
}

function createBrowserMidiDownloadEnvironment(): MusicDebugMidiDownloadEnvironment {
  const browserEnvironment: BrowserMidiDownloadEnvironment = {
    createObjectURL(blob) {
      return URL.createObjectURL(blob);
    },
    revokeObjectURL(url) {
      URL.revokeObjectURL(url);
    },
    createAnchor() {
      return document.createElement('a');
    },
    appendAnchor(anchor) {
      document.body.append(anchor);
    },
  };

  return browserEnvironment;
}

function resolveSongTempoBpm(snapshot: MusicDebugSnapshot): number {
  const baseQuarterMs = snapshot.theme.noteDurationMs / 1.5;
  const adjustedQuarterMs =
    baseQuarterMs / Math.max(0.1, snapshot.mood.tempoMultiplier);
  return MICROSECONDS_PER_MINUTE / Math.max(1, adjustedQuarterMs * 1000);
}

function resolveMidiNoteNumber(
  frequency: number,
  family: ProceduralInstrument['family']
): number {
  if (family in PERCUSSION_NOTES && isPercussionFamily(family)) {
    return PERCUSSION_NOTES[family];
  }

  const midi = Math.round(69 + 12 * Math.log2(Math.max(frequency, 1) / 440));
  return clamp(midi, 0, 127);
}

function isPercussionFamily(
  family: ProceduralInstrument['family']
): family is 'kick' | 'snare' | 'cymbals' | 'shaker' | 'hand-percussion' {
  return (
    family === 'kick' ||
    family === 'snare' ||
    family === 'cymbals' ||
    family === 'shaker' ||
    family === 'hand-percussion'
  );
}

function resolveVelocity(
  volume: number,
  role: MusicDebugSnapshot['notes'][number]['role']
): number {
  const roleBias =
    role === 'lead'
      ? 1
      : role === 'percussion'
        ? 0.96
        : role === 'bass'
          ? 0.9
          : 0.82;
  return clamp(Math.round(volume * roleBias * 2048), 24, 127);
}

function msToTicks(milliseconds: number): number {
  return Math.max(
    0,
    Math.round((milliseconds / 1000) * (MIDI_TICKS_PER_QUARTER * 2))
  );
}

function encodeText(value: string): number[] {
  const bytes = Array.from(new TextEncoder().encode(value));
  return [...encodeVariableLengthQuantity(bytes.length), ...bytes];
}

function encodeUint16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function encodeUint24(value: number): number[] {
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function encodeUint32(value: number): number[] {
  return [
    (value >> 24) & 0xff,
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff,
  ];
}

function encodeVariableLengthQuantity(value: number): number[] {
  let buffer = value & 0x7f;
  const bytes: number[] = [];
  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }

  while (true) {
    bytes.push(buffer & 0xff);
    if ((buffer & 0x80) === 0) {
      break;
    }
    buffer >>= 8;
  }

  return bytes;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
