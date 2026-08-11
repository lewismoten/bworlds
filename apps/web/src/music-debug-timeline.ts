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
  normalizeMusicDebugDisplayRoles,
  resolveMusicDebugDisplayRoleColor,
  type MusicDebugDisplayRole,
} from './music-debug-role-display.ts';
import {
  type MusicDebugChordCue,
  resolveMusicDebugChordCueAtOffset,
  resolveMusicDebugChordCues,
} from './music-debug-chord-cues.ts';
import {
  type MusicDebugCadenceMarker,
  resolveMusicDebugCadenceMarkers,
} from './music-debug-cadence-markers.ts';
import {
  resolveMusicDebugBeatSubdivisionMarkers,
  resolveMusicDebugMeasureMarkers,
} from './music-debug-measure-guides.ts';
import { resolveMusicDebugPitchClassLabel } from './music-debug-pitch-class.ts';

const MUSIC_DEBUG_TIMELINE_LEFT_PAD = 84;
const MUSIC_DEBUG_TIMELINE_RIGHT_PAD = 24;
const MUSIC_DEBUG_TIMELINE_TOP_PAD = 84;
const MUSIC_DEBUG_TIMELINE_BOTTOM_PAD = 24;
const MUSIC_DEBUG_TIMELINE_NOTE_BAR_MIN_WIDTH = 2;
const MUSIC_DEBUG_TIMELINE_NOTE_BAR_MAX_HEIGHT = 8;
const MUSIC_DEBUG_TIMELINE_NOTE_BAR_MIN_HEIGHT = 5;
const MUSIC_DEBUG_TIMELINE_EXPORT_WIDTH = 960;
const MUSIC_DEBUG_TIMELINE_EXPORT_HEIGHT = 320;
const MUSIC_DEBUG_TIMELINE_SECTION_LABEL_Y = 16;
const MUSIC_DEBUG_TIMELINE_SECTION_LABEL_PADDING_X = 8;
const MUSIC_DEBUG_TIMELINE_SECTION_LABEL_MIN_WIDTH = 30;
const MUSIC_DEBUG_TIMELINE_SECTION_LABEL_HEIGHT = 16;
const MUSIC_DEBUG_TIMELINE_CHORD_LABEL_Y = 32;
const MUSIC_DEBUG_TIMELINE_CADENCE_MARKER_Y = 48;
const MUSIC_DEBUG_TIMELINE_PLAYHEAD_CHORD_LABEL_Y = 64;
const MUSIC_DEBUG_TIMELINE_MEASURE_LABEL_Y = 78;
const MUSIC_DEBUG_TIMELINE_CHORD_LABEL_GAP = 8;

export type MusicDebugTimelineNoteBar = {
  role: ProceduralMusicNote['role'];
  noteIndex: number;
  noteLabel: string;
  hoverLabel: string;
  hoverDurationLabel: string;
  x: number;
  y: number;
  width: number;
  height: number;
  overlapCount: number;
};

