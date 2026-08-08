import { describe, expect, it } from 'vitest';
import { createSoundUpdatePayloadBuilder } from './sound-update-payload.ts';

describe('sound update payload builder', () => {
  it('reuses the same payload and nested audio position objects across frames', () => {
    const buildPayload = createSoundUpdatePayloadBuilder();

    const first = buildPayload({
      nowMs: 0,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'town',
      weatherKind: 'fog',
      weatherIntensity: 0.4,
      windStrength: 0.2,
      emitterX: 12.5,
      emitterY: -4.5,
      listenerX: 12.5,
      listenerY: -4.5,
      nearbyTrain: {
        progress: 0.3,
        emitter: { x: 16, y: -3 },
      },
      nearbyPaddleBoat: {
        progress: 0.7,
        whistlePhase: 'arrival',
        emitter: { x: 8, y: -6 },
      },
    });
    const second = buildPayload({
      nowMs: 16,
      walking: false,
      isJumping: true,
      viewMode: '3d',
      tileKind: 'bridge',
      weatherKind: 'wind',
      weatherIntensity: 0.8,
      windStrength: 0.65,
      emitterX: 13.5,
      emitterY: -5.5,
      listenerX: 13.5,
      listenerY: -5.5,
      nearbyTrain: {
        progress: 0.9,
        emitter: { x: 18, y: -1 },
      },
      nearbyPaddleBoat: {
        progress: 0.15,
        whistlePhase: 'departure',
        emitter: { x: 10, y: -8 },
      },
    });

    expect(second).toBe(first);
    expect(second.emitter).toBe(first.emitter);
    expect(second.listener).toBe(first.listener);
    expect(second.nearbyTrain).toBe(first.nearbyTrain);
    expect(second.nearbyPaddleBoat).toBe(first.nearbyPaddleBoat);
    expect(second.emitter).toEqual({ x: 13.5, y: -5.5 });
    expect(second.listener).toEqual({ x: 13.5, y: -5.5 });
    expect(second.nearbyTrain).toEqual(
      expect.objectContaining({
        progress: 0.9,
        emitter: { x: 18, y: -1 },
        listener: { x: 13.5, y: -5.5 },
      })
    );
    expect(second.nearbyPaddleBoat).toEqual(
      expect.objectContaining({
        progress: 0.15,
        whistlePhase: 'departure',
        emitter: { x: 10, y: -8 },
        listener: { x: 13.5, y: -5.5 },
      })
    );
  });

  it('clears optional nearby audio profiles without replacing the main payload object', () => {
    const buildPayload = createSoundUpdatePayloadBuilder();

    const first = buildPayload({
      nowMs: 0,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'town',
      emitterX: 0,
      emitterY: 0,
      listenerX: 0,
      listenerY: 0,
      nearbyTrain: {
        progress: 0.1,
        emitter: { x: 4, y: 6 },
      },
      nearbyPaddleBoat: {
        progress: 0.4,
        whistlePhase: 'arrival',
        emitter: { x: -2, y: 3 },
      },
    });
    const second = buildPayload({
      nowMs: 32,
      walking: false,
      isJumping: false,
      viewMode: '2d',
      tileKind: 'plains',
      emitterX: 2,
      emitterY: 1,
      listenerX: 1,
      listenerY: 2,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
    });

    expect(second).toBe(first);
    expect(second.nearbyTrain).toBeNull();
    expect(second.nearbyPaddleBoat).toBeNull();
    expect(second.listener).toEqual({ x: 1, y: 2 });
  });
});
