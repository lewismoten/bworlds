import type { ProceduralInstrument } from './procedural-music.ts';
import type { MusicDebugSnapshot } from './music-debug.ts';

const MIDI_HEADER_CHUNK_ID = [0x4d, 0x54, 0x68, 0x64];
const MIDI_TRACK_CHUNK_ID = [0x4d, 0x54, 0x72, 0x6b];
const MIDI_FORMAT_MULTI_TRACK = 1;
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

type MusicDebugMidiTrack = {
  name: string;
  events: MidiTrackEvent[];
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
  const tracks = buildMidiTracks(snapshot);
  const encodedTracks = tracks.map((track) => {
    const trackBytes = encodeTrackEvents(track.events);
    return [
      ...MIDI_TRACK_CHUNK_ID,
      ...encodeUint32(trackBytes.length),
      ...trackBytes,
    ];
  });
  const bytes = new Uint8Array([
    ...MIDI_HEADER_CHUNK_ID,
    ...encodeUint32(6),
    ...encodeUint16(MIDI_FORMAT_MULTI_TRACK),
    ...encodeUint16(encodedTracks.length),
    ...encodeUint16(MIDI_TICKS_PER_QUARTER),
    ...encodedTracks.flat(),
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

function buildMidiTracks(snapshot: MusicDebugSnapshot): MusicDebugMidiTrack[] {
  const conductorTrack = buildConductorTrack(snapshot);
  const roleTracks = buildRoleTracks(snapshot);
  return [conductorTrack, ...roleTracks];
}

function buildConductorTrack(
  snapshot: MusicDebugSnapshot
): MusicDebugMidiTrack {
  const events: MidiTrackEvent[] = [];
  const bpm = resolveSongTempoBpm(snapshot);
  const microsecondsPerQuarter = Math.max(
    1,
    Math.round(MICROSECONDS_PER_MINUTE / bpm)
  );
  const timeSignature = resolveMidiTimeSignature(snapshot);
  const keySignature = resolveMidiKeySignature(snapshot);

  events.push({
    tick: 0,
    order: 0,
    data: [0xff, 0x03, ...encodeText('bworlds music debug conductor')],
  });
  events.push({
    tick: 0,
    order: 1,
    data: [0xff, 0x51, 0x03, ...encodeUint24(microsecondsPerQuarter)],
  });
  events.push({
    tick: 0,
    order: 2,
    data: [
      0xff,
      0x58,
      0x04,
      timeSignature.numerator,
      timeSignature.denominatorPower,
      24,
      8,
    ],
  });
  events.push({
    tick: 0,
    order: 3,
    data: [
      0xff,
      0x59,
      0x02,
      encodeSignedByte(keySignature.accidentalCount),
      keySignature.isMinor ? 1 : 0,
    ],
  });
  for (let index = 0; index < snapshot.song.sections.length; index += 1) {
    const section = snapshot.song.sections[index]!;
    events.push({
      tick: msToTicks(section.startOffsetMs),
      order: 10 + index,
      data: [0xff, 0x06, ...encodeText(section.label)],
    });
  }
  events.push({
    tick: msToTicks(snapshot.durationMs),
    order: Number.MAX_SAFE_INTEGER,
    data: [0xff, 0x2f, 0x00],
  });

  return {
    name: 'bworlds music debug conductor',
    events,
  };
}

function buildRoleTracks(snapshot: MusicDebugSnapshot): MusicDebugMidiTrack[] {
  const roleOrder = ['bass', 'harmony', 'lead', 'percussion'] as const;
  return roleOrder.map((role, roleIndex) => {
    const events: MidiTrackEvent[] = [];
    const instrument = snapshot.instrumentBank.instruments[role];
    const channel = ROLE_CHANNELS[role];
    const roleLabel = formatRoleTrackLabel(role, instrument.family);

    events.push({
      tick: 0,
      order: 0,
      data: [0xff, 0x03, ...encodeText(roleLabel)],
    });
    if (!isPercussionFamily(instrument.family)) {
      events.push(createProgramChangeEvent(channel, instrument.family, 1));
    }

    let noteOrder = 10;
    for (let index = 0; index < snapshot.notes.length; index += 1) {
      const note = snapshot.notes[index]!;
      if (note.role !== role) {
        continue;
      }
      const midiNote = resolveMidiNoteNumber(note.frequency, instrument.family);
      const velocity = resolveVelocity(note.volume, note.role);
      const startTick = msToTicks(note.startMs - snapshot.song.startMs);
      const endTick = msToTicks(
        note.startMs + note.durationMs - snapshot.song.startMs
      );

      events.push({
        tick: startTick,
        order: noteOrder,
        data: [0x90 | channel, midiNote, velocity],
      });
      events.push({
        tick: Math.max(startTick, endTick),
        order: noteOrder + 1,
        data: [0x80 | channel, midiNote, 0],
      });
      noteOrder += 2;
    }

    events.push({
      tick: msToTicks(snapshot.durationMs),
      order: Number.MAX_SAFE_INTEGER - roleIndex,
      data: [0xff, 0x2f, 0x00],
    });

    return {
      name: roleLabel,
      events,
    };
  });
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

function formatRoleTrackLabel(
  role: keyof typeof ROLE_CHANNELS,
  family: ProceduralInstrument['family']
): string {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const familyLabel = family
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
  return `${roleLabel}: ${familyLabel}`;
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

function resolveMidiTimeSignature(snapshot: MusicDebugSnapshot): {
  numerator: number;
  denominatorPower: number;
} {
  if (snapshot.songDna.meterLabel === '4/4') {
    return {
      numerator: 4,
      denominatorPower: 2,
    };
  }

  return {
    numerator: 4,
    denominatorPower: 2,
  };
}

function resolveMidiKeySignature(snapshot: MusicDebugSnapshot): {
  accidentalCount: number;
  isMinor: boolean;
} {
  const pitchClass = resolvePitchClassFromFrequency(snapshot.theme.rootHz);
  const isMinor = snapshot.songDna.modeLabel.toLowerCase().includes('minor');
  return {
    accidentalCount: isMinor
      ? (MINOR_KEY_SIGNATURES[pitchClass] ?? 0)
      : (MAJOR_KEY_SIGNATURES[pitchClass] ?? 0),
    isMinor,
  };
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

function encodeSignedByte(value: number): number {
  return value < 0 ? 0x100 + value : value;
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

function resolvePitchClassFromFrequency(frequency: number): number {
  const midi = Math.round(69 + 12 * Math.log2(Math.max(frequency, 1) / 440));
  return ((midi % 12) + 12) % 12;
}

const MAJOR_KEY_SIGNATURES: Record<number, number> = {
  0: 0,
  1: -5,
  2: 2,
  3: -3,
  4: 4,
  5: -1,
  6: 6,
  7: 1,
  8: -4,
  9: 3,
  10: -2,
  11: 5,
};

const MINOR_KEY_SIGNATURES: Record<number, number> = {
  0: -3,
  1: 4,
  2: -1,
  3: 6,
  4: 1,
  5: -4,
  6: 3,
  7: -2,
  8: 5,
  9: 0,
  10: -5,
  11: 2,
};
