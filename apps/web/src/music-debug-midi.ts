import {
  isMidiPercussionFamily,
  resolveMidiPercussionNoteNumber,
} from './music-debug-midi-drums.ts';
import {
  formatMusicDebugMidiExportVariantSuffix,
  resolveMusicDebugMidiExportRoles,
  type MusicDebugMidiExportVariant,
} from './music-debug-midi-export-variant.ts';
import { describeProceduralChordQuality } from './procedural-music-chord-progression.ts';
import {
  msToMusicDebugTicks,
  MUSIC_DEBUG_MIDI_TICKS_PER_QUARTER,
} from './music-debug-tempo.ts';
import type { ProceduralInstrument } from './procedural-music.ts';
import { resolveProceduralChordTimelineEntryAtStep } from './procedural-music-chord-timeline.ts';
import { resolvePercussionFamilyFromInstrumentId } from './procedural-music-percussion.ts';
import { resolveMusicStereoPan } from './procedural-music-mix.ts';
import type { MusicDebugSnapshot } from './music-debug.ts';
import { inspectMusicDebugMidiBytes } from './music-debug-midi-audit.ts';

const MIDI_HEADER_CHUNK_ID = [0x4d, 0x54, 0x68, 0x64];
const MIDI_TRACK_CHUNK_ID = [0x4d, 0x54, 0x72, 0x6b];
const MIDI_FORMAT_MULTI_TRACK = 1;
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

export type MusicDebugMidiMetadataOptions = {
  author?: string;
  arranger?: string;
  createdAt?: Date;
  website?: string;
  source?: string;
  sequencer?: string;
  variant?: MusicDebugMidiExportVariant;
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
  snapshot: MusicDebugSnapshot,
  metadataOptions: MusicDebugMidiMetadataOptions = {}
): MusicDebugMidiFile {
  const variant = metadataOptions.variant ?? 'full';
  const validationMessages = [
    ...snapshot.midiExportValidation.messages,
    ...snapshot.motifValidation.messages,
    ...snapshot.timingValidation.messages,
    ...snapshot.percussionValidation.messages,
    ...snapshot.songDnaValidation.messages,
  ];
  if (
    !snapshot.midiExportValidation.isValidForMidiExport ||
    !snapshot.motifValidation.isValidForMidiExport ||
    !snapshot.timingValidation.isValidForMidiExport ||
    !snapshot.percussionValidation.isValidForMidiExport ||
    !snapshot.songDnaValidation.isValidForMidiExport
  ) {
    throw new Error(`Cannot export MIDI: ${validationMessages.join(' ')}`);
  }
  const file = createMusicDebugMidiFileUnchecked(snapshot, metadataOptions);
  const midiAudit = inspectMusicDebugMidiBytes(file.bytes, snapshot, {
    includedRoles: resolveMusicDebugMidiExportRoles(variant),
  });
  if (!midiAudit.isConsistent) {
    throw new Error(
      `Cannot export MIDI: ${midiAudit.mismatchMessages.join(' ')}`
    );
  }
  return file;
}

export function createMusicDebugMidiFileUnchecked(
  snapshot: MusicDebugSnapshot,
  metadataOptions: MusicDebugMidiMetadataOptions = {}
): MusicDebugMidiFile {
  const metadata = resolveMusicDebugMidiMetadata(snapshot, metadataOptions);
  const tracks = buildMidiTracks(snapshot, metadata);
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
    ...encodeUint16(MUSIC_DEBUG_MIDI_TICKS_PER_QUARTER),
    ...encodedTracks.flat(),
  ]);

  return {
    bytes,
    fileName: formatMusicDebugMidiFileName(snapshot, metadata.variant),
    mimeType: 'audio/midi',
  };
}