export type MusicDebugTimelineHoverDetail = {
  noteIndex: number | null;
  role: ProceduralMusicNote['role'] | null;
  hoverLabel: string;
  hoverDurationLabel: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MusicDebugTimelineChordLabel = {
  cue: MusicDebugChordCue;
  label: string;
  x: number;
  startX: number;
  endX: number;
};

export type MusicDebugTimelinePercussionLaneLabel = {
  key: string;
  label: string;
  x: number;
  y: number;
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

export function resolveMusicDebugTimelineTrackLabelRoleAtPoint(options: {
  canvas: Pick<HTMLCanvasElement, 'width' | 'height'>;
  clientX: number;
  clientY: number;
  boundsLeft: number;
  boundsTop: number;
  boundsWidth: number;
  boundsHeight: number;
}): MusicDebugDisplayRole | null {
  const layout = resolveMusicDebugTimelineLayout(
    options.canvas.width,
    options.canvas.height
  );
  const canvasX =
    ((options.clientX - options.boundsLeft) /
      Math.max(1, options.boundsWidth)) *
    options.canvas.width;
  const canvasY =
    ((options.clientY - options.boundsTop) /
      Math.max(1, options.boundsHeight)) *
    options.canvas.height;

  if (canvasX < 0 || canvasX > layout.leftPad - 8) {
    return null;
  }

  for (let index = 0; index < layout.roleOrder.length; index += 1) {
    const role = layout.roleOrder[index]!;
    const top = layout.topPad + layout.trackHeight * index;
    const bottom = top + layout.trackHeight;
    if (canvasY >= top && canvasY <= bottom) {
      return role;
    }
  }

  return null;
}

export function resolveMusicDebugTimelineHoverDetail(options: {
  snapshot: MusicDebugSnapshot;
  canvas: Pick<HTMLCanvasElement, 'width' | 'height'>;
  clientX: number;
  clientY: number;
  boundsLeft: number;
  boundsTop: number;
  boundsWidth: number;
  boundsHeight: number;
  visibleRoles?: readonly MusicDebugDisplayRole[] | null;
}): MusicDebugTimelineHoverDetail | null {
  const layout = resolveMusicDebugTimelineLayout(
    options.canvas.width,
    options.canvas.height
  );
  const canvasX =
    ((options.clientX - options.boundsLeft) /
      Math.max(1, options.boundsWidth)) *
    options.canvas.width;
  const canvasY =
    ((options.clientY - options.boundsTop) /
      Math.max(1, options.boundsHeight)) *
    options.canvas.height;
  const cadenceMarkers = resolveMusicDebugCadenceMarkers(options.snapshot);
  const noteBars = resolveMusicDebugTimelineNoteBars(options.snapshot, layout, {
    visibleRoles: options.visibleRoles,
  });

  for (const marker of cadenceMarkers) {
    const hoverDetail = resolveMusicDebugTimelineCadenceMarkerHoverDetail({
      layout,
      durationMs: options.snapshot.durationMs,
      canvasX,
      canvasY,
      marker,
    });
    if (hoverDetail) {
      return hoverDetail;
    }
  }

  for (let index = noteBars.length - 1; index >= 0; index -= 1) {
    const noteBar = noteBars[index]!;
    if (
      canvasX >= noteBar.x &&
      canvasX <= noteBar.x + noteBar.width &&
      canvasY >= noteBar.y &&
      canvasY <= noteBar.y + noteBar.height
    ) {
      return {
        noteIndex: noteBar.noteIndex,
        role: noteBar.role,
        hoverLabel: noteBar.hoverLabel,
        hoverDurationLabel: noteBar.hoverDurationLabel,
        x: noteBar.x,
        y: noteBar.y,
        width: noteBar.width,
        height: noteBar.height,
      };
    }
  }

  return null;
}

function resolveMusicDebugTimelineCadenceMarkerHoverDetail(options: {
  layout: MusicDebugTimelineLayout;
  durationMs: number;
  canvasX: number;
  canvasY: number;
  marker: MusicDebugCadenceMarker;
}): MusicDebugTimelineHoverDetail | null {
  const markerX = resolveMusicDebugTimelineXForOffset(
    options.layout,
    options.durationMs,
    options.marker.offsetMs
  );
  const hoverWidth = 18;
  const hoverHeight = 16;
  const hoverX = markerX - hoverWidth * 0.5;
  const hoverY = MUSIC_DEBUG_TIMELINE_CADENCE_MARKER_Y - 11;
  if (
    options.canvasX < hoverX ||
    options.canvasX > hoverX + hoverWidth ||
    options.canvasY < hoverY ||
    options.canvasY > hoverY + hoverHeight
  ) {
    return null;
  }
  return {
    noteIndex: null,
    role: null,
    hoverLabel: options.marker.label,
    hoverDurationLabel: `Phrase ${options.marker.phraseIndex + 1} • ${options.marker.shortLabel} cadence`,
    x: hoverX,
    y: hoverY,
    width: hoverWidth,
    height: hoverHeight,
  };
}

export function resolveMusicDebugTimelineChordLabels(
  layout: MusicDebugTimelineLayout,
  durationMs: number,
  chordCues: readonly MusicDebugChordCue[]
): MusicDebugTimelineChordLabel[] {
  const labels: MusicDebugTimelineChordLabel[] = [];
  let previousRightEdge = Number.NEGATIVE_INFINITY;

  for (const cue of chordCues) {
    const startX = resolveMusicDebugTimelineXForOffset(
      layout,
      durationMs,
      cue.startOffsetMs
    );
    const endX = resolveMusicDebugTimelineXForOffset(
      layout,
      durationMs,
      cue.endOffsetMs
    );
    const spanWidth = Math.max(1, endX - startX);
    const label = resolveMusicDebugTimelineChordLabelText(cue, spanWidth);
    if (!label) {
      continue;
    }
    const centerX = (startX + endX) * 0.5;
    const halfWidth = resolveMusicDebugTimelineChordLabelWidth(label) * 0.5;
    const leftEdge = centerX - halfWidth;
    const rightEdge = centerX + halfWidth;
    if (leftEdge < previousRightEdge + MUSIC_DEBUG_TIMELINE_CHORD_LABEL_GAP) {
      continue;
    }
    labels.push({
      cue,
      label,
      x: centerX,
      startX,
      endX,
    });
    previousRightEdge = rightEdge;
  }

  return labels;
}

export function drawMusicDebugTimeline(
  canvas: HTMLCanvasElement,
  snapshot: MusicDebugSnapshot,
  options: {
    playheadOffsetMs?: number;
    activeRegion?: MusicDebugPlaybackRegion | null;
    visibleRoles?: readonly MusicDebugDisplayRole[] | null;
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
  const visibleRoles = normalizeMusicDebugTimelineVisibleRoles(
    options.visibleRoles
  );
  const scaleOverlay = createMusicDebugScaleOverlay(snapshot, layout);
  const chordCues = resolveMusicDebugChordCues(snapshot);
  const chordLabels = resolveMusicDebugTimelineChordLabels(
    layout,
    durationMs,
    chordCues
  );
  const cadenceMarkers = resolveMusicDebugCadenceMarkers(snapshot);
  const measureMarkers = resolveMusicDebugMeasureMarkers(snapshot);
  const beatMarkers = resolveMusicDebugBeatSubdivisionMarkers(snapshot);
  const activeChordCue =
    typeof options.playheadOffsetMs === 'number'
      ? resolveMusicDebugChordCueAtOffset(snapshot, options.playheadOffsetMs)
      : null;
  const playheadLabel =
    typeof options.playheadOffsetMs === 'number'
      ? resolveMusicDebugTimelinePlayheadLabel({
          snapshot,
          chordCue: activeChordCue,
        })
      : null;

  context.clearRect(0, 0, width, height);
  context.fillStyle = '#071019';
  context.fillRect(0, 0, width, height);

  drawMusicDebugSectionBands(context, snapshot, layout, durationMs);
  drawMusicDebugActiveRegion(context, layout, durationMs, options.activeRegion);
  drawMusicDebugMeasureGuides(
    context,
    layout,
    durationMs,
    measureMarkers,
    beatMarkers
  );

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
    context.fillStyle = visibleRoles.includes(role) ? '#9db2bd' : '#51616d';
    context.fillText(
      formatMusicDebugDisplayRoleLabel(role).toUpperCase(),
      16,
      layout.topPad + layout.trackHeight * index + 18
    );
  });
  context.fillStyle = '#d8e5ef';
  context.font = '11px Trebuchet MS';
  context.textAlign = 'center';
  for (const chordLabel of chordLabels) {
    context.fillText(
      chordLabel.label,
      chordLabel.x,
      MUSIC_DEBUG_TIMELINE_CHORD_LABEL_Y
    );
  }
  for (const marker of cadenceMarkers) {
    const x = resolveMusicDebugTimelineXForOffset(
      layout,
      durationMs,
      marker.offsetMs
    );
    context.fillStyle =
      marker.kind === 'question' ? 'rgba(255, 204, 51, 0.9)' : '#f5f7fb';
    context.fillRect(
      x - 1,
      layout.topPad - 10,
      2,
      layout.height - layout.topPad + 10
    );
    context.fillStyle = marker.kind === 'question' ? '#ffcc33' : '#f5f7fb';
    context.fillText(
      marker.shortLabel,
      x,
      MUSIC_DEBUG_TIMELINE_CADENCE_MARKER_Y
    );
  }
  context.fillStyle = '#8fa4af';
  for (const measure of measureMarkers) {
    if (!measure.label) {
      continue;
    }
    context.fillText(
      `M${measure.label}`,
      resolveMusicDebugTimelineXForOffset(
        layout,
        durationMs,
        measure.centerOffsetMs
      ),
      MUSIC_DEBUG_TIMELINE_MEASURE_LABEL_Y
    );
  }
  context.textAlign = 'start';

  const noteBars = resolveMusicDebugTimelineNoteBars(snapshot, layout, {
    visibleRoles,
  });
  const percussionLaneLabels = visibleRoles.includes('percussion')
    ? resolveMusicDebugTimelinePercussionLaneLabels(snapshot, layout)
    : [];
  for (const noteBar of noteBars) {
    context.fillStyle = resolveMusicDebugTimelineNoteBarColor(
      resolveMusicDebugDisplayRoleColor(noteBar.role),
      noteBar.overlapCount
    );
    context.fillRect(noteBar.x, noteBar.y, noteBar.width, noteBar.height);
  }

  context.fillStyle = '#7f929d';
  context.font = '10px Trebuchet MS';
  for (const laneLabel of percussionLaneLabels) {
    context.fillText(laneLabel.label, laneLabel.x, laneLabel.y);
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
    context.moveTo(playheadX, layout.topPad);
    context.lineTo(playheadX, height - layout.bottomPad);
    context.stroke();
    if (playheadLabel) {
      drawMusicDebugTimelinePlayheadChordLabel(
        context,
        layout,
        playheadX,
        playheadLabel
      );
    }
  }
}

export function buildMusicDebugTimelineSvgMarkup(
  snapshot: MusicDebugSnapshot,
  options: {
    width?: number;
    height?: number;
    playheadOffsetMs?: number;
    activeRegion?: MusicDebugPlaybackRegion | null;
    visibleRoles?: readonly MusicDebugDisplayRole[] | null;
  } = {}
): string {
  const width = options.width ?? MUSIC_DEBUG_TIMELINE_EXPORT_WIDTH;
  const height = options.height ?? MUSIC_DEBUG_TIMELINE_EXPORT_HEIGHT;
  const layout = resolveMusicDebugTimelineLayout(width, height);
  const durationMs = Math.max(snapshot.durationMs, 1);
  const visibleRoles = normalizeMusicDebugTimelineVisibleRoles(
    options.visibleRoles
  );
  const scaleOverlay = createMusicDebugScaleOverlay(snapshot, layout);
  const noteBars = resolveMusicDebugTimelineNoteBars(snapshot, layout, {
    visibleRoles,
  });
  const percussionLaneLabels = visibleRoles.includes('percussion')
    ? resolveMusicDebugTimelinePercussionLaneLabels(snapshot, layout)
    : [];
  const chordCues = resolveMusicDebugChordCues(snapshot);
  const chordLabels = resolveMusicDebugTimelineChordLabels(
    layout,
    durationMs,
    chordCues
  );
  const cadenceMarkers = resolveMusicDebugCadenceMarkers(snapshot);
  const measureMarkers = resolveMusicDebugMeasureMarkers(snapshot);
  const beatMarkers = resolveMusicDebugBeatSubdivisionMarkers(snapshot);
  const activeChordCue =
    typeof options.playheadOffsetMs === 'number'
      ? resolveMusicDebugChordCueAtOffset(snapshot, options.playheadOffsetMs)
      : null;
  const playheadLabel =
    typeof options.playheadOffsetMs === 'number'
      ? resolveMusicDebugTimelinePlayheadLabel({
          snapshot,
          chordCue: activeChordCue,
        })
      : null;
  const playheadMarkup =
    typeof options.playheadOffsetMs === 'number'
      ? buildMusicDebugTimelinePlayheadSvgMarkup(
          layout,
          durationMs,
          options.playheadOffsetMs,
          height,
          playheadLabel
        )
      : '';

  return `
    <svg
      viewBox="0 0 ${width} ${height}"
      role="img"
      aria-label="Music debug timeline"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="0" width="${width}" height="${height}" fill="#071019"></rect>
      ${buildMusicDebugSectionBandSvgMarkup(snapshot, layout, durationMs)}
      ${buildMusicDebugActiveRegionSvgMarkup(
        layout,
        durationMs,
        height,
        options.activeRegion
      )}
      ${buildMusicDebugMeasureGuideSvgMarkup(
        layout,
        durationMs,
        measureMarkers,
        beatMarkers
      )}
      ${Array.from({ length: layout.roleOrder.length + 1 }, (_, index) => {
        const y = layout.topPad + layout.trackHeight * index;
        return `<path d="M${layout.leftPad} ${y.toFixed(2)} H${(width - layout.rightPad).toFixed(2)}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"></path>`;
      }).join('')}
      ${layout.roleOrder
        .map((role, index) => {
          const y = layout.topPad + layout.trackHeight * index + 18;
          const fill = visibleRoles.includes(role) ? '#9db2bd' : '#51616d';
          return `<text x="16" y="${y.toFixed(2)}" fill="${fill}" font-family="Trebuchet MS, sans-serif" font-size="13">${formatMusicDebugDisplayRoleLabel(
            role
          ).toUpperCase()}</text>`;
        })
        .join('')}
      ${chordLabels
        .map((chordLabel) => {
          return `<text class="music-debug-timeline-chord-cue" x="${chordLabel.x.toFixed(
            2
          )}" y="${MUSIC_DEBUG_TIMELINE_CHORD_LABEL_Y.toFixed(
            2
          )}" fill="#d8e5ef" font-family="Trebuchet MS, sans-serif" font-size="11" text-anchor="middle">${chordLabel.label}</text>`;
        })
        .join('')}
      ${cadenceMarkers
        .map((marker) => {
          const x = resolveMusicDebugTimelineXForOffset(
            layout,
            durationMs,
            marker.offsetMs
          );
          const stroke =
            marker.kind === 'question' ? 'rgba(255,204,51,0.9)' : '#f5f7fb';
          const fill = marker.kind === 'question' ? '#ffcc33' : '#f5f7fb';
          return `<path class="music-debug-timeline-cadence-marker" d="M${x.toFixed(
            2
          )} ${(layout.topPad - 10).toFixed(2)} V${layout.height.toFixed(
            2
          )}" fill="none" stroke="${stroke}" stroke-width="2"></path><text x="${x.toFixed(
            2
          )}" y="${MUSIC_DEBUG_TIMELINE_CADENCE_MARKER_Y.toFixed(
            2
          )}" fill="${fill}" font-family="Trebuchet MS, sans-serif" font-size="11" text-anchor="middle">${marker.shortLabel}</text>`;
        })
        .join('')}
      ${measureMarkers
        .map((measure) => {
          if (!measure.label) {
            return '';
          }
          return `<text class="music-debug-timeline-measure-label" x="${resolveMusicDebugTimelineXForOffset(
            layout,
            durationMs,
            measure.centerOffsetMs
          ).toFixed(2)}" y="${MUSIC_DEBUG_TIMELINE_MEASURE_LABEL_Y.toFixed(
            2
          )}" fill="#8fa4af" font-family="Trebuchet MS, sans-serif" font-size="10" text-anchor="middle">M${measure.label}</text>`;
        })
        .join('')}
      ${noteBars
        .map(
          (noteBar) =>
            `<rect x="${noteBar.x.toFixed(2)}" y="${noteBar.y.toFixed(
              2
            )}" width="${noteBar.width.toFixed(2)}" height="${noteBar.height.toFixed(
              2
            )}" fill="${resolveMusicDebugTimelineNoteBarColor(
              resolveMusicDebugDisplayRoleColor(noteBar.role),
              noteBar.overlapCount
            )}" rx="2" ry="2"><title>${escapeMusicDebugTimelineSvgText(
              `${noteBar.hoverLabel} (${noteBar.hoverDurationLabel})`
            )}</title></rect>`
        )
        .join('')}
      ${percussionLaneLabels
        .map(
          (laneLabel) =>
            `<text class="music-debug-timeline-percussion-lane-label" x="${laneLabel.x.toFixed(
              2
            )}" y="${laneLabel.y.toFixed(
              2
            )}" fill="#7f929d" font-family="Trebuchet MS, sans-serif" font-size="10">${escapeMusicDebugTimelineSvgText(
              laneLabel.label
            )}</text>`
        )
        .join('')}
      ${scaleOverlay.guides
        .map(
          (guide) =>
            `<path d="M${layout.leftPad} ${guide.y.toFixed(2)} H${(
              width - layout.rightPad
            ).toFixed(
              2
            )}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"></path>`
        )
        .join('')}
      ${playheadMarkup}
    </svg>
  `;
}

export function resolveMusicDebugTimelineNoteBars(
  snapshot: MusicDebugSnapshot,
  layout: MusicDebugTimelineLayout,
  options: {
    visibleRoles?: readonly MusicDebugDisplayRole[] | null;
  } = {}
): MusicDebugTimelineNoteBar[] {
  const durationMs = Math.max(snapshot.durationMs, 1);
  const timelineStartMs = snapshot.notes[0]?.startMs ?? snapshot.song.startMs;
  const scaleOverlay = createMusicDebugScaleOverlay(snapshot, layout);
  const markerQueueByRole = createMarkerQueueByRole(scaleOverlay.markers);
  const percussionLaneMap = createPercussionLaneMap(snapshot.notes);
  const noteBars: MusicDebugTimelineNoteBar[] = [];
  const usableWidth = layout.width - layout.leftPad - layout.rightPad;
  const visibleRoles = normalizeMusicDebugTimelineVisibleRoles(
    options.visibleRoles
  );

  snapshot.notes.forEach((note, noteIndex) => {
    if (!visibleRoles.includes(note.role)) {
      return;
    }
    const roleIndex = layout.roleOrder.indexOf(note.role);
    if (roleIndex < 0) {
      return;
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
      Math.max(
        MUSIC_DEBUG_TIMELINE_NOTE_BAR_MIN_HEIGHT,
        layout.trackHeight * 0.16
      )
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
      noteIndex,
      noteLabel: resolveMusicDebugTimelineNoteLabel(note),
      hoverLabel: resolveMusicDebugTimelineHoverLabel(note),
      hoverDurationLabel: formatMusicDebugTimelineHoverDuration(
        note.durationMs
      ),
      x: layout.leftPad + startRatio * usableWidth,
      y: clampNoteBarY(centerY - height * 0.5, trackTop, trackBottom - height),
      width,
      height,
      overlapCount: 1,
    });
  });

  applyNoteBarOverlapCounts(noteBars);
  return noteBars;
}

export function resolveMusicDebugTimelinePercussionLaneLabels(
  snapshot: MusicDebugSnapshot,
  layout: MusicDebugTimelineLayout
): MusicDebugTimelinePercussionLaneLabel[] {
  const percussionTrackIndex = layout.roleOrder.indexOf('percussion');
  if (percussionTrackIndex < 0) {
    return [];
  }

  const trackTop =
    layout.topPad + percussionTrackIndex * layout.trackHeight + 10;
  const trackBottom = trackTop + Math.max(10, layout.trackHeight - 18);
  const laneMap = createPercussionLaneMap(snapshot.notes);
  const familyCounts = createPercussionLaneFamilyCounts(snapshot.notes);
  const labelsByKey = createPercussionLaneLabelsByKey(
    snapshot.notes,
    familyCounts
  );

  return [...laneMap.entries()]
    .sort((left, right) => left[1] - right[1])
    .flatMap(([key]) => {
      const note = snapshot.notes.find((entry) => {
        if (entry.role !== 'percussion') {
          return false;
        }
        const voiceId = resolvePercussionVoiceIdFromInstrumentId(
          entry.instrumentId
        );
        const family = resolvePercussionFamilyFromInstrumentId(
          entry.instrumentId
        );
        return (voiceId ?? family ?? entry.instrumentId) === key;
      });
      if (!note) {
        return [];
      }
      return [
        {
          key,
          label: labelsByKey.get(key) ?? 'Percussion',
          x: layout.leftPad + 6,
          y:
            resolvePercussionLaneCenterY({
              note,
              laneMap,
              trackTop,
              trackBottom,
            }) + 3,
        },
      ];
    });
}

function normalizeMusicDebugTimelineVisibleRoles(
  value: readonly MusicDebugDisplayRole[] | null | undefined
): MusicDebugDisplayRole[] {
  if (value == null) {
    return [...MUSIC_DEBUG_DISPLAY_ROLE_ORDER];
  }
  return normalizeMusicDebugDisplayRoles(value);
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

function applyNoteBarOverlapCounts(
  noteBars: MusicDebugTimelineNoteBar[]
): void {
  for (let index = 0; index < noteBars.length; index += 1) {
    const current = noteBars[index]!;
    let overlapCount = 1;

    for (
      let compareIndex = 0;
      compareIndex < noteBars.length;
      compareIndex += 1
    ) {
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
    drawMusicDebugSectionLabel(context, section.label, startX, endX);
  }
}

function drawMusicDebugMeasureGuides(
  context: CanvasRenderingContext2D,
  layout: MusicDebugTimelineLayout,
  durationMs: number,
  measureMarkers: ReturnType<typeof resolveMusicDebugMeasureMarkers>,
  beatMarkers: ReturnType<typeof resolveMusicDebugBeatSubdivisionMarkers>
): void {
  context.lineWidth = 1;
  for (const beat of beatMarkers) {
    const x = resolveMusicDebugTimelineXForOffset(
      layout,
      durationMs,
      beat.offsetMs
    );
    context.strokeStyle = 'rgba(255,255,255,0.05)';
    context.beginPath();
    context.moveTo(x, layout.topPad);
    context.lineTo(x, layout.height - layout.bottomPad);
    context.stroke();
  }
  for (const measure of measureMarkers) {
    const x = resolveMusicDebugTimelineXForOffset(
      layout,
      durationMs,
      measure.startOffsetMs
    );
    context.strokeStyle = 'rgba(255,255,255,0.12)';
    context.beginPath();
    context.moveTo(x, layout.topPad - 6);
    context.lineTo(x, layout.height - layout.bottomPad);
    context.stroke();
  }
}

function buildMusicDebugSectionBandSvgMarkup(
  snapshot: MusicDebugSnapshot,
  layout: MusicDebugTimelineLayout,
  durationMs: number
): string {
  return snapshot.song.sections
    .map((section, index) => {
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
      const fill =
        index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
      const labelMarkup = buildMusicDebugSectionLabelSvgMarkup(
        section.label,
        startX,
        endX
      );
      return `
        <rect
          x="${startX.toFixed(2)}"
          y="0"
          width="${Math.max(1, endX - startX).toFixed(2)}"
          height="${(layout.height - layout.bottomPad + 8).toFixed(2)}"
          fill="${fill}"
        ></rect>
        ${labelMarkup}
      `;
    })
    .join('');
}

function drawMusicDebugSectionLabel(
  context: CanvasRenderingContext2D,
  label: string,
  startX: number,
  endX: number
): void {
  const labelWidth = Math.max(
    MUSIC_DEBUG_TIMELINE_SECTION_LABEL_MIN_WIDTH,
    context.measureText(label).width +
      MUSIC_DEBUG_TIMELINE_SECTION_LABEL_PADDING_X * 2
  );
  const clampedCenterX = Math.min(
    endX - labelWidth * 0.5,
    Math.max(startX + labelWidth * 0.5, (startX + endX) * 0.5)
  );
  const labelX = clampedCenterX - labelWidth * 0.5;
  const labelY =
    MUSIC_DEBUG_TIMELINE_SECTION_LABEL_Y -
    MUSIC_DEBUG_TIMELINE_SECTION_LABEL_HEIGHT +
    2;

  context.fillStyle = 'rgba(7,16,25,0.72)';
  context.strokeStyle = 'rgba(213,227,234,0.2)';
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(
    labelX,
    labelY,
    labelWidth,
    MUSIC_DEBUG_TIMELINE_SECTION_LABEL_HEIGHT,
    6
  );
  context.fill();
  context.stroke();

  context.fillStyle = '#a8bcc7';
  context.textAlign = 'center';
  context.fillText(label, clampedCenterX, MUSIC_DEBUG_TIMELINE_SECTION_LABEL_Y);
  context.textAlign = 'start';
}

function buildMusicDebugSectionLabelSvgMarkup(
  label: string,
  startX: number,
  endX: number
): string {
  const labelWidth = Math.max(
    MUSIC_DEBUG_TIMELINE_SECTION_LABEL_MIN_WIDTH,
    label.length * 6.6 + MUSIC_DEBUG_TIMELINE_SECTION_LABEL_PADDING_X * 2
  );
  const clampedCenterX = Math.min(
    endX - labelWidth * 0.5,
    Math.max(startX + labelWidth * 0.5, (startX + endX) * 0.5)
  );
  const labelX = clampedCenterX - labelWidth * 0.5;
  const labelY =
    MUSIC_DEBUG_TIMELINE_SECTION_LABEL_Y -
    MUSIC_DEBUG_TIMELINE_SECTION_LABEL_HEIGHT +
    2;

  return `
    <rect
      class="music-debug-timeline-section-label-pill"
      x="${labelX.toFixed(2)}"
      y="${labelY.toFixed(2)}"
      width="${labelWidth.toFixed(2)}"
      height="${MUSIC_DEBUG_TIMELINE_SECTION_LABEL_HEIGHT.toFixed(2)}"
      rx="6"
      ry="6"
      fill="rgba(7,16,25,0.72)"
      stroke="rgba(213,227,234,0.2)"
      stroke-width="1"
    ></rect>
    <text
      class="music-debug-timeline-section-label"
      x="${clampedCenterX.toFixed(2)}"
      y="${MUSIC_DEBUG_TIMELINE_SECTION_LABEL_Y.toFixed(2)}"
      fill="#a8bcc7"
      font-family="Trebuchet MS, sans-serif"
      font-size="11"
      text-anchor="middle"
    >${label}</text>
  `;
}

function buildMusicDebugMeasureGuideSvgMarkup(
  layout: MusicDebugTimelineLayout,
  durationMs: number,
  measureMarkers: ReturnType<typeof resolveMusicDebugMeasureMarkers>,
  beatMarkers: ReturnType<typeof resolveMusicDebugBeatSubdivisionMarkers>
): string {
  return `${beatMarkers
    .map((beat) => {
      const x = resolveMusicDebugTimelineXForOffset(
        layout,
        durationMs,
        beat.offsetMs
      );
      return `<path class="music-debug-timeline-beat-guide" d="M${x.toFixed(
        2
      )} ${layout.topPad.toFixed(2)} V${(
        layout.height - layout.bottomPad
      ).toFixed(
        2
      )}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"></path>`;
    })
    .join('')}${measureMarkers
    .map((measure) => {
      const x = resolveMusicDebugTimelineXForOffset(
        layout,
        durationMs,
        measure.startOffsetMs
      );
      return `<path class="music-debug-timeline-measure-guide" d="M${x.toFixed(
        2
      )} ${(layout.topPad - 6).toFixed(2)} V${(
        layout.height - layout.bottomPad
      ).toFixed(
        2
      )}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"></path>`;
    })
    .join('')}`;
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

function buildMusicDebugActiveRegionSvgMarkup(
  layout: MusicDebugTimelineLayout,
  durationMs: number,
  height: number,
  region?: MusicDebugPlaybackRegion | null
): string {
  if (!region) {
    return '';
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
  return `
    <rect
      x="${startX.toFixed(2)}"
      y="${layout.topPad.toFixed(2)}"
      width="${Math.max(0, endX - startX).toFixed(2)}"
      height="${(height - layout.topPad - layout.bottomPad).toFixed(2)}"
      fill="rgba(85,214,190,0.08)"
    ></rect>
  `;
}

function buildMusicDebugTimelinePlayheadSvgMarkup(
  layout: MusicDebugTimelineLayout,
  durationMs: number,
  playheadOffsetMs: number,
  height: number,
  playheadLabel: string | null
): string {
  const playheadX = resolveMusicDebugTimelineXForOffset(
    layout,
    durationMs,
    playheadOffsetMs
  );
  const playheadPath = `<path d="M${playheadX.toFixed(2)} ${layout.topPad.toFixed(
    2
  )} V${(height - layout.bottomPad).toFixed(
    2
  )}" fill="none" stroke="#f5f7fb" stroke-width="2"></path>`;
  if (!playheadLabel) {
    return playheadPath;
  }
  const labelWidth = Math.max(58, playheadLabel.length * 6.2 + 18);
  const labelCenterX = clampMusicDebugTimelineLabelCenterX(
    layout,
    playheadX,
    labelWidth * 0.5
  );
  return `${playheadPath}<rect class="music-debug-timeline-playhead-chord" x="${(
    labelCenterX -
    labelWidth * 0.5
  ).toFixed(2)}" y="${(
    MUSIC_DEBUG_TIMELINE_PLAYHEAD_CHORD_LABEL_Y - 11
  ).toFixed(
    2
  )}" width="${labelWidth.toFixed(2)}" height="16" rx="8" ry="8" fill="#f5f7fb"></rect><text x="${labelCenterX.toFixed(
    2
  )}" y="${MUSIC_DEBUG_TIMELINE_PLAYHEAD_CHORD_LABEL_Y.toFixed(
    2
  )}" fill="#071019" font-family="Trebuchet MS, sans-serif" font-size="11" text-anchor="middle">${playheadLabel}</text>`;
}

