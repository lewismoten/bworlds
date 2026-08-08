import { describe, expect, it } from 'vitest';
import {
  compactThreeMaterialOptions,
  resolveThreeColor,
} from './three-material-options.ts';

describe('three material options helpers', () => {
  it('removes undefined material fields before handing options to Three', () => {
    expect(
      compactThreeMaterialOptions({
        color: undefined,
        transparent: true,
        opacity: 0.4,
        side: undefined,
      })
    ).toEqual({
      transparent: true,
      opacity: 0.4,
    });
  });

  it('falls back to a safe preview color when a body or marker omits one', () => {
    expect(resolveThreeColor(undefined, '#8fb7de')).toBe('#8fb7de');
    expect(resolveThreeColor('', '#8fb7de')).toBe('#8fb7de');
    expect(resolveThreeColor('#ffd06e', '#8fb7de')).toBe('#ffd06e');
  });
});
