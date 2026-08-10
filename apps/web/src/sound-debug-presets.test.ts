import { describe, expect, it } from 'vitest';
import {
  buildSoundDebugSnapshot,
  SOUND_DEBUG_PRESETS,
} from './sound-debug-presets.ts';

describe('sound debug presets', () => {
  it('provides deterministic sound presets for the dedicated sounds debug page', () => {
    expect(SOUND_DEBUG_PRESETS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'footstep-dirt' }),
        expect.objectContaining({ id: 'open-door' }),
        expect.objectContaining({ id: 'thunder-near' }),
      ])
    );
  });

  it('keeps every listed preset renderable for waveform previews and wav export', () => {
    for (const preset of SOUND_DEBUG_PRESETS) {
      const snapshot = buildSoundDebugSnapshot(preset.id);
      expect(snapshot.renderable).toBe(true);
      expect(snapshot.recipe.id.length).toBeGreaterThan(0);
      expect(snapshot.details.signature.length).toBeGreaterThan(0);
    }
  });
});
