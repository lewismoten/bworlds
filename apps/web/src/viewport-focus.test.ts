import { describe, expect, it, vi } from 'vitest';
import { restore3dViewportKeyboardFocus } from './viewport-focus.ts';

describe('viewport keyboard focus', () => {
  it('focuses the renderer canvas when 3d mode becomes active', () => {
    const canvas = {
      focus: vi.fn(),
    };
    const viewport = {
      focus: vi.fn(),
      querySelector: vi.fn().mockReturnValue(canvas),
    };

    expect(restore3dViewportKeyboardFocus('3d', viewport)).toBe(true);
    expect(viewport.querySelector).toHaveBeenCalledWith('canvas');
    expect(canvas.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(viewport.focus).not.toHaveBeenCalled();
  });

  it('falls back to the viewport host when no canvas is present', () => {
    const viewport = {
      focus: vi.fn(),
      querySelector: vi.fn().mockReturnValue(null),
    };

    expect(restore3dViewportKeyboardFocus('3d', viewport)).toBe(true);
    expect(viewport.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('does not steal focus outside 3d mode', () => {
    const viewport = {
      focus: vi.fn(),
      querySelector: vi.fn(),
    };

    expect(restore3dViewportKeyboardFocus('2d', viewport)).toBe(false);
    expect(restore3dViewportKeyboardFocus('text', viewport)).toBe(false);
    expect(restore3dViewportKeyboardFocus('3d', null)).toBe(false);
    expect(viewport.focus).not.toHaveBeenCalled();
    expect(viewport.querySelector).not.toHaveBeenCalled();
  });
});