function drawMusicDebugTimelinePlayheadChordLabel(
  context: CanvasRenderingContext2D,
  layout: MusicDebugTimelineLayout,
  playheadX: number,
  playheadLabel: string
): void {
  const labelWidth = Math.max(58, playheadLabel.length * 6.2 + 18);
  const labelCenterX = clampMusicDebugTimelineLabelCenterX(
    layout,
    playheadX,
    labelWidth * 0.5
  );
  context.fillStyle = '#f5f7fb';
  context.fillRect(
    labelCenterX - labelWidth * 0.5,
    MUSIC_DEBUG_TIMELINE_PLAYHEAD_CHORD_LABEL_Y - 11,
    labelWidth,
    16
  );
  context.fillStyle = '#071019';
  context.font = '11px Trebuchet MS';
  context.textAlign = 'center';
  context.fillText(
    playheadLabel,
    labelCenterX,
    MUSIC_DEBUG_TIMELINE_PLAYHEAD_CHORD_LABEL_Y
  );
  context.textAlign = 'start';
}

function resolveMusicDebugTimelinePlayheadScaleLabel(
  snapshot: MusicDebugSnapshot
): string {
  return `Scale ${resolveMusicDebugPitchClassLabel(snapshot.scaleMap.rootMidiNote)} ${snapshot.theme.vocabulary.modeLabel}`;
}

