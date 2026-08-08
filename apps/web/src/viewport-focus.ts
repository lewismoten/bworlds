type FocusableLike = {
  focus: (options?: FocusOptions) => void;
} | null | undefined;

type ViewportHostLike = {
  focus: (options?: FocusOptions) => void;
  querySelector?: (selector: string) => FocusableLike;
} | null | undefined;

export function restore3dViewportKeyboardFocus(
  viewMode: '2d' | '3d' | 'text',
  viewport: ViewportHostLike
): boolean {
  if (viewMode !== '3d' || !viewport) {
    return false;
  }

  const focusTarget = viewport.querySelector?.('canvas') ?? viewport;
  focusTarget.focus({ preventScroll: true });
  return true;
}
