import type { MusicDebugSnapshot } from './music-debug.ts';
import {
  resolveMusicDebugTimelineSeekOffset,
  resolveMusicDebugTimelineTrackLabelRoleAtPoint,
} from './music-debug-timeline.ts';

const MUSIC_DEBUG_TIMELINE_DRAG_SLOP_PX = 4;

export type MusicDebugTimelinePointerDragState = {
  pointerId: number;
  anchorClientX: number;
  anchorClientY: number;
  offsetMs: number;
  dragging: boolean;
};

type MusicDebugTimelinePointerPoint = {
  canvas: Pick<HTMLCanvasElement, 'width' | 'height'>;
  clientX: number;
  clientY: number;
  boundsLeft: number;
  boundsTop: number;
  boundsWidth: number;
  boundsHeight: number;
};

export function startMusicDebugTimelinePointerDrag(
  options: {
    snapshot: MusicDebugSnapshot;
    pointerId: number;
    button: number;
  } & MusicDebugTimelinePointerPoint
): MusicDebugTimelinePointerDragState | null {
  if (options.button !== 0) {
    return null;
  }
  if (resolveMusicDebugTimelineTrackLabelRoleAtPoint(options)) {
    return null;
  }
  return {
    pointerId: options.pointerId,
    anchorClientX: options.clientX,
    anchorClientY: options.clientY,
    offsetMs: resolveMusicDebugTimelineSeekOffset({
      snapshot: options.snapshot,
      canvas: options.canvas,
      clientX: options.clientX,
      boundsLeft: options.boundsLeft,
      boundsWidth: options.boundsWidth,
    }),
    dragging: false,
  };
}

export function updateMusicDebugTimelinePointerDrag(
  state: MusicDebugTimelinePointerDragState,
  options: {
    snapshot: MusicDebugSnapshot;
  } & Pick<
    MusicDebugTimelinePointerPoint,
    'canvas' | 'clientX' | 'clientY' | 'boundsLeft' | 'boundsWidth'
  >
): MusicDebugTimelinePointerDragState {
  const dragging =
    state.dragging ||
    Math.hypot(
      options.clientX - state.anchorClientX,
      options.clientY - state.anchorClientY
    ) >= MUSIC_DEBUG_TIMELINE_DRAG_SLOP_PX;
  return {
    ...state,
    offsetMs: resolveMusicDebugTimelineSeekOffset({
      snapshot: options.snapshot,
      canvas: options.canvas,
      clientX: options.clientX,
      boundsLeft: options.boundsLeft,
      boundsWidth: options.boundsWidth,
    }),
    dragging,
  };
}
