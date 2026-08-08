import { describe, expect, it, vi } from 'vitest';
import {
  restore3dViewportKeyboardFocus,
  restore3dViewportKeyboardFocusOnPointerDown,
  shouldRestore3dViewportKeyboardFocusOnPointerDown,
} from './viewport-focus.ts';

describe('viewport keyboard focus', () => {
  it('restores keyboard focus for primary pointer presses in 3d mode', () => {
    expect(shouldRestore3dViewportKeyboardFocusOnPointerDown('3d', 0)).toBe(
      true
    );
    expect(shouldRestore3dViewportKeyboardFocusOnPointerDown('2d', 0)).toBe(
      false
    );
    expect(shouldRestore3dViewportKeyboardFocusOnPointerDown('text', 0)).toBe(
      false
    );
    expect(shouldRestore3dViewportKeyboardFocusOnPointerDown('3d', 1)).toBe(
      false
    );
  });

  it('focuses the 3d viewport host when 3d mode becomes active', () => {
    const viewport = {
      focus: vi.fn(),
    };

    expect(restore3dViewportKeyboardFocus('3d', viewport)).toBe(true);
    expect(viewport.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('restores focus directly from primary 3d viewport pointer presses', () => {
    const viewport = {
      focus: vi.fn(),
    };

    expect(
      restore3dViewportKeyboardFocusOnPointerDown('3d', 0, viewport)
    ).toBe(true);
    expect(viewport.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('prefers the renderer canvas when the 3d host wraps one', () => {
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

  it('ignores non-primary pointer presses when restoring focus from pointer events', () => {
    const viewport = {
      focus: vi.fn(),
    };

    expect(
      restore3dViewportKeyboardFocusOnPointerDown('3d', 1, viewport)
    ).toBe(false);
    expect(
      restore3dViewportKeyboardFocusOnPointerDown('2d', 0, viewport)
    ).toBe(false);
    expect(viewport.focus).not.toHaveBeenCalled();
  });
});