export function downloadMusicDebugMidiFile(
  snapshot: MusicDebugSnapshot,
  environment: MusicDebugMidiDownloadEnvironment = createBrowserMidiDownloadEnvironment(),
  metadataOptions: MusicDebugMidiMetadataOptions = {}
): void {
  const file = createMusicDebugMidiFile(snapshot, metadataOptions);
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

function buildMidiTracks(
  snapshot: MusicDebugSnapshot,
  metadata: ResolvedMusicDebugMidiMetadata
): MusicDebugMidiTrack[] {
  const conductorTrack = buildConductorTrack(snapshot, metadata);
  const roleTracks = buildRoleTracks(snapshot, metadata.variant);
  return [conductorTrack, ...roleTracks];
}

function buildConductorTrack(
  snapshot: MusicDebugSnapshot,
  metadata: ResolvedMusicDebugMidiMetadata
): MusicDebugMidiTrack {
  const events: MidiTrackEvent[] = [];
  const bpm = snapshot.resolvedBpm;
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
    data: [0xff, 0x01, ...encodeText(`Author: ${metadata.author}`)],
  });
  events.push({
    tick: 0,
    order: 2,
    data: [0xff, 0x01, ...encodeText(`Arranger: ${metadata.arranger}`)],
  });
  events.push({
    tick: 0,
    order: 3,
    data: [0xff, 0x01, ...encodeText(`Created Date: ${metadata.createdDate}`)],
  });
  events.push({
    tick: 0,
    order: 4,
    data: [0xff, 0x01, ...encodeText(`Website: ${metadata.website}`)],
  });
  events.push({
    tick: 0,
    order: 5,
    data: [0xff, 0x01, ...encodeText(`Source: ${metadata.source}`)],
  });
  events.push({
    tick: 0,
    order: 6,
    data: [0xff, 0x01, ...encodeText(`Sequencer: ${metadata.sequencer}`)],
  });
  events.push({
    tick: 0,
    order: 7,
    data: [0xff, 0x01, ...encodeText(`Comments: ${metadata.comments}`)],
  });
  for (let index = 0; index < metadata.moreComments.length; index += 1) {
    events.push({
      tick: 0,
      order: 8 + index,
      data: [
        0xff,
        0x01,
        ...encodeText(`More comments: ${metadata.moreComments[index]!}`),
      ],
    });
  }
  events.push({
    tick: 0,
    order: 20,
    data: [0xff, 0x51, 0x03, ...encodeUint24(microsecondsPerQuarter)],
  });
  events.push({
    tick: 0,
    order: 21,
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
    order: 22,
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
      tick: section.startTick,
      order: 30 + index,
      data: [0xff, 0x06, ...encodeText(section.label)],
    });
  }
  const chordCueEvents = buildChordCueEvents(snapshot);
  for (let index = 0; index < chordCueEvents.length; index += 1) {
    events.push(chordCueEvents[index]!);
  }
  events.push({
    tick: msToTicks(snapshot.durationMs, snapshot),
    order: Number.MAX_SAFE_INTEGER,
    data: [0xff, 0x2f, 0x00],
  });

  return {
    name: 'bworlds music debug conductor',
    events,
  };
}

function buildChordCueEvents(snapshot: MusicDebugSnapshot): MidiTrackEvent[] {
  const events: MidiTrackEvent[] = [];
  let previousLabel: string | null = null;

  for (
    let measureNumber = 1;
    measureNumber <= snapshot.measureCount;
    measureNumber += 1
  ) {
    const timelineEntry = resolveProceduralChordTimelineEntryAtStep({
      themeId: snapshot.theme.id,
      themeStepCount: snapshot.theme.stepPattern.length,
      stepIndex: (measureNumber - 1) * 4,
      clusterX: snapshot.options.clusterX,
      clusterY: snapshot.options.clusterY,
    });
    const cueLabel = formatChordCueLabel(
      snapshot.theme.scale,
      timelineEntry.degreeIndex
    );
    if (cueLabel === previousLabel) {
      continue;
    }
    previousLabel = cueLabel;
    events.push({
      tick: resolveSongMeasureStartTick(snapshot, measureNumber),
      order: 200 + measureNumber,
      data: [0xff, 0x07, ...encodeText(cueLabel)],
    });
  }

  return events;
}

function formatChordCueLabel(
  scale: readonly number[],
  degreeIndex: number
): string {
  return `Chord ${degreeIndex + 1} ${describeProceduralChordQuality(scale, degreeIndex)}`;
}

function resolveSongMeasureStartTick(
  snapshot: MusicDebugSnapshot,
  measureNumber: number
): number {
  const section =
    snapshot.song.sections.find(
      (candidate) =>
        measureNumber >= candidate.startMeasure &&
        measureNumber <= candidate.endMeasure
    ) ?? snapshot.song.sections[0];
  if (!section) {
    return 0;
  }
  const sectionMeasureOffset = measureNumber - section.startMeasure;
  const sectionMeasureCount = Math.max(1, section.measureCount);
  const ticksPerMeasure =
    (section.endTick - section.startTick) / sectionMeasureCount;
  return Math.round(section.startTick + sectionMeasureOffset * ticksPerMeasure);
}