function resolveMusicDebugTimelinePlayheadLabel(options: {
  snapshot: MusicDebugSnapshot;
  chordCue?: MusicDebugChordCue | null;
}): string {
  const scaleLabel = resolveMusicDebugTimelinePlayheadScaleLabel(
    options.snapshot
  );
  if (!options.chordCue) {
    return scaleLabel;
  }
  return `${options.chordCue.label} • ${scaleLabel}`;
}

function resolveMusicDebugTimelineChordLabelText(
  cue: MusicDebugChordCue,
  spanWidth: number
): string | null {
  if (spanWidth >= 72) {
    return cue.label;
  }
  if (spanWidth >= 18) {
    return `Ch${cue.degreeIndex + 1} ${resolveMusicDebugTimelineChordQualityShortLabel(
      cue.label
    )}`;
  }
  return null;
}

function resolveMusicDebugTimelineChordQualityShortLabel(
  label: string
): string {
  const quality = label.split(' ').at(-1) ?? label;
  switch (quality) {
    case 'major':
      return 'maj';
    case 'minor':
      return 'min';
    case 'diminished':
      return 'dim';
    case 'augmented':
      return 'aug';
    default:
      return quality;
  }
}

function resolveMusicDebugTimelineChordLabelWidth(label: string): number {
  return Math.max(20, label.length * 6.2);
}

