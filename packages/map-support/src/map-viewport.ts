export type MapViewportState = {
  centerMapX: number;
  centerMapY: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
};

export type MapViewportFrame = {
  width: number;
  height: number;
};

export type MapViewportScreenPoint = {
  screenX: number;
  screenY: number;
};

export type MapViewportTouchPoint = MapViewportScreenPoint;

export type MapViewportMapPoint = {
  mapX: number;
  mapY: number;
};

export type MapViewportWorldSelection = {
  worldX: number;
  worldY: number;
};

export const DEFAULT_MAP_VIEWPORT_CENTER_X = 0;
export const DEFAULT_MAP_VIEWPORT_CENTER_Y = 0;
export const DEFAULT_MAP_VIEWPORT_ZOOM = 1;
export const DEFAULT_MAP_VIEWPORT_MIN_ZOOM = 0.25;
export const DEFAULT_MAP_VIEWPORT_MAX_ZOOM = 16;
export const DEFAULT_MAP_VIEWPORT_WHEEL_ZOOM_STEP = 240;
export const DEFAULT_MAP_VIEWPORT_TOUCH_ZOOM_DEADZONE = 1e-6;

export function createMapViewportState(
  options: Partial<MapViewportState> = {}
): MapViewportState {
  const minZoom = normalizePositiveFiniteNumber(
    options.minZoom ?? DEFAULT_MAP_VIEWPORT_MIN_ZOOM,
    'Map viewport minZoom'
  );
  const maxZoom = normalizePositiveFiniteNumber(
    options.maxZoom ?? DEFAULT_MAP_VIEWPORT_MAX_ZOOM,
    'Map viewport maxZoom'
  );
  if (minZoom > maxZoom) {
    throw new Error('Map viewport minZoom must be <= maxZoom.');
  }
  return {
    centerMapX: normalizeFiniteNumber(
      options.centerMapX ?? DEFAULT_MAP_VIEWPORT_CENTER_X,
      'Map viewport centerMapX'
    ),
    centerMapY: normalizeFiniteNumber(
      options.centerMapY ?? DEFAULT_MAP_VIEWPORT_CENTER_Y,
      'Map viewport centerMapY'
    ),
    zoom: clamp(
      normalizePositiveFiniteNumber(
        options.zoom ?? DEFAULT_MAP_VIEWPORT_ZOOM,
        'Map viewport zoom'
      ),
      minZoom,
      maxZoom
    ),
    minZoom,
    maxZoom,
  };
}

export function mapViewportMapToScreenCoordinate(
  viewport: MapViewportState,
  frame: MapViewportFrame,
  coordinate: MapViewportMapPoint
): MapViewportScreenPoint {
  const normalizedViewport = createMapViewportState(viewport);
  const normalizedFrame = normalizeMapViewportFrame(frame);
  const normalizedCoordinate = normalizeMapViewportMapPoint(coordinate);
  const pixelsPerMapUnit = resolveViewportPixelsPerMapUnit(
    normalizedViewport,
    normalizedFrame
  );
  return {
    screenX:
      normalizedFrame.width / 2 +
      (normalizedCoordinate.mapX - normalizedViewport.centerMapX) *
        pixelsPerMapUnit,
    screenY:
      normalizedFrame.height / 2 -
      (normalizedCoordinate.mapY - normalizedViewport.centerMapY) *
        pixelsPerMapUnit,
  };
}

export function mapViewportScreenToMapCoordinate(
  viewport: MapViewportState,
  frame: MapViewportFrame,
  coordinate: MapViewportScreenPoint
): MapViewportMapPoint {
  const normalizedViewport = createMapViewportState(viewport);
  const normalizedFrame = normalizeMapViewportFrame(frame);
  const normalizedCoordinate = normalizeMapViewportScreenPoint(coordinate);
  const pixelsPerMapUnit = resolveViewportPixelsPerMapUnit(
    normalizedViewport,
    normalizedFrame
  );
  return {
    mapX:
      normalizedViewport.centerMapX +
      (normalizedCoordinate.screenX - normalizedFrame.width / 2) /
        pixelsPerMapUnit,
    mapY:
      normalizedViewport.centerMapY -
      (normalizedCoordinate.screenY - normalizedFrame.height / 2) /
        pixelsPerMapUnit,
  };
}

