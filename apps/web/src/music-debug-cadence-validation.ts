import {
  collectSongCadencePoints,
  type SongCadenceKind,
  type SongCadenceSection,
} from './procedural-music-song-cadence-plan.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

const MUSIC_DEBUG_PITCH_CLASS_LABELS = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export type MusicDebugCadenceDetection = {
  sectionId: string;
  sectionLabel: string;
  kind: SongCadenceKind;
  measureNumber: number | null;
  leadPitchLabel: string | null;
  bassPitchLabel: string | null;
  leadNoteLabel: string | null;
  bassNoteLabel: string | null;
  harmonyPitchLabels: string[];
  matchesCadenceTarget: boolean;
  matchesHarmony: boolean;
};

export type MusicDebugCadenceValidation = {
  detections: MusicDebugCadenceDetection[];
  isValidForMidiExport: boolean;
  messages: string[];
};

export function validateMusicDebugCadences(options: {
  notes: readonly ProceduralMusicNote[];
  sections: readonly SongCadenceSection[];
  songStartMs: number;
  rootMidiNote: number;
  scale: readonly number[];
}): MusicDebugCadenceValidation {
  const detections = collectSongCadencePoints(options.sections).map((point) => {
    const boundaryMs = options.songStartMs + point.boundaryOffsetMs;
    const leadNote = findFinalRoleNoteInWindow({
      notes: options.notes,
      role: 'lead',
      startMs: options.songStartMs + point.windowStartOffsetMs,
      endMs: boundaryMs,
    });
    const bassNote = findFinalRoleNoteInWindow({
      notes: options.notes,
      role: 'bass',
      startMs: options.songStartMs + point.windowStartOffsetMs,
      endMs: boundaryMs,
    });
    const leadPitchClass =
      leadNote === null ? null : resolveNotePitchClass(leadNote.frequency);
    const bassPitchClass =
      bassNote === null ? null : resolveNotePitchClass(bassNote.frequency);
    const cadenceMeasureNumber = resolveCadenceMeasureNumber({
      section: point.section,
      boundaryOffsetMs: point.boundaryOffsetMs,
    });
    const cadenceStartMs = Math.min(
      leadNote?.startMs ?? boundaryMs,
      bassNote?.startMs ?? boundaryMs,
      boundaryMs
    );
    const target = resolveCadenceTargetPitchClasses({
      kind: point.kind,
      rootMidiNote: options.rootMidiNote,
      scale: options.scale,
    });
    const harmonyPitchClasses = collectHarmonyPitchClassesInWindow({
      notes: options.notes,
      startMs: cadenceStartMs,
      endMs: boundaryMs,
    });
    const matchesCadenceTarget =
      leadPitchClass !== null &&
      bassPitchClass !== null &&
      target.leadPitchClasses.includes(leadPitchClass) &&
      target.bassPitchClasses.includes(bassPitchClass);
    const matchesHarmony =
      harmonyPitchClasses.length === 0
        ? true
        : (leadPitchClass === null ||
            harmonyPitchClasses.includes(leadPitchClass)) &&
          (bassPitchClass === null ||
            harmonyPitchClasses.includes(bassPitchClass));

    return {
      sectionId: point.section.id,
      sectionLabel: point.section.label,
      kind: point.kind,
      measureNumber: cadenceMeasureNumber,
      leadPitchLabel:
        leadPitchClass === null ? null : formatPitchClassLabel(leadPitchClass),
      bassPitchLabel:
        bassPitchClass === null ? null : formatPitchClassLabel(bassPitchClass),
      leadNoteLabel:
        leadNote === null ? null : formatAbsoluteNoteLabel(leadNote.frequency),
      bassNoteLabel:
        bassNote === null ? null : formatAbsoluteNoteLabel(bassNote.frequency),
      harmonyPitchLabels: harmonyPitchClasses
        .map((pitchClass) => formatPitchClassLabel(pitchClass))
        .sort(),
      matchesCadenceTarget,
      matchesHarmony,
    };
  });
  const messages: string[] = [];

  for (const detection of detections) {
    if (!detection.matchesCadenceTarget) {
      messages.push(createCadenceFailureMessage(detection, 'target'));
    }
    if (!detection.matchesHarmony) {
      messages.push(createCadenceFailureMessage(detection, 'harmony'));
    }
  }

  return {
    detections,
    isValidForMidiExport: messages.length === 0,
    messages,
  };
}

function findFinalRoleNoteInWindow(options: {
  notes: readonly ProceduralMusicNote[];
  role: ProceduralMusicNote['role'];
  startMs: number;
  endMs: number;
}): ProceduralMusicNote | null {
  for (let index = options.notes.length - 1; index >= 0; index -= 1) {
    const note = options.notes[index];
    if (
      note?.role === options.role &&
      note.startMs >= options.startMs &&
      note.startMs < options.endMs
    ) {
      return note;
    }
  }
  return null;
}

