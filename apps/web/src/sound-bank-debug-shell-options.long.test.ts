import { describe, expect, it } from 'vitest';
import {
  createSoundBankDebugSnapshot,
  normalizeSoundBankDebugOptions,
  randomizeSoundBankDebugSeed,
} from './sound-bank-debug.ts';

describe('sound bank debug shell options', () => {
  it('normalizes partial debug options into a safe instrument-bank snapshot seed', () => {
    expect(
      normalizeSoundBankDebugOptions({
        tileKind: 'tower',
        contextType: 'town',
        clusterX: 12.8,
        clusterY: -5.2,
        dayProgress: 2,
        yearProgress: -1,
      })
    ).toEqual({
      tileKind: 'tower',
      contextType: 'town',
      clusterX: 13,
      clusterY: -5,
      dayProgress: 1,
      yearProgress: 0,
    });
  });

  it('randomizes the sound bank seed within the shared debug coordinate range', () => {
    expect(
      randomizeSoundBankDebugSeed(
        createSoundBankDebugSnapshot().options,
        () => 1
      )
    ).toEqual(
      expect.objectContaining({
        clusterX: 9_999,
        clusterY: 9_999,
      })
    );
  });
});
