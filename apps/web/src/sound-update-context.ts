type ViewModeLike = '2d' | '3d' | 'text';

export function shouldResolve3dSoundContext(viewMode: ViewModeLike): boolean {
  return viewMode === '3d';
}
