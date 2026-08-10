import { describe, expect, it } from 'vitest';
import {
  buildSoundBankDebugMarkup,
  createSoundBankDebugSnapshot,
  normalizeSoundBankDebugOptions,
  randomizeSoundBankDebugSeed,
} from './sound-bank-debug.ts';

describe('sound bank debug page', () => {
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

  it('builds a dedicated instrument-bank browser with preview controls', () => {
    const snapshot = createSoundBankDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const markup = buildSoundBankDebugMarkup(snapshot, {
      audioStatus: 'Audio idle',
    });

    expect(markup).toContain('<h1>Sound Bank Debug</h1>');
    expect(markup).toContain('/debug/');
    expect(markup).toContain('sound-bank-debug-form');
    expect(markup).toContain('sound-bank-debug-randomize');
    expect(markup).toContain('sound-bank-debug-reset');
    expect(markup).toContain('sound-bank-debug-audio-status');
    expect(markup).toContain('Instrument Browser');
    expect(markup).toContain('Role Patches');
    expect(markup).toContain('music-debug-instrument-panel');
    expect(markup).toContain('Play lead');
    expect(markup).toContain('Play harmony');
    expect(markup).toContain('Play bass');
    expect(markup).toContain('Play percussion');
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
