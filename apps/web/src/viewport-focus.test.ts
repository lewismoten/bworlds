import { describe, expect, it, vi } from 'vitest';
import { restore3dViewportKeyboardFocus } from './viewport-focus.ts';

describe('viewport keyboard focus', () => {
  it('focuses the 3d viewport host when 3d mode becomes active', () => {
    const viewport = {
      focus: vi.fn(),
    };

    expect(restore3dViewportKeyboardFocus('3d', viewport)).toBe(true);
    expect(viewport.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('does not require a renderer canvas to restore focus', () => {
    const viewport = {
      focus: vi.fn(),
    };

    expect(restore3dViewportKeyboardFocus('3d', viewport)).toBe(true);
    expect(viewport.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('can restore focus repeatedly after reloads or ui interactions', () => {
    const viewport = {
      focus: vi.fn(),
    };

    expect(restore3dViewportKeyboardFocus('3d', viewport)).toBe(true);
    expect(restore3dViewportKeyboardFocus('3d', viewport)).toBe(true);
    expect(viewport.focus).toHaveBeenNthCalledWith(1, { preventScroll: true });
    expect(viewport.focus).toHaveBeenNthCalledWith(2, { preventScroll: true });
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