export function panMapViewport(
  viewport: MapViewportState,
  frame: MapViewportFrame,
  delta: {
    deltaScreenX: number;
    deltaScreenY: number;
  }
): MapViewportState {
  const normalizedViewport = createMapViewportState(viewport);
  const normalizedFrame = normalizeMapViewportFrame(frame);
  const pixelsPerMapUnit = resolveViewportPixelsPerMapUnit(
    normalizedViewport,
    normalizedFrame
  );
  return {
    ...normalizedViewport,
    centerMapX:
      normalizedViewport.centerMapX -
      normalizeFiniteNumber(delta.deltaScreenX, 'Map viewport deltaScreenX') /
        pixelsPerMapUnit,
    centerMapY:
      normalizedViewport.centerMapY +
      normalizeFiniteNumber(delta.deltaScreenY, 'Map viewport deltaScreenY') /
        pixelsPerMapUnit,
  };
}

export function zoomMapViewportAtScreenPoint(
  viewport: MapViewportState,
  frame: MapViewportFrame,
  options: MapViewportScreenPoint & {
    deltaY: number;
    wheelZoomStep?: number;
  }
): MapViewportState {
  const normalizedViewport = createMapViewportState(viewport);
  const normalizedFrame = normalizeMapViewportFrame(frame);
  const normalizedCoordinate = normalizeMapViewportScreenPoint(options);
  const wheelZoomStep = normalizePositiveFiniteNumber(
    options.wheelZoomStep ?? DEFAULT_MAP_VIEWPORT_WHEEL_ZOOM_STEP,
    'Map viewport wheelZoomStep'
  );
  const anchorBefore = mapViewportScreenToMapCoordinate(
    normalizedViewport,
    normalizedFrame,
    normalizedCoordinate
  );
  const zoomFactor = 2 ** (-options.deltaY / wheelZoomStep);
  const nextZoom = clamp(
    normalizedViewport.zoom * zoomFactor,
    normalizedViewport.minZoom,
    normalizedViewport.maxZoom
  );
  const zoomedViewport = {
    ...normalizedViewport,
    zoom: nextZoom,
  };
  const anchorAfter = mapViewportScreenToMapCoordinate(
    zoomedViewport,
    normalizedFrame,
    normalizedCoordinate
  );
  return {
    ...zoomedViewport,
    centerMapX:
      zoomedViewport.centerMapX + (anchorBefore.mapX - anchorAfter.mapX),
    centerMapY:
      zoomedViewport.centerMapY + (anchorBefore.mapY - anchorAfter.mapY),
  };
}

export function reprojectMapViewportSelection(options: {
  selection: MapViewportWorldSelection;
  project(selection: MapViewportWorldSelection): MapViewportMapPoint;
}): MapViewportMapPoint {
  return normalizeMapViewportMapPoint(
    options.project(normalizeMapViewportWorldSelection(options.selection))
  );
}

export function gesturePanAndZoomMapViewport(
  viewport: MapViewportState,
  frame: MapViewportFrame,
  gesture: {
    previousTouches: readonly [MapViewportTouchPoint] | readonly [
      MapViewportTouchPoint,
      MapViewportTouchPoint,
    ];
    nextTouches: readonly [MapViewportTouchPoint] | readonly [
      MapViewportTouchPoint,
      MapViewportTouchPoint,
    ];
    touchZoomDeadzone?: number;
  }
): MapViewportState {
  const normalizedViewport = createMapViewportState(viewport);
  const normalizedFrame = normalizeMapViewportFrame(frame);
  const previousTouches = normalizeMapViewportTouchList(
    gesture.previousTouches,
    'Map viewport previousTouches'
  );
  const nextTouches = normalizeMapViewportTouchList(
    gesture.nextTouches,
    'Map viewport nextTouches'
  );
  if (previousTouches.length !== nextTouches.length) {
    throw new Error(
      'Map viewport touch gesture must keep the same touch count between samples.'
    );
  }

  if (previousTouches.length === 1) {
    const previousTouch = previousTouches[0];
    const nextTouch = nextTouches[0];
    if (!previousTouch || !nextTouch) {
      throw new Error('Map viewport single-touch gestures require one touch.');
    }
    return panMapViewport(normalizedViewport, normalizedFrame, {
      deltaScreenX: nextTouch.screenX - previousTouch.screenX,
      deltaScreenY: nextTouch.screenY - previousTouch.screenY,
    });
  }

  const touchZoomDeadzone = normalizePositiveFiniteNumber(
    gesture.touchZoomDeadzone ?? DEFAULT_MAP_VIEWPORT_TOUCH_ZOOM_DEADZONE,
    'Map viewport touchZoomDeadzone'
  );
  const previousMidpoint = resolveTouchMidpoint(previousTouches);
  const nextMidpoint = resolveTouchMidpoint(nextTouches);
  const previousDistance = resolveTouchDistance(previousTouches);
  const nextDistance = resolveTouchDistance(nextTouches);
  const anchorBefore = mapViewportScreenToMapCoordinate(
    normalizedViewport,
    normalizedFrame,
    previousMidpoint
  );
  const zoomFactor =
    previousDistance <= touchZoomDeadzone || nextDistance <= touchZoomDeadzone
      ? 1
      : nextDistance / previousDistance;
  const zoomedViewport = {
    ...normalizedViewport,
    zoom: clamp(
      normalizedViewport.zoom * zoomFactor,
      normalizedViewport.minZoom,
      normalizedViewport.maxZoom
    ),
  };
  const anchorAfter = mapViewportScreenToMapCoordinate(
    zoomedViewport,
    normalizedFrame,
    nextMidpoint
  );
  const deltaCenterX = anchorBefore.mapX - anchorAfter.mapX;
  const deltaCenterY = anchorBefore.mapY - anchorAfter.mapY;
  return {
    ...zoomedViewport,
    centerMapX: zoomedViewport.centerMapX + deltaCenterX,
    centerMapY: zoomedViewport.centerMapY + deltaCenterY,
  };
}

