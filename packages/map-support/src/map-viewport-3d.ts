export type MapViewport3DState = {
  targetX: number;
  targetY: number;
  targetZ: number;
  yawRadians: number;
  pitchRadians: number;
  distance: number;
  minDistance: number;
  maxDistance: number;
  minPitchRadians: number;
  maxPitchRadians: number;
};

export type MapViewport3DFrame = {
  width: number;
  height: number;
};

export type MapViewport3DVector = {
  x: number;
  y: number;
  z: number;
};

export const DEFAULT_MAP_VIEWPORT_3D_TARGET_X = 0;
export const DEFAULT_MAP_VIEWPORT_3D_TARGET_Y = 0;
export const DEFAULT_MAP_VIEWPORT_3D_TARGET_Z = 0;
export const DEFAULT_MAP_VIEWPORT_3D_YAW_RADIANS = 0;
export const DEFAULT_MAP_VIEWPORT_3D_PITCH_RADIANS = Math.PI / 6;
export const DEFAULT_MAP_VIEWPORT_3D_DISTANCE = 6;
export const DEFAULT_MAP_VIEWPORT_3D_MIN_DISTANCE = 1;
export const DEFAULT_MAP_VIEWPORT_3D_MAX_DISTANCE = 64;
export const DEFAULT_MAP_VIEWPORT_3D_MIN_PITCH_RADIANS =
  -Math.PI / 2 + 0.01;
export const DEFAULT_MAP_VIEWPORT_3D_MAX_PITCH_RADIANS =
  Math.PI / 2 - 0.01;
export const DEFAULT_MAP_VIEWPORT_3D_ROTATE_RADIANS_PER_SCREEN = Math.PI;
export const DEFAULT_MAP_VIEWPORT_3D_PAN_WORLD_UNITS_PER_SCREEN = 2;
export const DEFAULT_MAP_VIEWPORT_3D_WHEEL_ZOOM_STEP = 240;

export function createMapViewport3DState(
  options: Partial<MapViewport3DState> = {}
): MapViewport3DState {
  const minDistance = normalizePositiveFiniteNumber(
    options.minDistance ?? DEFAULT_MAP_VIEWPORT_3D_MIN_DISTANCE,
    'Map viewport 3D minDistance'
  );
  const maxDistance = normalizePositiveFiniteNumber(
    options.maxDistance ?? DEFAULT_MAP_VIEWPORT_3D_MAX_DISTANCE,
    'Map viewport 3D maxDistance'
  );
  if (minDistance > maxDistance) {
    throw new Error('Map viewport 3D minDistance must be <= maxDistance.');
  }
  const minPitchRadians = normalizeFiniteNumber(
    options.minPitchRadians ?? DEFAULT_MAP_VIEWPORT_3D_MIN_PITCH_RADIANS,
    'Map viewport 3D minPitchRadians'
  );
  const maxPitchRadians = normalizeFiniteNumber(
    options.maxPitchRadians ?? DEFAULT_MAP_VIEWPORT_3D_MAX_PITCH_RADIANS,
    'Map viewport 3D maxPitchRadians'
  );
  if (minPitchRadians > maxPitchRadians) {
    throw new Error(
      'Map viewport 3D minPitchRadians must be <= maxPitchRadians.'
    );
  }
  return {
    targetX: normalizeFiniteNumber(
      options.targetX ?? DEFAULT_MAP_VIEWPORT_3D_TARGET_X,
      'Map viewport 3D targetX'
    ),
    targetY: normalizeFiniteNumber(
      options.targetY ?? DEFAULT_MAP_VIEWPORT_3D_TARGET_Y,
      'Map viewport 3D targetY'
    ),
    targetZ: normalizeFiniteNumber(
      options.targetZ ?? DEFAULT_MAP_VIEWPORT_3D_TARGET_Z,
      'Map viewport 3D targetZ'
    ),
    yawRadians: normalizeFiniteNumber(
      options.yawRadians ?? DEFAULT_MAP_VIEWPORT_3D_YAW_RADIANS,
      'Map viewport 3D yawRadians'
    ),
    pitchRadians: clamp(
      normalizeFiniteNumber(
        options.pitchRadians ?? DEFAULT_MAP_VIEWPORT_3D_PITCH_RADIANS,
        'Map viewport 3D pitchRadians'
      ),
      minPitchRadians,
      maxPitchRadians
    ),
    distance: clamp(
      normalizePositiveFiniteNumber(
        options.distance ?? DEFAULT_MAP_VIEWPORT_3D_DISTANCE,
        'Map viewport 3D distance'
      ),
      minDistance,
      maxDistance
    ),
    minDistance,
    maxDistance,
    minPitchRadians,
    maxPitchRadians,
  };
}

export function rotateMapViewport3D(
  viewport: MapViewport3DState,
  frame: MapViewport3DFrame,
  delta: {
    deltaScreenX: number;
    deltaScreenY: number;
    rotateRadiansPerScreen?: number;
  }
): MapViewport3DState {
  const normalizedViewport = createMapViewport3DState(viewport);
  const normalizedFrame = normalizeMapViewport3DFrame(frame);
  const rotateRadiansPerScreen = normalizePositiveFiniteNumber(
    delta.rotateRadiansPerScreen ??
      DEFAULT_MAP_VIEWPORT_3D_ROTATE_RADIANS_PER_SCREEN,
    'Map viewport 3D rotateRadiansPerScreen'
  );
  return {
    ...normalizedViewport,
    yawRadians:
      normalizedViewport.yawRadians +
      (normalizeFiniteNumber(
        delta.deltaScreenX,
        'Map viewport 3D deltaScreenX'
      ) /
        normalizedFrame.width) *
        rotateRadiansPerScreen,
    pitchRadians: clamp(
      normalizedViewport.pitchRadians -
        (normalizeFiniteNumber(
          delta.deltaScreenY,
          'Map viewport 3D deltaScreenY'
        ) /
          normalizedFrame.height) *
          rotateRadiansPerScreen,
      normalizedViewport.minPitchRadians,
      normalizedViewport.maxPitchRadians
    ),
  };
}

