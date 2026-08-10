type ViewportHostLike =
  | {
      focus: (options?: FocusOptions) => void;
    }
  | null
  | undefined;

export function shouldRestore3dViewportKeyboardFocusOnPointerDown(
  viewMode: '2d' | '3d' | 'text',
  button: number
): boolean {
  return viewMode === '3d' && button === 0;
}

export function restore3dViewportKeyboardFocusOnPointerDown(
  viewMode: '2d' | '3d' | 'text',
  button: number,
  viewport: ViewportHostLike
): boolean {
  if (!shouldRestore3dViewportKeyboardFocusOnPointerDown(viewMode, button)) {
    return false;
  }

  return restore3dViewportKeyboardFocus(viewMode, viewport);
}

export function restore3dViewportKeyboardFocus(
  viewMode: '2d' | '3d' | 'text',
  viewport: ViewportHostLike
): boolean {
  if (viewMode !== '3d' || !viewport) {
    return false;
  }

  viewport.focus({ preventScroll: true });
  return true;
}
