import { describe, expect, it } from 'vitest';
import { getDaylightCycleState } from '@bworlds/core';
import {
  getSolarSystemBodyPositions,
  getSolarSystemEventMarkerStates,
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
});
