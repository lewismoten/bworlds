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
  leadPitchLabel: string | null;
  bassPitchLabel: string | null;
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
      leadPitchLabel:
        leadPitchClass === null ? null : formatPitchClassLabel(leadPitchClass),
      bassPitchLabel:
        bassPitchClass === null ? null : formatPitchClassLabel(bassPitchClass),
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
      messages.push(
        `${detection.sectionLabel} ${detection.kind} cadence missed its target tones.`
      );
    }
    if (!detection.matchesHarmony) {
      messages.push(
        `${detection.sectionLabel} ${detection.kind} cadence drifted outside the active harmony.`
      );
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

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