export function panMapViewport3D(
  viewport: MapViewport3DState,
  frame: MapViewport3DFrame,
  delta: {
    deltaScreenX: number;
    deltaScreenY: number;
    panWorldUnitsPerScreen?: number;
  }
): MapViewport3DState {
  const normalizedViewport = createMapViewport3DState(viewport);
  const normalizedFrame = normalizeMapViewport3DFrame(frame);
  const panWorldUnitsPerScreen = normalizePositiveFiniteNumber(
    delta.panWorldUnitsPerScreen ??
      DEFAULT_MAP_VIEWPORT_3D_PAN_WORLD_UNITS_PER_SCREEN,
    'Map viewport 3D panWorldUnitsPerScreen'
  );
  const distanceScale = normalizedViewport.distance * panWorldUnitsPerScreen;
  const normalizedDeltaX =
    normalizeFiniteNumber(delta.deltaScreenX, 'Map viewport 3D deltaScreenX') /
    normalizedFrame.width;
  const normalizedDeltaY =
    normalizeFiniteNumber(delta.deltaScreenY, 'Map viewport 3D deltaScreenY') /
    normalizedFrame.height;
  const orbit = resolveOrbitAxes(normalizedViewport);
  return {
    ...normalizedViewport,
    targetX:
      normalizedViewport.targetX -
      orbit.right.x * normalizedDeltaX * distanceScale +
      orbit.up.x * normalizedDeltaY * distanceScale,
    targetY:
      normalizedViewport.targetY -
      orbit.right.y * normalizedDeltaX * distanceScale +
      orbit.up.y * normalizedDeltaY * distanceScale,
    targetZ:
      normalizedViewport.targetZ -
      orbit.right.z * normalizedDeltaX * distanceScale +
      orbit.up.z * normalizedDeltaY * distanceScale,
  };
}

export function zoomMapViewport3D(
  viewport: MapViewport3DState,
  options: {
    deltaY: number;
    wheelZoomStep?: number;
  }
): MapViewport3DState {
  const normalizedViewport = createMapViewport3DState(viewport);
  const wheelZoomStep = normalizePositiveFiniteNumber(
    options.wheelZoomStep ?? DEFAULT_MAP_VIEWPORT_3D_WHEEL_ZOOM_STEP,
    'Map viewport 3D wheelZoomStep'
  );
  const zoomFactor =
    2 ** (-normalizeFiniteNumber(options.deltaY, 'Map viewport 3D deltaY') /
      wheelZoomStep);
  return {
    ...normalizedViewport,
    distance: clamp(
      normalizedViewport.distance / zoomFactor,
      normalizedViewport.minDistance,
      normalizedViewport.maxDistance
    ),
  };
}

export function resolveMapViewport3DCameraPosition(
  viewport: MapViewport3DState
): MapViewport3DVector {
  const normalizedViewport = createMapViewport3DState(viewport);
  const orbit = resolveOrbitAxes(normalizedViewport);
  return {
    x: normalizedViewport.targetX - orbit.forward.x * normalizedViewport.distance,
    y: normalizedViewport.targetY - orbit.forward.y * normalizedViewport.distance,
    z: normalizedViewport.targetZ - orbit.forward.z * normalizedViewport.distance,
  };
}

function normalizeMapViewport3DFrame(frame: MapViewport3DFrame): MapViewport3DFrame {
  return {
    width: normalizePositiveFiniteNumber(frame.width, 'Map viewport 3D width'),
    height: normalizePositiveFiniteNumber(
      frame.height,
      'Map viewport 3D height'
    ),
  };
}

function resolveOrbitAxes(viewport: MapViewport3DState): {
  forward: MapViewport3DVector;
  right: MapViewport3DVector;
  up: MapViewport3DVector;
} {
  const cosPitch = Math.cos(viewport.pitchRadians);
  const sinPitch = Math.sin(viewport.pitchRadians);
  const cosYaw = Math.cos(viewport.yawRadians);
  const sinYaw = Math.sin(viewport.yawRadians);
  const forward = normalizeVector({
    x: cosPitch * sinYaw,
    y: sinPitch,
    z: cosPitch * cosYaw,
  });
  const worldUp = { x: 0, y: 1, z: 0 };
  const right = normalizeVector(crossProduct(forward, worldUp));
  const up = normalizeVector(crossProduct(right, forward));
  return {
    forward,
    right,
    up,
  };
}

function crossProduct(
  left: MapViewport3DVector,
  right: MapViewport3DVector
): MapViewport3DVector {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}

function normalizeVector(vector: MapViewport3DVector): MapViewport3DVector {
  const magnitude = Math.hypot(vector.x, vector.y, vector.z);
  if (magnitude <= 1e-12) {
    return { x: 0, y: 0, z: 0 };
  }
  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
    z: vector.z / magnitude,
  };
}

function normalizeFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}

function normalizePositiveFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
