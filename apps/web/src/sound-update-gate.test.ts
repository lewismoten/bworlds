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
      emitterX: 0,
      emitterY: 0,
      listenerX: 0,
      listenerY: 0,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyOcean: null,
    });
    const second = gateUpdate({
      nowMs: 50,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: true,
      tileKind: 'town',
      emitterX: 1,
      emitterY: 2,
      listenerX: 1,
      listenerY: 2,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyOcean: null,
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
      emitterX: 0,
      emitterY: 0,
      listenerX: 0,
      listenerY: 0,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyOcean: null,
    });

    expect(
      gateUpdate({
        nowMs: 16,
        walking: false,
        isJumping: false,
        viewMode: '3d',
        ambianceEnabled: true,
        tileKind: 'plains',
        emitterX: 0.25,
        emitterY: 0.25,
        listenerX: 0.25,
        listenerY: 0.25,
        nearbyTrain: null,
        nearbyPaddleBoat: null,
        nearbyOcean: null,
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
      emitterX: 0,
      emitterY: 0,
      listenerX: 0,
      listenerY: 0,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyOcean: null,
    });

    const changed = gateUpdate({
      nowMs: 16,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: true,
      tileKind: 'plains',
      emitterX: 0.25,
      emitterY: 0.25,
      listenerX: 0.25,
      listenerY: 0.25,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyOcean: null,
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
      nearbyOcean: null,
    });

    const changed = gateUpdate({
      nowMs: 16,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: true,
      tileKind: 'shore',
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
      nearbyOcean: null,
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
      emitterX: 0,
      emitterY: 0,
      listenerX: 0,
      listenerY: 0,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyOcean: {
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
      emitterX: 0,
      emitterY: 0,
      listenerX: 0,
      listenerY: 0,
      nearbyTrain: null,
      nearbyPaddleBoat: null,
      nearbyOcean: {
        intensity: 0.7,
        emitter: { x: 4, y: 0 },
      },
    });

    expect(changed).not.toBeNull();
    expect(changed?.ambianceEnabled).toBe(false);
    expect(changed?.nearbyOcean).toEqual(
      expect.objectContaining({
        intensity: 0.7,
        emitter: { x: 4, y: 0 },
      })
    );
  });
});
