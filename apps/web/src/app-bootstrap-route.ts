import { buildCanonicalDebugRouteUrl } from './debug-route-guard.ts';
import {
  resolveRootEntryRoute,
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
  const route = resolveRootEntryRoute(
    canonicalUrl
      ? new URL(canonicalUrl, 'http://bworlds.local').pathname
      : location.pathname
  );

  return {
    canonicalUrl: canonicalUrl ?? null,
    pagePath: route?.pagePath ?? null,
  };
}
