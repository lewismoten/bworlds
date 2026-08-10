import { resolveRootEntryRoute } from './root-entry-route.ts';

export const DEBUG_ROUTE_ALIASES = [
  '/debug',
  '/debug/index.html',
  '/debug/audio',
  '/debug/audio/index.html',
  '/debug/audio.html',
  '/debug/ambience',
  '/debug/ambience/index.html',
  '/debug/ambience.html',
  '/debug/music',
  '/debug/music/index.html',
  '/debug/music.html',
  '/debug/sounds',
  '/debug/sounds/index.html',
  '/debug/sounds.html',
  '/debug/sound-bank',
  '/debug/sound-bank/index.html',
  '/debug/sound-bank.html',
  '/debug/trees',
  '/debug/trees/index.html',
] as const;

export function resolveDebugRouteRedirect(pathname: string): string | null {
  const route = resolveRootEntryRoute(pathname);
  if (!route?.isAlias) {
    return null;
  }

  return route.canonicalPathname;
}
