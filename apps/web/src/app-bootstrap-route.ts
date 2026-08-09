import { buildCanonicalDebugRouteUrl } from './debug-route-guard.ts';
import {
  resolveRootEntryPagePath,
  type RootEntryPagePath,
} from './root-entry-route.ts';

export type BootstrapLocationLike = {
  pathname: string;
  search?: string;
  hash?: string;
};

export type AppBootstrapRoute = {
  canonicalUrl: string | null;
  pagePath: RootEntryPagePath | null;
};

export function resolveAppBootstrapRoute(
  location: BootstrapLocationLike
): AppBootstrapRoute {
  const canonicalUrl = buildCanonicalDebugRouteUrl(location);

  if (canonicalUrl) {
    const canonicalPathname = new URL(canonicalUrl, 'http://bworlds.local')
      .pathname;
    return {
      canonicalUrl,
      pagePath: resolveRootEntryPagePath(canonicalPathname),
    };
  }

  return {
    canonicalUrl: null,
    pagePath: resolveRootEntryPagePath(location.pathname),
  };
}
