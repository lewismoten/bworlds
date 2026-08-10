import {
  type MusicDebugPlaybackRegion,
  type MusicDebugSnapshot,
  type MusicDebugTimelineLayout,
} from './music-debug.ts';
import {
  resolvePercussionFamilyFromInstrumentId,
  resolvePercussionVoiceIdFromInstrumentId,
} from './procedural-music-percussion.ts';
import { resolvePercussionVoiceById } from './procedural-music-percussion-voices.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import { createMusicDebugScaleOverlay } from './music-debug-scale.ts';
import {
  formatMusicDebugDisplayRoleLabel,
  MUSIC_DEBUG_DISPLAY_ROLE_ORDER,
  resolveMusicDebugDisplayRoleColor,
} from './music-debug-role-display.ts';

const MUSIC_DEBUG_TIMELINE_LEFT_PAD = 84;
const MUSIC_DEBUG_TIMELINE_RIGHT_PAD = 24;
const MUSIC_DEBUG_TIMELINE_TOP_PAD = 34;
const MUSIC_DEBUG_TIMELINE_BOTTOM_PAD = 24;
const MUSIC_DEBUG_TIMELINE_NOTE_BAR_MIN_WIDTH = 2;
const MUSIC_DEBUG_TIMELINE_NOTE_BAR_MAX_HEIGHT = 8;
const MUSIC_DEBUG_TIMELINE_NOTE_BAR_MIN_HEIGHT = 5;

export type MusicDebugTimelineNoteBar = {
  role: ProceduralMusicNote['role'];
  x: number;
  y: number;
  width: number;
  height: number;
  overlapCount: number;
};

export function resolveMusicDebugTimelineLayout(
  width: number,
  height: number
): MusicDebugTimelineLayout {
  return {
    width,
    height,
    leftPad: MUSIC_DEBUG_TIMELINE_LEFT_PAD,
    rightPad: MUSIC_DEBUG_TIMELINE_RIGHT_PAD,
    topPad: MUSIC_DEBUG_TIMELINE_TOP_PAD,
    bottomPad: MUSIC_DEBUG_TIMELINE_BOTTOM_PAD,
    trackHeight:
      (height -
        MUSIC_DEBUG_TIMELINE_TOP_PAD -
        MUSIC_DEBUG_TIMELINE_BOTTOM_PAD) /
      4,
    roleOrder: [...MUSIC_DEBUG_DISPLAY_ROLE_ORDER],
  };
}

export function resolveMusicDebugTimelineXForOffset(
  layout: MusicDebugTimelineLayout,
  durationMs: number,
  offsetMs: number
): number {
  const usableWidth = layout.width - layout.leftPad - layout.rightPad;
  const clampedOffsetMs = Math.min(durationMs, Math.max(0, offsetMs));
  const ratio = durationMs <= 0 ? 0 : clampedOffsetMs / durationMs;
  return layout.leftPad + usableWidth * ratio;
}

export function resolveMusicDebugTimelineOffsetForX(
  layout: MusicDebugTimelineLayout,
  durationMs: number,
  x: number
): number {
  const usableWidth = Math.max(
    1,
    layout.width - layout.leftPad - layout.rightPad
  );
  const clampedX = Math.min(
    layout.width - layout.rightPad,
    Math.max(layout.leftPad, x)
  );
  const ratio = (clampedX - layout.leftPad) / usableWidth;
  return Math.round(Math.max(0, Math.min(1, ratio)) * Math.max(0, durationMs));
}

export function resolveMusicDebugTimelineSeekOffset(options: {
  snapshot: MusicDebugSnapshot;
  canvas: Pick<HTMLCanvasElement, 'width' | 'height'>;
  clientX: number;
  boundsLeft: number;
  boundsWidth: number;
}): number {
  const layout = resolveMusicDebugTimelineLayout(
    options.canvas.width,
    options.canvas.height
  );
  const canvasX =
    ((options.clientX - options.boundsLeft) /
      Math.max(1, options.boundsWidth)) *
    options.canvas.width;
  return resolveMusicDebugTimelineOffsetForX(
    layout,
    options.snapshot.durationMs,
    canvasX
  );
}

