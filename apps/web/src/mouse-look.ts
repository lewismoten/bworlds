import { normalizeAngle } from '@bworlds/core';
import { clampCameraPitch } from '@bworlds/render3d';

const DEFAULT_MOUSE_LOOK_SENSITIVITY = 0.006;

export type MouseLookDragStart = {
  pointerX: number;
  pointerY: number;
  facing: number;
  pitch: number;
};

export function getMouseLookAngles(
  dragStart: MouseLookDragStart,
  pointerX: number,
  pointerY: number,
  sensitivity = DEFAULT_MOUSE_LOOK_SENSITIVITY
): { facing: number; pitch: number } {
  const deltaX = pointerX - dragStart.pointerX;
  const deltaY = pointerY - dragStart.pointerY;
  return {
    facing: normalizeAngle(dragStart.facing + deltaX * sensitivity),
    pitch: clampCameraPitch(dragStart.pitch + deltaY * sensitivity),
  };
}