function buildRoleTracks(
  snapshot: MusicDebugSnapshot,
  variant: MusicDebugMidiExportVariant
): MusicDebugMidiTrack[] {
  const roleOrder = ['bass', 'harmony', 'lead', 'percussion'] as const;
  const includedRoles = new Set(resolveMusicDebugMidiExportRoles(variant));
  return roleOrder
    .filter((role) => includedRoles.has(role))
    .map((role, roleIndex) => {
      const events: MidiTrackEvent[] = [];
      const instrument = snapshot.instrumentBank.instruments[role];
      const channel = ROLE_CHANNELS[role];
      const roleLabel = formatRoleTrackLabel(role, instrument.family);

      events.push({
        tick: 0,
        order: 0,
        data: [0xff, 0x03, ...encodeText(roleLabel)],
      });
      events.push({
        tick: 0,
        order: 1,
        data: [
          0xff,
          0x04,
          ...encodeText(formatInstrumentName(instrument.family)),
        ],
      });
      events.push({
        tick: 0,
        order: 2,
        data: createControllerEvent(
          channel,
          0,
          resolveBankSelectMsb(instrument.family)
        ),
      });
      events.push({
        tick: 0,
        order: 3,
        data: createControllerEvent(
          channel,
          32,
          resolveBankSelectLsb(instrument.family)
        ),
      });
      events.push({
        tick: 0,
        order: 4,
        data: createControllerEvent(
          channel,
          7,
          resolveChannelVolume(snapshot, role)
        ),
      });
      events.push({
        tick: 0,
        order: 5,
        data: createControllerEvent(
          channel,
          10,
          resolveChannelPan(role, instrument)
        ),
      });
      if (!isMidiPercussionFamily(instrument.family)) {
        events.push(createProgramChangeEvent(channel, instrument.family, 6));
      }
      if (role === 'lead') {
        for (let index = 0; index < snapshot.lyrics.length; index += 1) {
          const lyric = snapshot.lyrics[index]!;
          events.push({
            tick: msToTicks(lyric.startOffsetMs, snapshot),
            order: 10 + index,
            data: [0xff, 0x05, ...encodeText(lyric.text)],
          });
        }
      }

      let noteOrder = 20;
      let roleNoteIndex = 0;
      for (let index = 0; index < snapshot.notes.length; index += 1) {
        const note = snapshot.notes[index]!;
        if (note.role !== role) {
          continue;
        }
        const notePercussionFamily =
          role === 'percussion'
            ? resolvePercussionFamilyFromInstrumentId(note.instrumentId)
            : null;
        const midiNote = isMidiPercussionFamily(instrument.family)
          ? resolveMidiPercussionNoteNumber({
              note,
              family: notePercussionFamily ?? instrument.family,
              noteIndex: roleNoteIndex,
            })
          : resolveMidiNoteNumber(note.frequency);
        const velocity = resolveVelocity(note.volume, note.role);
        const startTick = msToTicks(
          note.startMs - snapshot.song.startMs,
          snapshot
        );
        const endTick = msToTicks(
          note.startMs + note.durationMs - snapshot.song.startMs,
          snapshot
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
        roleNoteIndex += 1;
      }

      events.push({
        tick: msToTicks(snapshot.durationMs, snapshot),
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

function createControllerEvent(
  channel: number,
  controller: number,
  value: number
): number[] {
  return [0xb0 | channel, controller, clamp(Math.round(value), 0, 127)];
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

function formatMusicDebugMidiFileName(
  snapshot: MusicDebugSnapshot,
  variant: MusicDebugMidiExportVariant
): string {
  const theme = snapshot.theme.id;
  const x = snapshot.options.clusterX;
  const y = snapshot.options.clusterY;
  const suffix = formatMusicDebugMidiExportVariantSuffix(variant);
  return suffix.length > 0
    ? `bworlds-${theme}-${x}-${y}-${suffix}.mid`
    : `bworlds-${theme}-${x}-${y}.mid`;
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

function formatInstrumentName(family: ProceduralInstrument['family']): string {
  return family
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
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

type ResolvedMusicDebugMidiMetadata = {
  author: string;
  arranger: string;
  createdDate: string;
  website: string;
  source: string;
  sequencer: string;
  comments: string;
  moreComments: string[];
  variant: MusicDebugMidiExportVariant;
};

function resolveMusicDebugMidiMetadata(
  snapshot: MusicDebugSnapshot,
  options: MusicDebugMidiMetadataOptions
): ResolvedMusicDebugMidiMetadata {
  const createdAt = options.createdAt ?? new Date();
  return {
    author: options.author?.trim() || 'bworlds',
    arranger: options.arranger?.trim() || 'bworlds music debug page',
    createdDate: formatMidiMetadataDate(createdAt),
    website: options.website?.trim() || '/debug/audio/',
    source:
      options.source?.trim() ||
      `Theme ${snapshot.theme.id} at (${snapshot.options.clusterX}, ${snapshot.options.clusterY})`,
    sequencer:
      options.sequencer?.trim() || 'bworlds procedural music midi exporter',
    comments: [
      snapshot.blueprintLabel,
      `${snapshot.songDna.modeLabel} ${snapshot.songDna.meterLabel}`,
    ].join(' | '),
    moreComments: [
      `Seed ${snapshot.options.clusterX},${snapshot.options.clusterY}`,
      `Tile ${snapshot.options.tileKind} / Context ${snapshot.options.contextType}`,
      `Mood tempo ${snapshot.mood.tempoMultiplier.toFixed(2)}x / Resolved BPM ${snapshot.resolvedBpm.toFixed(1)} / brightness ${snapshot.mood.brightness.toFixed(2)}x / Encounter ${snapshot.options.encounterMode}`,
      `Vocabulary ${snapshot.vocabularySummary.join(', ')}`,
      `Chromatic ${snapshot.accidentalNoteCount} outside ${snapshot.theme.vocabulary.modeLabel} / Black keys ${snapshot.midiExportValidation.blackKeyNoteCount} / Rules passing ${snapshot.midiExportValidation.accidentalReasonCounts['chromatic-passing']} color ${snapshot.midiExportValidation.accidentalReasonCounts['harmonic-color']} lower ${snapshot.midiExportValidation.accidentalReasonCounts['lower-approach']} upper ${snapshot.midiExportValidation.accidentalReasonCounts['upper-approach']} unsupported ${snapshot.midiExportValidation.accidentalReasonCounts['unsupported-chromatic-leap']} unresolved ${snapshot.midiExportValidation.accidentalReasonCounts['unresolved-chromatic']}`,
      `Export variant ${options.variant ?? 'full'}`,
    ],
    variant: options.variant ?? 'full',
  };
}

function formatMidiMetadataDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const pitchClass = snapshot.scaleMap.rootMidiNote % 12;
  const isMinor = snapshot.songDna.modeLabel.toLowerCase().includes('minor');
  return {
    accidentalCount: isMinor
      ? (MINOR_KEY_SIGNATURES[pitchClass] ?? 0)
      : (MAJOR_KEY_SIGNATURES[pitchClass] ?? 0),
    isMinor,
  };
}

function resolveMidiNoteNumber(frequency: number): number {
  const midi = Math.round(69 + 12 * Math.log2(Math.max(frequency, 1) / 440));
  return clamp(midi, 0, 127);
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

function resolveChannelVolume(
  snapshot: MusicDebugSnapshot,
  role: keyof typeof ROLE_CHANNELS
): number {
  let loudestVolume = 0;
  for (let index = 0; index < snapshot.notes.length; index += 1) {
    const note = snapshot.notes[index]!;
    if (note.role === role) {
      loudestVolume = Math.max(loudestVolume, note.volume);
    }
  }

  const fallback =
    role === 'lead'
      ? 110
      : role === 'harmony'
        ? 102
        : role === 'bass'
          ? 100
          : 108;
  return loudestVolume > 0
    ? clamp(Math.round(loudestVolume * 2048), 72, 127)
    : fallback;
}

function resolveChannelPan(
  role: keyof typeof ROLE_CHANNELS,
  instrument: Pick<ProceduralInstrument, 'id'>
): number {
  const pan = resolveMusicStereoPan({ role, instrumentId: instrument.id }, 0);
  return Math.round((pan + 1) * 63.5);
}

function resolveBankSelectMsb(family: ProceduralInstrument['family']): number {
  if (isMidiPercussionFamily(family)) {
    return 1;
  }
  if (
    family === 'vocals' ||
    family === 'lead-guitar' ||
    family === 'violin' ||
    family === 'flute' ||
    family === 'trumpet' ||
    family === 'synth-lead'
  ) {
    return 0;
  }
  if (
    family === 'piano' ||
    family === 'guitar' ||
    family === 'organ' ||
    family === 'strings' ||
    family === 'synth-pad'
  ) {
    return 2;
  }
  return 3;
}

function resolveBankSelectLsb(family: ProceduralInstrument['family']): number {
  const familyOrder: ProceduralInstrument['family'][] = [
    'vocals',
    'lead-guitar',
    'violin',
    'flute',
    'trumpet',
    'synth-lead',
    'piano',
    'guitar',
    'organ',
    'strings',
    'synth-pad',
    'bass-guitar',
    'upright-bass',
    'bass-synth',
    'tuba',
    'kick',
    'snare',
    'cymbals',
    'shaker',
    'hand-percussion',
  ];
  return Math.max(0, familyOrder.indexOf(family));
}

function msToTicks(
  milliseconds: number,
  snapshot: Pick<MusicDebugSnapshot, 'resolvedBpm'>
): number {
  return msToMusicDebugTicks(milliseconds, snapshot.resolvedBpm);
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
