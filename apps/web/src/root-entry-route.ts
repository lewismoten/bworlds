export const ROOT_ENTRY_PAGE_PATHS = [
  '/debug/',
  '/debug/music/',
  '/debug/trees/',
] as const;

export type RootEntryPagePath = (typeof ROOT_ENTRY_PAGE_PATHS)[number];

export function resolveRootEntryPagePath(
  pathname: string
): RootEntryPagePath | null {
  for (const pagePath of ROOT_ENTRY_PAGE_PATHS) {
    if (pathname === pagePath) {
      return pagePath;
    }
  }

  return null;
}