export function drawMusicDebugTimeline(
  canvas: HTMLCanvasElement,
  snapshot: MusicDebugSnapshot,
  options: {
    playheadOffsetMs?: number;
    activeRegion?: MusicDebugPlaybackRegion | null;
  } = {}
): void {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const layout = resolveMusicDebugTimelineLayout(width, height);
  const durationMs = Math.max(snapshot.durationMs, 1);
  const scaleOverlay = createMusicDebugScaleOverlay(snapshot, layout);

  context.clearRect(0, 0, width, height);
  context.fillStyle = '#071019';
  context.fillRect(0, 0, width, height);

  drawMusicDebugSectionBands(context, snapshot, layout, durationMs);
  drawMusicDebugActiveRegion(context, layout, durationMs, options.activeRegion);

  context.strokeStyle = 'rgba(255,255,255,0.08)';
  context.lineWidth = 1;
  for (let index = 0; index <= layout.roleOrder.length; index += 1) {
    const y = layout.topPad + layout.trackHeight * index;
    context.beginPath();
    context.moveTo(layout.leftPad, y);
    context.lineTo(width - layout.rightPad, y);
    context.stroke();
  }

  context.fillStyle = '#9db2bd';
  context.font = '13px Trebuchet MS';
  layout.roleOrder.forEach((role, index) => {
    context.fillText(
      formatMusicDebugDisplayRoleLabel(role).toUpperCase(),
      16,
      layout.topPad + layout.trackHeight * index + 18
    );
  });

  const noteBars = resolveMusicDebugTimelineNoteBars(snapshot, layout);
  for (const noteBar of noteBars) {
    context.fillStyle = resolveMusicDebugTimelineNoteBarColor(
      resolveMusicDebugDisplayRoleColor(noteBar.role),
      noteBar.overlapCount
    );
    context.fillRect(noteBar.x, noteBar.y, noteBar.width, noteBar.height);
  }

  context.strokeStyle = 'rgba(255,255,255,0.12)';
  context.lineWidth = 1;
  for (const guide of scaleOverlay.guides) {
    context.beginPath();
    context.moveTo(layout.leftPad, guide.y);
    context.lineTo(width - layout.rightPad, guide.y);
    context.stroke();
  }
  if (typeof options.playheadOffsetMs === 'number') {
    const playheadX = resolveMusicDebugTimelineXForOffset(
      layout,
      durationMs,
      options.playheadOffsetMs
    );
    context.strokeStyle = '#f5f7fb';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(playheadX, 12);
    context.lineTo(playheadX, height - layout.bottomPad + 6);
    context.stroke();
  }
}

export function resolveMusicDebugTimelineNoteBars(
  snapshot: MusicDebugSnapshot,
  layout: MusicDebugTimelineLayout
): MusicDebugTimelineNoteBar[] {
  const durationMs = Math.max(snapshot.durationMs, 1);
  const timelineStartMs = snapshot.notes[0]?.startMs ?? snapshot.song.startMs;
  const scaleOverlay = createMusicDebugScaleOverlay(snapshot, layout);
  const markerQueueByRole = createMarkerQueueByRole(scaleOverlay.markers);
  const percussionLaneMap = createPercussionLaneMap(snapshot.notes);
  const noteBars: MusicDebugTimelineNoteBar[] = [];
  const usableWidth = layout.width - layout.leftPad - layout.rightPad;

  for (const note of snapshot.notes) {
    const roleIndex = layout.roleOrder.indexOf(note.role);
    if (roleIndex < 0) {
      continue;
    }
    const trackTop = layout.topPad + roleIndex * layout.trackHeight + 10;
    const trackBottom = trackTop + Math.max(10, layout.trackHeight - 18);
    const marker =
      note.role === 'percussion'
        ? null
        : (markerQueueByRole[
            note.role as Exclude<ProceduralMusicNote['role'], 'percussion'>
          ]?.shift() ?? null);
    const startRatio = (note.startMs - timelineStartMs) / durationMs;
    const endRatio =
      (note.startMs + note.durationMs - timelineStartMs) / durationMs;
    const width = Math.max(
      MUSIC_DEBUG_TIMELINE_NOTE_BAR_MIN_WIDTH,
      (endRatio - startRatio) * usableWidth
    );
    const height = Math.min(
      MUSIC_DEBUG_TIMELINE_NOTE_BAR_MAX_HEIGHT,
      Math.max(MUSIC_DEBUG_TIMELINE_NOTE_BAR_MIN_HEIGHT, layout.trackHeight * 0.16)
    );
    const centerY =
      marker?.y ??
      (note.role === 'percussion'
        ? resolvePercussionLaneCenterY({
            note,
            laneMap: percussionLaneMap,
            trackTop,
            trackBottom,
          })
        : (trackTop + trackBottom) * 0.5);

    noteBars.push({
      role: note.role,
      x: layout.leftPad + startRatio * usableWidth,
      y: clampNoteBarY(centerY - height * 0.5, trackTop, trackBottom - height),
      width,
      height,
      overlapCount: 1,
    });
  }

  applyNoteBarOverlapCounts(noteBars);
  return noteBars;
}

export function resolveMusicDebugTimelineNoteBarColor(
  baseColor: string,
  overlapCount: number
): string {
  const hex = baseColor.replace('#', '');
  if (hex.length !== 6) {
    return baseColor;
  }

  const overlapBoost = Math.min(0.28, Math.max(0, overlapCount - 1) * 0.09);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const brighten = (channel: number) =>
    Math.round(channel + (255 - channel) * overlapBoost)
      .toString(16)
      .padStart(2, '0');

  return `#${brighten(red)}${brighten(green)}${brighten(blue)}`;
}