function normalizeMapViewportFrame(frame: MapViewportFrame): MapViewportFrame {
  return {
    width: normalizePositiveFiniteNumber(frame.width, 'Map viewport width'),
    height: normalizePositiveFiniteNumber(frame.height, 'Map viewport height'),
  };
}

function normalizeMapViewportScreenPoint(
  coordinate: MapViewportScreenPoint
): MapViewportScreenPoint {
  return {
    screenX: normalizeFiniteNumber(
      coordinate.screenX,
      'Map viewport screenX'
    ),
    screenY: normalizeFiniteNumber(
      coordinate.screenY,
      'Map viewport screenY'
    ),
  };
}

function normalizeMapViewportMapPoint(
  coordinate: MapViewportMapPoint
): MapViewportMapPoint {
  return {
    mapX: normalizeFiniteNumber(coordinate.mapX, 'Map viewport mapX'),
    mapY: normalizeFiniteNumber(coordinate.mapY, 'Map viewport mapY'),
  };
}

function normalizeMapViewportTouchList(
  touches:
    | readonly [MapViewportTouchPoint]
    | readonly [MapViewportTouchPoint, MapViewportTouchPoint],
  label: string
): MapViewportTouchPoint[] {
  if (touches.length !== 1 && touches.length !== 2) {
    throw new Error(`${label} must contain one or two touches.`);
  }
  return touches.map((touch) => normalizeMapViewportScreenPoint(touch));
}

function normalizeMapViewportWorldSelection(
  selection: MapViewportWorldSelection
): MapViewportWorldSelection {
  return {
    worldX: normalizeFiniteNumber(selection.worldX, 'Map viewport worldX'),
    worldY: normalizeFiniteNumber(selection.worldY, 'Map viewport worldY'),
  };
}

function resolveViewportPixelsPerMapUnit(
  viewport: MapViewportState,
  frame: MapViewportFrame
): number {
  return (Math.min(frame.width, frame.height) / 2) * viewport.zoom;
}

function resolveTouchMidpoint(
  touches: readonly MapViewportTouchPoint[]
): MapViewportScreenPoint {
  if (touches.length === 1) {
    return touches[0];
  }
  const firstTouch = touches[0];
  const secondTouch = touches[1];
  if (!firstTouch || !secondTouch) {
    throw new Error('Map viewport two-touch gestures require two touches.');
  }
  return {
    screenX: (firstTouch.screenX + secondTouch.screenX) / 2,
    screenY: (firstTouch.screenY + secondTouch.screenY) / 2,
  };
}

function resolveTouchDistance(
  touches: readonly MapViewportTouchPoint[]
): number {
  if (touches.length === 1) {
    return 0;
  }
  const firstTouch = touches[0];
  const secondTouch = touches[1];
  if (!firstTouch || !secondTouch) {
    throw new Error('Map viewport two-touch gestures require two touches.');
  }
  return Math.hypot(
    secondTouch.screenX - firstTouch.screenX,
    secondTouch.screenY - firstTouch.screenY
  );
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
