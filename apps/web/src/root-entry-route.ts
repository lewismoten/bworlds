const ROOT_ENTRY_PAGE_PATH_ALIASES = {
  '/debug': '/debug/',
  '/debug/': '/debug/',
  '/debug/index.html': '/debug/',
  '/debug/music': '/debug/music/',
  '/debug/music/': '/debug/music/',
  '/debug/music/index.html': '/debug/music/',
  '/debug/trees': '/debug/trees/',
  '/debug/trees/': '/debug/trees/',
  '/debug/trees/index.html': '/debug/trees/',
} as const;

export const ROOT_ENTRY_PAGE_PATHS = [
  '/debug/',
  '/debug/music/',
  '/debug/trees/',
] as const;

export type RootEntryPagePath = (typeof ROOT_ENTRY_PAGE_PATHS)[number];

export function resolveRootEntryPagePath(
  pathname: string
): RootEntryPagePath | null {
  return (
    ROOT_ENTRY_PAGE_PATH_ALIASES[
      pathname as keyof typeof ROOT_ENTRY_PAGE_PATH_ALIASES
    ] ?? null
  );
}
