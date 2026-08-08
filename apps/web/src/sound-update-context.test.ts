import { describe, expect, it } from 'vitest';
import { shouldResolve3dSoundContext } from './sound-update-context.ts';

describe('sound update context', () => {
  it('only resolves expensive nearby audio context in 3d mode', () => {
    expect(shouldResolve3dSoundContext('3d')).toBe(true);
    expect(shouldResolve3dSoundContext('2d')).toBe(false);
    expect(shouldResolve3dSoundContext('text')).toBe(false);
  });
});
