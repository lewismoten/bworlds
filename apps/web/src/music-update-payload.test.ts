import { describe, expect, it } from 'vitest';
import { createMusicUpdatePayloadBuilder } from './music-update-payload.ts';

describe('music update payload builder', () => {
  it('reuses the same payload and nested coordinate objects across frames', () => {
    const buildPayload = createMusicUpdatePayloadBuilder();

    const first = buildPayload({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      weatherKind: 'fog',
      weatherIntensity: 0.3,
      combatIntensity: 0.25,
      dayProgress: 0.5,
      yearProgress: 0.05,
      clusterX: 1,
      clusterY: -2,
      emitterX: 18,
      emitterY: -18,
      listenerX: 12.5,
      listenerY: -6.25,
      nearbyPoi: {
        tileKind: 'town',
        poiType: 'town',
        contextType: 'town',
        mix: 0.75,
        clusterX: 0,
        clusterY: 0,
        emitter: { x: 4, y: 6 },
      },
    });
    const second = buildPayload({
      nowMs: 16,
      tileKind: 'forest',
      contextType: 'overworld',
      weatherKind: 'light-rain',
      weatherIntensity: 0.6,
      combatIntensity: 0.75,
      dayProgress: 0.52,
      yearProgress: 0.55,
      clusterX: 2,
      clusterY: -1,
      emitterX: 30,
      emitterY: -6,
      listenerX: 13.5,
      listenerY: -5.25,
      nearbyPoi: {
        tileKind: 'cave-floor',
        poiType: 'cave',
        contextType: 'cave',
        mix: 0.5,
        clusterX: 1,
        clusterY: 1,
        emitter: { x: 9, y: 3 },
      },
    });

    expect(second).toBe(first);
    expect(second.emitter).toBe(first.emitter);
    expect(second.listener).toBe(first.listener);
    expect(second.nearbyPoi).toBe(first.nearbyPoi);
    expect(second.tileKind).toBe('forest');
    expect(second.clusterX).toBe(2);
    expect(second.yearProgress).toBe(0.55);
    expect(second.combatIntensity).toBe(0.75);
    expect(second.emitter).toEqual({ x: 30, y: -6 });
    expect(second.listener).toEqual({ x: 13.5, y: -5.25 });
    expect(second.nearbyPoi).toEqual(
      expect.objectContaining({
        tileKind: 'cave-floor',
        poiType: 'cave',
        contextType: 'cave',
        mix: 0.5,
        clusterX: 1,
        clusterY: 1,
        emitter: { x: 9, y: 3 },
        listener: { x: 13.5, y: -5.25 },
      })
    );
  });

  it('clears the nearby poi payload without replacing the main payload object', () => {
    const buildPayload = createMusicUpdatePayloadBuilder();

    const first = buildPayload({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      yearProgress: 0.15,
      combatIntensity: 0.5,
      clusterX: 0,
      clusterY: 0,
      emitterX: 6,
      emitterY: 6,
      listenerX: 0,
      listenerY: 0,
      nearbyPoi: {
        tileKind: 'town',
        poiType: 'town',
        contextType: 'town',
        mix: 1,
        clusterX: 0,
        clusterY: 0,
        emitter: { x: 4, y: 6 },
      },
    });
    const second = buildPayload({
      nowMs: 32,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      yearProgress: 0.15,
      combatIntensity: 0,
      clusterX: 0,
      clusterY: 0,
      emitterX: 6,
      emitterY: 6,
      listenerX: 0.5,
      listenerY: 1,
      nearbyPoi: null,
    });

    expect(second).toBe(first);
    expect(second.nearbyPoi).toBeNull();
    expect(second.combatIntensity).toBe(0);
    expect(second.listener).toEqual({ x: 0.5, y: 1 });
  });
});
