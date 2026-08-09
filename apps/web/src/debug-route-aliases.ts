import { resolveRootEntryRoute } from './root-entry-route.ts';

export const DEBUG_ROUTE_ALIASES = [
  '/debug',
  '/debug/index.html',
  '/debug/music',
  '/debug/music/index.html',
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
