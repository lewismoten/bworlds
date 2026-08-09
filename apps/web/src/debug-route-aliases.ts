export const DEBUG_ROUTE_ALIASES = [
  '/debug',
  '/debug/music',
  '/debug/trees',
] as const;

export function resolveDebugRouteRedirect(pathname: string): string | null {
  for (const route of DEBUG_ROUTE_ALIASES) {
    if (pathname === route) {
      return `${route}/`;
    }
  }

  return null;
}
