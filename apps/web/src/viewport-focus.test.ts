import { describe, expect, it, vi } from 'vitest';
import { restore3dViewportKeyboardFocus } from './viewport-focus.ts';

describe('viewport keyboard focus', () => {
  it('focuses the 3d viewport when 3d mode becomes active', () => {
    const viewport = {
      focus: vi.fn(),
    };

    expect(restore3dViewportKeyboardFocus('3d', viewport)).toBe(true);
    expect(viewport.focus).toHaveBeenCalledTimes(1);
  });

  it('does not steal focus outside 3d mode', () => {
    const viewport = {
      focus: vi.fn(),
    };

    expect(restore3dViewportKeyboardFocus('2d', viewport)).toBe(false);
    expect(restore3dViewportKeyboardFocus('text', viewport)).toBe(false);
    expect(restore3dViewportKeyboardFocus('3d', null)).toBe(false);
    expect(viewport.focus).not.toHaveBeenCalled();
  });
});
