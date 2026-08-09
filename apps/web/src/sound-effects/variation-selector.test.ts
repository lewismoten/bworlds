import { describe, expect, it } from 'vitest';
import { createSoundVariationSelector } from './variation-selector.ts';

describe('sound variation selector', () => {
  it('never repeats the most recent variation when alternatives exist', () => {
    const selector = createSoundVariationSelector();
    const selections = [
      selector.select('footstep:road', 0),
      selector.select('footstep:road', 100),
      selector.select('footstep:road', 200),
      selector.select('footstep:road', 300),
    ];

    expect(selections[1]).not.toBe(selections[0]);
    expect(selections[2]).not.toBe(selections[1]);
    expect(selections[3]).not.toBe(selections[2]);
  });

  it('widens variation history when the sound repeats frequently', () => {
    const selector = createSoundVariationSelector();
    const selections = [
      selector.select('forest-ambience:river', 0, { recognition: 'low' }),
      selector.select('forest-ambience:river', 120, { recognition: 'low' }),
      selector.select('forest-ambience:river', 240, { recognition: 'low' }),
      selector.select('forest-ambience:river', 360, { recognition: 'low' }),
    ];

    expect(new Set(selections).size).toBeGreaterThanOrEqual(3);
  });

  it('keeps high-recognition sounds on a tighter weighted cycle', () => {
    const selector = createSoundVariationSelector();
    const selections = [
      selector.select('advancement', 0, { recognition: 'high' }),
      selector.select('advancement', 800, { recognition: 'high' }),
      selector.select('advancement', 1_600, { recognition: 'high' }),
      selector.select('advancement', 2_400, { recognition: 'high' }),
    ];

    expect(Math.max(...selections)).toBeLessThanOrEqual(2);
    expect(new Set(selections).size).toBeGreaterThanOrEqual(2);
  });
});
