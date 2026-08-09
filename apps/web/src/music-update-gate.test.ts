import { describe, expect, it } from 'vitest';

import { createMusicUpdateGate } from './music-update-gate.ts';

describe('music update gate', () => {
  it('emits an initial payload and reuses the payload object on later updates', () => {
    const gateUpdate = createMusicUpdateGate(120);

    const first = gateUpdate({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      yearProgress: 0.1,
      clusterX: 0,
      clusterY: 0,
      emitterX: 6,
      emitterY: 6,
      listenerX: 0,
      listenerY: 0,
      nearbyPoi: null,
    });
    const second = gateUpdate({
      nowMs: 120,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      yearProgress: 0.1,
      clusterX: 0,
      clusterY: 0,
      emitterX: 6,
      emitterY: 6,
      listenerX: 1,
      listenerY: 2,
      nearbyPoi: null,
    });

    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(second?.listener).toEqual({ x: 1, y: 2 });
  });

  it('skips redundant per-frame updates before the interval elapses', () => {
    const gateUpdate = createMusicUpdateGate(120);

    gateUpdate({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
      emitterX: 6,
      emitterY: 6,
      listenerX: 0,
      listenerY: 0,
      nearbyPoi: null,
    });

    expect(
      gateUpdate({
        nowMs: 16,
        tileKind: 'plains',
        contextType: 'overworld',
        dayProgress: 0.5,
        clusterX: 0,
        clusterY: 0,
        emitterX: 6,
        emitterY: 6,
        listenerX: 0.25,
        listenerY: 0.25,
        nearbyPoi: null,
      })
    ).toBeNull();
  });

  it('updates immediately when the music state changes before the interval', () => {
    const gateUpdate = createMusicUpdateGate(120);

    gateUpdate({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
      emitterX: 6,
      emitterY: 6,
      listenerX: 0,
      listenerY: 0,
      nearbyPoi: null,
    });

    const changed = gateUpdate({
      nowMs: 16,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.5,
      clusterX: 1,
      clusterY: 0,
      emitterX: 18,
      emitterY: 6,
      listenerX: 0.5,
      listenerY: 0.5,
      nearbyPoi: null,
    });

    expect(changed).not.toBeNull();
    expect(changed?.tileKind).toBe('forest');
  });

  it('updates immediately when dialogue ducking changes before the interval', () => {
    const gateUpdate = createMusicUpdateGate(120);

    gateUpdate({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      dialogueIntensity: 0,
      clusterX: 0,
      clusterY: 0,
      emitterX: 6,
      emitterY: 6,
      listenerX: 0,
      listenerY: 0,
      nearbyPoi: null,
    });

    const changed = gateUpdate({
      nowMs: 16,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      dialogueIntensity: 1,
      clusterX: 0,
      clusterY: 0,
      emitterX: 6,
      emitterY: 6,
      listenerX: 0,
      listenerY: 0,
      nearbyPoi: null,
    });

    expect(changed).not.toBeNull();
    expect(changed?.dialogueIntensity).toBe(1);
  });

  it('updates again after the interval even when the signature is unchanged', () => {
    const gateUpdate = createMusicUpdateGate(120);

    gateUpdate({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      clusterX: 0,
      clusterY: 0,
      emitterX: 6,
      emitterY: 6,
      listenerX: 0,
      listenerY: 0,
      nearbyPoi: null,
    });

    const repeated = gateUpdate({
      nowMs: 120,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      clusterX: 0,
      clusterY: 0,
      emitterX: 6,
      emitterY: 6,
      listenerX: 0,
      listenerY: 0,
      nearbyPoi: null,
    });

    expect(repeated).not.toBeNull();
    expect(repeated?.tileKind).toBe('town');
  });
});
