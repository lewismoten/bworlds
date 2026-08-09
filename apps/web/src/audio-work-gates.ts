type ViewModeLike = '2d' | '3d' | 'text';

export function shouldResolve3dSoundContext(viewMode: ViewModeLike): boolean {
  return viewMode === '3d';
}

export function shouldResolveNearbyEnvironmentalAudioWork(options: {
  viewMode: ViewModeLike;
  soundEnabled: boolean;
  ambianceEnabled: boolean;
  environmentVolume: number;
}): boolean {
  return (
    shouldResolve3dSoundContext(options.viewMode) &&
    options.soundEnabled &&
    options.ambianceEnabled &&
    options.environmentVolume > 0.001
  );
}

export function shouldResolvePoiMusicWork(options: {
  musicEnabled: boolean;
  musicVolume: number;
}): boolean {
  return options.musicEnabled && options.musicVolume > 0.001;
}
