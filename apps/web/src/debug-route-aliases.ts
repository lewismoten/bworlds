export const DEBUG_ROUTE_ALIASES = [
  '/debug',
  '/debug/index.html',
  '/debug/music',
  '/debug/music/index.html',
  '/debug/trees',
  '/debug/trees/index.html',
] as const;

export function resolveDebugRouteRedirect(pathname: string): string | null {
  switch (pathname) {
    case '/debug':
    case '/debug/index.html':
      return '/debug/';
    case '/debug/music':
    case '/debug/music/index.html':
      return '/debug/music/';
    case '/debug/trees':
    case '/debug/trees/index.html':
      return '/debug/trees/';
    default:
      return null;
  }
}