function applyNoteBarOverlapCounts(noteBars: MusicDebugTimelineNoteBar[]): void {
  for (let index = 0; index < noteBars.length; index += 1) {
    const current = noteBars[index]!;
    let overlapCount = 1;

    for (let compareIndex = 0; compareIndex < noteBars.length; compareIndex += 1) {
      if (compareIndex === index) {
        continue;
      }
      const candidate = noteBars[compareIndex]!;
      if (candidate.role !== current.role) {
        continue;
      }
      if (
        candidate.x < current.x + current.width &&
        candidate.x + candidate.width > current.x &&
        candidate.y < current.y + current.height &&
        candidate.y + candidate.height > current.y
      ) {
        overlapCount += 1;
      }
    }

    current.overlapCount = overlapCount;
  }
}

function drawMusicDebugSectionBands(
  context: CanvasRenderingContext2D,
  snapshot: MusicDebugSnapshot,
  layout: MusicDebugTimelineLayout,
  durationMs: number
): void {
  context.font = '11px Trebuchet MS';
  for (let index = 0; index < snapshot.song.sections.length; index += 1) {
    const section = snapshot.song.sections[index]!;
    const startX = resolveMusicDebugTimelineXForOffset(
      layout,
      durationMs,
      section.startOffsetMs
    );
    const endX = resolveMusicDebugTimelineXForOffset(
      layout,
      durationMs,
      section.startOffsetMs + section.durationMs
    );
    context.fillStyle =
      index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
    context.fillRect(
      startX,
      0,
      Math.max(1, endX - startX),
      layout.height - layout.bottomPad + 8
    );
    context.fillStyle = '#d5e3ea';
    context.fillText(section.label, startX + 6, 18);
  }
}

function drawMusicDebugActiveRegion(
  context: CanvasRenderingContext2D,
  layout: MusicDebugTimelineLayout,
  durationMs: number,
  region?: MusicDebugPlaybackRegion | null
): void {
  if (!region) {
    return;
  }
  const startX = resolveMusicDebugTimelineXForOffset(
    layout,
    durationMs,
    region.startOffsetMs
  );
  const endX = resolveMusicDebugTimelineXForOffset(
    layout,
    durationMs,
    region.endOffsetMs
  );
  context.fillStyle = 'rgba(85,214,190,0.08)';
  context.fillRect(
    startX,
    layout.topPad,
    Math.max(0, endX - startX),
    layout.height - layout.topPad - layout.bottomPad
  );
}

function createMarkerQueueByRole(
  markers: ReturnType<typeof createMusicDebugScaleOverlay>['markers']
): Record<'bass' | 'harmony' | 'lead', typeof markers> {
  return {
    bass: markers.filter((marker) => marker.role === 'bass'),
    harmony: markers.filter((marker) => marker.role === 'harmony'),
    lead: markers.filter((marker) => marker.role === 'lead'),
  };
}

function createPercussionLaneMap(
  notes: readonly ProceduralMusicNote[]
): Map<string, number> {
  const laneEntries = new Map<
    string,
    { familyRank: number; pitchRank: number; key: string }
  >();

  for (const note of notes) {
    if (note.role !== 'percussion') {
      continue;
    }
    const voiceId = resolvePercussionVoiceIdFromInstrumentId(note.instrumentId);
    const family = resolvePercussionFamilyFromInstrumentId(note.instrumentId);
    const key = voiceId ?? family ?? note.instrumentId;
    if (laneEntries.has(key)) {
      continue;
    }
    laneEntries.set(key, {
      familyRank: resolvePercussionFamilyRank(family),
      pitchRank: voiceId ? resolvePercussionVoiceById(voiceId).midiNote : 0,
      key,
    });
  }

  return new Map(
    [...laneEntries.values()]
      .sort(
        (left, right) =>
          left.familyRank - right.familyRank ||
          left.pitchRank - right.pitchRank ||
          left.key.localeCompare(right.key)
      )
      .map((entry, index) => [entry.key, index])
  );
}

function resolvePercussionLaneCenterY(options: {
  note: ProceduralMusicNote;
  laneMap: ReadonlyMap<string, number>;
  trackTop: number;
  trackBottom: number;
}): number {
  const laneCount = Math.max(1, options.laneMap.size);
  if (laneCount <= 1) {
    return (options.trackTop + options.trackBottom) * 0.5;
  }
  const voiceId = resolvePercussionVoiceIdFromInstrumentId(
    options.note.instrumentId
  );
  const family = resolvePercussionFamilyFromInstrumentId(
    options.note.instrumentId
  );
  const laneKey = voiceId ?? family ?? options.note.instrumentId;
  const laneIndex = options.laneMap.get(laneKey) ?? Math.floor(laneCount / 2);
  const ratio = laneIndex / Math.max(1, laneCount - 1);
  return (
    options.trackBottom - (options.trackBottom - options.trackTop) * ratio
  );
}

function resolvePercussionFamilyRank(
  family: ReturnType<typeof resolvePercussionFamilyFromInstrumentId>
): number {
  switch (family) {
    case 'kick':
      return 0;
    case 'snare':
      return 1;
    case 'hand-percussion':
      return 2;
    case 'shaker':
      return 3;
    case 'cymbals':
      return 4;
    default:
      return 5;
  }
}

function clampNoteBarY(y: number, minY: number, maxY: number): number {
  return Math.min(maxY, Math.max(minY, y));
}
