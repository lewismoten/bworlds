import {
  resolveMusicTheme as resolveRuntimeMusicTheme,
  resolveMusicThemeById,
} from './procedural-music.ts';
import { blendThemeMotifWithFactionInteraction } from './procedural-music-faction-motif.ts';
import { blendThemeMotifWithImportantNpcMotif } from './procedural-music-npc-motif.ts';

export { resolveMusicThemeById } from './procedural-music.ts';

export function resolveMusicTheme(
  ...args: Parameters<typeof resolveRuntimeMusicTheme>
): ReturnType<typeof resolveRuntimeMusicTheme> {
  const [tileKind, contextType, poiType, clusterX = 0, clusterY = 0] = args;
  const resolvedKind = poiType ?? tileKind;
  const theme = resolveRuntimeMusicTheme(...args);

  return {
    ...theme,
    motif: blendThemeMotifWithImportantNpcMotif(
      blendThemeMotifWithFactionInteraction(theme.motif, {
        contextType,
        tileKind: resolvedKind,
        clusterX,
        clusterY,
      }),
      {
        contextType,
        tileKind: resolvedKind,
        clusterX,
        clusterY,
      }
    ),
  };
}
