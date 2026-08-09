import { describe, expect, it } from 'vitest';
import { getDaylightCycleState } from '@bworlds/core';
import {
  getBackgroundStarStates,
  getSolarSystemBodyRenderState,
  getSolarSystemRenderSignature,
  getSolarSystemBodyPositions,
  getSolarSystemEventMarkerStates,
  getSolarSystemEventRenderState,
  getSolarSystemSceneSignatures,
} from './solar-system-preview.ts';

type SolarSystemSceneCycleLike = Parameters<typeof getSolarSystemSceneSignatures>[0];
type SolarSystemEventCycleLike = Parameters<typeof getSolarSystemEventMarkerStates>[0];

function cloneSolarSystemCycle(
  cycle: SolarSystemSceneCycleLike,
  overrides: Partial<SolarSystemSceneCycleLike>
): SolarSystemSceneCycleLike {
  return {
    ...cycle,
    ...overrides,
  };
}

function asSolarSystemEventCycle(cycle: SolarSystemSceneCycleLike): SolarSystemEventCycleLike {
  return cycle;
}

describe('solar system preview helpers', () => {
  it('maps orrery bodies into stable preview positions', () => {
    const cycle = getDaylightCycleState(210000, {
      observerLatitudeDegrees: 24,
    });
    const positions = getSolarSystemBodyPositions(cycle.orreryBodies);

    expect(positions[0]).toEqual(
      expect.objectContaining({
        id: 'sun',
      })
    );
    expect(positions.find((entry) => entry.id === 'sun')?.position.length()).toBeCloseTo(0, 6);
    expect(
      positions.some(
        (entry) => entry.id.startsWith('planet:') && entry.position.length() > 0.5
      )
    ).toBe(true);
  });

  it('derives reusable marker, glow, and trail states for solar-system bodies', () => {
    const cycle = {
      ...getDaylightCycleState(210000, {
        observerLatitudeDegrees: 24,
      }),
      orreryBodies: [
        {
          id: 'sun',
          type: 'sun' as const,
          angle: 0,
          orbitRadius: 0,
          orbitTilt: 0,
          orbitHeight: 0,
          orbitEccentricity: 0,
          orbitRotation: 0,
          color: '#ffd48a',
          size: 0.8,
          trailLength: 0,
        },
        {
          id: 'comet:guest',
          type: 'comet' as const,
          angle: 0.35,
          orbitRadius: 8,
          orbitTilt: 0.2,
          orbitHeight: 0.1,
          orbitEccentricity: 0.18,
          orbitRotation: 0.4,
          color: '#dff6ff',
          size: 0.42,
          trailLength: 2.8,
        },
      ],
    };

    const state = getSolarSystemBodyRenderState(cycle);

    expect(state.markers).toHaveLength(2);
    expect(state.glows).toHaveLength(1);
    expect(state.trails).toHaveLength(1);
    expect(state.sunLightPosition).toEqual(state.markers[0]?.position);
    expect(state.markers[1]).toEqual(
      expect.objectContaining({
        color: expect.any(String),
        opacity: expect.any(Number),
        scale: expect.any(Number),
        visible: true,
      })
    );
    expect(state.trails[0]).toEqual(
      expect.objectContaining({
        start: expect.any(Object),
        end: expect.any(Object),
        color: expect.any(String),
        opacity: expect.any(Number),
        visible: true,
      })
    );
  });

  it('maps active aurora, meteor, and comet events into shell markers', () => {
    const cycle = {
      ...getDaylightCycleState(210000, {
        observerLatitudeDegrees: 24,
      }),
      auroraBands: [
        {
          id: 'aurora-test',
          azimuthCenter: 0.4,
          span: 0.8,
          altitude: 0.24,
          height: 0.18,
          intensity: 0.8,
          wavePhase: 0.2,
          colorA: '#7effbc',
          colorB: '#46d8ff',
        },
      ],
      visibleEvents: [
        {
          type: 'meteor-shower' as const,
          name: 'Burst',
          progress: 0.2,
          intensity: 0.8,
          visibility: 0.9,
          azimuth: -0.5,
          altitude: 0.3,
          color: '#dff4ff',
          size: 0.3,
          trailLength: 2.4,
        },
        {
          type: 'comet' as const,
          name: 'Guest',
          progress: 0.5,
          intensity: 0.7,
          visibility: 0.85,
          azimuth: 1.1,
          altitude: 0.22,
          color: '#dff6ff',
          size: 0.48,
          trailLength: 2.8,
        },
      ],
    };

    const markers = getSolarSystemEventMarkerStates(asSolarSystemEventCycle(cycle));

    expect(markers.map((marker) => marker.type)).toEqual([
      'aurora',
      'meteor-shower',
      'comet',
    ]);
    expect(markers.every((marker) => marker.position.length() > 14)).toBe(true);
    expect(markers.every((marker) => marker.intensity > 0.5)).toBe(true);
  });

  it('derives reusable glow and trail states for solar-system events', () => {
    const cycle = {
      ...getDaylightCycleState(210000, {
        observerLatitudeDegrees: 24,
      }),
      auroraBands: [
        {
          id: 'aurora-test',
          azimuthCenter: 0.4,
          span: 0.8,
          altitude: 0.24,
          height: 0.18,
          intensity: 0.8,
          wavePhase: 0.2,
          colorA: '#7effbc',
          colorB: '#46d8ff',
        },
      ],
      visibleEvents: [
        {
          type: 'meteor-shower' as const,
          name: 'Burst',
          progress: 0.2,
          intensity: 0.8,
          visibility: 0.9,
          azimuth: -0.5,
          altitude: 0.3,
          color: '#dff4ff',
          size: 0.3,
          trailLength: 2.4,
        },
        {
          type: 'comet' as const,
          name: 'Guest',
          progress: 0.5,
          intensity: 0.7,
          visibility: 0.85,
          azimuth: 1.1,
          altitude: 0.22,
          color: '#dff6ff',
          size: 0.48,
          trailLength: 2.8,
        },
      ],
    };

    const state = getSolarSystemEventRenderState(asSolarSystemEventCycle(cycle));

    expect(state.glows).toHaveLength(3);
    expect(state.trails.length).toBeGreaterThanOrEqual(4);
    expect(state.glows[0]).toEqual(
      expect.objectContaining({
        color: expect.any(String),
        opacity: expect.any(Number),
        scale: expect.any(Number),
        visible: expect.any(Boolean),
      })
    );
    expect(state.trails[0]).toEqual(
      expect.objectContaining({
        start: expect.any(Object),
        end: expect.any(Object),
        color: expect.any(String),
        opacity: expect.any(Number),
        visible: expect.any(Boolean),
      })
    );
  });

  it('uses coarse solar-system signatures so tiny movement does not thrash geometry rebuilds', () => {
    const cycle = getDaylightCycleState(210000, {
      observerLatitudeDegrees: 24,
    });
    const nearCycle = cloneSolarSystemCycle(cycle, {
      ...cycle,
      starsOpacity: Math.min(1, cycle.starsOpacity + 0.004),
      orreryBodies: cycle.orreryBodies.map((body) => ({
        ...body,
        angle: body.angle + 0.0004,
      })),
    });
    const farCycle = cloneSolarSystemCycle(cycle, {
      ...cycle,
      orreryBodies: cycle.orreryBodies.map((body, index) =>
        index === 0 ? { ...body, angle: body.angle + 0.08 } : body
      ),
    });

    expect(getSolarSystemSceneSignatures(nearCycle)).toEqual(
      getSolarSystemSceneSignatures(cycle)
    );
    expect(getSolarSystemSceneSignatures(farCycle).bodies).not.toBe(
      getSolarSystemSceneSignatures(cycle).bodies
    );
  });

  it('builds stable background star states from a fixed reusable pool', () => {
    const cycle = getDaylightCycleState(210000, {
      observerLatitudeDegrees: 24,
    });
    const dimmerCycle = cloneSolarSystemCycle(cycle, {
      ...cycle,
      starsOpacity: Math.max(0, cycle.starsOpacity - 0.25),
    });
    const brighterCycle = cloneSolarSystemCycle(cycle, {
      ...cycle,
      yearProgress: cycle.yearProgress + 0.15,
      starsOpacity: Math.min(1, cycle.starsOpacity + 0.25),
    });

    const dimmerStars = getBackgroundStarStates(dimmerCycle);
    const stars = getBackgroundStarStates(cycle);
    const brighterStars = getBackgroundStarStates(brighterCycle);

    expect(stars).toHaveLength(56);
    expect(stars[0]).toEqual(
      expect.objectContaining({
        color: '#fff2ca',
        radius: 0.04,
      })
    );
    expect(stars[1]).toEqual(
      expect.objectContaining({
        color: '#d8e9ff',
        radius: 0.06,
      })
    );
    expect(brighterStars[0]?.opacity).toBeGreaterThan(dimmerStars[0]?.opacity ?? 0);
    expect(brighterStars[0]?.x).not.toBeCloseTo(stars[0]?.x ?? 0, 6);
    expect(brighterStars[0]?.z).not.toBeCloseTo(stars[0]?.z ?? 0, 6);
  });

  it('reuses the same render signature until the scene or camera meaningfully changes', () => {
    const cycle = getDaylightCycleState(210000, {
      observerLatitudeDegrees: 24,
    });
    const nearCycle = cloneSolarSystemCycle(cycle, {
      ...cycle,
      starsOpacity: Math.min(1, cycle.starsOpacity + 0.004),
    });
    const farCycle = cloneSolarSystemCycle(cycle, {
      ...cycle,
      orreryBodies: cycle.orreryBodies.map((body, index) =>
        index === 1 ? { ...body, angle: body.angle + 0.09 } : body
      ),
    });

    expect(getSolarSystemRenderSignature(nearCycle, 0.1, -0.2)).toBe(
      getSolarSystemRenderSignature(cycle, 0.1, -0.2)
    );
    expect(getSolarSystemRenderSignature(farCycle, 0.1, -0.2)).not.toBe(
      getSolarSystemRenderSignature(cycle, 0.1, -0.2)
    );
    expect(getSolarSystemRenderSignature(cycle, 0.4, -0.2)).not.toBe(
      getSolarSystemRenderSignature(cycle, 0.1, -0.2)
    );
  });
});
