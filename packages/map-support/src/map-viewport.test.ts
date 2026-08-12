import { describe, expect, it } from 'vitest';
import {
  createMapViewportState,
  DEFAULT_MAP_VIEWPORT_CENTER_X,
  DEFAULT_MAP_VIEWPORT_CENTER_Y,
  DEFAULT_MAP_VIEWPORT_MAX_ZOOM,
  DEFAULT_MAP_VIEWPORT_MIN_ZOOM,
  DEFAULT_MAP_VIEWPORT_TOUCH_ZOOM_DEADZONE,
  DEFAULT_MAP_VIEWPORT_WHEEL_ZOOM_STEP,
  DEFAULT_MAP_VIEWPORT_ZOOM,
  gesturePanAndZoomMapViewport,
  mapViewportMapToScreenCoordinate,
  mapViewportScreenToMapCoordinate,
  panMapViewport,
  reprojectMapViewportSelection,
  zoomMapViewportAtScreenPoint,
} from './map-viewport.ts';

describe('map viewport', () => {
  it('creates normalized viewport state with bounded zoom', () => {
    expect(createMapViewportState()).toEqual({
      centerMapX: DEFAULT_MAP_VIEWPORT_CENTER_X,
      centerMapY: DEFAULT_MAP_VIEWPORT_CENTER_Y,
      zoom: DEFAULT_MAP_VIEWPORT_ZOOM,
      minZoom: DEFAULT_MAP_VIEWPORT_MIN_ZOOM,
      maxZoom: DEFAULT_MAP_VIEWPORT_MAX_ZOOM,
    });

    expect(
      createMapViewportState({
        zoom: 99,
        minZoom: 0.5,
        maxZoom: 4,
      })
    ).toMatchObject({
      zoom: 4,
      minZoom: 0.5,
      maxZoom: 4,
    });
  });

  it('maps coordinates between map space and screen space with one shared viewport transform', () => {
    const viewport = createMapViewportState({
      centerMapX: 0.25,
      centerMapY: -0.5,
      zoom: 2,
    });
    const frame = { width: 800, height: 600 };

    const screen = mapViewportMapToScreenCoordinate(viewport, frame, {
      mapX: 0.75,
      mapY: 0,
    });

    expect(screen).toEqual({
      screenX: 700,
      screenY: 0,
    });
    expect(mapViewportScreenToMapCoordinate(viewport, frame, screen)).toEqual({
      mapX: 0.75,
      mapY: 0,
    });
  });

  it('pans a viewport by translating center map coordinates against mouse deltas', () => {
    const viewport = createMapViewportState();
    const frame = { width: 800, height: 600 };

    expect(
      panMapViewport(viewport, frame, {
        deltaScreenX: 150,
        deltaScreenY: -75,
      })
    ).toEqual({
      centerMapX: -0.5,
      centerMapY: -0.25,
      zoom: 1,
      minZoom: DEFAULT_MAP_VIEWPORT_MIN_ZOOM,
      maxZoom: DEFAULT_MAP_VIEWPORT_MAX_ZOOM,
    });
  });

  it('zooms around the hovered screen point without moving its underlying map coordinate', () => {
    const viewport = createMapViewportState();
    const frame = { width: 800, height: 600 };
    const screenPoint = {
      screenX: 550,
      screenY: 225,
    };
    const anchorBefore = mapViewportScreenToMapCoordinate(
      viewport,
      frame,
      screenPoint
    );

    const zoomed = zoomMapViewportAtScreenPoint(viewport, frame, {
      ...screenPoint,
      deltaY: -DEFAULT_MAP_VIEWPORT_WHEEL_ZOOM_STEP,
    });
    const anchorAfter = mapViewportScreenToMapCoordinate(
      zoomed,
      frame,
      screenPoint
    );

    expect(zoomed.zoom).toBe(2);
    expect(anchorAfter).toEqual(anchorBefore);
  });

  it('supports one-finger touch pan using the same center translation rules as mouse drag', () => {
    const viewport = createMapViewportState();
    const frame = { width: 800, height: 600 };

    expect(
      gesturePanAndZoomMapViewport(viewport, frame, {
        previousTouches: [{ screenX: 200, screenY: 250 }],
        nextTouches: [{ screenX: 350, screenY: 175 }],
      })
    ).toEqual({
      centerMapX: -0.5,
      centerMapY: -0.25,
      zoom: 1,
      minZoom: DEFAULT_MAP_VIEWPORT_MIN_ZOOM,
      maxZoom: DEFAULT_MAP_VIEWPORT_MAX_ZOOM,
    });
  });

  it('supports two-finger pinch zoom around the touch midpoint without moving its map anchor', () => {
    const viewport = createMapViewportState();
    const frame = { width: 800, height: 600 };
    const nextMidpoint = {
      screenX: 400,
      screenY: 300,
    };
    const anchorBefore = mapViewportScreenToMapCoordinate(
      viewport,
      frame,
      nextMidpoint
    );

    const zoomed = gesturePanAndZoomMapViewport(viewport, frame, {
      previousTouches: [
        { screenX: 350, screenY: 300 },
        { screenX: 450, screenY: 300 },
      ],
      nextTouches: [
        { screenX: 300, screenY: 300 },
        { screenX: 500, screenY: 300 },
      ],
      touchZoomDeadzone: DEFAULT_MAP_VIEWPORT_TOUCH_ZOOM_DEADZONE,
    });
    const anchorAfter = mapViewportScreenToMapCoordinate(
      zoomed,
      frame,
      nextMidpoint
    );

    expect(zoomed.zoom).toBe(2);
    expect(anchorAfter).toEqual(anchorBefore);
  });

  it('supports two-finger midpoint motion while pinching so the touched map location stays under the gesture center', () => {
    const viewport = createMapViewportState();
    const frame = { width: 800, height: 600 };
    const previousMidpoint = { screenX: 300, screenY: 250 };
    const nextMidpoint = { screenX: 450, screenY: 350 };
    const anchorBefore = mapViewportScreenToMapCoordinate(
      viewport,
      frame,
      previousMidpoint
    );

    const nextViewport = gesturePanAndZoomMapViewport(viewport, frame, {
      previousTouches: [
        { screenX: 250, screenY: 250 },
        { screenX: 350, screenY: 250 },
      ],
      nextTouches: [
        { screenX: 350, screenY: 350 },
        { screenX: 550, screenY: 350 },
      ],
    });
    const anchorAfter = mapViewportScreenToMapCoordinate(
      nextViewport,
      frame,
      nextMidpoint
    );

    expect(nextViewport.zoom).toBe(2);
    expect(anchorAfter.mapX).toBeCloseTo(anchorBefore.mapX, 10);
    expect(anchorAfter.mapY).toBeCloseTo(anchorBefore.mapY, 10);
  });

  it('reprojects a selected world coordinate through a new projection callback', () => {
    expect(
      reprojectMapViewportSelection({
        selection: {
          worldX: 30,
          worldY: 15,
        },
        project({ worldX, worldY }) {
          return {
            mapX: worldX / 180,
            mapY: worldY / 90,
          };
        },
      })
    ).toEqual({
      mapX: 1 / 6,
      mapY: 1 / 6,
    });
  });
});
