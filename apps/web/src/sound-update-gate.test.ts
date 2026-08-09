import { describe, expect, it } from 'vitest';

import { createSoundUpdateGate } from './sound-update-gate.ts';

describe('sound update gate', () => {
  it('emits an initial payload and reuses the payload object on later updates', () => {
    const gateUpdate = createSoundUpdateGate(50);

    const first = gateUpdate({
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
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyAmbient: null,
    });
    const second = gateUpdate({
      nowMs: 50,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: true,
      tileKind: 'town',
      dayProgress: 0.5,
      yearProgress: 0.5,
      emitterX: 1,
      emitterY: 2,
      listenerX: 1,
      listenerY: 2,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyAmbient: null,
    });

    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(second?.listener).toEqual({ x: 1, y: 2 });
  });

  it('skips redundant updates before the minimum interval elapses', () => {
    const gateUpdate = createSoundUpdateGate(50);

    gateUpdate({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: true,
      tileKind: 'plains',
      dayProgress: 0.5,
      yearProgress: 0.5,
      emitterX: 0,
      emitterY: 0,
      listenerX: 0,
      listenerY: 0,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyAmbient: null,
    });

    expect(
      gateUpdate({
        nowMs: 16,
        walking: false,
        isJumping: false,
        viewMode: '3d',
        ambianceEnabled: true,
        tileKind: 'plains',
        dayProgress: 0.5,
        yearProgress: 0.5,
        emitterX: 0.25,
        emitterY: 0.25,
        listenerX: 0.25,
        listenerY: 0.25,
        nearbyTrain: null,
        nearbyPaddleBoat: null,
        nearbyAmbient: null,
      })
    ).toBeNull();
  });

  it('updates immediately when audible state changes before the interval', () => {
    const gateUpdate = createSoundUpdateGate(50);

    gateUpdate({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: true,
      tileKind: 'plains',
      dayProgress: 0.5,
      yearProgress: 0.5,
      emitterX: 0,
      emitterY: 0,
      listenerX: 0,
      listenerY: 0,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyAmbient: null,
    });

    const changed = gateUpdate({
      nowMs: 16,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: true,
      tileKind: 'plains',
      dayProgress: 0.5,
      yearProgress: 0.5,
      emitterX: 0.25,
      emitterY: 0.25,
      listenerX: 0.25,
      listenerY: 0.25,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyAmbient: null,
    });

    expect(changed).not.toBeNull();
    expect(changed?.walking).toBe(true);
  });

  it('updates immediately when nearby traffic sound cues change', () => {
    const gateUpdate = createSoundUpdateGate(50);

    gateUpdate({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: true,
      tileKind: 'shore',
      dayProgress: 0.5,
      yearProgress: 0.5,
      emitterX: 0,
      emitterY: 0,
      listenerX: 0,
      listenerY: 0,
      nearbyTrain: null,
      nearbyPaddleBoat: {
        progress: 0.1,
        whistlePhase: 'arrival',
        emitter: { x: 2, y: 0 },
      },
      nearbyAmbient: null,
    });

    const changed = gateUpdate({
      nowMs: 16,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: true,
      tileKind: 'shore',
      dayProgress: 0.5,
      yearProgress: 0.5,
      emitterX: 0,
      emitterY: 0,
      listenerX: 0,
      listenerY: 0,
      nearbyTrain: null,
      nearbyPaddleBoat: {
        progress: 0.3,
        whistlePhase: 'departure',
        emitter: { x: 2, y: 0 },
      },
      nearbyAmbient: null,
    });

    expect(changed).not.toBeNull();
    expect(changed?.nearbyPaddleBoat).toEqual(
      expect.objectContaining({
        progress: 0.3,
        whistlePhase: 'departure',
      })
    );
  });

  it('updates immediately when ambiance preferences or nearby ocean cues change', () => {
    const gateUpdate = createSoundUpdateGate(50);

    gateUpdate({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: true,
      tileKind: 'shore',
      dayProgress: 0.5,
      yearProgress: 0.5,
      emitterX: 0,
      emitterY: 0,
      listenerX: 0,
      listenerY: 0,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyAmbient: {
        kind: 'ocean',
        intensity: 0.35,
        emitter: { x: 3, y: 0 },
      },
    });

    const changed = gateUpdate({
      nowMs: 16,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: false,
      tileKind: 'shore',
      dayProgress: 0.5,
      yearProgress: 0.5,
      emitterX: 0,
      emitterY: 0,
      listenerX: 0,
      listenerY: 0,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyAmbient: {
        kind: 'settlement',
        intensity: 0.7,
        emitter: { x: 4, y: 0 },
      },
    });

    expect(changed).not.toBeNull();
    expect(changed?.ambianceEnabled).toBe(false);
    expect(changed?.nearbyAmbient).toEqual(
      expect.objectContaining({
        kind: 'settlement',
        intensity: 0.7,
        emitter: { x: 4, y: 0 },
      })
    );
  });

  it('updates immediately when ambient time-of-day phases change', () => {
    const gateUpdate = createSoundUpdateGate(50);

    gateUpdate({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: true,
      tileKind: 'forest',
      dayProgress: 0.5,
      yearProgress: 0.5,
      emitterX: 0,
      emitterY: 0,
      listenerX: 0,
      listenerY: 0,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyAmbient: {
        kind: 'forest',
        intensity: 0.7,
        emitter: { x: 2, y: 0 },
      },
    });

    const changed = gateUpdate({
      nowMs: 16,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: true,
      tileKind: 'forest',
      dayProgress: 0.92,
      yearProgress: 0.5,
      emitterX: 0,
      emitterY: 0,
      listenerX: 0,
      listenerY: 0,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyAmbient: {
        kind: 'forest',
        intensity: 0.7,
        emitter: { x: 2, y: 0 },
      },
    });

    expect(changed).not.toBeNull();
    expect(changed?.dayProgress).toBe(0.92);
  });
});
