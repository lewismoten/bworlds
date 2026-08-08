type FocusableLike = {
  focus: (options?: FocusOptions) => void;
} | null | undefined;

type ViewportHostLike = {
  focus: (options?: FocusOptions) => void;
} | null | undefined;

export function shouldRestore3dViewportKeyboardFocusOnPointerDown(
  viewMode: '2d' | '3d' | 'text',
  button: number
): boolean {
  return viewMode === '3d' && button === 0;
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
