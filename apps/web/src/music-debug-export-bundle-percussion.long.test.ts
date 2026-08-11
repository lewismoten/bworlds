import { describe, expect, it } from 'vitest';

import {
  FOREST_EXPORT_BUNDLE,
  FOREST_PERCUSSION_VOICES,
} from './testing/music-debug-export-bundle-fixtures.ts';

describe('music debug export bundle percussion solo wavs', () => {
  it('exports one solo wav for each resolved percussion voice in the song', () => {
    const bundle = FOREST_EXPORT_BUNDLE;
    const fileNames = bundle.entries.map((entry) => entry.fileName);
    const percussionVoices = FOREST_PERCUSSION_VOICES;

    expect(percussionVoices.length).toBeGreaterThan(0);
    for (const voice of percussionVoices) {
      expect(voice.voiceId).toBeTruthy();
      expect(fileNames).toContain(
        `bworlds-deep-forest-4--1-percussion-${voice.voiceId}-solo.wav`
      );
      expect(fileNames).toContain(
        `bworlds-deep-forest-4--1-percussion-${voice.voiceId}-waveform.svg`
      );
    }
    expect(bundle.entries).toHaveLength(11 + percussionVoices.length * 2);
  }, 10_000);
});
