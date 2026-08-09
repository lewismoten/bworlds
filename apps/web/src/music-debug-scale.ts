import type {
  MusicDebugSnapshot,
  MusicDebugTheme,
  MusicDebugTimelineLayout,
} from './music-debug.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

export type MusicDebugScaleGuide = {
  role: Exclude<ProceduralMusicNote['role'], 'percussion'>;
  y: number;
};

export type MusicDebugScaleMarker = {
  role: Exclude<ProceduralMusicNote['role'], 'percussion'>;
  x: number;
  y: number;
  radius: number;
};

export type MusicDebugScaleOverlay = {
  guides: MusicDebugScaleGuide[];
  markers: MusicDebugScaleMarker[];
};

type NonPercussionRole = Exclude<ProceduralMusicNote['role'], 'percussion'>;

const NON_PERCUSSION_ROLE_ORDER: NonPercussionRole[] = [
  'bass',
  'harmony',
  'lead',
];

export function createMusicDebugScaleOverlay(
  snapshot: MusicDebugSnapshot,
  layout: MusicDebugTimelineLayout
): MusicDebugScaleOverlay {
  const guides: MusicDebugScaleGuide[] = [];
  const markers: MusicDebugScaleMarker[] = [];
  const durationMs = Math.max(snapshot.durationMs, 1);
  const baseStartMs = snapshot.notes[0]?.startMs ?? snapshot.song.startMs;

  for (const role of NON_PERCUSSION_ROLE_ORDER) {
    const roleIndex = layout.roleOrder.indexOf(role);
    if (roleIndex < 0) {
      continue;
    }

    const roleNotes = snapshot.notes.filter((note) => note.role === role);
    if (roleNotes.length === 0) {
      continue;
    }

    const slots = createRoleScaleSlots(roleNotes, snapshot.theme);
    if (slots.length === 0) {
      continue;
    }

    const trackTop = layout.topPad + roleIndex * layout.trackHeight + 10;
    const trackBottom = trackTop + Math.max(10, layout.trackHeight - 18);

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
      guides.push({
        role,
        y: interpolateSlotY(trackTop, trackBottom, slotIndex, slots.length),
      });
    }

    for (const note of roleNotes) {
      const relativeSemitone = resolveRelativeSemitone(
        note.frequency,
        snapshot.theme.rootHz
      );
      const slotIndex = findNearestSlotIndex(slots, relativeSemitone);
      const startRatio = (note.startMs - baseStartMs) / durationMs;
      markers.push({
        role,
        x:
          layout.leftPad +
          startRatio * (layout.width - layout.leftPad - layout.rightPad),
        y: interpolateSlotY(trackTop, trackBottom, slotIndex, slots.length),
        radius: role === 'lead' ? 4.5 : role === 'harmony' ? 4 : 3.5,
      });
    }
  }

  return {
    guides,
    markers,
  };
}

function createRoleScaleSlots(
  notes: readonly ProceduralMusicNote[],
  theme: MusicDebugTheme
): number[] {
  if (notes.length === 0) {
    return [];
  }

  let minSemitone = Number.POSITIVE_INFINITY;
  let maxSemitone = Number.NEGATIVE_INFINITY;

  for (const note of notes) {
    const semitone = resolveRelativeSemitone(note.frequency, theme.rootHz);
    if (semitone < minSemitone) {
      minSemitone = semitone;
    }
    if (semitone > maxSemitone) {
      maxSemitone = semitone;
    }
  }

  const minOctave = Math.floor(minSemitone / 12);
  const maxOctave = Math.ceil(maxSemitone / 12);
  const slots = new Set<number>();

  for (let octave = minOctave; octave <= maxOctave; octave += 1) {
    for (const scaleDegree of theme.scale) {
      const absoluteSemitone = scaleDegree + octave * 12;
      if (
        absoluteSemitone >= minSemitone - 2 &&
        absoluteSemitone <= maxSemitone + 2
      ) {
        slots.add(absoluteSemitone);
      }
    }
  }

  return [...slots].sort((left, right) => left - right);
}

function interpolateSlotY(
  trackTop: number,
  trackBottom: number,
  slotIndex: number,
  slotCount: number
): number {
  if (slotCount <= 1) {
    return (trackTop + trackBottom) * 0.5;
  }
  const ratio = slotIndex / (slotCount - 1);
  return trackBottom - (trackBottom - trackTop) * ratio;
}

function resolveRelativeSemitone(frequency: number, rootHz: number): number {
  return Math.round(
    12 * Math.log2(Math.max(frequency, 1) / Math.max(rootHz, 1))
  );
}

function findNearestSlotIndex(
  slots: readonly number[],
  semitone: number
): number {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < slots.length; index += 1) {
    const distance = Math.abs((slots[index] ?? 0) - semitone);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }

  return nearestIndex;
}
