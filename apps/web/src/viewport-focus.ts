type FocusableLike = {
  focus: () => void;
} | null | undefined;

export function restore3dViewportKeyboardFocus(
  viewMode: '2d' | '3d' | 'text',
  viewport: FocusableLike
): boolean {
  if (viewMode !== '3d' || !viewport) {
    return false;
  }

  viewport.focus();
  return true;
}