function resolveMusicDebugTimelineHoverLabel(
  note: ProceduralMusicNote
): string {
  if (note.role === 'percussion') {
    return `Percussion ${formatMusicDebugTimelinePercussionVoiceLabel(
      note.instrumentId
    )}`;
  }
  return `${formatMusicDebugDisplayRoleLabel(note.role)} ${resolveMusicDebugTimelineNoteLabel(note)}`;
}

function resolveMusicDebugTimelineNoteLabel(note: ProceduralMusicNote): string {
  const midiNote = Math.round(69 + 12 * Math.log2(note.frequency / 440));
  const pitchClass =
    MUSIC_DEBUG_TIMELINE_PITCH_CLASS_NAMES[mod(midiNote, 12)] ?? 'C';
  const octave = Math.floor(midiNote / 12) - 1;
  return `${pitchClass}${octave}`;
}

function formatMusicDebugTimelinePercussionVoiceLabel(
  instrumentId: string
): string {
  const voiceId = resolvePercussionVoiceIdFromInstrumentId(instrumentId);
  const voiceName = voiceId
    ? resolvePercussionVoiceById(voiceId).name
    : (resolvePercussionFamilyFromInstrumentId(instrumentId) ?? 'percussion');
  return voiceName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMusicDebugTimelinePercussionFamilyLabel(family: string): string {
  return family
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMusicDebugTimelineHoverDuration(durationMs: number): string {
  if (durationMs < 1_000) {
    return `${Math.max(0, Math.round(durationMs))} ms`;
  }
  return `${(durationMs / 1000).toFixed(2)} s`;
}

function escapeMusicDebugTimelineSvgText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const MUSIC_DEBUG_TIMELINE_PITCH_CLASS_NAMES = [
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

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clampMusicDebugTimelineLabelCenterX(
  layout: MusicDebugTimelineLayout,
  centerX: number,
  halfWidth: number
): number {
  return Math.min(
    layout.width - layout.rightPad - halfWidth,
    Math.max(layout.leftPad + halfWidth, centerX)
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

function createPercussionLaneFamilyCounts(
  notes: readonly ProceduralMusicNote[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const note of notes) {
    if (note.role !== 'percussion') {
      continue;
    }
    const family = resolvePercussionFamilyFromInstrumentId(note.instrumentId);
    if (!family) {
      continue;
    }
    counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  return counts;
}

function createPercussionLaneLabelsByKey(
  notes: readonly ProceduralMusicNote[],
  familyCounts: ReadonlyMap<string, number>
): Map<string, string> {
  const labels = new Map<string, string>();

  for (const note of notes) {
    if (note.role !== 'percussion') {
      continue;
    }
    const voiceId = resolvePercussionVoiceIdFromInstrumentId(note.instrumentId);
    const family = resolvePercussionFamilyFromInstrumentId(note.instrumentId);
    const key = voiceId ?? family ?? note.instrumentId;
    if (labels.has(key)) {
      continue;
    }
    const label =
      family && (familyCounts.get(family) ?? 0) <= 1
        ? formatMusicDebugTimelinePercussionFamilyLabel(family)
        : formatMusicDebugTimelinePercussionVoiceLabel(note.instrumentId);
    labels.set(key, label);
  }

  return labels;
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
  return options.trackBottom - (options.trackBottom - options.trackTop) * ratio;
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
