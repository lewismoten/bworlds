import { describe, expect, it } from 'vitest';
import {
  createMapViewport3DState,
  DEFAULT_MAP_VIEWPORT_3D_DISTANCE,
  DEFAULT_MAP_VIEWPORT_3D_MAX_DISTANCE,
  DEFAULT_MAP_VIEWPORT_3D_MAX_PITCH_RADIANS,
  DEFAULT_MAP_VIEWPORT_3D_MIN_DISTANCE,
  DEFAULT_MAP_VIEWPORT_3D_MIN_PITCH_RADIANS,
  DEFAULT_MAP_VIEWPORT_3D_PITCH_RADIANS,
  DEFAULT_MAP_VIEWPORT_3D_TARGET_X,
  DEFAULT_MAP_VIEWPORT_3D_TARGET_Y,
  DEFAULT_MAP_VIEWPORT_3D_TARGET_Z,
  DEFAULT_MAP_VIEWPORT_3D_WHEEL_ZOOM_STEP,
  DEFAULT_MAP_VIEWPORT_3D_YAW_RADIANS,
  panMapViewport3D,
  resolveMapViewport3DCameraPosition,
  rotateMapViewport3D,
  zoomMapViewport3D,
} from './map-viewport-3d.ts';

describe('map viewport 3d', () => {
  it('creates normalized 3d viewport state with bounded pitch and distance', () => {
    expect(createMapViewport3DState()).toEqual({
      targetX: DEFAULT_MAP_VIEWPORT_3D_TARGET_X,
      targetY: DEFAULT_MAP_VIEWPORT_3D_TARGET_Y,
      targetZ: DEFAULT_MAP_VIEWPORT_3D_TARGET_Z,
      yawRadians: DEFAULT_MAP_VIEWPORT_3D_YAW_RADIANS,
      pitchRadians: DEFAULT_MAP_VIEWPORT_3D_PITCH_RADIANS,
      distance: DEFAULT_MAP_VIEWPORT_3D_DISTANCE,
      minDistance: DEFAULT_MAP_VIEWPORT_3D_MIN_DISTANCE,
      maxDistance: DEFAULT_MAP_VIEWPORT_3D_MAX_DISTANCE,
      minPitchRadians: DEFAULT_MAP_VIEWPORT_3D_MIN_PITCH_RADIANS,
      maxPitchRadians: DEFAULT_MAP_VIEWPORT_3D_MAX_PITCH_RADIANS,
    });

    expect(
      createMapViewport3DState({
        distance: 999,
        minDistance: 2,
        maxDistance: 8,
        pitchRadians: Math.PI,
      })
    ).toMatchObject({
      distance: 8,
      minDistance: 2,
      maxDistance: 8,
      pitchRadians: DEFAULT_MAP_VIEWPORT_3D_MAX_PITCH_RADIANS,
    });
  });

  it('rotates yaw and pitch from mouse deltas while clamping pitch', () => {
    const viewport = createMapViewport3DState();
    const frame = { width: 800, height: 600 };
    const rotated = rotateMapViewport3D(viewport, frame, {
      deltaScreenX: 200,
      deltaScreenY: -150,
    });

    expect(rotated.yawRadians).toBeCloseTo(Math.PI / 4, 10);
    expect(rotated.pitchRadians).toBeCloseTo(
      DEFAULT_MAP_VIEWPORT_3D_PITCH_RADIANS + Math.PI / 4,
      10
    );
  });

  it('pans the 3d target along camera right and up axes', () => {
    const viewport = createMapViewport3DState({
      yawRadians: 0,
      pitchRadians: 0,
      distance: 10,
    });
    const frame = { width: 800, height: 600 };
    const panned = panMapViewport3D(viewport, frame, {
      deltaScreenX: 400,
      deltaScreenY: -300,
    });

    expect(panned.targetX).toBeCloseTo(10, 10);
    expect(panned.targetY).toBeCloseTo(-10, 10);
    expect(panned.targetZ).toBeCloseTo(0, 10);
  });

  it('zooms the 3d camera distance with clamping', () => {
    const viewport = createMapViewport3DState();
    const zoomedIn = zoomMapViewport3D(viewport, {
      deltaY: -DEFAULT_MAP_VIEWPORT_3D_WHEEL_ZOOM_STEP,
    });
    const zoomedOut = zoomMapViewport3D(viewport, {
      deltaY: DEFAULT_MAP_VIEWPORT_3D_WHEEL_ZOOM_STEP,
    });

    expect(zoomedIn.distance).toBe(3);
    expect(zoomedOut.distance).toBe(12);
  });

  it('resolves a camera position from orbit target, yaw, pitch, and distance', () => {
    const camera = resolveMapViewport3DCameraPosition(
      createMapViewport3DState({
        targetX: 1,
        targetY: 2,
        targetZ: 3,
        yawRadians: 0,
        pitchRadians: 0,
        distance: 5,
      })
    );

    expect(camera).toEqual({
      x: 1,
      y: 2,
      z: -2,
    });
  });
});
