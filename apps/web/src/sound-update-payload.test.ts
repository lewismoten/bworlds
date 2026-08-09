import { describe, expect, it } from 'vitest';
import {
  createSoundUpdatePayloadBuilder,
  getSoundUpdateInputSignature,
} from './sound-update-payload.ts';

describe('sound update payload builder', () => {
  it('reuses the same payload and nested audio position objects across frames', () => {
    const buildPayload = createSoundUpdatePayloadBuilder();

    const first = buildPayload({
      nowMs: 0,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: true,
      tileKind: 'town',
      dayProgress: 0.24,
      yearProgress: 0.2,
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
      nearbyAmbient: {
        kind: 'settlement',
        intensity: 0.65,
        emitter: { x: 14, y: -7 },
        blendedLayers: [
          {
            kind: 'plains',
            intensity: 0.28,
            emitter: { x: 12, y: -8 },
          },
        ],
      },
    });
    const second = buildPayload({
      nowMs: 16,
      walking: false,
      isJumping: true,
      viewMode: '3d',
      ambianceEnabled: false,
      tileKind: 'bridge',
      dayProgress: 0.92,
      yearProgress: 0,
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
      nearbyAmbient: {
        kind: 'ocean',
        intensity: 0.25,
        emitter: { x: 15, y: -9 },
        blendedLayers: [
          {
            kind: 'forest',
            intensity: 0.4,
            emitter: { x: 13, y: -8 },
          },
        ],
      },
    });

    expect(second).toBe(first);
    expect(second.emitter).toBe(first.emitter);
    expect(second.listener).toBe(first.listener);
    expect(second.nearbyTrain).toBe(first.nearbyTrain);
    expect(second.nearbyPaddleBoat).toBe(first.nearbyPaddleBoat);
    expect(second.nearbyAmbient).toBe(first.nearbyAmbient);
    expect(second.ambianceEnabled).toBe(false);
    expect(second.dayProgress).toBe(0.92);
    expect(second.yearProgress).toBe(0);
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
    expect(second.nearbyAmbient).toEqual(
      expect.objectContaining({
        kind: 'ocean',
        intensity: 0.25,
        emitter: { x: 15, y: -9 },
        listener: { x: 13.5, y: -5.5 },
        blendedLayers: [
          {
            kind: 'forest',
            intensity: 0.4,
            emitter: { x: 13, y: -8 },
          },
        ],
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
      ambianceEnabled: true,
      tileKind: 'town',
      dayProgress: 0.5,
      yearProgress: 0.5,
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
      nearbyAmbient: {
        kind: 'ocean',
        intensity: 0.8,
        emitter: { x: 5, y: 0 },
      },
    });
    const second = buildPayload({
      nowMs: 32,
      walking: false,
      isJumping: false,
      viewMode: '2d',
      ambianceEnabled: false,
      tileKind: 'plains',
      dayProgress: 0.5,
      yearProgress: 0.5,
      emitterX: 2,
      emitterY: 1,
      listenerX: 1,
      listenerY: 2,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyAmbient: null,
    });

    expect(second).toBe(first);
    expect(second.nearbyTrain).toBeNull();
    expect(second.nearbyPaddleBoat).toBeNull();
    expect(second.nearbyAmbient).toBeNull();
    expect(second.ambianceEnabled).toBe(false);
    expect(second.listener).toEqual({ x: 1, y: 2 });
  });

  it('changes the audible signature when ambient phase transitions between day and night', () => {
    const day = getSoundUpdateInputSignature({
      walking: false,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: true,
      tileKind: 'forest',
      dayProgress: 0.5,
      yearProgress: 0.5,
      weatherKind: 'clear',
      weatherIntensity: 0,
      windStrength: 0,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyAmbient: {
        kind: 'forest',
        intensity: 0.7,
        emitter: { x: 2, y: 0 },
      },
    });
    const night = getSoundUpdateInputSignature({
      walking: false,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: true,
      tileKind: 'forest',
      dayProgress: 0.92,
      yearProgress: 0.5,
      weatherKind: 'clear',
      weatherIntensity: 0,
      windStrength: 0,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyAmbient: {
        kind: 'forest',
        intensity: 0.7,
        emitter: { x: 2, y: 0 },
      },
    });

    expect(day.ambient).not.toBe(night.ambient);
  });
});