function collectHarmonyPitchClassesInWindow(options: {
  notes: readonly ProceduralMusicNote[];
  startMs: number;
  endMs: number;
}): number[] {
  const pitchClasses = new Set<number>();

  for (const note of options.notes) {
    if (note.role !== 'harmony') {
      continue;
    }
    if (
      note.startMs >= options.endMs ||
      note.startMs + note.durationMs <= options.startMs
    ) {
      continue;
    }
    pitchClasses.add(resolveNotePitchClass(note.frequency));
  }

  return [...pitchClasses];
}

function createCadenceFailureMessage(
  detection: MusicDebugCadenceDetection,
  reason: 'target' | 'harmony'
): string {
  const measureLabel =
    detection.measureNumber === null
      ? 'an unknown measure'
      : `measure ${detection.measureNumber}`;
  const leadLabel = detection.leadNoteLabel ?? 'missing';
  const bassLabel = detection.bassNoteLabel ?? 'missing';

  if (reason === 'target') {
    return `${detection.sectionLabel} ${detection.kind} cadence at ${measureLabel} missed its target tones (lead ${leadLabel}, bass ${bassLabel}).`;
  }

  const harmonyLabel = detection.harmonyPitchLabels.join(', ') || 'open harmony';
  return `${detection.sectionLabel} ${detection.kind} cadence at ${measureLabel} drifted outside the active harmony (${harmonyLabel}; lead ${leadLabel}, bass ${bassLabel}).`;
}

function resolveCadenceTargetPitchClasses(options: {
  kind: SongCadenceKind;
  rootMidiNote: number;
  scale: readonly number[];
}): {
  leadPitchClasses: number[];
  bassPitchClasses: number[];
} {
  const tonicPitchClass = mod(options.rootMidiNote, 12);
  const supertonicPitchClass = resolveScaleDegreePitchClass(
    options.rootMidiNote,
    options.scale,
    1
  );
  const mediantPitchClass = resolveScaleDegreePitchClass(
    options.rootMidiNote,
    options.scale,
    2
  );
  const dominantPitchClass = resolveScaleDegreePitchClass(
    options.rootMidiNote,
    options.scale,
    4
  );

  if (options.kind === 'answer') {
    return {
      leadPitchClasses: [tonicPitchClass],
      bassPitchClasses: [tonicPitchClass],
    };
  }
  if (options.kind === 'weak') {
    return {
      leadPitchClasses: [mediantPitchClass, dominantPitchClass],
      bassPitchClasses: [mediantPitchClass, dominantPitchClass],
    };
  }
  return {
    leadPitchClasses: [supertonicPitchClass, dominantPitchClass],
    bassPitchClasses: [dominantPitchClass],
  };
}

function resolveScaleDegreePitchClass(
  rootMidiNote: number,
  scale: readonly number[],
  degreeIndex: number
): number {
  const degreeOffset = scale[mod(degreeIndex, Math.max(1, scale.length))] ?? 0;
  return mod(rootMidiNote + degreeOffset, 12);
}

function resolveNotePitchClass(frequency: number): number {
  const midiNote = Math.round(
    69 + 12 * Math.log2(Math.max(frequency, 1) / 440)
  );
  return mod(midiNote, 12);
}

function formatPitchClassLabel(pitchClass: number): string {
  return MUSIC_DEBUG_PITCH_CLASS_LABELS[mod(pitchClass, 12)] ?? 'C';
}

function formatAbsoluteNoteLabel(frequency: number): string {
  const midiNote = resolveMidiNoteFromFrequency(frequency);
  const pitchClass = formatPitchClassLabel(midiNote);
  const octave = Math.floor(midiNote / 12) - 1;
  return `${pitchClass}${octave}`;
}

function resolveMidiNoteFromFrequency(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}

function resolveCadenceMeasureNumber(options: {
  section: SongCadenceSection;
  boundaryOffsetMs: number;
}): number | null {
  const startMeasure = options.section.startMeasure;
  if (typeof startMeasure !== 'number') {
    return null;
  }
  const measureDurationMs =
    options.section.durationMs / Math.max(1, options.section.measureCount);
  const relativeBoundaryMs = Math.max(
    0,
    options.boundaryOffsetMs - options.section.startOffsetMs
  );
  const cadenceMeasureOffset = Math.min(
    Math.max(1, Math.ceil(relativeBoundaryMs / Math.max(1, measureDurationMs))),
    Math.max(1, options.section.measureCount)
  );
  return startMeasure + cadenceMeasureOffset - 1;
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
