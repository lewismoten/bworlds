import { resolveDebugRouteRedirect } from './debug-route-aliases.ts';

export type LocationLike = {
  pathname: string;
  search?: string;
  hash?: string;
  replace: (url: string) => void;
};

export function buildCanonicalDebugRouteUrl(location: {
  pathname: string;
  search?: string;
  hash?: string;
}): string | null {
  const redirectPath = resolveDebugRouteRedirect(location.pathname);
  if (!redirectPath) {
    return null;
  }

  return `${redirectPath}${location.search ?? ''}${location.hash ?? ''}`;
}

export function redirectToCanonicalDebugRoute(location: LocationLike): boolean {
  const redirectUrl = buildCanonicalDebugRouteUrl(location);
  if (!redirectUrl) {
    return false;
  }

  location.replace(redirectUrl);
  return true;
}
